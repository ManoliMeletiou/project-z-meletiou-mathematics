-- Phase 52: close the default PostgreSQL function-execution exposure.
--
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. In an
-- exposed Supabase schema that also grants the anon API role access to every
-- SECURITY DEFINER RPC unless the grant is explicitly removed. Project Z RPCs
-- are authenticated workflows, so anonymous callers do not need function
-- execution rights.

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

-- Preserve existing signed-in and server-side workflows. A later least-
-- privilege phase can narrow this to an explicit RPC allow-list after every
-- role journey has automated coverage.
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema public to service_role;

-- Trigger functions are internal implementation details and must not be
-- callable as RPC endpoints by signed-in users.
do $$
declare
  function_signature regprocedure;
begin
  for function_signature in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'pg_catalog.trigger'::regtype
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      function_signature
    );
  end loop;
end
$$;

-- Stop future functions from silently reopening anonymous execution.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

-- Fix mutable search paths reported by the Supabase security advisor.
alter function public.source_rights_ok(text)
  set search_path = public, pg_temp;
alter function public.project_z_touch_updated_at()
  set search_path = public, pg_temp;
alter function public.project_z_generate_join_code()
  set search_path = public, pg_temp;
