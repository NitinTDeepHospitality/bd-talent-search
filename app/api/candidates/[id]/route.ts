// PATCH /api/candidates/[id] — partial updates on one candidate.
// v1 only supports toggling is_watched (the Watchlist star). Future
// fields (tier reclassification, last_contact_at bumps, etc.) plug into
// the same allow-list pattern below.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 15;

type IncomingPatch = {
  is_watched?: boolean;
};

// Allow-list of mutable fields. Anything not listed is ignored (defence
// against curious clients sending extra keys).
const ALLOWED_FIELDS = new Set<keyof IncomingPatch>(['is_watched']);

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || id.length < 8) {
    return NextResponse.json({ error: 'bad_id' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as IncomingPatch;

  const patch: Record<string, unknown> = {};
  for (const k of Object.keys(body) as Array<keyof IncomingPatch>) {
    if (ALLOWED_FIELDS.has(k) && body[k] !== undefined) {
      patch[k] = body[k];
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'no_allowed_fields_in_patch' },
      { status: 400 },
    );
  }

  const sb = supabaseServer();
  const { error } = await sb.from('candidates').update(patch).eq('id', id);
  if (error) {
    return NextResponse.json(
      { error: 'update_failed', detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ id, patched: Object.keys(patch) });
}
