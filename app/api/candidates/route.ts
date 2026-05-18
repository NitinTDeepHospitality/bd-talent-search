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
  current_location?: string | null;
  open_to_locations?: string[];
  nationalities?: string[];
  languages?: string[];
  last_job_change_date?: string | null;
  last_contact_at?: string | null;
  move_readiness?: 'ready' | 'passive' | 'settled' | null;
  family_travels?: boolean | null;
  child_education_required?: boolean | null;
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

// Empty strings come back from the form when a field is left blank, and
// also from Claude when it can't fill a scalar (the Anthropic 16-union cap
// forces us to use plain `string` instead of nullable). Postgres `date`
// and `integer` columns reject "", so normalise to null before insert.
const blankToNull = (v: string | null | undefined): string | null => {
  if (v == null) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};
const zeroToNull = (v: number | null | undefined): number | null => {
  if (v == null || v === 0 || Number.isNaN(v)) return null;
  return v;
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
      age: zeroToNull(body.age),
      current_title: blankToNull(body.current_title),
      current_hotel: blankToNull(body.current_hotel),
      tenure: blankToNull(body.tenure),
      // Keep legacy `location` populated for backward-compat with screens
      // that still read it (DetailScreen, OpportunityCard match labels).
      location: blankToNull(body.current_location),
      current_location: blankToNull(body.current_location),
      open_to_locations: body.open_to_locations ?? [],
      nationalities: body.nationalities ?? [],
      languages: body.languages ?? [],
      last_job_change_date: blankToNull(body.last_job_change_date),
      last_contact_at: blankToNull(body.last_contact_at),
      move_readiness: body.move_readiness ?? null,
      family_travels: body.family_travels ?? null,
      child_education_required: body.child_education_required ?? null,
      belinda_tier: body.belinda_tier ?? null,
      belinda_rating: zeroToNull(body.belinda_rating),
      availability: blankToNull(body.availability),
      quote: blankToNull(body.quote),
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
