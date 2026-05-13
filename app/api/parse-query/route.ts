// POST /api/parse-query — turn a spoken transcript into structured filters
// and a ranked candidate list. Returns the IDs only; the client already
// has the full candidate objects via initialCandidates.

import { NextResponse } from 'next/server';
import type { Anthropic } from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Belinda's BD assistant. Belinda is a hospitality talent broker — she places GMs, DOSMs, F&B directors at luxury and lifestyle hotels.

When she asks something, you:
1. Parse her query into structured filters (expertise area, tier, location, languages, anything else relevant)
2. Pick up to 5 candidates from her network that fit best, ranked best first
3. Explain your reasoning in one short sentence in her register — editorial, terse, knowing. Never marketing-y, never overlong.

Examples of her register:
- "Three names jump out — all have run lifestyle properties and speak French."
- "Two of these are mobile in EMEA. The third would need persuading."
- "Sophie is the obvious pick. Alessandra runs hotter on chemistry."

You receive a JSON array of her candidates with key facts. Use the candidate \`id\` (UUID) in \`matchedIds\`. The \`tags\` field is for pill chips on the UI — short, 1–2 words each, max 6.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    filters: {
      type: 'object',
      properties: {
        expertise: { type: 'array', items: { type: 'string' } },
        tier: { type: 'string' },
        location: { type: 'string' },
        languages: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
      additionalProperties: false,
    },
    matchedIds: { type: 'array', items: { type: 'string' } },
    reasoning: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['filters', 'matchedIds', 'reasoning', 'tags'],
  additionalProperties: false,
} as const;

export type ParseQueryResponse = {
  filters: {
    expertise?: string[];
    tier?: string;
    location?: string;
    languages?: string[];
    notes?: string;
  };
  matchedIds: string[];
  reasoning: string;
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

  const sb = supabaseServer();
  const { data: candidates, error: dbErr } = await sb
    .from('candidates')
    .select(
      'id, name, current_title, current_hotel, location, languages, belinda_tier, belinda_rating, quote, availability',
    )
    .limit(50);

  if (dbErr) {
    return NextResponse.json(
      { error: 'db_error', detail: dbErr.message },
      { status: 502 },
    );
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json(
      { error: 'no_candidates' },
      { status: 503 },
    );
  }

  const userPrompt =
    `Belinda said: "${transcript}"\n\n` +
    `Her candidates:\n${JSON.stringify(candidates, null, 2)}`;

  let response;
  try {
    response = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2500,
      // Adaptive thinking + structured outputs was burning the token budget
      // before the JSON was emitted. Ranking 5 candidates doesn't need
      // thinking — disable it.
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
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    console.error('[BD] parse-query Anthropic call failed:', err);
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
      {
        error: 'no_text_block',
        stop_reason: response.stop_reason,
        blocks: response.content.map((b) => b.type),
      },
      { status: 502 },
    );
  }

  let parsed: ParseQueryResponse;
  try {
    parsed = JSON.parse(textBlock.text) as ParseQueryResponse;
  } catch {
    return NextResponse.json(
      {
        error: 'parse_failed',
        stop_reason: response.stop_reason,
        raw: textBlock.text.slice(0, 500),
      },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed);
}
