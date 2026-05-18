-- Belinda asked for richer candidate records (CRM-style). Additive columns
-- on the candidates table; existing rows get NULLs and the AddCandidate
-- voice flow now captures them on new candidates.

alter table candidates
  add column if not exists last_job_change_date date,
  add column if not exists last_contact_at      date,
  -- Free-text rather than an enum so we can iterate on values without
  -- ALTER TYPE migrations. Conventional values: 'ready', 'passive', 'settled'.
  add column if not exists move_readiness       text,
  -- Split from the legacy `location` field (which mixed current + open-to).
  -- We keep `location` for backward-compat with the seed rows; new flows
  -- populate these two.
  add column if not exists current_location     text,
  add column if not exists open_to_locations    text[] default '{}',
  add column if not exists family_travels       boolean,
  add column if not exists child_education_required boolean;

-- 0003_grants.sql already set default privileges for future columns, but
-- be explicit anyway in case the previous default-priv block hasn't been
-- run on this database.
grant select, insert, update on public.candidates to service_role, authenticated;
