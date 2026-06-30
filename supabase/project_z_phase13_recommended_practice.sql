-- Project Z Phase 13 Recommended Practice Engine
-- Safe to run more than once after Phase 12B.

create extension if not exists pgcrypto;

create table if not exists public.project_z_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  course_code text not null references public.project_z_course_catalog(course_code) on delete restrict,
  course_skill_code text not null references public.project_z_curriculum_skills(course_skill_code) on delete restrict,
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  target_questions integer not null default 10,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.project_z_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.project_z_practice_sessions(id) on delete cascade,
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  course_skill_code text not null references public.project_z_curriculum_skills(course_skill_code) on delete cascade,
  diagnostic_question_id uuid references public.project_z_diagnostic_question_bank(id) on delete set null,
  assessment_criterion text,
  difficulty_band integer not null default 1,
  selected_option text,
  correct_option text,
  is_correct boolean not null default false,
  score numeric not null default 0,
  question_prompt text,
  response_summary text,
  created_at timestamptz not null default now()
);

alter table public.project_z_practice_sessions enable row level security;
alter table public.project_z_practice_attempts enable row level security;

drop policy if exists "practice_sessions_select_own_teacher_parent" on public.project_z_practice_sessions;
create policy "practice_sessions_select_own_teacher_parent"
on public.project_z_practice_sessions
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_z_class_members cm
    join public.project_z_classes c on c.id = cm.class_id
    where cm.student_id = project_z_practice_sessions.user_id
      and c.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_z_parent_student_links l
    where l.parent_id = auth.uid()
      and l.student_id = project_z_practice_sessions.user_id
      and l.status = 'active'
  )
);

drop policy if exists "practice_attempts_select_own_teacher_parent" on public.project_z_practice_attempts;
create policy "practice_attempts_select_own_teacher_parent"
on public.project_z_practice_attempts
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_z_class_members cm
    join public.project_z_classes c on c.id = cm.class_id
    where cm.student_id = project_z_practice_attempts.user_id
      and c.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_z_parent_student_links l
    where l.parent_id = auth.uid()
      and l.student_id = project_z_practice_attempts.user_id
      and l.status = 'active'
  )
);

create or replace function public.project_z_recommended_practice()
returns table (
  course_skill_code text,
  course_code text,
  course_display_name text,
  strand_title text,
  assessment_criterion text,
  title text,
  description text,
  mastery_percent numeric,
  confidence_percent numeric,
  evidence_count integer,
  correct_count integer,
  priority_score numeric,
  recommendation_reason text,
  next_action text
)
language sql
security definer
set search_path = public
as $$
  with selected_course as (
    select s.course_code
    from public.project_z_student_course_selection s
    where s.user_id = auth.uid()
    limit 1
  ),
  base as (
    select
      sk.course_skill_code,
      sk.course_code,
      c.display_name as course_display_name,
      st.title as strand_title,
      sk.assessment_criterion,
      sk.title,
      sk.description,
      coalesce(m.mastery_percent, 0) as mastery_percent,
      coalesce(m.confidence_percent, 0) as confidence_percent,
      coalesce(m.evidence_count, 0) as evidence_count,
      coalesce(m.correct_count, 0) as correct_count,
      sk.target_mastery_percent,
      sk.sort_order,
      (
        (100 - coalesce(m.mastery_percent, 0)) * 0.55
        + (100 - coalesce(m.confidence_percent, 0)) * 0.25
        + case when coalesce(m.evidence_count, 0) < 4 then 20 else 0 end
        + case when sk.assessment_criterion in ('B','C','D') then 4 else 0 end
      )::numeric as priority_score
    from public.project_z_curriculum_skills sk
    join selected_course sc on sc.course_code = sk.course_code
    join public.project_z_course_catalog c on c.course_code = sk.course_code
    join public.project_z_curriculum_strands st on st.strand_code = sk.strand_code
    left join public.project_z_curriculum_mastery m
      on m.course_skill_code = sk.course_skill_code
     and m.user_id = auth.uid()
    where sk.practice_enabled = true
  )
  select
    b.course_skill_code,
    b.course_code,
    b.course_display_name,
    b.strand_title,
    b.assessment_criterion,
    b.title,
    b.description,
    b.mastery_percent,
    b.confidence_percent,
    b.evidence_count,
    b.correct_count,
    round(b.priority_score, 2) as priority_score,
    case
      when b.evidence_count = 0 then 'No evidence yet. Start here so the system can learn this skill.'
      when b.evidence_count < 4 then 'Not enough evidence yet. Practise more so the system can make a stronger conclusion.'
      when b.mastery_percent < 45 then 'Weak skill. This should be practised before moving forward.'
      when b.mastery_percent < 75 then 'Developing skill. Targeted practice should improve accuracy and confidence.'
      when b.confidence_percent < 80 then 'Looks strong, but the confidence is not high enough yet. Use mixed review.'
      else 'Maintenance review. Keep this skill active with spaced practice.'
    end as recommendation_reason,
    case
      when b.evidence_count = 0 then 'Start practice'
      when b.mastery_percent < 45 then 'Repair weakness'
      when b.mastery_percent < 75 then 'Build fluency'
      when b.confidence_percent < 80 then 'Increase evidence'
      else 'Review later'
    end as next_action
  from base b
  where b.mastery_percent < b.target_mastery_percent
     or b.confidence_percent < 85
     or b.evidence_count < 8
  order by b.priority_score desc, b.sort_order asc
  limit 12;
