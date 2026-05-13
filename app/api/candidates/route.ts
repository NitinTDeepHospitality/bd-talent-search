// POST /api/candidates — insert one candidate (plus their signals + tags)
// into Belinda's network. Body is the structured shape returned by
// /api/extract-candidate, optionally edited by the user in the review step.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

type IncomingSignal = string | null | undefined;
type IncomingBody = {
  name?: string | null;
  age?: number | null;
  current_title?: string | null;
  current_hotel?: string | null;
  tenure?: string | null;
  location?: string | null;
  nationalities?: string[];
  languages?: string[];
  belinda_tier?: 'black_book' | 'inner_circle' | 'watching' | null;
  belinda_rating?: number | null;
  availability?: string | null;
  quote?: string | null;
  signals?: {
    word_on_street?: IncomingSignal;
    chemistry?: IncomingSignal;
    trajectory?: IncomingSignal;
    gut_note?: IncomingSignal;
  };
  tags?: string[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as IncomingBody;

  if (!body.name || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: 'name required' },
      { status: 400 },
    );
  }

  const sb = supabaseServer();

  // Insert the candidate row first; we need the generated UUID for the
  // signals + tags joins below.
  const { data: candidateRow, error: insertErr } = await sb
    .from('candidates')
    .insert({
      name: body.name.trim(),
      age: body.age ?? null,
      current_title: body.current_title ?? null,
      current_hotel: body.current_hotel ?? null,
      tenure: body.tenure ?? null,
      location: body.location ?? null,
      nationalities: body.nationalities ?? [],
      languages: body.languages ?? [],
      belinda_tier: body.belinda_tier ?? null,
      belinda_rating: body.belinda_rating ?? null,
      availability: body.availability ?? null,
      quote: body.quote ?? null,
      consent_status: 'unknown' as const,
    })
    .select('id')
    .single();

  if (insertErr || !candidateRow) {
    return NextResponse.json(
      { error: 'insert_failed', detail: insertErr?.message },
      { status: 502 },
    );
  }

  const candidateId = candidateRow.id;

  // Signals (one row per non-null signal type).
  const signalRows: Array<{
    candidate_id: string;
    type: string;
    note: string;
  }> = [];
  const s = body.signals ?? {};
  if (s.word_on_street) signalRows.push({ candidate_id: candidateId, type: 'word_on_street', note: s.word_on_street });
  if (s.chemistry) signalRows.push({ candidate_id: candidateId, type: 'chemistry', note: s.chemistry });
  if (s.trajectory) signalRows.push({ candidate_id: candidateId, type: 'trajectory', note: s.trajectory });
  if (s.gut_note) signalRows.push({ candidate_id: candidateId, type: 'gut_note', note: s.gut_note });

  if (signalRows.length > 0) {
    const { error: signalErr } = await sb
      .from('candidate_signals')
      .insert(signalRows);
    if (signalErr) {
      // Don't roll back — the candidate is in. Just flag it.
      console.error('[BD candidates] signals insert failed:', signalErr.message);
    }
  }

  // Tags — stored as polymorphic axis/value rows. Default the axis to "shape"
  // (a free-form bucket) since the memo doesn't give us axis information.
  const tags = (body.tags ?? []).filter((t) => t && t.trim());
  if (tags.length > 0) {
    const tagRows = tags.map((value) => ({
      candidate_id: candidateId,
      axis: 'shape' as const,
      value: value.trim(),
      source: 'belinda' as const,
    }));
    const { error: tagErr } = await sb.from('candidate_tags').insert(tagRows);
    if (tagErr) {
      console.error('[BD candidates] tags insert failed:', tagErr.message);
    }
  }

  return NextResponse.json({ id: candidateId, name: body.name });
}
