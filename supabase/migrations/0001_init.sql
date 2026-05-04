-- BD Talent Search — initial schema
-- Run this in Supabase: SQL Editor → New query → paste → Run

-- ─── Reset public schema (safe on a fresh project) ──────────────────────
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant create on schema public to authenticated, service_role;

-- ─── Extensions ──────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";    -- gen_random_uuid()
create extension if not exists "vector";      -- pgvector for embeddings

-- ─── Enums ───────────────────────────────────────────────────────────────
create type company_type as enum (
  'third_party_operator',   -- Aimbridge, Highgate, Coury…
  'luxury_collection',      -- Faena, Kempinski, Rosewood…
  'family_office',          -- private capital buying hotels
  'developer',              -- pre-opening project
  'big_chain'               -- Marriott, Hilton — usually NOT a target
);

create type talent_tier as enum ('lifestyle', 'luxury', 'premium', 'select');
create type expertise as enum ('commercial', 'fnb', 'sales', 'marketing', 'innovation', 'operations', 'pre_opening');
create type belinda_tier as enum ('black_book', 'inner_circle', 'watching');
create type signal_type as enum ('word_on_street', 'chemistry', 'trajectory', 'gut_note', 'shape_area', 'leadership');
create type signal_source as enum ('meeting', 'interview', 'hearsay', 'note');
create type consent_status as enum ('unknown', 'opted_in', 'opted_out');
create type opp_status as enum ('new', 'reviewed', 'sent', 'archived');

-- ─── Companies (target operators) ────────────────────────────────────────
create table companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         company_type not null,
  no_internal_ta boolean default true,    -- true = good target
  hq_city      text,
  notes        text,
  created_at   timestamptz default now()
);
create index on companies (type, no_internal_ta);

-- ─── Hotels (properties tied to companies) ───────────────────────────────
create table hotels (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references companies(id) on delete set null,
  name         text not null,
  city         text,
  country      text,
  keys         int,
  tier         talent_tier,
  status       text,                       -- 'open' | 'pre_opening' | 'closed'
  created_at   timestamptz default now()
);

-- ─── Contacts (people at companies — owners, asset mgrs, GMs to know) ───
create table contacts (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references companies(id) on delete set null,
  name         text not null,
  role         text,
  email        text,
  linkedin_url text,
  last_contact_at date,
  notes        text,
  created_at   timestamptz default now()
);

-- ─── Candidates (the talent Belinda places) ──────────────────────────────
create table candidates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  age             int,
  current_company_id uuid references companies(id) on delete set null,
  current_title   text,                       -- 'General Manager', 'Hotel Manager' etc.
  current_hotel   text,
  tenure          text,
  location        text,
  photo_url       text,
  linkedin_url    text,
  nationalities   text[] default '{}',
  languages       text[] default '{}',
  pnl             text,
  keys            int,
  belinda_rating  numeric(3,1),
  belinda_tier    belinda_tier,
  quote           text,
  availability    text,
  consent_status  consent_status default 'unknown',
  consent_date    date,
  consent_source  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index on candidates (belinda_tier);
create index on candidates (current_company_id);

-- ─── Career history (one row per past role) ──────────────────────────────
create table candidate_experience (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  brand        text not null,
  role         text,
  years        text,
  ord          int default 0
);
create index on candidate_experience (candidate_id, ord);

-- ─── Tags (taxonomy applied to candidates) ───────────────────────────────
-- Stored as polymorphic key/value so we can grow the taxonomy without DDL.
create table candidate_tags (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  axis         text not null,    -- 'expertise' | 'tier' | 'language' | 'geo' | 'shape'
  value        text not null,
  source       text default 'auto',  -- 'auto' | 'belinda' | 'imported'
  confidence   numeric(3,2) default 1.0,
  created_at   timestamptz default now(),
  unique(candidate_id, axis, value)
);
create index on candidate_tags (axis, value);