$$;

create or replace function public.project_z_start_practice_skill(
  p_course_skill_code text
)
returns public.project_z_practice_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  selected_course text;
  skill_row public.project_z_curriculum_skills;
  session_row public.project_z_practice_sessions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if caller_role <> 'student' then
    raise exception 'Only student accounts can start their own practice session';
  end if;

  select course_code into selected_course
  from public.project_z_student_course_selection
  where user_id = auth.uid()
  limit 1;

  if selected_course is null then
    raise exception 'Select a course before starting recommended practice';
  end if;

  select *
  into skill_row
  from public.project_z_curriculum_skills
  where course_skill_code = p_course_skill_code
    and course_code = selected_course
    and practice_enabled = true;

  if skill_row.course_skill_code is null then
    raise exception 'This skill is not available for your selected course';
  end if;

  select *
  into session_row
  from public.project_z_practice_sessions
  where user_id = auth.uid()
    and course_skill_code = p_course_skill_code
    and status = 'active'
  order by created_at desc
  limit 1;

  if session_row.id is not null then
    return session_row;
  end if;

  insert into public.project_z_practice_sessions (
    user_id,
    course_code,
    course_skill_code,
    status,
    target_questions
  )
  values (
    auth.uid(),
    skill_row.course_code,
    skill_row.course_skill_code,
    'active',
    10
  )
  returning * into session_row;

  return session_row;
end;
$$;

