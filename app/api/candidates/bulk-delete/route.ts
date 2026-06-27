// POST /api/candidates/bulk-delete — { ids: string[] }, deletes them
// in one DB call. Schema cascades take care of every joined row
// (experience / tags / signals / snapshots / changes / brief_shortlist /
// interviews) automatically.
//
// Returns { deleted: number } — count actually removed; useful so the
// UI can report "Deleted X of Y" if some IDs were already gone.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 15;

const MAX_PER_CALL = 500; // safety cap — UI won't ever hit this

type IncomingBody = {
  ids?: string[];
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as IncomingBody;
  const rawIds = Array.isArray(body.ids) ? body.ids : [];
  const ids = rawIds
    .filter((id): id is string => typeof id === 'string' && id.length >= 8)
    .slice(0, MAX_PER_CALL);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'no_ids_provided' },
      { status: 400 },
    );
  }

  const sb = supabaseServer();
  const { error, count } = await sb
    .from('candidates')
    .delete({ count: 'exact' })
    .in('id', ids);

  if (error) {
    return NextResponse.json(
      { error: 'delete_failed', detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ deleted: count ?? 0, requested: ids.length });
}
