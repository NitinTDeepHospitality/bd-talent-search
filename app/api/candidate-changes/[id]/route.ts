// PATCH /api/candidate-changes/[id] — mark a detected change as seen
// (clears the MOVED badge). Body: { acknowledged: true | false }.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 15;

type IncomingPatch = {
  acknowledged?: boolean;
};

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || id.length < 8) {
    return NextResponse.json({ error: 'bad_id' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as IncomingPatch;
  if (body.acknowledged === undefined) {
    return NextResponse.json({ error: 'acknowledged_required' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { error } = await sb
    .from('candidate_changes')
    .update({
      acknowledged_at: body.acknowledged ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) {
    return NextResponse.json(
      { error: 'update_failed', detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ id, acknowledged: body.acknowledged });
}
