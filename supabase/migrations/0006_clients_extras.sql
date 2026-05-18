-- Phase 3: surface clients (companies) as a first-class CRM entity.
-- Belinda asked for active/dormant classification and last-spoken date.

alter table companies
  add column if not exists status text default 'active',
  add column if not exists last_contact_at date;

-- Convenience: a partial index for the common "show me the active
-- clients" query in the Clients screen.
create index if not exists companies_status_idx
  on companies (status, last_contact_at desc);

grant select, insert, update on public.companies to service_role, authenticated;
grant select, insert, update on public.briefs    to service_role, authenticated;
grant select, insert, update on public.contacts  to service_role, authenticated;
