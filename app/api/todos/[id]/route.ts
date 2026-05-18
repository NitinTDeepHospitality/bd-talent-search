// PATCH /api/todos/[id] — toggle a todo's completion state.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { completed?: boolean };
  const completed = Boolean(body.completed);

  const sb = supabaseServer();
  const { error } = await sb
    .from('todos')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: 'update_failed', detail: error.message },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
