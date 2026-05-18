-- Phase 2: Belinda asked for "highlights and to-do points" from voice
-- memos. Highlights stay in captures.structured (jsonb); to-dos get
-- their own table so they can be listed, filtered, and marked complete.

create table if not exists todos (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  detail        text,
  due_at        timestamptz,
  completed     boolean default false,
  completed_at  timestamptz,
  -- Origin links. Any combination may be set; at least one is typical.
  capture_id    uuid references captures(id)   on delete set null,
  candidate_id  uuid references candidates(id) on delete set null,
  company_id    uuid references companies(id)  on delete set null,
  brief_id      uuid references briefs(id)     on delete set null,
  created_at    timestamptz default now()
);

-- Fast "what's still open?" lookups for the Tasks view.
create index if not exists todos_open_idx on todos (completed, due_at);
create index if not exists todos_capture_idx on todos (capture_id);

alter table todos enable row level security;

-- Policies mirror the rest of the schema: authenticated users have full
-- access (we'll tighten when multi-user comes online).
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'todos' and policyname = 'auth read todos') then
    create policy "auth read todos"  on public.todos for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'todos' and policyname = 'auth write todos') then
    create policy "auth write todos" on public.todos for all    to authenticated using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.todos to service_role, authenticated;
grant select on public.todos to anon;
