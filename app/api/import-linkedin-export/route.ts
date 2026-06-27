// POST /api/import-linkedin-export — receive Belinda's LinkedIn
// Connections.csv export, match each row to a candidate in her network,
// diff current_title/current_hotel vs the row, and surface deltas as
// candidate_changes that show up as "MOVED" badges.
//
// Input  : multipart/form-data with `file` = Connections.csv
// Output : { matched, totalRows, changesDetected, importId }
//
// Matching strategy (in order):
//   1. linkedin_url exact (after light normalisation — strip trailing
//      slash, lowercase, strip query string)
//   2. fallback: case-insensitive full-name exact ("Alessandra Marchetti")
//
// Diff:
//   - role_change   if Position differs from candidate.current_title
//   - company_change if Company  differs from candidate.current_hotel
//
// We compare against the CURRENT row (then update it) — so re-uploading
// the same CSV is a no-op the second time. The snapshot table preserves
// history for audit.

import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024; // 20MB — Belinda has ~7K contacts

type ConnectionRow = {
  'First Name'?: string;
  'Last Name'?: string;
  URL?: string;
  'Email Address'?: string;
  Company?: string;
  Position?: string;
  'Connected On'?: string;
};

type DbCandidate = {
  id: string;
  name: string;
  current_title: string | null;
  current_hotel: string | null;
  linkedin_url: string | null;
};

function normaliseLinkedInUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let u = raw.trim().toLowerCase();
  // Strip query string + fragment — they're tracking noise.
  u = u.split('?')[0].split('#')[0];
  // Strip trailing slash.
  if (u.endsWith('/')) u = u.slice(0, -1);
  // Strip protocol so http vs https doesn't matter.
  u = u.replace(/^https?:\/\//, '');
  // Strip leading www.
  u = u.replace(/^www\./, '');
  return u.length > 0 ? u : null;
}

