-- Project Z Phase 31 Publish Generated Assignments to Students
-- Run after the app build/push succeeds.
-- Purpose: teachers can publish audited generated assignments; students in the class can answer them.

create extension if not exists pgcrypto;

create table if not exists public.project_z_generated_assignment_student_responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.project_z_generated_assignments(id) on delete cascade,
  question_id uuid not null references public.project_z_generated_assignment_questions(id) on delete cascade,
  student_id uuid not null references public.project_z_profiles(id) on delete cascade,
  answer_text text,
  selected_option text,
  is_submitted boolean not null default false,
  is_correct boolean,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, question_id, student_id)
);

alter table public.project_z_generated_assignment_student_responses enable row level security;

drop policy if exists "generated_assignment_student_responses_own_or_teacher_select" on public.project_z_generated_assignment_student_responses;
create policy "generated_assignment_student_responses_own_or_teacher_select"
on public.project_z_generated_assignment_student_responses
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.project_z_generated_assignments a
    where a.id = assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "generated_assignment_student_responses_own_insert" on public.project_z_generated_assignment_student_responses;
create policy "generated_assignment_student_responses_own_insert"
on public.project_z_generated_assignment_student_responses
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.project_z_generated_assignments a
    join public.project_z_class_members cm
      on cm.class_id = a.class_id
    where a.id = assignment_id
      and cm.student_id = auth.uid()
      and a.status = 'assigned'
  )
);

drop policy if exists "generated_assignment_student_responses_own_update" on public.project_z_generated_assignment_student_responses;
create policy "generated_assignment_student_responses_own_update"
on public.project_z_generated_assignment_student_responses
for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

create or replace function public.project_z_publish_generated_assignment(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  assignment_owner uuid;
  stored_question_count integer := 0;
  actual_question_count integer := 0;
  flagged_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role
  into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if coalesce(caller_role, '') <> 'teacher' then
    raise exception 'Only teachers can publish generated assignments';
  end if;

  select a.teacher_id, a.question_count
  into assignment_owner, stored_question_count
  from public.project_z_generated_assignments a
  where a.id = p_assignment_id;

  if assignment_owner is null then
    raise exception 'Generated assignment not found';
  end if;

  if assignment_owner <> auth.uid() then
    raise exception 'You can only publish your own generated assignments';
  end if;

  select count(*)::integer
  into actual_question_count
  from public.project_z_generated_assignment_questions q
  where q.assignment_id = p_assignment_id;

  if actual_question_count < 30 or stored_question_count < 30 then
    raise exception 'Generated assignment must have at least 30 questions before publishing';
  end if;

  select count(*)::integer
  into flagged_count
  from public.project_z_assignment_quality_audits l
  where l.assignment_id = p_assignment_id
    and l.audit_status = 'flagged'
    and not exists (
      select 1
      from public.project_z_assignment_quality_audits later_log
      where later_log.assignment_id = l.assignment_id
        and later_log.question_id is not distinct from l.question_id
        and later_log.created_at > l.created_at
        and later_log.audit_status in ('approved', 'regenerated', 'ignored', 'passed')
    );

  if flagged_count > 0 then
    raise exception 'Resolve flagged audit items before publishing';
  end if;

  update public.project_z_generated_assignments
  set status = 'assigned',
      updated_at = now()
  where id = p_assignment_id;

  return jsonb_build_object(
    'ok', true,
    'assignment_id', p_assignment_id,
    'status', 'assigned',
    'question_count', actual_question_count,
    'message', 'Generated assignment published to students in the class'
  );
end;
$$;

create or replace function public.project_z_student_generated_assignments()
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
  question_count integer,
  status text,
  answered_count integer,
  submitted_count integer,
  correct_count integer,
  progress_percent numeric,
  created_at timestamptz,
  updated_at timestamptz
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
    a.question_count,
    a.status,
    count(r.id) filter (where coalesce(r.answer_text, '') <> '' or coalesce(r.selected_option, '') <> '')::integer as answered_count,
    count(r.id) filter (where r.is_submitted = true)::integer as submitted_count,
    count(r.id) filter (where r.is_correct = true)::integer as correct_count,
    case
      when a.question_count > 0 then round((count(r.id) filter (where coalesce(r.answer_text, '') <> '' or coalesce(r.selected_option, '') <> '')::numeric / a.question_count::numeric) * 100, 1)
      else 0
    end as progress_percent,
    a.created_at,
    a.updated_at
  from public.project_z_generated_assignments a
  join public.project_z_class_members cm
    on cm.class_id = a.class_id
  left join public.project_z_generated_assignment_student_responses r
    on r.assignment_id = a.id
    and r.student_id = auth.uid()
  where cm.student_id = auth.uid()
    and a.status = 'assigned'
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )
  group by
    a.id,
    a.class_id,
    a.course_code,
    a.course_skill_code,
    a.skill_title,
    a.assignment_title,
    a.assignment_instructions,
    a.assignment_level,
    a.question_count,
    a.status,
    a.created_at,
    a.updated_at
  order by a.updated_at desc, a.created_at desc;
$$;

create or replace function public.project_z_student_generated_assignment_questions(
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
  student_answer_text text,
  student_selected_option text,
  is_submitted boolean,
  is_correct boolean
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
    r.answer_text as student_answer_text,
    r.selected_option as student_selected_option,
    coalesce(r.is_submitted, false) as is_submitted,
    r.is_correct
  from public.project_z_generated_assignment_questions q
  join public.project_z_generated_assignments a
    on a.id = q.assignment_id
  join public.project_z_class_members cm
    on cm.class_id = a.class_id
  left join public.project_z_generated_assignment_student_responses r
    on r.assignment_id = a.id
    and r.question_id = q.id
    and r.student_id = auth.uid()
  where a.id = p_assignment_id
    and a.status = 'assigned'
    and cm.student_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )
  order by q.question_number;
