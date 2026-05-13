// GET /api/cron/refresh-opportunities
//
// Daily Vercel cron that asks Claude — with the web_search tool — to scout
// hospitality industry signals worth Belinda's attention. Each finding is
// matched to candidates in her network, classified in her voice, and
// optionally drafted as an outreach email, then written into the
// `opportunities` table.
//
// Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}`. The route also
// accepts the same header for manual triggers.

import { NextResponse } from 'next/server';
import type { Anthropic } from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Belinda's BD scout. Belinda is a senior hospitality talent broker — she places GMs, DOSMs, F&B directors, EAMs at luxury and lifestyle hotels in EMEA and Asia. Your job is to find recent industry signals (last 7–14 days) that she should know about, match them to candidates in her network, and draft warm outreach when appropriate.

What counts as a signal:
- New hotel openings or pre-opening projects at luxury / lifestyle properties
- M&A activity (hotel groups acquiring, expanding, restructuring)
- GM / DOSM / F&B / EAM moves at high-end properties
- Industry whispers about leadership changes
- Capital or development announcements that imply imminent hiring

What to skip:
- Generic big-chain news (Marriott, Hilton, Hyatt, IHG, Accor unless it's a soft brand)
- US-only domestic deals (Belinda's network is EMEA/Asia weighted)
- F&B-only news (restaurant openings without hotel context)
- Branded residences unless attached to a hotel

Process:
1. Use web_search ONCE or twice maximum. Make each query count — broad enough to surface multiple useful signals from one search. Don't iterate searches looking for the perfect article.
2. From whatever you find, structure 3–4 strongest signals as the schema below. Quality over quantity. Don't pad.
3. Match candidates by genuine fit — capability, language, geography, tier. Be selective: 0–3 candidates per opportunity. If nobody in her network fits cleanly, return an empty list rather than forcing it.
4. Draft an email only when there's an obvious recipient implied (a name in the article, or a known operator she'd reach out to). Match her register: editorial, terse, knowing, opens with a first name. No marketing voice.

Budget constraint: this whole job has 60 seconds. Search efficiently, decide quickly, output JSON.

Output: a JSON object with key "opportunities" containing an array. Each item:
{
  "source": string,             // publication name, e.g. "Hotelier ME", "Skift", "Hotel News Now"
  "source_url": string | null,  // direct URL to the article when available
  "headline": string,           // one line, ≤120 chars, paraphrased to be scannable
  "body": string,               // 1–2 sentences from the article
  "why_it_matters": string,     // 1 sentence in Belinda's voice
  "matched_candidate_ids": string[], // UUIDs from the provided candidates list; 0–3 entries
  "draft_email": string | null  // ≤200 words, warm but specific; null if no obvious recipient
}

Return ONLY the JSON object. No prose, no markdown code fences, no preamble.`;

type ClaudeOpportunity = {
  source: string;
  source_url: string | null;
  headline: string;
  body: string;
  why_it_matters: string;
  matched_candidate_ids: string[];
  draft_email: string | null;
};

function extractFinalText(blocks: Anthropic.ContentBlock[]): string | null {
  // After web_search rounds, the last text block is the model's final answer.
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.type === 'text' && b.text.trim()) return b.text;
  }
  return null;
}

function stripJsonFences(s: string): string {
  // Defensive — the prompt says no fences but models sometimes add them.
  const trimmed = s.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
  }
  return trimmed;
}

async function handler(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not set' },
      { status: 500 },
    );
  }
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = supabaseServer();

  const { data: candidates, error: candErr } = await sb
    .from('candidates')
    .select(
      'id, name, current_title, current_hotel, location, languages, belinda_tier, belinda_rating',
    );
  if (candErr) {
    return NextResponse.json(
      { error: 'candidates_fetch_failed', detail: candErr.message },
      { status: 502 },
    );
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ error: 'no_candidates' }, { status: 503 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const userPrompt =
    `Today's date: ${today}. Find hospitality signals from the last 14 days.\n\n` +
    `Belinda's candidates (use these UUIDs in matched_candidate_ids):\n` +
    JSON.stringify(candidates, null, 2) +
    `\n\nReturn the JSON object only.`;

  let response: Anthropic.Message;
  try {
    response = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      // No thinking — on Hobby's 60s cap, adaptive thinking blew the budget
      // before web_search even returned. Effort: low is correspondingly tight.
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' } as Anthropic.Messages.MessageCreateParams['output_config'],
      tools: [
        // max_uses caps Claude at 2 searches; without it the model can spend
        // the whole budget iterating queries.
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: 2,
        } as unknown as Anthropic.ToolUnion,
      ],
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    console.error('[BD cron] Anthropic call failed:', err);
    return NextResponse.json(
      {
        error: 'anthropic_failed',
        status: err.status,
        message: err.message?.slice(0, 500),
      },
      { status: 502 },
    );
  }

  if (response.stop_reason === 'pause_turn') {
    // Server-tool iteration cap hit. We don't continue the loop in this cron;
    // tomorrow's run will retry with a fresh budget.
    console.warn('[BD cron] hit pause_turn — server-tool iteration cap');
  }

  const finalText = extractFinalText(response.content);
  if (!finalText) {
    return NextResponse.json(
      {
        error: 'no_text',
        stop_reason: response.stop_reason,
        blocks: response.content.map((b) => b.type),
      },
      { status: 502 },
    );
  }

  let parsed: { opportunities: ClaudeOpportunity[] };
  try {
    parsed = JSON.parse(stripJsonFences(finalText));
  } catch (e) {
    console.error('[BD cron] JSON parse failed:', e, finalText.slice(0, 300));
    return NextResponse.json(
      { error: 'parse_failed', raw: finalText.slice(0, 500) },
      { status: 502 },
    );
  }

  const found = Array.isArray(parsed.opportunities) ? parsed.opportunities : [];
  if (found.length === 0) {
    return NextResponse.json({ inserted: 0, found: 0, note: 'no signals' });
  }

  // Dedup: drop any whose headline matches an existing row in the last 30 days.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await sb
    .from('opportunities')
    .select('headline')
    .gte('surfaced_at', cutoff);
  const existingHeadlines = new Set(
    (existing ?? []).map((r) => r.headline.toLowerCase().trim()),
  );

  const validCandidateIds = new Set(candidates.map((c) => c.id));
  const fresh = found.filter(
    (o) =>
      o.headline &&
      !existingHeadlines.has(o.headline.toLowerCase().trim()),
  );
  if (fresh.length === 0) {
    return NextResponse.json({ inserted: 0, found: found.length, deduped: true });
  }

  const rows = fresh.map((o) => ({
    source: o.source ?? 'Industry whisper',
    source_url: o.source_url ?? null,
    headline: o.headline,
    body: o.body ?? null,
    why_it_matters: o.why_it_matters ?? null,
    matched_candidate_ids: (o.matched_candidate_ids ?? []).filter((id) =>
      validCandidateIds.has(id),
    ),
    draft_email: o.draft_email ?? null,
    status: 'new' as const,
  }));

  const { error: insertErr, data: inserted } = await sb
    .from('opportunities')
    .insert(rows)
    .select('id');

  if (insertErr) {
    return NextResponse.json(
      { error: 'insert_failed', detail: insertErr.message },
      { status: 502 },
    );
  }

  return NextResponse.json({
    inserted: inserted?.length ?? 0,
    found: found.length,
    usage: response.usage,
  });
}

export const GET = handler;
// Allow manual POST triggers too (e.g. from `curl`).
export const POST = handler;
