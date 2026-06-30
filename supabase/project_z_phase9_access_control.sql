-- Project Z Phase 9 Role Access Control and Parent-Child Links
-- Safe to run more than once after Phase 8.

create extension if not exists pgcrypto;

create table if not exists public.project_z_parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.project_z_profiles(id) on delete cascade,
  student_id uuid not null references public.project_z_profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

alter table public.project_z_parent_student_links enable row level security;

drop policy if exists "parent_links_parent_select_own" on public.project_z_parent_student_links;
create policy "parent_links_parent_select_own"
on public.project_z_parent_student_links
for select
to authenticated
using (
  parent_id = auth.uid()
  or exists (
    select 1
    from public.project_z_class_members cm
    join public.project_z_classes c on c.id = cm.class_id
    where cm.student_id = project_z_parent_student_links.student_id
      and c.teacher_id = auth.uid()
  )
);

drop policy if exists "parent_links_parent_insert_own" on public.project_z_parent_student_links;
create policy "parent_links_parent_insert_own"
on public.project_z_parent_student_links
for insert
to authenticated
with check (parent_id = auth.uid());

drop policy if exists "parent_links_parent_update_own" on public.project_z_parent_student_links;
create policy "parent_links_parent_update_own"
on public.project_z_parent_student_links
for update
to authenticated
using (parent_id = auth.uid())
with check (parent_id = auth.uid());

create or replace function public.project_z_link_parent_to_student_by_email(
  p_student_email text
)
returns public.project_z_parent_student_links
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  target_student_id uuid;
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

  return new_link;
end;
$$;

create or replace function public.project_z_my_children()
returns table (
  student_id uuid,
  student_email text,
  student_name text,
  joined_at timestamptz,
  total_attempts bigint,
  total_correct bigint,
  average_mastery numeric
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as student_id,
    p.email as student_email,
    coalesce(p.display_name, split_part(p.email, '@', 1)) as student_name,
    l.created_at as joined_at,
    coalesce(sum(sm.attempts), 0)::bigint as total_attempts,
    coalesce(sum(sm.correct), 0)::bigint as total_correct,
    coalesce(round(avg(sm.mastery_score), 2), 0) as average_mastery
  from public.project_z_parent_student_links l
  join public.project_z_profiles p on p.id = l.student_id
  left join public.project_z_skill_mastery sm on sm.user_id = p.id
  where l.parent_id = auth.uid()
    and l.status = 'active'
  group by p.id, p.email, p.display_name, l.created_at
  order by p.display_name nulls last, p.email;
$$;

create or replace function public.project_z_child_mastery_for_parent(
  p_student_id uuid
)
returns table (
  skill_id text,
  attempts integer,
  correct integer,
  mastery_score numeric,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    sm.skill_id,
    sm.attempts,
    sm.correct,
    sm.mastery_score,
    sm.updated_at
  from public.project_z_skill_mastery sm
  where sm.user_id = p_student_id
    and exists (
      select 1
      from public.project_z_parent_student_links l
      where l.parent_id = auth.uid()
        and l.student_id = p_student_id
        and l.status = 'active'
    )
  order by sm.mastery_score asc, sm.updated_at desc;
$$;

grant execute on function public.project_z_link_parent_to_student_by_email(text) to authenticated;
grant execute on function public.project_z_my_children() to authenticated;
grant execute on function public.project_z_child_mastery_for_parent(uuid) to authenticated;

select
  'Project Z Phase 9 role access and parent-child links schema applied successfully' as status,
  now() as applied_at;

