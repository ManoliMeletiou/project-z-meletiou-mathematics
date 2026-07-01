-- Project Z Phase 32 Teacher Review, Feedback, and Memorandum Release
-- Run after the app build/push succeeds.
-- Purpose: teachers review generated-assignment submissions, give feedback, and release a memorandum to students.

alter table public.project_z_generated_assignment_student_responses
  add column if not exists teacher_feedback text,
  add column if not exists teacher_score numeric,
  add column if not exists teacher_review_status text not null default 'not_reviewed'
    check (teacher_review_status in ('not_reviewed', 'reviewed', 'needs_revision')),
  add column if not exists teacher_reviewed_at timestamptz,
  add column if not exists teacher_reviewer_id uuid references public.project_z_profiles(id) on delete set null;

alter table public.project_z_generated_assignments
  add column if not exists memorandum_released boolean not null default false,
  add column if not exists memorandum_notes text,
  add column if not exists memorandum_released_at timestamptz,
  add column if not exists memorandum_released_by uuid references public.project_z_profiles(id) on delete set null;

create or replace function public.project_z_teacher_generated_assignments_for_review()
returns table (
  assignment_id uuid,
  class_id uuid,
  class_label text,
  assignment_title text,
  course_code text,
  course_skill_code text,
  skill_title text,
  question_count integer,
  status text,
  memorandum_released boolean,
  student_count integer,
  answered_responses integer,
  submitted_responses integer,
  reviewed_responses integer,
  needs_revision_responses integer,
  average_score numeric,
  latest_activity_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id as assignment_id,
    a.class_id,
    'Class ' || left(a.class_id::text, 8) as class_label,
    a.assignment_title,
    a.course_code,
    a.course_skill_code,
    a.skill_title,
    a.question_count,
    a.status,
    coalesce(a.memorandum_released, false) as memorandum_released,
    count(distinct cm.student_id)::integer as student_count,
    count(r.id) filter (where coalesce(r.answer_text, '') <> '' or coalesce(r.selected_option, '') <> '')::integer as answered_responses,
    count(r.id) filter (where r.is_submitted = true)::integer as submitted_responses,
    count(r.id) filter (where r.teacher_review_status = 'reviewed')::integer as reviewed_responses,
    count(r.id) filter (where r.teacher_review_status = 'needs_revision')::integer as needs_revision_responses,
    round(avg(r.teacher_score)::numeric, 1) as average_score,
    max(r.updated_at) as latest_activity_at
  from public.project_z_generated_assignments a
  left join public.project_z_class_members cm
    on cm.class_id = a.class_id
  left join public.project_z_generated_assignment_student_responses r
    on r.assignment_id = a.id
  where a.teacher_id = auth.uid()
    and a.status in ('assigned', 'reviewed', 'draft')
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  group by
    a.id,
    a.class_id,
    a.assignment_title,
    a.course_code,
    a.course_skill_code,
    a.skill_title,
    a.question_count,
    a.status,
    a.memorandum_released
  order by a.updated_at desc, a.created_at desc;
$$;

create or replace function public.project_z_teacher_generated_assignment_submissions(
  p_assignment_id uuid
)
returns table (
  response_id uuid,
  assignment_id uuid,
  question_id uuid,
  question_number integer,
  student_id uuid,
  student_email text,
  student_name text,
  prompt text,
  options jsonb,
  criterion text,
  difficulty_band text,
  question_type text,
  student_answer_text text,
  student_selected_option text,
  is_submitted boolean,
  auto_is_correct boolean,
  correct_answer text,
  correct_option text,
  explanation text,
  teacher_feedback text,
  teacher_score numeric,
  teacher_review_status text,
  teacher_reviewed_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id as response_id,
    r.assignment_id,
    r.question_id,
    q.question_number,
    r.student_id,
    coalesce(p.email, 'unknown@student') as student_email,
    coalesce(split_part(p.email, '@', 1), 'Student') as student_name,
    q.prompt,
    q.options,
    q.criterion,
    q.difficulty_band,
    q.question_type,
    r.answer_text as student_answer_text,
    r.selected_option as student_selected_option,
    r.is_submitted,
    r.is_correct as auto_is_correct,
    q.correct_answer,
    q.correct_option,
    q.explanation,
    r.teacher_feedback,
    r.teacher_score,
    r.teacher_review_status,
    r.teacher_reviewed_at,
    r.updated_at
  from public.project_z_generated_assignment_student_responses r
  join public.project_z_generated_assignments a
    on a.id = r.assignment_id
  join public.project_z_generated_assignment_questions q
    on q.id = r.question_id
  left join public.project_z_profiles p
    on p.id = r.student_id
  where r.assignment_id = p_assignment_id
    and a.teacher_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles teacher_profile
      where teacher_profile.id = auth.uid()
        and teacher_profile.role = 'teacher'
    )
  order by student_email, q.question_number;
$$;

create or replace function public.project_z_teacher_review_generated_response(
  p_response_id uuid,
  p_teacher_score numeric default null,
  p_is_correct boolean default null,
  p_feedback text default null,
  p_review_status text default 'reviewed'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
  assignment_id_value uuid;
  response_student_id uuid;
  response_skill text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_review_status not in ('reviewed', 'needs_revision') then
    raise exception 'Invalid review status';
  end if;

  select
    r.assignment_id,
    r.student_id,
    q.course_skill_code,
    exists (
      select 1
      from public.project_z_generated_assignments a
      join public.project_z_profiles p
        on p.id = auth.uid()
      where a.id = r.assignment_id
        and a.teacher_id = auth.uid()
        and p.role = 'teacher'
    )
  into assignment_id_value, response_student_id, response_skill, allowed
  from public.project_z_generated_assignment_student_responses r
  join public.project_z_generated_assignment_questions q
    on q.id = r.question_id
  where r.id = p_response_id;

  if assignment_id_value is null then
    raise exception 'Response not found';
  end if;

  if not allowed then
    raise exception 'You can only review responses for your own assignments';
  end if;

  update public.project_z_generated_assignment_student_responses
  set
    teacher_score = p_teacher_score,
    is_correct = coalesce(p_is_correct, is_correct),
    teacher_feedback = p_feedback,
    teacher_review_status = p_review_status,
    teacher_reviewed_at = now(),
    teacher_reviewer_id = auth.uid(),
    updated_at = now()
  where id = p_response_id;

  -- Learning signal: reviewed generated-assignment results can contribute lightly to mastery.
  if p_review_status = 'reviewed' and response_skill is not null then
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
      response_student_id,
      response_skill,
      case when coalesce(p_is_correct, false) then 65 else 45 end,
      case when coalesce(p_is_correct, false) then 60 else 40 end,
      1,
      case when coalesce(p_is_correct, false) then 1 else 0 end,
      now()
    )
    on conflict (user_id, course_skill_code)
    do update set
      mastery_percent = round(((public.project_z_curriculum_mastery.mastery_percent * 0.85) + ((case when coalesce(p_is_correct, false) then 65 else 45 end) * 0.15))::numeric, 1),
      confidence_percent = round(((public.project_z_curriculum_mastery.confidence_percent * 0.9) + ((case when coalesce(p_is_correct, false) then 60 else 40 end) * 0.1))::numeric, 1),
      evidence_count = public.project_z_curriculum_mastery.evidence_count + 1,
      correct_count = public.project_z_curriculum_mastery.correct_count + case when coalesce(p_is_correct, false) then 1 else 0 end,
      updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true,
    'response_id', p_response_id,
    'assignment_id', assignment_id_value,
    'review_status', p_review_status,
    'teacher_score', p_teacher_score,
    'mastery_signal_updated', p_review_status = 'reviewed'
  );
