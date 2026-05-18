-- Phase 4: scheduled follow-ups stored both locally (so the app can
-- show a "Coming up" view without re-querying Outlook) and as the
-- corresponding Outlook event id (so we can update/cancel later).

alter table candidates
  add column if not exists follow_up_at        timestamptz,
  add column if not exists follow_up_event_id  text;

alter table companies
  add column if not exists follow_up_at        timestamptz,
  add column if not exists follow_up_event_id  text;

create index if not exists candidates_followup_idx on candidates (follow_up_at);
create index if not exists companies_followup_idx  on companies (follow_up_at);
