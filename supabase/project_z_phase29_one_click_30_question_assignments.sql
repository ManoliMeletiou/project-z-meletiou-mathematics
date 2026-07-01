-- Project Z Phase 29 One-click 30-question Assignment Creation
-- Run after the app build/push succeeds.
-- Purpose: teachers can create a minimum-30-question assignment draft from a smart recommendation.

create extension if not exists pgcrypto;

create table if not exists public.project_z_generated_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.project_z_profiles(id) on delete set null,
  class_id uuid references public.project_z_classes(id) on delete set null,
  source_recommendation_id text,
  course_code text,
  course_skill_code text not null,
  skill_title text not null,
  assignment_title text not null,
  assignment_instructions text not null,
  assignment_level text not null default 'standard'
    check (assignment_level in ('foundation_rebuild', 'standard', 'extended', 'challenge_consolidation')),
  recommendation_type text,
  question_count integer not null default 30 check (question_count >= 30),
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'assigned', 'archived')),
  ai_model text,
  quality_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_z_generated_assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.project_z_generated_assignments(id) on delete cascade,
  question_number integer not null,
  course_skill_code text not null,
  skill_title text not null,
  criterion text not null default 'A',
  difficulty_band text not null default 'standard'
    check (difficulty_band in ('foundation', 'core', 'standard', 'extended', 'challenge', 'reflection')),
  question_type text not null default 'short_answer'
    check (question_type in ('short_answer', 'multiple_choice', 'worked_reasoning', 'error_analysis', 'reflection')),
  prompt text not null,
  options jsonb,
  correct_answer text not null,
  correct_option text,
  explanation text not null,
  quality_notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (assignment_id, question_number)
);

alter table public.project_z_generated_assignments enable row level security;
alter table public.project_z_generated_assignment_questions enable row level security;

drop policy if exists "generated_assignments_teacher_select" on public.project_z_generated_assignments;
create policy "generated_assignments_teacher_select"
on public.project_z_generated_assignments
for select
to authenticated
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from public.project_z_class_members cm
    where cm.class_id = project_z_generated_assignments.class_id
      and cm.student_id = auth.uid()
      and project_z_generated_assignments.status in ('assigned', 'reviewed')
  )
);

drop policy if exists "generated_assignments_teacher_insert" on public.project_z_generated_assignments;
create policy "generated_assignments_teacher_insert"
on public.project_z_generated_assignments
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.project_z_classes c
    where c.id = class_id
      and c.teacher_id = auth.uid()
  )
);

drop policy if exists "generated_assignments_teacher_update" on public.project_z_generated_assignments;
create policy "generated_assignments_teacher_update"
on public.project_z_generated_assignments
for update
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

drop policy if exists "generated_assignment_questions_select" on public.project_z_generated_assignment_questions;
create policy "generated_assignment_questions_select"
on public.project_z_generated_assignment_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.project_z_generated_assignments a
    where a.id = assignment_id
      and (
        a.teacher_id = auth.uid()
        or exists (
          select 1
          from public.project_z_class_members cm
          where cm.class_id = a.class_id
            and cm.student_id = auth.uid()
            and a.status in ('assigned', 'reviewed')
        )
      )
  )
);

drop policy if exists "generated_assignment_questions_teacher_insert" on public.project_z_generated_assignment_questions;
create policy "generated_assignment_questions_teacher_insert"
on public.project_z_generated_assignment_questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.project_z_generated_assignments a
    where a.id = assignment_id
      and a.teacher_id = auth.uid()
  )
);

create or replace function public.project_z_my_generated_assignments()
returns table (
  assignment_id uuid,
  class_id uuid,
  class_label text,
  course_code text,
  course_skill_code text,
  skill_title text,
  assignment_title text,
  assignment_instructions text,
  assignment_level text,
  recommendation_type text,
  question_count integer,
  status text,
  ai_model text,
  quality_rules jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id as assignment_id,
    a.class_id,
    'Class ' || left(a.class_id::text, 8) as class_label,
    a.course_code,
    a.course_skill_code,
    a.skill_title,
    a.assignment_title,
    a.assignment_instructions,
    a.assignment_level,
    a.recommendation_type,
    a.question_count,
    a.status,
    a.ai_model,
    a.quality_rules,
    a.created_at
  from public.project_z_generated_assignments a
  where a.teacher_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  order by a.created_at desc
  limit 100;
$$;

create or replace function public.project_z_generated_assignment_questions(
  p_assignment_id uuid
)
returns table (
  question_id uuid,
  question_number integer,
  course_skill_code text,
  skill_title text,
  criterion text,
  difficulty_band text,
  question_type text,
  prompt text,
  options jsonb,
  correct_answer text,
  correct_option text,
  explanation text,
  quality_notes jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    q.id as question_id,
    q.question_number,
    q.course_skill_code,
    q.skill_title,
    q.criterion,
    q.difficulty_band,
    q.question_type,
    q.prompt,
    q.options,
    q.correct_answer,
    q.correct_option,
    q.explanation,
    q.quality_notes,
    q.created_at
  from public.project_z_generated_assignment_questions q
  join public.project_z_generated_assignments a
    on a.id = q.assignment_id
  where q.assignment_id = p_assignment_id
    and (
      a.teacher_id = auth.uid()
      or exists (
        select 1
        from public.project_z_class_members cm
        where cm.class_id = a.class_id
          and cm.student_id = auth.uid()
          and a.status in ('assigned', 'reviewed')
      )
    )
  order by q.question_number;
$$;

create or replace function public.project_z_mark_generated_assignment_status(
  p_assignment_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('draft', 'reviewed', 'assigned', 'archived') then
    raise exception 'Invalid generated assignment status';
  end if;

  update public.project_z_generated_assignments
  set status = p_status,
      updated_at = now()
  where id = p_assignment_id
    and teacher_id = auth.uid();

  if not found then
    raise exception 'Assignment not found or not yours';
  end if;

  return jsonb_build_object('ok', true, 'assignment_id', p_assignment_id, 'status', p_status);
end;
$$;

create or replace function public.project_z_generated_assignment_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-29-one-click-30-question-assignments',
    'minimum_questions', 30,
    'skill_locked_generation', true,
    'teacher_only_creation', true,
    'review_page', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_my_generated_assignments() to authenticated;
grant execute on function public.project_z_generated_assignment_questions(uuid) to authenticated;
grant execute on function public.project_z_mark_generated_assignment_status(uuid, text) to authenticated;
grant execute on function public.project_z_generated_assignment_status() to authenticated;

select
  'Project Z Phase 29 one-click 30-question assignments schema applied successfully' as status,
  now() as applied_at;
