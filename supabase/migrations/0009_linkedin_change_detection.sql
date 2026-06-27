-- Phase 5b: LinkedIn change detection via Connections.csv import.
--
-- Why CSV import instead of an API: Proxycurl shut down (LinkedIn
-- lawsuit, Jan 2026). The official LinkedIn Recruiter API is $900+/mo
-- per seat plus partnership approval. The clean, legally-bulletproof,
-- free path is LinkedIn's own Connections export — Belinda requests
-- "Get a copy of your data" from her LinkedIn settings, gets a ZIP by
-- email ~24h later, uploads Connections.csv into BD Talent. We diff and
-- surface what moved.

begin;

-- Snapshots: what a candidate looked like at each refresh. Stored
-- separately from candidates so we can replay history and audit when
-- a title actually changed (without losing the prior value).
create table if not exists candidate_linkedin_snapshots (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid references candidates(id) on delete cascade,
  fetched_at      timestamptz default now(),
  current_title   text,
  current_company text,
  source          text default 'connections_export'
);
create index if not exists idx_snapshots_candidate_fetched
  on candidate_linkedin_snapshots (candidate_id, fetched_at desc);

-- Changes: the deltas Belinda actually sees. One row per detected
-- change. acknowledged_at = null means the MOVED badge is showing.
create table if not exists candidate_changes (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid references candidates(id) on delete cascade,
  type            text not null check (type in ('role_change','company_change')),
  from_value      text,
  to_value        text,
  detected_at     timestamptz default now(),
  source          text default 'connections_export',
  acknowledged_at timestamptz
);
create index if not exists idx_changes_unacked
  on candidate_changes (candidate_id) where acknowledged_at is null;
create index if not exists idx_changes_detected
  on candidate_changes (detected_at desc);

-- Imports: audit + recency. Lets us tell Belinda "Last refresh 3 days
-- ago — 47 of 6,842 connections matched watched candidates, 8 changes
-- detected".
create table if not exists linkedin_imports (
  id                uuid primary key default gen_random_uuid(),
  imported_at       timestamptz default now(),
  filename          text,
  total_rows        int,
  matched_rows      int,
  changes_detected  int,
  notes             text
);
create index if not exists idx_imports_recent
  on linkedin_imports (imported_at desc);

-- Permissive RLS to match the rest of the schema (gated by middleware
-- at the route level until proper per-user auth lands).
alter table candidate_linkedin_snapshots enable row level security;
alter table candidate_changes enable row level security;
alter table linkedin_imports enable row level security;

do $$
begin
  -- Drop policies if they already exist so this migration is re-runnable
  -- during dev. In production we'd never replay a migration.
  drop policy if exists "auth read snapshots"  on candidate_linkedin_snapshots;
  drop policy if exists "auth write snapshots" on candidate_linkedin_snapshots;
  drop policy if exists "auth read changes"    on candidate_changes;
  drop policy if exists "auth write changes"   on candidate_changes;
  drop policy if exists "auth read imports"    on linkedin_imports;
  drop policy if exists "auth write imports"   on linkedin_imports;

  create policy "auth read snapshots"  on candidate_linkedin_snapshots for select to authenticated using (true);
  create policy "auth write snapshots" on candidate_linkedin_snapshots for all    to authenticated using (true) with check (true);
  create policy "auth read changes"    on candidate_changes            for select to authenticated using (true);
  create policy "auth write changes"   on candidate_changes            for all    to authenticated using (true) with check (true);
  create policy "auth read imports"    on linkedin_imports             for select to authenticated using (true);
  create policy "auth write imports"   on linkedin_imports             for all    to authenticated using (true) with check (true);
end $$;

commit;