end;
$$;

create or replace function public.project_z_release_generated_assignment_memorandum(
  p_assignment_id uuid,
  p_memorandum_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  question_count_value integer := 0;
  assignment_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select a.teacher_id, a.question_count
  into assignment_owner, question_count_value
  from public.project_z_generated_assignments a
  join public.project_z_profiles p
    on p.id = auth.uid()
  where a.id = p_assignment_id
    and p.role = 'teacher';

  if assignment_owner is null then
    raise exception 'Assignment not found';
  end if;

  if assignment_owner <> auth.uid() then
    raise exception 'You can only release memorandums for your own assignments';
  end if;

  if question_count_value < 30 then
    raise exception 'Memorandum can only be released for valid assignments with at least 30 questions';
  end if;

  update public.project_z_generated_assignments
  set
    memorandum_released = true,
    memorandum_notes = p_memorandum_notes,
    memorandum_released_at = now(),
    memorandum_released_by = auth.uid(),
    updated_at = now()
  where id = p_assignment_id;

  return jsonb_build_object(
    'ok', true,
    'assignment_id', p_assignment_id,
    'memorandum_released', true,
    'message', 'Memorandum released to students'
  );
end;
$$;

create or replace function public.project_z_student_generated_assignment_memorandum(
  p_assignment_id uuid
)
returns table (
  assignment_id uuid,
  assignment_title text,
  memorandum_notes text,
  memorandum_released_at timestamptz,
  question_number integer,
  question_id uuid,
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
  teacher_score numeric,
  teacher_review_status text
)
language sql
security definer
set search_path = public
as $$
  select
    a.id as assignment_id,
    a.assignment_title,
    a.memorandum_notes,
    a.memorandum_released_at,
    q.question_number,
    q.id as question_id,
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
    r.teacher_score,
    r.teacher_review_status
  from public.project_z_generated_assignments a
  join public.project_z_generated_assignment_questions q
    on q.assignment_id = a.id
  join public.project_z_class_members cm
    on cm.class_id = a.class_id
  left join public.project_z_generated_assignment_student_responses r
    on r.assignment_id = a.id
    and r.question_id = q.id
    and r.student_id = auth.uid()
  where a.id = p_assignment_id
    and a.memorandum_released = true
    and cm.student_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )
  order by q.question_number;
