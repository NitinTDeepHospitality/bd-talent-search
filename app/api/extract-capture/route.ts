// POST /api/extract-capture — turn a post-meeting voice-memo transcript into
// structured rows (briefs / contacts / tags / opportunities) that Belinda
// can save into her BD brain.

import { NextResponse } from 'next/server';
import type { Anthropic } from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Belinda's capture assistant. Belinda just walked out of a meeting and dictates what she heard. Your job is to extract structured rows from her voice memo so she can save them into her BD brain.

There are four extraction types:
- BRIEF — a new role to fill ("Faena Lisbon is opening 2027 and wants a pre-opening GM")
- CONTACT — a person to remember ("the asset manager is Tomas Cardoso")
- TAG — a candidate fact ("Sophie speaks fluent Mandarin", "Alessandra would relocate to Madrid")
- OPPORTUNITY — a BD signal ("Rocco Forte's new build in Tuscany broke ground")

Each row has \`type\`, \`label\` (one short line, ≤80 chars, what Belinda would scan), and \`detail\` (the supporting context from the memo, ≤200 chars).

Be aggressive about extraction. If she mentions a name, a date, a number, a hotel — it's almost certainly worth a row. Don't paraphrase her words; pull them out cleanly.

If the memo is short or there's nothing structured to extract, return an empty \`extracted\` array.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    extracted: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['brief', 'contact', 'tag', 'opportunity'],
          },
          label: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['type', 'label', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['extracted'],
  additionalProperties: false,
} as const;

export type ExtractCaptureResponse = {
  extracted: Array<{
    type: 'brief' | 'contact' | 'tag' | 'opportunity';
    label: string;
    detail: string;
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

  const response = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
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

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  );
  if (!textBlock) {
    return NextResponse.json(
      { error: 'no_text_block', stop_reason: response.stop_reason },
      { status: 502 },
    );
  }

  let parsed: ExtractCaptureResponse;
  try {
    parsed = JSON.parse(textBlock.text) as ExtractCaptureResponse;
  } catch {
    return NextResponse.json(
      { error: 'parse_failed', raw: textBlock.text.slice(0, 500) },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed);
}
