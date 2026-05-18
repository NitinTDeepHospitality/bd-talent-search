// POST /api/clients — insert a company (Belinda's client) + optional
// briefs + optional contacts. Mirrors the shape of /api/extract-client
// output, optionally edited by Belinda in the review step.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

type IncomingBrief = {
  role?: string;
  hotel_name?: string | null;
  city?: string | null;
  opening_date?: string | null;
};

type IncomingContact = {
  name?: string;
  role?: string | null;
};

type IncomingBody = {
  name?: string | null;
  type?:
    | 'third_party_operator'
    | 'luxury_collection'
    | 'family_office'
    | 'developer'
    | 'big_chain'
    | null;
  status?: 'active' | 'dormant' | null;
  hq_city?: string | null;
  last_contact_at?: string | null;
  notes?: string | null;
  briefs?: IncomingBrief[];
  contacts?: IncomingContact[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as IncomingBody;

  if (!body.name || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  if (!body.type) {
    return NextResponse.json({ error: 'type required' }, { status: 400 });
  }

  const sb = supabaseServer();

  const { data: companyRow, error: insertErr } = await sb
    .from('companies')
    .insert({
      name: body.name.trim(),
      type: body.type,
      status: body.status ?? 'active',
      hq_city: body.hq_city ?? null,
      last_contact_at: body.last_contact_at ?? null,
      notes: body.notes ?? null,
    })
    .select('id')
    .single();

  if (insertErr || !companyRow) {
    return NextResponse.json(
      { error: 'insert_failed', detail: insertErr?.message },
      { status: 502 },
    );
  }

  const companyId = companyRow.id;

  // Briefs: each row gets the company_id.
  const briefs = (body.briefs ?? []).filter(
    (b): b is IncomingBrief & { role: string } =>
      typeof b.role === 'string' && b.role.trim().length > 0,
  );
  let briefIds: string[] = [];
  if (briefs.length > 0) {
    const rows = briefs.map((b) => ({
      company_id: companyId,
      role: b.role.trim(),
      hotel_name: b.hotel_name ?? null,
      city: b.city ?? null,
      opening_date: b.opening_date ?? null,
      status: 'open' as const,
    }));
    const { data: inserted, error: briefErr } = await sb
      .from('briefs')
      .insert(rows)
      .select('id');
    if (briefErr) {
      console.error('[BD clients] briefs insert failed:', briefErr.message);
    } else {
      briefIds = (inserted ?? []).map((r) => r.id);
    }
  }

  // Contacts: each row gets the company_id.
  const contacts = (body.contacts ?? []).filter(
    (c): c is IncomingContact & { name: string } =>
      typeof c.name === 'string' && c.name.trim().length > 0,
  );
  if (contacts.length > 0) {
    const rows = contacts.map((c) => ({
      company_id: companyId,
      name: c.name.trim(),
      role: c.role ?? null,
    }));
    const { error: contactErr } = await sb.from('contacts').insert(rows);
    if (contactErr) {
      console.error('[BD clients] contacts insert failed:', contactErr.message);
    }
  }

  return NextResponse.json({
    id: companyId,
    name: body.name,
    brief_ids: briefIds,
  });
}
