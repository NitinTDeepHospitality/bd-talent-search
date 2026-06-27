-- Phase 5a: interim brief flag + candidate watchlist.
--
-- Driven by Belinda's demo session:
--  - She had a live interim GM brief in Hong Kong (~1 year, 18k+, family
--    package, luxury). Interim work has different urgency, comp shape, and
--    candidate pool than permanent — surfaced as its own marker on briefs.
--  - She validated the "golden list" idea — 15–100 candidates she watches
--    closely, separate from her curation tier (Black Book / Inner circle /
--    Watching). Adding is_watched lets us build a Watchlist screen now and
--    plug LinkedIn change-detection into the same flag later.

begin;

-- Briefs: interim engagement marker + free-form duration string. We keep
-- duration as text rather than an int_months column because Belinda's
-- phrasing is conversational ("12 months", "1 year+", "~18 months").
alter table briefs add column if not exists is_interim boolean default false;
alter table briefs add column if not exists interim_duration text;

-- Candidates: watch flag. Partial index because watched is a small
-- minority of all candidates — keeps the Watchlist query fast even at
-- thousands of contacts.
alter table candidates add column if not exists is_watched boolean default false;
create index if not exists idx_candidates_watched
  on candidates (is_watched) where is_watched = true;

commit;
