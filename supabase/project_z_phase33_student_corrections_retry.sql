-- Project Z Phase 33 Student Corrections and Retry After Memorandum
-- Run after the app build/push succeeds.
-- Purpose: students submit corrections after the memorandum; teachers review whether feedback led to improved understanding.

create extension if not exists pgcrypto;

create table if not exists public.project_z_generated_assignment_corrections (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.project_z_generated_assignments(id) on delete cascade,
  question_id uuid not null references public.project_z_generated_assignment_questions(id) on delete cascade,
  response_id uuid references public.project_z_generated_assignment_student_responses(id) on delete set null,
  student_id uuid not null references public.project_z_profiles(id) on delete cascade,
  correction_text text,
  reflection_text text,
  confidence_after_correction integer check (confidence_after_correction is null or confidence_after_correction between 1 and 5),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'reviewed', 'accepted', 'needs_more_work')),
  teacher_feedback text,
  teacher_score numeric,
  teacher_reviewed_at timestamptz,
  teacher_reviewer_id uuid references public.project_z_profiles(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, question_id, student_id)
);

alter table public.project_z_generated_assignment_corrections enable row level security;

drop policy if exists "generated_assignment_corrections_own_or_teacher_select" on public.project_z_generated_assignment_corrections;
create policy "generated_assignment_corrections_own_or_teacher_select"
on public.project_z_generated_assignment_corrections
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

drop policy if exists "generated_assignment_corrections_student_insert" on public.project_z_generated_assignment_corrections;
create policy "generated_assignment_corrections_student_insert"
on public.project_z_generated_assignment_corrections
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
      and a.memorandum_released = true
  )
);

drop policy if exists "generated_assignment_corrections_student_or_teacher_update" on public.project_z_generated_assignment_corrections;
create policy "generated_assignment_corrections_student_or_teacher_update"
on public.project_z_generated_assignment_corrections
for update
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.project_z_generated_assignments a
    where a.id = assignment_id
      and a.teacher_id = auth.uid()
  )
)
with check (
  student_id = auth.uid()
  or exists (
    select 1
    from public.project_z_generated_assignments a
    where a.id = assignment_id
      and a.teacher_id = auth.uid()
  )
);

create or replace function public.project_z_student_correction_assignments()
returns table (
  assignment_id uuid,
  class_id uuid,
  class_label text,
  assignment_title text,
  course_code text,
  course_skill_code text,
  skill_title text,
  assignment_level text,
  question_count integer,
  memorandum_released_at timestamptz,
  responses_needing_correction integer,
  corrections_started integer,
  corrections_submitted integer,
  corrections_accepted integer,
  corrections_needing_more_work integer,
  correction_progress_percent numeric
)
language sql
security definer
set search_path = public
as $$
  with eligible as (
    select
      a.id as assignment_id,
      a.class_id,
      a.assignment_title,
      a.course_code,
      a.course_skill_code,
      a.skill_title,
      a.assignment_level,
      a.question_count,
      a.memorandum_released_at
    from public.project_z_generated_assignments a
    join public.project_z_class_members cm
      on cm.class_id = a.class_id
    join public.project_z_profiles p
      on p.id = auth.uid()
    where cm.student_id = auth.uid()
      and p.role = 'student'
      and a.status = 'assigned'
      and a.memorandum_released = true
  ),
  response_summary as (
    select
      r.assignment_id,
      count(*) filter (
        where r.is_submitted = true
          and (
            r.is_correct = false
            or r.teacher_review_status = 'needs_revision'
          )
      )::integer as responses_needing_correction
    from public.project_z_generated_assignment_student_responses r
    where r.student_id = auth.uid()
    group by r.assignment_id
  ),
  correction_summary as (
    select
      c.assignment_id,
      count(*)::integer as corrections_started,
      count(*) filter (where c.status in ('submitted', 'reviewed', 'accepted', 'needs_more_work'))::integer as corrections_submitted,
      count(*) filter (where c.status = 'accepted')::integer as corrections_accepted,
      count(*) filter (where c.status = 'needs_more_work')::integer as corrections_needing_more_work
    from public.project_z_generated_assignment_corrections c
    where c.student_id = auth.uid()
    group by c.assignment_id
  )
  select
    e.assignment_id,
    e.class_id,
    'Class ' || left(e.class_id::text, 8) as class_label,
    e.assignment_title,
    e.course_code,
    e.course_skill_code,
    e.skill_title,
    e.assignment_level,
    e.question_count,
    e.memorandum_released_at,
    coalesce(rs.responses_needing_correction, 0) as responses_needing_correction,
    coalesce(cs.corrections_started, 0) as corrections_started,
    coalesce(cs.corrections_submitted, 0) as corrections_submitted,
    coalesce(cs.corrections_accepted, 0) as corrections_accepted,
    coalesce(cs.corrections_needing_more_work, 0) as corrections_needing_more_work,
    case
      when coalesce(rs.responses_needing_correction, 0) > 0 then
        round((coalesce(cs.corrections_submitted, 0)::numeric / rs.responses_needing_correction::numeric) * 100, 1)
      else 100
    end as correction_progress_percent
  from eligible e
  left join response_summary rs
    on rs.assignment_id = e.assignment_id
  left join correction_summary cs
    on cs.assignment_id = e.assignment_id
  order by e.memorandum_released_at desc nulls last;