-- ─── Signals (Belinda's notes per candidate) ─────────────────────────────
create table candidate_signals (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  type         signal_type not null,
  note         text not null,
  source       signal_source default 'note',
  confidence   numeric(3,2) default 1.0,
  created_at   timestamptz default now()
);
create index on candidate_signals (candidate_id, type);

-- ─── Briefs (open roles Belinda is filling) ──────────────────────────────
create table briefs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references companies(id) on delete set null,
  hotel_id      uuid references hotels(id) on delete set null,
  hotel_name    text,                         -- denormalised for quick display
  role          text not null,                -- 'General Manager' etc.
  city          text,
  opening_date  text,
  comp          text,
  requirements_text text,
  status        text default 'open',          -- 'open' | 'shortlisted' | 'placed' | 'closed'
  owner_name    text,                         -- the hiring contact
  owner_temperament text,                     -- the 'CEO is financially sharp' kind of note
  created_at    timestamptz default now()
);

-- Many-to-many: which candidates are shortlisted against which briefs
create table brief_shortlist (
  brief_id     uuid references briefs(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete cascade,
  score        numeric(4,1),
  reasoning    text,
  added_at     timestamptz default now(),
  primary key (brief_id, candidate_id)
);

-- ─── Captures (post-meeting voice memos -> structured) ──────────────────
create table captures (
  id            uuid primary key default gen_random_uuid(),
  audio_url     text,
  transcript    text,
  structured    jsonb,                       -- briefs/contacts/tags extracted by Claude
  applied       boolean default false,        -- did we save the extractions?
  created_at    timestamptz default now()
);

-- ─── Interviews (recorded candidate conversations) ──────────────────────
create table interviews (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid references candidates(id) on delete cascade,
  brief_id      uuid references briefs(id) on delete set null,
  audio_url     text,
  transcript    text,
  structured_signals jsonb,                  -- signals Claude pulled from transcript
  consent_confirmed boolean default false,
  recorded_at   timestamptz default now()
);

-- ─── Opportunities (BD prompts from scraped news / industry signals) ────
create table opportunities (
  id            uuid primary key default gen_random_uuid(),
  source        text,                         -- 'Hotelier ME' | 'Skift' | 'Industry whisper'
  source_url    text,
  headline      text not null,
  body          text,
  why_it_matters text,                        -- Claude's classification
  matched_candidate_ids uuid[] default '{}',
  matched_contact_id uuid references contacts(id) on delete set null,
  draft_email   text,
  status        opp_status default 'new',
  surfaced_at   timestamptz default now()
);

-- ─── Voice queries (history of what Belinda asked the app) ──────────────
create table voice_queries (
  id            uuid primary key default gen_random_uuid(),
  spoken_text   text not null,
  parsed_filters jsonb,
  result_candidate_ids uuid[] default '{}',
  reasoning     text,
  created_at    timestamptz default now()
);

-- ─── Embeddings (one row per source for RAG) ────────────────────────────
-- text-embedding-3-small from OpenAI = 1536 dims. Change if model changes.
create table embeddings (
  id            uuid primary key default gen_random_uuid(),
  source_table  text not null,                -- 'candidates' | 'candidate_signals' | 'interviews' | 'captures'
  source_id     uuid not null,
  chunk_text    text not null,
  embedding     vector(1536),
  created_at    timestamptz default now()
);
create index on embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on embeddings (source_table, source_id);

-- ─── Row Level Security ──────────────────────────────────────────────────
-- Tighten once we add auth. For now: anyone authenticated can read/write.
-- The publishable key in the browser is rate-limited and has no rights
-- without a session, so this is safe pre-auth.

alter table companies enable row level security;
alter table hotels enable row level security;
alter table contacts enable row level security;
alter table candidates enable row level security;
alter table candidate_experience enable row level security;
alter table candidate_tags enable row level security;
alter table candidate_signals enable row level security;
alter table briefs enable row level security;
alter table brief_shortlist enable row level security;
alter table captures enable row level security;
alter table interviews enable row level security;
alter table opportunities enable row level security;
alter table voice_queries enable row level security;
alter table embeddings enable row level security;

-- Permissive policies for v1 — only authenticated users can do anything.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('create policy "auth read %s"  on public.%I for select to authenticated using (true);', t, t);
    execute format('create policy "auth write %s" on public.%I for all    to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- ─── updated_at trigger for candidates ──────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger candidates_updated_at
  before update on candidates
  for each row execute function set_updated_at();
