-- Clean slate for Belinda's first real use.
--
-- Wipes every user-data table in the public schema:
--   candidates + cascades (experience, tags, signals, snapshots, changes,
--                          interviews, brief_shortlist)
--   companies (clients) + cascading briefs
--   contacts, hotels
--   captures, todos, voice_queries
--   opportunities, linkedin_imports
--
-- Keeps: schema itself, auth.users (her Microsoft sign-in), seed
-- migrations are NOT re-run (this file does the inverse of 0002).
--
-- TRUNCATE … CASCADE follows every FK in public so any junction tables
-- referencing the listed rows clear automatically. RESTART IDENTITY is a
-- no-op for our UUID PKs but doesn't hurt.
--
-- Safe to re-run — TRUNCATE on empty tables is a cheap no-op.

truncate
  candidates,
  briefs,
  companies,
  contacts,
  hotels,
  captures,
  todos,
  voice_queries,
  linkedin_imports,
  opportunities,
  candidate_linkedin_snapshots,
  candidate_changes
restart identity cascade;