$$;

create or replace function public.project_z_student_correction_questions(
  p_assignment_id uuid
)
returns table (
  assignment_id uuid,
  question_id uuid,
  response_id uuid,
  question_number integer,
  prompt text,
  options jsonb,
  criterion text,
  difficulty_band text,
  question_type text,
  correct_answer text,
  correct_option text,
  explanation text,
  student_answer_text text,
  student_selected_option text,
  student_is_correct boolean,
  teacher_feedback text,
  teacher_review_status text,
  correction_id uuid,
  correction_text text,
  reflection_text text,
  confidence_after_correction integer,
  correction_status text,
  correction_teacher_feedback text,
  correction_teacher_score numeric
)
language sql
security definer
set search_path = public
as $$
  select
    a.id as assignment_id,
    q.id as question_id,
    r.id as response_id,
    q.question_number,
    q.prompt,
    q.options,
    q.criterion,
    q.difficulty_band,
    q.question_type,
    q.correct_answer,
    q.correct_option,
    q.explanation,
    r.answer_text as student_answer_text,
    r.selected_option as student_selected_option,
    r.is_correct as student_is_correct,
    r.teacher_feedback,
    r.teacher_review_status,
    c.id as correction_id,
    c.correction_text,
    c.reflection_text,
    c.confidence_after_correction,
    c.status as correction_status,
    c.teacher_feedback as correction_teacher_feedback,
    c.teacher_score as correction_teacher_score
  from public.project_z_generated_assignments a
  join public.project_z_generated_assignment_questions q
    on q.assignment_id = a.id
  join public.project_z_class_members cm
    on cm.class_id = a.class_id
  left join public.project_z_generated_assignment_student_responses r
    on r.assignment_id = a.id
    and r.question_id = q.id
    and r.student_id = auth.uid()
  left join public.project_z_generated_assignment_corrections c
    on c.assignment_id = a.id
    and c.question_id = q.id
    and c.student_id = auth.uid()
  where a.id = p_assignment_id
    and a.status = 'assigned'
    and a.memorandum_released = true
    and cm.student_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )
  order by
    case
      when r.is_correct = false or r.teacher_review_status = 'needs_revision' then 0
      else 1
    end,
    q.question_number;
$$;

