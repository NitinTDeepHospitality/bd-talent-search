-- BD Talent Search — table-level grants
-- Required because 0001 drops + recreates the public schema, which wipes
-- Supabase's default table grants. Without this, every query (even with
-- the service_role key) hits "permission denied for table X" before RLS
-- is even consulted.

-- service_role bypasses RLS but still needs table grants.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- authenticated: RLS policies in 0001 already permit; this lets the
-- privileges actually flow.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- anon: the publishable key in the browser. Grant SELECT at the table
-- level, but RLS still blocks it (no anon policies in 0001 — intentional).
-- This is defence-in-depth; if we add anon policies later, we won't also
-- have to remember to grant.
grant select on all tables in schema public to anon;

-- Apply the same defaults to any tables added by future migrations.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role, authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant usage, select on sequences to service_role, authenticated;
