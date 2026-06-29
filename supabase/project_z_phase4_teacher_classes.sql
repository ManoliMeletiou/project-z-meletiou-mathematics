-- Project Z Phase 4 Teacher Class Management
-- Safe to run more than once after Phase 3.

create extension if not exists pgcrypto;

alter table public.project_z_classes
add column if not exists course text default 'MYP Mathematics',
add column if not exists year_group text default 'Demo',
add column if not exists updated_at timestamptz not null default now();

alter table public.project_z_class_members
add column if not exists status text not null default 'active' check (status in ('active', 'inactive')),
add column if not exists updated_at timestamptz not null default now();

create or replace function public.project_z_generate_join_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create or replace function public.project_z_create_class(
  p_name text,
  p_course text default 'MYP Mathematics',
  p_year_group text default 'Demo'
)
returns public.project_z_classes
language plpgsql
security definer
set search_path = public
as $$
declare
  new_class public.project_z_classes;
  code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  loop
    code := public.project_z_generate_join_code();
    exit when not exists (
      select 1 from public.project_z_classes where join_code = code
    );
  end loop;

  insert into public.project_z_classes (
    teacher_id,
    name,
    join_code,
    course,
    year_group
  )
  values (
    auth.uid(),
    coalesce(nullif(trim(p_name), ''), 'Untitled class'),
    code,
    coalesce(nullif(trim(p_course), ''), 'MYP Mathematics'),
    coalesce(nullif(trim(p_year_group), ''), 'Demo')
  )
  returning * into new_class;

  return new_class;
end;
$$;

create or replace function public.project_z_join_class(
  p_join_code text
)
returns public.project_z_class_members
language plpgsql
security definer
set search_path = public
as $$
declare
  target_class_id uuid;
  new_member public.project_z_class_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into target_class_id
  from public.project_z_classes
  where upper(join_code) = upper(trim(p_join_code));

  if target_class_id is null then
    raise exception 'Invalid class code';
  end if;

  insert into public.project_z_class_members (
    class_id,
    student_id,
    status
  )
  values (
    target_class_id,
    auth.uid(),
    'active'
  )
  on conflict (class_id, student_id) do update
  set status = 'active',
      updated_at = now()
  returning * into new_member;

  return new_member;
end;
$$;

create or replace function public.project_z_my_teacher_classes()
returns table (
  id uuid,
  name text,
  join_code text,
  course text,
  year_group text,
  created_at timestamptz,
  member_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.join_code,
    c.course,
    c.year_group,
    c.created_at,
    count(cm.student_id) filter (where cm.status = 'active') as member_count
  from public.project_z_classes c
  left join public.project_z_class_members cm on cm.class_id = c.id
  where c.teacher_id = auth.uid()
  group by c.id, c.name, c.join_code, c.course, c.year_group, c.created_at
  order by c.created_at desc;
$$;

create or replace function public.project_z_my_student_classes()
returns table (
  id uuid,
  name text,
  join_code text,
  course text,
  year_group text,
  teacher_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.join_code,
    c.course,
    c.year_group,
    c.teacher_id,
    c.created_at
  from public.project_z_class_members cm
  join public.project_z_classes c on c.id = cm.class_id
  where cm.student_id = auth.uid()
    and cm.status = 'active'
  order by c.created_at desc;
$$;

drop policy if exists "members_student_insert_own" on public.project_z_class_members;
create policy "members_student_insert_own"
on public.project_z_class_members
for insert
to authenticated
with check (student_id = auth.uid());

drop policy if exists "members_student_update_own" on public.project_z_class_members;
create policy "members_student_update_own"
on public.project_z_class_members
for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

grant execute on function public.project_z_create_class(text, text, text) to authenticated;
grant execute on function public.project_z_join_class(text) to authenticated;
grant execute on function public.project_z_my_teacher_classes() to authenticated;
grant execute on function public.project_z_my_student_classes() to authenticated;

select
  'Project Z Phase 4 teacher class management schema applied successfully' as status,
  now() as applied_at;

