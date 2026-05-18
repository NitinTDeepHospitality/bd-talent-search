// POST /api/extract-capture — turn a post-meeting voice-memo transcript into
// structured rows (briefs / contacts / tags / opportunities) that Belinda
// can save into her BD brain.

import { NextResponse } from 'next/server';
import type { Anthropic } from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Belinda's capture assistant. Belinda just walked out of a meeting and dictates what she heard. Your job is to turn her memo into THREE things she can use:

1. EXTRACTED ROWS — structured records to save into her BD brain:
   - brief — a new role to fill ("Faena Lisbon is opening 2027 and wants a pre-opening GM")
   - contact — a person to remember ("the asset manager is Tomas Cardoso")
   - tag — a candidate fact ("Sophie speaks fluent Mandarin", "Alessandra would relocate to Madrid")
   - opportunity — a BD signal ("Rocco Forte's new build in Tuscany broke ground")
   Each has \`type\`, \`label\` (one short line, ≤80 chars), \`detail\` (supporting context, ≤200 chars).

2. HIGHLIGHTS — the few things from this meeting Belinda would want to remember tomorrow. Each is a single short sentence, ≤120 chars, in her register (terse, knowing). 0–5 highlights. Not a summary of the meeting — the *standout* moments only.

3. TODOS — action items Belinda needs to chase. Each has:
   - \`label\` (the action, imperative voice, ≤80 chars: "Email Stefan with two candidate names by Thursday")
   - \`due_hint\` (free-form, only if she mentioned timing: "this week", "before the holidays", "Thursday")
   Pull aggressively. If she says "I need to" or "I should" or implies follow-up, that's a todo. 0–8 todos.

Be aggressive but accurate. Don't invent. If a section has nothing, return an empty array for that key. If the memo is too thin for anything structured, return all empty arrays.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    extracted: {
      type: 'array',
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
    highlights: {
      type: 'array',
      items: { type: 'string' },
    },
    todos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          due_hint: { type: ['string', 'null'] },
        },
        required: ['label', 'due_hint'],
        additionalProperties: false,
      },
    },
  },
  required: ['extracted', 'highlights', 'todos'],
  additionalProperties: false,
} as const;

export type ExtractedTodo = {
  label: string;
  due_hint: string | null;
};

export type ExtractCaptureResponse = {
  extracted: Array<{
    type: 'brief' | 'contact' | 'tag' | 'opportunity';
    label: string;
    detail: string;
  }>;
  highlights: string[];
  todos: ExtractedTodo[];
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