create or replace function public.project_z_practice_next_question(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.project_z_practice_sessions;
  skill_row public.project_z_curriculum_skills;
  question_row public.project_z_diagnostic_question_bank;
  attempts_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into session_row
  from public.project_z_practice_sessions
  where id = p_session_id
    and user_id = auth.uid();

  if session_row.id is null then
    raise exception 'Practice session not found';
  end if;

  if session_row.status <> 'active' then
    return jsonb_build_object(
      'done', true,
      'status', session_row.status,
      'message', 'Practice session is not active.'
    );
  end if;

  select count(*)::integer
  into attempts_count
  from public.project_z_practice_attempts
  where session_id = p_session_id;

  if attempts_count >= session_row.target_questions then
    update public.project_z_practice_sessions
    set status = 'completed',
        completed_at = now()
    where id = p_session_id;

    return jsonb_build_object(
      'done', true,
      'status', 'completed',
      'message', 'Practice set completed. Mastery has been updated.'
    );
  end if;

  select *
  into skill_row
  from public.project_z_curriculum_skills
  where course_skill_code = session_row.course_skill_code;

  select q.*
  into question_row
  from public.project_z_diagnostic_question_bank q
  where q.course_skill_code = session_row.course_skill_code
    and q.verified = true
    and not exists (
      select 1
      from public.project_z_practice_attempts pa
      where pa.session_id = p_session_id
        and pa.diagnostic_question_id = q.id
    )
  order by random()
  limit 1;

  if question_row.id is null then
    select q.*
    into question_row
    from public.project_z_diagnostic_question_bank q
    where q.course_skill_code = session_row.course_skill_code
      and q.verified = true
    order by random()
    limit 1;
  end if;

  if question_row.id is null then
    return jsonb_build_object(
      'done', true,
      'status', 'blocked',
      'message', 'No verified practice questions exist yet for this skill.'
    );
  end if;

  return jsonb_build_object(
    'done', false,
    'session_id', p_session_id,
    'question_id', question_row.id,
    'course_skill_code', question_row.course_skill_code,
    'skill_title', skill_row.title,
    'skill_description', skill_row.description,
    'assessment_criterion', question_row.assessment_criterion,
    'question_type', question_row.question_type,
    'difficulty_band', question_row.difficulty_band,
    'prompt', question_row.prompt,
    'options', jsonb_build_object(
      'A', question_row.option_a,
      'B', question_row.option_b,
      'C', question_row.option_c,
      'D', question_row.option_d
    ),
    'question_number', attempts_count + 1,
    'target_questions', session_row.target_questions
  );
end;
$$;

create or replace function public.project_z_submit_practice_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_selected_option text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.project_z_practice_sessions;
  question_row public.project_z_diagnostic_question_bank;
  correct boolean;
  skill_max numeric;
  diag_evidence integer;
  diag_correct integer;
  practice_evidence integer;
  practice_correct integer;
  total_evidence integer;
  total_correct integer;
  accuracy numeric;
  confidence numeric;
  mastery numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into session_row
  from public.project_z_practice_sessions
  where id = p_session_id
    and user_id = auth.uid()
    and status = 'active';

  if session_row.id is null then
    raise exception 'Active practice session not found';
  end if;

  select *
  into question_row
  from public.project_z_diagnostic_question_bank
  where id = p_question_id
    and verified = true;

  if question_row.id is null then
    raise exception 'Question not found';
  end if;

  if question_row.course_skill_code <> session_row.course_skill_code then
    raise exception 'Question does not belong to this practice skill';
  end if;

  correct := upper(trim(p_selected_option)) = question_row.correct_option;

  insert into public.project_z_practice_attempts (
    session_id,
    user_id,
    course_skill_code,
    diagnostic_question_id,
    assessment_criterion,
    difficulty_band,
    selected_option,
    correct_option,
    is_correct,
    score,
    question_prompt,
    response_summary
  )
  values (
    p_session_id,
    auth.uid(),
    question_row.course_skill_code,
    question_row.id,
    question_row.assessment_criterion,
    question_row.difficulty_band,
    upper(trim(p_selected_option)),
    question_row.correct_option,
    correct,
    case when correct then 1 else 0 end,
    question_row.prompt,
    case when correct then 'Correct recommended practice response' else 'Incorrect recommended practice response' end
  );

  select
    count(*)::integer,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer
  into diag_evidence, diag_correct
  from public.project_z_diagnostic_evidence
  where user_id = auth.uid()
    and course_skill_code = question_row.course_skill_code;

  select
    count(*)::integer,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer
  into practice_evidence, practice_correct
  from public.project_z_practice_attempts
  where user_id = auth.uid()
    and course_skill_code = question_row.course_skill_code;

  total_evidence := coalesce(diag_evidence, 0) + coalesce(practice_evidence, 0);
  total_correct := coalesce(diag_correct, 0) + coalesce(practice_correct, 0);

  select max_mastery_percent
  into skill_max
  from public.project_z_curriculum_skills
  where course_skill_code = question_row.course_skill_code;

  accuracy := case when total_evidence = 0 then 0 else total_correct::numeric / total_evidence::numeric end;
  confidence := least(100, round((total_evidence::numeric / 12.0) * 100, 2));

  mastery := least(
    coalesce(skill_max, 96),
    round((accuracy * 100) * (0.30 + 0.70 * least(1, total_evidence::numeric / 12.0)), 2)
  );

  insert into public.project_z_curriculum_mastery (
    user_id,
    course_skill_code,
    evidence_count,
    correct_count,
    mastery_percent,
    confidence_percent,
    last_practised_at,
    next_review_at,
    updated_at
  )
  values (
    auth.uid(),
    question_row.course_skill_code,
    total_evidence,
    total_correct,
    mastery,
    confidence,
    now(),
    case
      when mastery < 45 then now() + interval '1 day'
      when mastery < 75 then now() + interval '2 days'
      else now() + interval '7 days'
    end,
    now()
  )
  on conflict (user_id, course_skill_code) do update
  set evidence_count = excluded.evidence_count,
      correct_count = excluded.correct_count,
      mastery_percent = excluded.mastery_percent,
      confidence_percent = excluded.confidence_percent,
      last_practised_at = excluded.last_practised_at,
      next_review_at = excluded.next_review_at,
      updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'correct', correct,
    'selected_option', upper(trim(p_selected_option)),
    'correct_option', question_row.correct_option,
    'explanation', question_row.explanation,
    'course_skill_code', question_row.course_skill_code,
    'mastery_percent', mastery,
    'confidence_percent', confidence,
    'evidence_count', total_evidence,
    'correct_count', total_correct,
    'practice_attempts_for_skill', practice_evidence
  );
