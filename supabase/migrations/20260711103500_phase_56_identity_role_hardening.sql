-- Project Z Phase 56: prevent self-assigned privileged roles.

create or replace function public.project_z_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_z_profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    'student',
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.project_z_profiles.display_name, excluded.display_name),
      updated_at = now();
  return new;
end;
$$;

create or replace function public.project_z_upsert_profile(
  p_role text default 'student',
  p_display_name text default null
)
returns public.project_z_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.project_z_profiles;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  insert into public.project_z_profiles (id, email, role, display_name)
  values (
    auth.uid(),
    auth.email(),
    'student',
    coalesce(nullif(trim(p_display_name), ''), split_part(auth.email(), '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(nullif(trim(p_display_name), ''), public.project_z_profiles.display_name),
      updated_at = now()
  returning * into result;

  return result;
end;
$$;

-- Profile writes must use controlled functions; browser clients may only read
-- their own role record. Existing approved roles are not changed here.
drop policy if exists "profiles_insert_own" on public.project_z_profiles;
drop policy if exists "profiles_update_own" on public.project_z_profiles;
revoke insert, update on public.project_z_profiles from authenticated;

create table if not exists public.project_z_role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_role text not null check (requested_role in ('teacher', 'parent')),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, requested_role)
);

alter table public.project_z_role_requests enable row level security;

drop policy if exists "role_requests_select_own" on public.project_z_role_requests;
create policy "role_requests_select_own"
on public.project_z_role_requests for select to authenticated
using (user_id = auth.uid());

-- Direct inserts/updates are intentionally absent. The request RPC validates
-- and normalizes the submitted request.

create or replace function public.project_z_request_role(
  p_requested_role text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
  current_role text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_requested_role not in ('teacher', 'parent') then
    raise exception 'Only teacher or parent access can be requested';
  end if;

  select role into current_role from public.project_z_profiles where id = auth.uid();
  if current_role = p_requested_role then
    raise exception 'This role is already active';
  end if;

  insert into public.project_z_role_requests (user_id, requested_role, reason, status, updated_at)
  values (auth.uid(), p_requested_role, nullif(trim(p_reason), ''), 'pending', now())
  on conflict (user_id, requested_role) do update
  set reason = excluded.reason,
      status = 'pending',
      reviewed_by = null,
      reviewed_at = null,
      updated_at = now()
  returning id into request_id;

  return jsonb_build_object('ok', true, 'request_id', request_id,
    'requested_role', p_requested_role, 'status', 'pending');
end;
$$;

create or replace function public.project_z_my_role_requests()
returns table (
  request_id uuid,
  requested_role text,
  reason text,
  status text,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, requested_role, reason, status, reviewed_at, created_at, updated_at
  from public.project_z_role_requests
  where user_id = auth.uid()
  order by updated_at desc;
$$;

revoke all on table public.project_z_role_requests from public, anon;
grant select on table public.project_z_role_requests to authenticated;
revoke all on function public.project_z_request_role(text, text) from public, anon;
revoke all on function public.project_z_my_role_requests() from public, anon;
grant execute on function public.project_z_request_role(text, text) to authenticated;
grant execute on function public.project_z_my_role_requests() to authenticated;

