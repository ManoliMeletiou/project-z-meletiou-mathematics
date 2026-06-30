-- Project Z Phase 10 Secure Parent-Child Linking
-- Safe to run more than once after Phase 9.

create extension if not exists pgcrypto;

create table if not exists public.project_z_parent_link_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.project_z_profiles(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, code)
);

alter table public.project_z_parent_link_codes enable row level security;

drop policy if exists "parent_link_codes_student_select_own" on public.project_z_parent_link_codes;
create policy "parent_link_codes_student_select_own"
on public.project_z_parent_link_codes
for select
to authenticated
using (student_id = auth.uid());

create or replace function public.project_z_generate_parent_link_code()
returns table (
  code text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  new_code text;
  new_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if caller_role <> 'student' then
    raise exception 'Only student accounts can generate a parent link code';
  end if;

  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  new_expires_at := now() + interval '7 days';

  insert into public.project_z_parent_link_codes (
    student_id,
    code,
    expires_at
  )
  values (
    auth.uid(),
    new_code,
    new_expires_at
  );

  return query select new_code, new_expires_at;
end;
$$;

create or replace function public.project_z_my_active_parent_link_codes()
returns table (
  code text,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.code,
    c.expires_at,
    c.created_at
  from public.project_z_parent_link_codes c
  where c.student_id = auth.uid()
    and c.used_at is null
    and c.expires_at > now()
  order by c.created_at desc
  limit 5;
$$;

create or replace function public.project_z_link_parent_to_student_with_code(
  p_student_email text,
  p_code text
)
returns public.project_z_parent_student_links
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  target_student_id uuid;
  code_row public.project_z_parent_link_codes;
  new_link public.project_z_parent_student_links;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if caller_role <> 'parent' then
    raise exception 'Only parent accounts can link to a child';
  end if;

  select id into target_student_id
  from public.project_z_profiles
  where lower(email) = lower(trim(p_student_email))
    and role = 'student';

  if target_student_id is null then
    raise exception 'Student account not found. The student must sign up first.';
  end if;

  select * into code_row
  from public.project_z_parent_link_codes
  where student_id = target_student_id
    and upper(code) = upper(trim(p_code))
    and used_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if code_row.id is null then
    raise exception 'Invalid or expired parent link code';
  end if;

  insert into public.project_z_parent_student_links (
    parent_id,
    student_id,
    status
  )
  values (
    auth.uid(),
    target_student_id,
    'active'
  )
  on conflict (parent_id, student_id) do update
  set status = 'active',
      updated_at = now()
  returning * into new_link;

  update public.project_z_parent_link_codes
  set used_at = now()
  where id = code_row.id;

  return new_link;
end;
$$;

grant execute on function public.project_z_generate_parent_link_code() to authenticated;
grant execute on function public.project_z_my_active_parent_link_codes() to authenticated;
grant execute on function public.project_z_link_parent_to_student_with_code(text, text) to authenticated;

select
  'Project Z Phase 10 secure parent-child linking schema applied successfully' as status,
  now() as applied_at;

