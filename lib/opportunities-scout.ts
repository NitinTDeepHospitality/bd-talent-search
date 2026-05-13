// Shared logic for both the daily cron and the user-callable refresh route.
// Asks Claude (with web_search) to find hospitality signals in a given
// region, matches candidates from Supabase, dedups, and inserts rows.

import 'server-only';
import type { Anthropic } from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';
import { supabaseServer } from '@/lib/supabase/server';

export type Region = 'global' | 'europe' | 'middle_east' | 'asia' | 'americas';

const REGION_FOCUS: Record<Region, string> = {
  global:
    "Geographic focus: any luxury/lifestyle hospitality activity worldwide, with a soft preference for EMEA and Asia where Belinda's network is deepest.",
  europe:
    'Geographic focus: Europe ONLY — UK, France, Italy, Spain, Portugal, Greece, Switzerland, Germany, Netherlands, Scandinavia, Austria, Czechia, Hungary, Ireland, Türkiye (European side). Skip anything outside Europe.',
  middle_east:
    'Geographic focus: Middle East and GCC ONLY — Saudi Arabia (Red Sea Project, NEOM, Diriyah, AlUla), UAE, Qatar, Bahrain, Kuwait, Oman, Jordan, Egypt, Morocco. Skip anything outside this region.',
  asia:
    'Geographic focus: Asia-Pacific ONLY — China, Hong Kong, Japan, Korea, Southeast Asia (Thailand, Vietnam, Indonesia, Singapore, Malaysia, Philippines), India, Maldives, Sri Lanka, Australia, New Zealand. Skip anything outside this region.',
  americas:
    'Geographic focus: Americas — United States (luxury/lifestyle only), Mexico, Caribbean, Brazil, Argentina, Chile, Peru, Costa Rica. Big-chain hotels still excluded.',
};

const REGION_LABELS: Record<Region, string> = {
  global: 'Global',
  europe: 'Europe',
  middle_east: 'Middle East',
  asia: 'Asia',
  americas: 'Americas',
};

export const REGIONS: Array<{ id: Region; label: string }> = (
  Object.keys(REGION_LABELS) as Region[]
).map((id) => ({ id, label: REGION_LABELS[id] }));

function buildSystemPrompt(region: Region): string {
  return `You are Belinda's BD scout. Belinda is a senior hospitality talent broker — she places GMs, DOSMs, F&B directors, EAMs at luxury and lifestyle hotels. Your job is to find recent industry signals (last 7–14 days) that she should know about, match them to candidates in her network, and draft warm outreach when appropriate.

What counts as a signal:
- New hotel openings or pre-opening projects at luxury / lifestyle properties
- M&A activity (hotel groups acquiring, expanding, restructuring)
- GM / DOSM / F&B / EAM moves at high-end properties
- Industry whispers about leadership changes
- Capital or development announcements that imply imminent hiring

${REGION_FOCUS[region]}

What to skip:
- Generic big-chain news (Marriott, Hilton, Hyatt, IHG, Accor unless it's a soft brand)
- F&B-only news (restaurant openings without hotel context)
- Branded residences unless attached to a hotel

Process:
1. Use web_search ONCE or twice maximum. Make each query count — broad enough to surface multiple useful signals from one search.
2. From whatever you find, structure 3–4 strongest signals. Quality over quantity.
3. Match candidates by genuine fit — capability, language, geography, tier. Be selective: 0–3 candidates per opportunity.
4. Draft an email only when there's an obvious recipient implied. Match her register: editorial, terse, knowing, opens with a first name.

Budget constraint: this whole job has 60 seconds. Search efficiently, output JSON.

Output: a JSON object with key "opportunities" containing an array. Each item:
{
  "source": string,
  "source_url": string | null,
  "headline": string,
  "body": string,
  "why_it_matters": string,
  "matched_candidate_ids": string[],
  "draft_email": string | null
}

Return ONLY the JSON object. No prose, no markdown code fences, no preamble.`;
}

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
  let lastToolIdx = -1;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const t = blocks[i].type;
    if (
      t === 'web_search_tool_result' ||
      t === 'tool_use' ||
      t === 'server_tool_use'
    ) {
      lastToolIdx = i;
      break;
    }
  }
  const tail = blocks
    .slice(lastToolIdx + 1)
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return tail.trim() || null;
}

function extractJsonObject(s: string): string {
  let t = s.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\n?/, '').replace(/```\s*$/, '').trim();
  }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return t;
  return t.slice(start, end + 1);
}

export type ScoutResult =
  | {
      ok: true;
      inserted: number;
      found: number;
      region: Region;
      deduped?: boolean;
      note?: string;
      usage?: Anthropic.Message['usage'];
    }
  | {
      ok: false;
      error: string;
      status: number;
      detail?: unknown;
    };

export async function scoutOpportunities(opts: {
  region?: Region;
}): Promise<ScoutResult> {
  const region: Region = opts.region ?? 'global';
  const sb = supabaseServer();

  const { data: candidates, error: candErr } = await sb
    .from('candidates')
    .select(
      'id, name, current_title, current_hotel, location, languages, belinda_tier, belinda_rating',
    );
  if (candErr) {
    return {
      ok: false,
      error: 'candidates_fetch_failed',
      status: 502,
      detail: candErr.message,
    };
  }
  if (!candidates || candidates.length === 0) {
    return { ok: false, error: 'no_candidates', status: 503 };
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
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' } as Anthropic.Messages.MessageCreateParams['output_config'],
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: 2,
        } as unknown as Anthropic.ToolUnion,
      ],
      system: buildSystemPrompt(region),
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    console.error('[BD scout] Anthropic call failed:', err);
    return {
      ok: false,
      error: 'anthropic_failed',
      status: 502,
      detail: { status: err.status, message: err.message?.slice(0, 500) },
    };
  }

  const finalText = extractFinalText(response.content);
  if (!finalText) {
    return {
      ok: false,
      error: 'no_text',
      status: 502,
      detail: {
        stop_reason: response.stop_reason,
        blocks: response.content.map((b) => b.type),
      },
    };
  }

  let parsed: { opportunities: ClaudeOpportunity[] };
  try {
    parsed = JSON.parse(extractJsonObject(finalText));
  } catch (e) {
    console.error('[BD scout] JSON parse failed:', e, finalText.slice(0, 300));
    return {
      ok: false,
      error: 'parse_failed',
      status: 502,
      detail: {
        stop_reason: response.stop_reason,
        text_length: finalText.length,
        head: finalText.slice(0, 200),
        tail: finalText.slice(-300),
      },
    };
  }

  const found = Array.isArray(parsed.opportunities) ? parsed.opportunities : [];
  if (found.length === 0) {
    return { ok: true, inserted: 0, found: 0, region, note: 'no signals' };
  }

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
    (o) => o.headline && !existingHeadlines.has(o.headline.toLowerCase().trim()),
  );
  if (fresh.length === 0) {
    return {
      ok: true,
      inserted: 0,
      found: found.length,
      region,
      deduped: true,
    };
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
    return {
      ok: false,
      error: 'insert_failed',
      status: 502,
      detail: insertErr.message,
    };
  }

  return {
    ok: true,
    inserted: inserted?.length ?? 0,
    found: found.length,
    region,
    usage: response.usage,
  };
}
