-- Project Z Phase 6 Assignments and Submissions
-- Safe to run more than once after Phase 5.

create extension if not exists pgcrypto;

create table if not exists public.project_z_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.project_z_classes(id) on delete cascade,
  teacher_id uuid not null references public.project_z_profiles(id) on delete cascade,
  title text not null,
  instructions text,
  skill_id text not null default 'quad_fact',
  difficulty integer not null default 2,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_z_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.project_z_assignments(id) on delete cascade,
  student_id uuid not null references public.project_z_profiles(id) on delete cascade,
  answer text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  correct boolean,
  feedback text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

alter table public.project_z_assignments enable row level security;
alter table public.project_z_assignment_submissions enable row level security;

drop policy if exists "assignments_teacher_select" on public.project_z_assignments;
create policy "assignments_teacher_select"
on public.project_z_assignments
for select
to authenticated
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from public.project_z_class_members cm
    where cm.class_id = project_z_assignments.class_id
      and cm.student_id = auth.uid()
      and cm.status = 'active'
  )
);

drop policy if exists "submissions_owner_or_teacher_select" on public.project_z_assignment_submissions;
create policy "submissions_owner_or_teacher_select"
on public.project_z_assignment_submissions
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.project_z_assignments a
    where a.id = project_z_assignment_submissions.assignment_id
      and a.teacher_id = auth.uid()
  )
);

create or replace function public.project_z_create_assignment(
  p_class_id uuid,
  p_title text,
  p_instructions text default '',
  p_skill_id text default 'quad_fact',
  p_difficulty integer default 2
)
returns public.project_z_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  new_assignment public.project_z_assignments;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.project_z_classes c
    where c.id = p_class_id
      and c.teacher_id = auth.uid()
  ) then
    raise exception 'Only the class teacher can create assignments';
  end if;

  insert into public.project_z_assignments (
    class_id,
    teacher_id,
    title,
    instructions,
    skill_id,
    difficulty
  )
  values (
    p_class_id,
    auth.uid(),
    coalesce(nullif(trim(p_title), ''), 'Untitled assignment'),
    coalesce(p_instructions, ''),
    coalesce(nullif(trim(p_skill_id), ''), 'quad_fact'),
    coalesce(p_difficulty, 2)
  )
  returning * into new_assignment;

  return new_assignment;
end;
$$;

create or replace function public.project_z_my_teacher_assignments()
returns table (
  id uuid,
  class_id uuid,
  class_name text,
  title text,
  instructions text,
  skill_id text,
  difficulty integer,
  created_at timestamptz,
  submission_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.class_id,
    c.name as class_name,
    a.title,
    a.instructions,
    a.skill_id,
    a.difficulty,
    a.created_at,
    count(s.id)::bigint as submission_count
  from public.project_z_assignments a
  join public.project_z_classes c on c.id = a.class_id
  left join public.project_z_assignment_submissions s on s.assignment_id = a.id
  where a.teacher_id = auth.uid()
  group by a.id, a.class_id, c.name, a.title, a.instructions, a.skill_id, a.difficulty, a.created_at
  order by a.created_at desc;
$$;

create or replace function public.project_z_my_student_assignments()
returns table (
  id uuid,
  class_id uuid,
  class_name text,
  title text,
  instructions text,
  skill_id text,
  difficulty integer,
  created_at timestamptz,
  submitted boolean,
  submitted_answer text,
  submitted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.class_id,
    c.name as class_name,
    a.title,
    a.instructions,
    a.skill_id,
    a.difficulty,
    a.created_at,
    (s.id is not null) as submitted,
    s.answer as submitted_answer,
    s.submitted_at
  from public.project_z_class_members cm
  join public.project_z_classes c on c.id = cm.class_id
  join public.project_z_assignments a on a.class_id = c.id
  left join public.project_z_assignment_submissions s
    on s.assignment_id = a.id
   and s.student_id = auth.uid()
  where cm.student_id = auth.uid()
    and cm.status = 'active'
  order by a.created_at desc;
$$;

create or replace function public.project_z_submit_assignment(
  p_assignment_id uuid,
  p_answer text
)
returns public.project_z_assignment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_class_id uuid;
  new_submission public.project_z_assignment_submissions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select class_id into target_class_id
  from public.project_z_assignments
  where id = p_assignment_id;

  if target_class_id is null then
    raise exception 'Assignment not found';
  end if;

  if not exists (
    select 1
    from public.project_z_class_members cm
    where cm.class_id = target_class_id
      and cm.student_id = auth.uid()
      and cm.status = 'active'
  ) then
    raise exception 'Student is not a member of this class';
  end if;

  insert into public.project_z_assignment_submissions (
    assignment_id,
    student_id,
    answer,
    status,
    submitted_at,
    updated_at
  )
  values (
    p_assignment_id,
    auth.uid(),
    coalesce(p_answer, ''),
    'submitted',
    now(),
    now()
  )
  on conflict (assignment_id, student_id) do update
  set answer = excluded.answer,
      status = 'submitted',
      submitted_at = now(),
      updated_at = now()
  returning * into new_submission;

  return new_submission;
end;
$$;

create or replace function public.project_z_teacher_assignment_submissions(
  p_assignment_id uuid
)
returns table (
  submission_id uuid,
  assignment_id uuid,
  student_id uuid,
  student_name text,
  student_email text,
  answer text,
  status text,
  submitted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as submission_id,
    s.assignment_id,
    s.student_id,
    coalesce(p.display_name, split_part(p.email, '@', 1)) as student_name,
    p.email as student_email,
    s.answer,
    s.status,
    s.submitted_at
  from public.project_z_assignment_submissions s
  join public.project_z_assignments a on a.id = s.assignment_id
  join public.project_z_profiles p on p.id = s.student_id
  where a.id = p_assignment_id
    and a.teacher_id = auth.uid()
  order by s.submitted_at desc;
$$;

grant execute on function public.project_z_create_assignment(uuid, text, text, text, integer) to authenticated;
grant execute on function public.project_z_my_teacher_assignments() to authenticated;
grant execute on function public.project_z_my_student_assignments() to authenticated;
grant execute on function public.project_z_submit_assignment(uuid, text) to authenticated;
grant execute on function public.project_z_teacher_assignment_submissions(uuid) to authenticated;

select
  'Project Z Phase 6 assignments schema applied successfully' as status,
  now() as applied_at;