$$;

create or replace function public.project_z_save_generated_assignment_answer(
  p_assignment_id uuid,
  p_question_id uuid,
  p_answer_text text default null,
  p_selected_option text default null,
  p_submit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
  correct_answer text;
  correct_option text;
  question_type text;
  calculated_correct boolean := null;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1
    from public.project_z_generated_assignments a
    join public.project_z_class_members cm
      on cm.class_id = a.class_id
    join public.project_z_profiles p
      on p.id = auth.uid()
    where a.id = p_assignment_id
      and cm.student_id = auth.uid()
      and a.status = 'assigned'
      and p.role = 'student'
  )
  into allowed;

  if not allowed then
    raise exception 'You can only answer assigned generated assignments for your class';
  end if;

  select q.correct_answer, q.correct_option, q.question_type
  into correct_answer, correct_option, question_type
  from public.project_z_generated_assignment_questions q
  where q.id = p_question_id
    and q.assignment_id = p_assignment_id;

  if correct_answer is null then
    raise exception 'Question not found';
  end if;

  if p_submit then
    if question_type = 'multiple_choice' then
      calculated_correct := upper(coalesce(p_selected_option, '')) = upper(coalesce(correct_option, ''));
    else
      calculated_correct := lower(trim(coalesce(p_answer_text, ''))) = lower(trim(coalesce(correct_answer, '')));
    end if;
  end if;

  insert into public.project_z_generated_assignment_student_responses (
    assignment_id,
    question_id,
    student_id,
    answer_text,
    selected_option,
    is_submitted,
    is_correct,
    submitted_at,
    created_at,
    updated_at
  )
  values (
    p_assignment_id,
    p_question_id,
    auth.uid(),
    p_answer_text,
    p_selected_option,
    p_submit,
    calculated_correct,
    case when p_submit then now() else null end,
    now(),
    now()
  )
  on conflict (assignment_id, question_id, student_id)
  do update set
    answer_text = excluded.answer_text,
    selected_option = excluded.selected_option,
    is_submitted = case
      when public.project_z_generated_assignment_student_responses.is_submitted = true then true
      else excluded.is_submitted
    end,
    is_correct = case
      when excluded.is_submitted then excluded.is_correct
      else public.project_z_generated_assignment_student_responses.is_correct
    end,
    submitted_at = case
      when excluded.is_submitted then now()
      else public.project_z_generated_assignment_student_responses.submitted_at
    end,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'assignment_id', p_assignment_id,
    'question_id', p_question_id,
    'submitted', p_submit,
    'is_correct', calculated_correct
  );
end;
$$;

create or replace function public.project_z_teacher_generated_assignment_progress(
  p_assignment_id uuid
)
returns table (
  student_id uuid,
  student_email text,
  student_name text,
  answered_count integer,
  submitted_count integer,
  correct_count integer,
  question_count integer,
  progress_percent numeric,
  accuracy_percent numeric,
  latest_activity_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    cm.student_id,
    coalesce(p.email, 'unknown@student') as student_email,
    coalesce(split_part(p.email, '@', 1), 'Student') as student_name,
    count(r.id) filter (where coalesce(r.answer_text, '') <> '' or coalesce(r.selected_option, '') <> '')::integer as answered_count,
    count(r.id) filter (where r.is_submitted = true)::integer as submitted_count,
    count(r.id) filter (where r.is_correct = true)::integer as correct_count,
    a.question_count,
    case
      when a.question_count > 0 then round((count(r.id) filter (where coalesce(r.answer_text, '') <> '' or coalesce(r.selected_option, '') <> '')::numeric / a.question_count::numeric) * 100, 1)
      else 0
    end as progress_percent,
    case
      when count(r.id) filter (where r.is_submitted = true) > 0 then round((count(r.id) filter (where r.is_correct = true)::numeric / count(r.id) filter (where r.is_submitted = true)::numeric) * 100, 1)
      else 0
    end as accuracy_percent,
    max(r.updated_at) as latest_activity_at
  from public.project_z_generated_assignments a
  join public.project_z_class_members cm
    on cm.class_id = a.class_id
  left join public.project_z_profiles p
    on p.id = cm.student_id
  left join public.project_z_generated_assignment_student_responses r
    on r.assignment_id = a.id
    and r.student_id = cm.student_id
  where a.id = p_assignment_id
    and a.teacher_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles teacher_profile
      where teacher_profile.id = auth.uid()
        and teacher_profile.role = 'teacher'
    )
  group by cm.student_id, p.email, a.question_count
  order by student_email;
$$;

create or replace function public.project_z_publish_generated_assignment_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-31-publish-generated-assignments',
    'teacher_publish_button', true,
    'minimum_questions_required', 30,
    'students_can_answer', true,
    'student_progress_tracking', true,
    'class_only_access', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_publish_generated_assignment(uuid) to authenticated;
grant execute on function public.project_z_student_generated_assignments() to authenticated;
grant execute on function public.project_z_student_generated_assignment_questions(uuid) to authenticated;
grant execute on function public.project_z_save_generated_assignment_answer(uuid, uuid, text, text, boolean) to authenticated;
grant execute on function public.project_z_teacher_generated_assignment_progress(uuid) to authenticated;
grant execute on function public.project_z_publish_generated_assignment_status() to authenticated;

select
  'Project Z Phase 31 publish generated assignments schema applied successfully' as status,
  now() as applied_at;