create or replace function public.project_z_save_student_correction(
  p_assignment_id uuid,
  p_question_id uuid,
  p_correction_text text,
  p_reflection_text text default null,
  p_confidence_after_correction integer default null,
  p_submit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
  response_id_value uuid;
  new_status text := 'draft';
  correction_id_value uuid;
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
      and a.status = 'assigned'
      and a.memorandum_released = true
      and cm.student_id = auth.uid()
      and p.role = 'student'
  )
  into allowed;

  if not allowed then
    raise exception 'You can only submit corrections after your teacher releases the memorandum';
  end if;

  if p_confidence_after_correction is not null and (p_confidence_after_correction < 1 or p_confidence_after_correction > 5) then
    raise exception 'Confidence must be between 1 and 5';
  end if;

  if p_submit and length(trim(coalesce(p_correction_text, ''))) < 10 then
    raise exception 'Submitted correction must explain the corrected answer';
  end if;

  select r.id
  into response_id_value
  from public.project_z_generated_assignment_student_responses r
  where r.assignment_id = p_assignment_id
    and r.question_id = p_question_id
    and r.student_id = auth.uid();

  new_status := case when p_submit then 'submitted' else 'draft' end;

  insert into public.project_z_generated_assignment_corrections (
    assignment_id,
    question_id,
    response_id,
    student_id,
    correction_text,
    reflection_text,
    confidence_after_correction,
    status,
    submitted_at,
    created_at,
    updated_at
  )
  values (
    p_assignment_id,
    p_question_id,
    response_id_value,
    auth.uid(),
    p_correction_text,
    p_reflection_text,
    p_confidence_after_correction,
    new_status,
    case when p_submit then now() else null end,
    now(),
    now()
  )
  on conflict (assignment_id, question_id, student_id)
  do update set
    response_id = excluded.response_id,
    correction_text = excluded.correction_text,
    reflection_text = excluded.reflection_text,
    confidence_after_correction = excluded.confidence_after_correction,
    status = excluded.status,
    submitted_at = case when excluded.status = 'submitted' then now() else public.project_z_generated_assignment_corrections.submitted_at end,
    updated_at = now()
  returning id into correction_id_value;

  return jsonb_build_object(
    'ok', true,
    'correction_id', correction_id_value,
    'assignment_id', p_assignment_id,
    'question_id', p_question_id,
    'status', new_status
  );
end;
$$;

