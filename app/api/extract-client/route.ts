// POST /api/extract-client — Belinda speaks a memo about a client
// (hotel operator, family office, developer, etc.); Claude turns it into
// a structured client record + zero-or-more open briefs + contacts.

import { NextResponse } from 'next/server';
import type { Anthropic } from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Belinda's onboarding assistant. Belinda is a senior hospitality talent broker; she's adding a CLIENT (an operator, owner, or developer she works with) to her network by speaking about them. Pull out:

Client basics:
- name (required if she mentions it — e.g. "Aimbridge", "Faena Group", "Rocco Forte")
- type — one of:
  • "third_party_operator" — third-party hospitality operators (Aimbridge, Highgate, Coury, IHM)
  • "luxury_collection" — luxury or lifestyle hotel brands (Faena, Kempinski, Rosewood, Aman, COMO, Mandarin)
  • "family_office" — private capital, single-family offices buying hotels
  • "developer" — pre-opening project / construction-side
  • "big_chain" — Marriott, Hilton, Hyatt, IHG, Accor (Belinda usually skips these — only tag if she says so)
- status — "active" (working with them now), "dormant" (warm but quiet)
- hq_city — head office city if she mentions it
- last_contact_at — ISO date (YYYY-MM-DD) of when she last spoke with them. Resolve "Tuesday", "yesterday", "last month" against today.
- notes — a 1–2 sentence summary of what she said about them, in her register

Open briefs (any number, including 0): each is a role they want filled:
- role — e.g. "General Manager", "Director of Sales & Marketing", "EAM"
- hotel_name — the property if she names one
- city — city of the role
- opening_date — opening date or year if mentioned

Contacts (any number, including 0): named individuals at this client
- name — full name
- role — their title if mentioned

If the memo is too thin to extract a client name, return an empty name and Belinda will redo.

Return ONLY a JSON object. No prose, no fences, no preamble.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: ['string', 'null'] },
    type: {
      anyOf: [
        {
          type: 'string',
          enum: [
            'third_party_operator',
            'luxury_collection',
            'family_office',
            'developer',
            'big_chain',
          ],
        },
        { type: 'null' },
      ],
    },
    status: {
      anyOf: [
        { type: 'string', enum: ['active', 'dormant'] },
        { type: 'null' },
      ],
    },
    hq_city: { type: ['string', 'null'] },
    last_contact_at: { type: ['string', 'null'] },
    notes: { type: ['string', 'null'] },
    briefs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          hotel_name: { type: ['string', 'null'] },
          city: { type: ['string', 'null'] },
          opening_date: { type: ['string', 'null'] },
        },
        required: ['role', 'hotel_name', 'city', 'opening_date'],
        additionalProperties: false,
      },
    },
    contacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: ['string', 'null'] },
        },
        required: ['name', 'role'],
        additionalProperties: false,
      },
    },
  },
  required: ['name', 'type', 'status', 'hq_city', 'last_contact_at', 'notes', 'briefs', 'contacts'],
  additionalProperties: false,
} as const;

export type ExtractedClient = {
  name: string | null;
  type:
    | 'third_party_operator'
    | 'luxury_collection'
    | 'family_office'
    | 'developer'
    | 'big_chain'
    | null;
  status: 'active' | 'dormant' | null;
  hq_city: string | null;
  last_contact_at: string | null;
  notes: string | null;
  briefs: Array<{
    role: string;
    hotel_name: string | null;
    city: string | null;
    opening_date: string | null;
  }>;
  contacts: Array<{
    name: string;
    role: string | null;
  }>;
};

export async function POST(request: Request) {
  const { transcript } = (await request.json()) as { transcript?: string };
  if (!transcript || transcript.trim().length === 0) {
    return NextResponse.json(
      { error: 'transcript required' },
      { status: 400 },
    );
  }

  let response;
  try {
    response = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      thinking: { type: 'disabled' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      } as Anthropic.Messages.MessageCreateParams['output_config'],
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        { role: 'user', content: `Belinda's memo:\n\n"${transcript}"` },
      ],
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json(
      {
        error: 'anthropic_failed',
        status: err.status,
        message: err.message?.slice(0, 500),
      },
      { status: 502 },
    );
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  );
  if (!textBlock) {
    return NextResponse.json(
      { error: 'no_text_block', stop_reason: response.stop_reason },
      { status: 502 },
    );
  }

  let client: ExtractedClient;
  try {
    client = JSON.parse(textBlock.text) as ExtractedClient;
  } catch {
    return NextResponse.json(
      { error: 'parse_failed', raw: textBlock.text.slice(0, 500) },
      { status: 502 },
    );
  }

  return NextResponse.json({ client });
}
