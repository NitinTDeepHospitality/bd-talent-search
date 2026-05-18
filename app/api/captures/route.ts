// POST /api/captures — persist a voice-memo capture after Belinda reviews
// and confirms. Writes one row to `captures` (with the transcript and the
// raw structured extractions in JSONB) plus one row per todo into `todos`.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

type IncomingTodo = {
  label?: string;
  due_hint?: string | null;
  due_at?: string | null;
};

type IncomingBody = {
  transcript?: string;
  extracted?: Array<{
    type: 'brief' | 'contact' | 'tag' | 'opportunity';
    label: string;
    detail?: string;
  }>;
  highlights?: string[];
  todos?: IncomingTodo[];
};

/**
 * Cheap heuristic to turn Claude's free-form `due_hint` ("Thursday",
 * "this week", "before the holidays") into a real timestamp where
 * possible. Returns null when nothing parses cleanly.
 */
function dueHintToDate(hint: string | null | undefined): string | null {
  if (!hint) return null;
  const h = hint.toLowerCase().trim();
  const now = new Date();

  if (/today|asap|now/.test(h)) {
    return now.toISOString();
  }
  if (/tomorrow/.test(h)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  if (/this week|by friday|end of week/.test(h)) {
    const d = new Date(now);
    const day = d.getDay(); // 0 = Sunday
    const friday = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + friday);
    return d.toISOString();
  }
  if (/next week/.test(h)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d.toISOString();
  }
  // Weekday names — schedule to the next occurrence
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < weekdays.length; i++) {
    if (new RegExp(`\\b${weekdays[i]}\\b`).test(h)) {
      const d = new Date(now);
      const diff = (i - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString();
    }
  }
  return null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as IncomingBody;
  if (!body.transcript || body.transcript.trim().length === 0) {
    return NextResponse.json({ error: 'transcript required' }, { status: 400 });
  }

  const sb = supabaseServer();

  const { data: captureRow, error: captureErr } = await sb
    .from('captures')
    .insert({
      transcript: body.transcript.trim(),
      structured: {
        extracted: body.extracted ?? [],
        highlights: body.highlights ?? [],
      },
      applied: true,
    })
    .select('id')
    .single();

  if (captureErr || !captureRow) {
    return NextResponse.json(
      { error: 'capture_insert_failed', detail: captureErr?.message },
      { status: 502 },
    );
  }

  const captureId = captureRow.id;

  const todos = (body.todos ?? []).filter(
    (t): t is IncomingTodo & { label: string } =>
      typeof t.label === 'string' && t.label.trim().length > 0,
  );

  let todoIds: string[] = [];
  if (todos.length > 0) {
    const rows = todos.map((t) => ({
      label: t.label.trim(),
      detail: null,
      due_at: t.due_at ?? dueHintToDate(t.due_hint),
      capture_id: captureId,
    }));
    const { data: inserted, error: todoErr } = await sb
      .from('todos')
      .insert(rows)
      .select('id');
    if (todoErr) {
      // Don't roll the capture back — the user can re-add todos if needed.
      console.error('[BD captures] todos insert failed:', todoErr.message);
    } else {
      todoIds = (inserted ?? []).map((r) => r.id);
    }
  }

  return NextResponse.json({ capture_id: captureId, todo_ids: todoIds });
}