create or replace function public.project_z_teacher_corrections_for_review(
  p_assignment_id uuid default null
)
returns table (
  correction_id uuid,
  assignment_id uuid,
  assignment_title text,
  class_id uuid,
  class_label text,
  question_id uuid,
  question_number integer,
  student_id uuid,
  student_email text,
  student_name text,
  prompt text,
  correct_answer text,
  correct_option text,
  explanation text,
  student_answer_text text,
  student_selected_option text,
  original_is_correct boolean,
  original_teacher_feedback text,
  correction_text text,
  reflection_text text,
  confidence_after_correction integer,
  correction_status text,
  teacher_feedback text,
  teacher_score numeric,
  submitted_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id as correction_id,
    c.assignment_id,
    a.assignment_title,
    a.class_id,
    'Class ' || left(a.class_id::text, 8) as class_label,
    c.question_id,
    q.question_number,
    c.student_id,
    coalesce(p.email, 'unknown@student') as student_email,
    coalesce(split_part(p.email, '@', 1), 'Student') as student_name,
    q.prompt,
    q.correct_answer,
    q.correct_option,
    q.explanation,
    r.answer_text as student_answer_text,
    r.selected_option as student_selected_option,
    r.is_correct as original_is_correct,
    r.teacher_feedback as original_teacher_feedback,
    c.correction_text,
    c.reflection_text,
    c.confidence_after_correction,
    c.status as correction_status,
    c.teacher_feedback,
    c.teacher_score,
    c.submitted_at,
    c.updated_at
  from public.project_z_generated_assignment_corrections c
  join public.project_z_generated_assignments a
    on a.id = c.assignment_id
  join public.project_z_generated_assignment_questions q
    on q.id = c.question_id
  left join public.project_z_generated_assignment_student_responses r
    on r.id = c.response_id
  left join public.project_z_profiles p
    on p.id = c.student_id
  where a.teacher_id = auth.uid()
    and (p_assignment_id is null or c.assignment_id = p_assignment_id)
    and c.status in ('submitted', 'reviewed', 'accepted', 'needs_more_work')
    and exists (
      select 1
      from public.project_z_profiles teacher_profile
      where teacher_profile.id = auth.uid()
        and teacher_profile.role = 'teacher'
    )
  order by
    case c.status
      when 'submitted' then 0
      when 'needs_more_work' then 1
      when 'reviewed' then 2
      when 'accepted' then 3
      else 4
    end,
    c.submitted_at desc nulls last,
    a.assignment_title,
    student_email,
    q.question_number;
$$;

create or replace function public.project_z_teacher_review_student_correction(
  p_correction_id uuid,
  p_status text,
  p_teacher_feedback text default null,
  p_teacher_score numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
  correction_student_id uuid;
  correction_skill text;
  accepted boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_status not in ('reviewed', 'accepted', 'needs_more_work') then
    raise exception 'Invalid correction review status';
  end if;

  select
    c.student_id,
    q.course_skill_code,
    exists (
      select 1
      from public.project_z_generated_assignments a
      join public.project_z_profiles p
        on p.id = auth.uid()
      where a.id = c.assignment_id
        and a.teacher_id = auth.uid()
        and p.role = 'teacher'
    )
  into correction_student_id, correction_skill, allowed
  from public.project_z_generated_assignment_corrections c
  join public.project_z_generated_assignment_questions q
    on q.id = c.question_id
  where c.id = p_correction_id;

  if correction_student_id is null then
    raise exception 'Correction not found';
  end if;

  if not allowed then
    raise exception 'You can only review corrections for your own assignments';
  end if;

  update public.project_z_generated_assignment_corrections
  set
    status = p_status,
    teacher_feedback = p_teacher_feedback,
    teacher_score = p_teacher_score,
    teacher_reviewed_at = now(),
    teacher_reviewer_id = auth.uid(),
    updated_at = now()
  where id = p_correction_id;

  accepted := p_status = 'accepted' or (p_status = 'reviewed' and coalesce(p_teacher_score, 0) >= 60);

  if accepted and correction_skill is not null then
    insert into public.project_z_curriculum_mastery (
      user_id,
      course_skill_code,
      mastery_percent,
      confidence_percent,
      evidence_count,
      correct_count,
      updated_at
    )
    values (
      correction_student_id,
      correction_skill,
      72,
      68,
      1,
      1,
      now()
    )
    on conflict (user_id, course_skill_code)
    do update set
      mastery_percent = round(((public.project_z_curriculum_mastery.mastery_percent * 0.8) + (72 * 0.2))::numeric, 1),
      confidence_percent = round(((public.project_z_curriculum_mastery.confidence_percent * 0.85) + (68 * 0.15))::numeric, 1),
      evidence_count = public.project_z_curriculum_mastery.evidence_count + 1,
      correct_count = public.project_z_curriculum_mastery.correct_count + 1,
      updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true,
    'correction_id', p_correction_id,
    'status', p_status,
    'mastery_signal_updated', accepted
  );
end;
$$;

create or replace function public.project_z_corrections_retry_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-33-student-corrections-retry',
    'student_corrections_after_memorandum', true,
    'teacher_correction_review', true,
    'mastery_update_from_accepted_corrections', true,
    'memo_required_before_corrections', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_student_correction_assignments() to authenticated;
grant execute on function public.project_z_student_correction_questions(uuid) to authenticated;
grant execute on function public.project_z_save_student_correction(uuid, uuid, text, text, integer, boolean) to authenticated;
grant execute on function public.project_z_teacher_corrections_for_review(uuid) to authenticated;
grant execute on function public.project_z_teacher_review_student_correction(uuid, text, text, numeric) to authenticated;
grant execute on function public.project_z_corrections_retry_status() to authenticated;

select
  'Project Z Phase 33 student corrections retry schema applied successfully' as status,
  now() as applied_at;
