// POST /api/extract-candidate — turn a Belinda-style voice memo about one
// candidate into a structured row she can save into her network.
//
// Input  : { transcript: string }
// Output : { candidate: { ... structured fields ... } }

import { NextResponse } from 'next/server';
import type { Anthropic } from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Belinda's onboarding assistant. Belinda is a senior hospitality talent broker; she's adding a candidate to her own network by speaking about them. Your job is to turn her memo into a clean structured record.

The memo is conversational — names, hotels, years, languages, family, gut feelings, gossip, dates. Pull out everything you can; leave fields null when she doesn't mention them.

Facts (what's on paper):
- name (required if she mentions it)
- age (if mentioned)
- current_title (e.g. "General Manager", "Director of Sales & Marketing")
- current_hotel (e.g. "Claridge's", "Aman Venice")
- tenure (e.g. "8 yrs", "4 years")
- nationalities (array of nationalities — "British", "French", etc.)
- languages (array of 2-letter codes preferred — EN, FR, IT, DE — or full names)

Location + mobility:
- current_location — city/region of their current role (e.g. "London", "Rome", "Singapore")
- open_to_locations — array of places they'd consider moving to (e.g. ["Mediterranean", "GCC", "Anywhere in Europe"])
- family_travels — boolean. True if she says spouse/partner/kids would relocate with them. Null if not discussed.
- child_education_required — boolean. True if she mentions schools, education for children, "needs international school". Null if not discussed.

Recency (date her phrasing as best you can — use today's date as anchor):
- last_job_change_date — when they last changed jobs. ISO date string (YYYY-MM-DD). E.g. "started at Claridge's in March 2022" → "2022-03-01". Approximate if she's vague.
- last_contact_at — when Belinda last spoke to them. "We last spoke at FT summit in February" → "<this year>-02-01".
- move_readiness — one of "ready" (actively wants to move), "passive" (open to right brief), "settled" (not moving). Infer if not explicit.

Belinda's read (her secret sauce — pull aggressively):
- belinda_tier — one of "black_book" (her most protected contacts), "inner_circle" (high-trust, regularly placed), "watching" (interesting but not yet validated). Infer from her phrasing if she doesn't say outright.
- belinda_rating — 1.0 to 10.0. Default to a sensible value if she gives a qualitative read.
- availability — short phrase, e.g. "Quietly looking", "Settled", "Open to right brief". Often overlaps with move_readiness; keep both populated when there's nuance.
- quote — a single short line she'd actually say about this candidate (her register, not yours). Only include if she said something quotable; do NOT invent.

Signals (Belinda's intel):
- word_on_street — gossip / hearsay about them in the industry
- chemistry — how they read in a room, with owners, etc.
- trajectory — career direction, momentum, what's next
- gut_note — Belinda's instinct, the thing she'd never put in writing

Tags — short phrases (≤3 words) that capture searchable attributes: "lifestyle", "pre-opening", "F&B-led", "luxury", "Black Book", "fluent French", etc. 3–8 tags.

If the memo is too thin to extract a name, return an empty object — better to ask her to redo than to invent.

Return ONLY a JSON object. No prose, no fences, no preamble.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: ['string', 'null'] },
    age: { type: ['number', 'null'] },
    current_title: { type: ['string', 'null'] },
    current_hotel: { type: ['string', 'null'] },
    tenure: { type: ['string', 'null'] },
    current_location: { type: ['string', 'null'] },
    open_to_locations: { type: 'array', items: { type: 'string' } },
    nationalities: { type: 'array', items: { type: 'string' } },
    languages: { type: 'array', items: { type: 'string' } },
    last_job_change_date: { type: ['string', 'null'] },
    last_contact_at: { type: ['string', 'null'] },
    move_readiness: {
      anyOf: [
        { type: 'string', enum: ['ready', 'passive', 'settled'] },
        { type: 'null' },
      ],
    },
    family_travels: { type: ['boolean', 'null'] },
    child_education_required: { type: ['boolean', 'null'] },
    belinda_tier: {
      anyOf: [
        { type: 'string', enum: ['black_book', 'inner_circle', 'watching'] },
        { type: 'null' },
      ],
    },
    belinda_rating: { type: ['number', 'null'] },
    availability: { type: ['string', 'null'] },
    quote: { type: ['string', 'null'] },
    signals: {
      type: 'object',
      properties: {
        word_on_street: { type: ['string', 'null'] },
        chemistry: { type: ['string', 'null'] },
        trajectory: { type: ['string', 'null'] },
        gut_note: { type: ['string', 'null'] },
      },
      required: ['word_on_street', 'chemistry', 'trajectory', 'gut_note'],
      additionalProperties: false,
    },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'name',
    'age',
    'current_title',
    'current_hotel',
    'tenure',
    'current_location',
    'open_to_locations',
    'nationalities',
    'languages',
    'last_job_change_date',
    'last_contact_at',
    'move_readiness',
    'family_travels',
    'child_education_required',
    'belinda_tier',
    'belinda_rating',
    'availability',
    'quote',
    'signals',
    'tags',
  ],
  additionalProperties: false,
} as const;

export type ExtractedCandidate = {
  name: string | null;
  age: number | null;
  current_title: string | null;
  current_hotel: string | null;
  tenure: string | null;
  current_location: string | null;
  open_to_locations: string[];
  nationalities: string[];
  languages: string[];
  last_job_change_date: string | null;
  last_contact_at: string | null;
  move_readiness: 'ready' | 'passive' | 'settled' | null;
  family_travels: boolean | null;
  child_education_required: boolean | null;
  belinda_tier: 'black_book' | 'inner_circle' | 'watching' | null;
  belinda_rating: number | null;
  availability: string | null;
  quote: string | null;
  signals: {
    word_on_street: string | null;
    chemistry: string | null;
    trajectory: string | null;
    gut_note: string | null;
  };
  tags: string[];
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
        {
          role: 'user',
          content: `Belinda's memo:\n\n"${transcript}"`,
        },
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

  let candidate: ExtractedCandidate;
  try {
    candidate = JSON.parse(textBlock.text) as ExtractedCandidate;
  } catch {
    return NextResponse.json(
      { error: 'parse_failed', raw: textBlock.text.slice(0, 500) },
      { status: 502 },
    );
  }

  return NextResponse.json({ candidate });
}