end;
$$;

create or replace function public.project_z_student_learning_report(
  p_student_id uuid default null
)
returns table (
  student_id uuid,
  course_code text,
  course_display_name text,
  total_practice_attempts integer,
  total_diagnostic_attempts integer,
  average_mastery numeric,
  average_confidence numeric,
  weak_skill_count integer,
  developing_skill_count integer,
  strong_skill_count integer,
  next_steps text
)
language sql
security definer
set search_path = public
as $$
  with target_student as (
    select coalesce(p_student_id, auth.uid()) as student_id
  ),
  allowed as (
    select ts.student_id
    from target_student ts
    where ts.student_id = auth.uid()
       or exists (
          select 1
          from public.project_z_class_members cm
          join public.project_z_classes c on c.id = cm.class_id
          where cm.student_id = ts.student_id
            and c.teacher_id = auth.uid()
       )
       or exists (
          select 1
          from public.project_z_parent_student_links l
          where l.parent_id = auth.uid()
            and l.student_id = ts.student_id
            and l.status = 'active'
       )
  ),
  mastery as (
    select
      a.student_id,
      sel.course_code,
      cc.display_name as course_display_name,
      coalesce(count(pa.id), 0)::integer as total_practice_attempts,
      coalesce(count(de.id), 0)::integer as total_diagnostic_attempts,
      coalesce(round(avg(cm.mastery_percent), 2), 0) as average_mastery,
      coalesce(round(avg(cm.confidence_percent), 2), 0) as average_confidence,
      coalesce(sum(case when cm.mastery_percent < 45 then 1 else 0 end), 0)::integer as weak_skill_count,
      coalesce(sum(case when cm.mastery_percent >= 45 and cm.mastery_percent < 75 then 1 else 0 end), 0)::integer as developing_skill_count,
      coalesce(sum(case when cm.mastery_percent >= 75 then 1 else 0 end), 0)::integer as strong_skill_count
    from allowed a
    left join public.project_z_student_course_selection sel on sel.user_id = a.student_id
    left join public.project_z_course_catalog cc on cc.course_code = sel.course_code
    left join public.project_z_curriculum_mastery cm on cm.user_id = a.student_id
    left join public.project_z_practice_attempts pa on pa.user_id = a.student_id
    left join public.project_z_diagnostic_evidence de on de.user_id = a.student_id
    group by a.student_id, sel.course_code, cc.display_name
  )
  select
    m.student_id,
    m.course_code,
    m.course_display_name,
    m.total_practice_attempts,
    m.total_diagnostic_attempts,
    m.average_mastery,
    m.average_confidence,
    m.weak_skill_count,
    m.developing_skill_count,
    m.strong_skill_count,
    case
      when m.course_code is null then 'Select a course and complete the diagnostic.'
      when m.total_diagnostic_attempts = 0 then 'Complete the diagnostic so recommended practice can become accurate.'
      when m.weak_skill_count > 0 then 'Focus on weak skills first using recommended practice.'
      when m.developing_skill_count > 0 then 'Build developing skills to fluency with targeted practice.'
      else 'Use spaced mixed review to keep strong skills active.'
    end as next_steps
  from mastery m;
$$;

grant execute on function public.project_z_recommended_practice() to authenticated;
grant execute on function public.project_z_start_practice_skill(text) to authenticated;
grant execute on function public.project_z_practice_next_question(uuid) to authenticated;
grant execute on function public.project_z_submit_practice_answer(uuid, uuid, text) to authenticated;
grant execute on function public.project_z_student_learning_report(uuid) to authenticated;

select
  'Project Z Phase 13 recommended practice engine schema applied successfully' as status,
  now() as applied_at;