$$;

create or replace function public.project_z_teacher_generated_assignment_memorandum(
  p_assignment_id uuid
)
returns table (
  assignment_id uuid,
  assignment_title text,
  memorandum_notes text,
  memorandum_released boolean,
  memorandum_released_at timestamptz,
  question_number integer,
  question_id uuid,
  prompt text,
  options jsonb,
  criterion text,
  difficulty_band text,
  question_type text,
  correct_answer text,
  correct_option text,
  explanation text
)
language sql
security definer
set search_path = public
as $$
  select
    a.id as assignment_id,
    a.assignment_title,
    a.memorandum_notes,
    a.memorandum_released,
    a.memorandum_released_at,
    q.question_number,
    q.id as question_id,
    q.prompt,
    q.options,
    q.criterion,
    q.difficulty_band,
    q.question_type,
    q.correct_answer,
    q.correct_option,
    q.explanation
  from public.project_z_generated_assignments a
  join public.project_z_generated_assignment_questions q
    on q.assignment_id = a.id
  where a.id = p_assignment_id
    and a.teacher_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  order by q.question_number;
$$;

create or replace function public.project_z_review_feedback_memorandum_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-32-review-feedback-memorandum',
    'teacher_review_student_submissions', true,
    'teacher_feedback', true,
    'mastery_signal_update_from_review', true,
    'memorandum_release', true,
    'student_memorandum_view', true,
    'memo_hidden_until_teacher_releases', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_teacher_generated_assignments_for_review() to authenticated;
grant execute on function public.project_z_teacher_generated_assignment_submissions(uuid) to authenticated;
grant execute on function public.project_z_teacher_review_generated_response(uuid, numeric, boolean, text, text) to authenticated;
grant execute on function public.project_z_release_generated_assignment_memorandum(uuid, text) to authenticated;
grant execute on function public.project_z_student_generated_assignment_memorandum(uuid) to authenticated;
grant execute on function public.project_z_teacher_generated_assignment_memorandum(uuid) to authenticated;
grant execute on function public.project_z_review_feedback_memorandum_status() to authenticated;

select
  'Project Z Phase 32 review feedback memorandum schema applied successfully' as status,
  now() as applied_at;
