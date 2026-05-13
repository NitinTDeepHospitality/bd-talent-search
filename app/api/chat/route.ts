// POST /api/chat — Belinda's conversational assistant. Streams responses.
// Body: { messages: [{ role: 'user'|'assistant', content: string }], candidateId?: string }
// Response: Server-Sent Events of text deltas (one delta per chunk).

import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Belinda's conversational assistant. Belinda is a hospitality talent broker — she places senior hotel executives at luxury and lifestyle properties.

Your role:
- Answer her questions about her own candidates (rating, signals, fit for briefs, history)
- Help her think through who to send where and why
- Surface tradeoffs honestly, not just affirmations

Register:
- Editorial. Confident. Brief. No marketing voice, no "I'd be happy to…", no bullet-point dumps unless she asks
- Match her style: short sentences, knowing asides, a little dry humour
- Speak about candidates as colleagues with reputations, not as data records

If she asks about a candidate you have no information on, say so plainly and ask what she knows. Never invent placements, ratings, or signals.`;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    candidateId?: string;
  };

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'messages required' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  // If she's asking about a specific candidate, hydrate their record into
  // the user turn so Claude has the facts in front of it.
  let candidateContext = '';
  if (body.candidateId) {
    const sb = supabaseServer();
    const { data } = await sb
      .from('candidates')
      .select(
        'name, current_title, current_hotel, location, languages, belinda_tier, belinda_rating, quote, availability',
      )
      .eq('id', body.candidateId)
      .maybeSingle();
    if (data) {
      candidateContext = `\n\n[Context — the candidate Belinda is asking about:\n${JSON.stringify(data, null, 2)}\n]`;
    }
  }

  // Append candidate context to the most recent user message, if any.
  const tail = messages[messages.length - 1];
  const tailWithCtx =
    candidateContext && tail.role === 'user'
      ? { ...tail, content: tail.content + candidateContext }
      : tail;
  const messagesForApi = [...messages.slice(0, -1), tailWithCtx];

  const stream = await anthropic().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    output_config: { effort: 'low' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: messagesForApi,
  });

  // Pipe text deltas to the client as a plain text stream — simpler than SSE
  // for the React side, which just appends to a buffer.
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      stream.on('text', (delta) => {
        controller.enqueue(encoder.encode(delta));
      });
      stream.on('error', (err) => {
        controller.enqueue(
          encoder.encode(`\n[stream error: ${err.message}]\n`),
        );
        controller.close();
      });
      stream.on('end', () => controller.close());
    },
  });

  return new Response(readable, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
    },
  });
}