function normaliseName(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function textsEqual(a: string | null, b: string | null): boolean {
  // Light normalisation — formatting differences shouldn't fire a change.
  // "Hotel Manager" vs "hotel manager " should match.
  const norm = (s: string | null): string =>
    (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return norm(a) === norm(b);
}

export async function POST(request: Request) {
  let file: File;
  try {
    const form = await request.formData();
    const f = form.get('file');
    if (!(f instanceof File)) {
      return NextResponse.json({ error: 'file_field_missing' }, { status: 400 });
    }
    file = f;
  } catch {
    return NextResponse.json({ error: 'bad_form_data' }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'empty_file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'file_too_large', max_bytes: MAX_BYTES },
      { status: 413 },
    );
  }

  // LinkedIn's Connections.csv occasionally has a "Notes:" preamble of
  // 2-3 lines before the actual CSV header. Strip until we find a line
  // starting with "First Name,".
  const raw = await file.text();
  const lines = raw.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.startsWith('First Name'));
  const csvText = headerIdx >= 0 ? lines.slice(headerIdx).join('\n') : raw;

  const parsed = Papa.parse<ConnectionRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return NextResponse.json(
      {
        error: 'csv_parse_failed',
        detail: parsed.errors.slice(0, 3).map((e) => e.message),
      },
      { status: 400 },
    );
  }

  const rows = parsed.data.filter(
    (r) => r['First Name'] || r['Last Name'] || r.URL,
  );
  const totalRows = rows.length;

  // Pull every candidate's id + matching keys once. Belinda's network
  // tops out at a few thousand — fine to do in one query.
  const sb = supabaseServer();
  const { data: candidates, error: fetchErr } = await sb
    .from('candidates')
    .select('id, name, current_title, current_hotel, linkedin_url');

  if (fetchErr) {
    return NextResponse.json(
      { error: 'candidates_fetch_failed', detail: fetchErr.message },
      { status: 502 },
    );
  }

  // Index by normalised URL and normalised name for O(1) matching.
  const byUrl = new Map<string, DbCandidate>();
  const byName = new Map<string, DbCandidate>();
  for (const c of candidates as DbCandidate[]) {
    const u = normaliseLinkedInUrl(c.linkedin_url);
    if (u) byUrl.set(u, c);
    byName.set(normaliseName(c.name), c);
  }

  type Update = {
    candidateId: string;
    newTitle: string | null;
    newCompany: string | null;
  };
  type ChangeRow = {
    candidate_id: string;
    type: 'role_change' | 'company_change';
    from_value: string | null;
    to_value: string | null;
    source: 'connections_export';
  };
  type SnapshotRow = {
    candidate_id: string;
    current_title: string | null;
    current_company: string | null;
    source: 'connections_export';
  };

  const updates = new Map<string, Update>(); // dedupe per candidate
  const changes: ChangeRow[] = [];
  const snapshots: SnapshotRow[] = [];
  let matchedRows = 0;

  for (const r of rows) {
    const url = normaliseLinkedInUrl(r.URL ?? null);
    const fullName = normaliseName(
      `${r['First Name'] ?? ''} ${r['Last Name'] ?? ''}`,
    );
    const candidate =
      (url ? byUrl.get(url) : undefined) ?? byName.get(fullName);
    if (!candidate) continue;
    matchedRows++;

    const newTitle = (r.Position ?? '').trim() || null;
    const newCompany = (r.Company ?? '').trim() || null;

    // Title change
    if (newTitle && !textsEqual(candidate.current_title, newTitle)) {
      changes.push({
        candidate_id: candidate.id,
        type: 'role_change',
        from_value: candidate.current_title,
        to_value: newTitle,
        source: 'connections_export',
      });
    }
    // Company change
    if (newCompany && !textsEqual(candidate.current_hotel, newCompany)) {
      changes.push({
        candidate_id: candidate.id,
        type: 'company_change',
        from_value: candidate.current_hotel,
        to_value: newCompany,
        source: 'connections_export',
      });
    }

    // Snapshot every matched candidate (regardless of whether anything
    // changed) so we have a chronological record of what they looked
    // like at each refresh.
    snapshots.push({
      candidate_id: candidate.id,
      current_title: newTitle,
      current_company: newCompany,
      source: 'connections_export',
    });

    // Stage an update only if at least one field actually moved.
    if (
      (newTitle && !textsEqual(candidate.current_title, newTitle)) ||
      (newCompany && !textsEqual(candidate.current_hotel, newCompany))
    ) {
      updates.set(candidate.id, {
        candidateId: candidate.id,
        newTitle: newTitle ?? candidate.current_title,
        newCompany: newCompany ?? candidate.current_hotel,
      });
    }
  }

  // Persist in order: changes → snapshots → candidate updates → import
  // audit row. Each block is non-blocking on the others, but a partial
  // failure logs and continues so we don't lose the import entirely.
  if (changes.length > 0) {
    const { error } = await sb.from('candidate_changes').insert(changes);
    if (error) console.error('[BD import] changes insert failed:', error.message);
  }
  if (snapshots.length > 0) {
    const { error } = await sb
      .from('candidate_linkedin_snapshots')
      .insert(snapshots);
    if (error) console.error('[BD import] snapshots insert failed:', error.message);
  }
  for (const u of updates.values()) {
    const { error } = await sb
      .from('candidates')
      .update({
        current_title: u.newTitle,
        current_hotel: u.newCompany,
      })
      .eq('id', u.candidateId);
    if (error) {
      console.error(
        '[BD import] candidate update failed:',
        u.candidateId,
        error.message,
      );
    }
  }

  const { data: importRow, error: importErr } = await sb
    .from('linkedin_imports')
    .insert({
      filename: file.name,
      total_rows: totalRows,
      matched_rows: matchedRows,
      changes_detected: changes.length,
    })
    .select('id')
    .single();

  if (importErr) {
    console.error('[BD import] import audit row failed:', importErr.message);
  }

  return NextResponse.json({
    importId: importRow?.id ?? null,
    totalRows,
    matchedRows,
    changesDetected: changes.length,
  });
}
