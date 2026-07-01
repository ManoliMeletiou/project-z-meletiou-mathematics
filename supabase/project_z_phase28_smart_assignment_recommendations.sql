-- Project Z Phase 28 Smart Assignment Recommendations
-- Run after the app build/push succeeds.
-- Purpose: recommend teacher assignments from mastery, confidence, tutor evidence, and action-needed signals.

create extension if not exists pgcrypto;

create table if not exists public.project_z_assignment_recommendation_actions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.project_z_profiles(id) on delete set null,
  class_id uuid references public.project_z_classes(id) on delete set null,
  course_skill_code text,
  skill_title text,
  recommendation_type text,
  action text not null default 'copied'
    check (action in ('copied', 'planned', 'dismissed', 'created_elsewhere')),
  teacher_notes text,
  created_at timestamptz not null default now()
);

alter table public.project_z_assignment_recommendation_actions enable row level security;

drop policy if exists "teacher_assignment_recommendation_actions_own_select" on public.project_z_assignment_recommendation_actions;
create policy "teacher_assignment_recommendation_actions_own_select"
on public.project_z_assignment_recommendation_actions
for select
to authenticated
using (
  teacher_id = auth.uid()
);

create or replace function public.project_z_teacher_assignment_classes()
returns table (
  class_id uuid,
  class_label text,
  student_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    c.id as class_id,
    'Class ' || left(c.id::text, 8) as class_label,
    count(cm.student_id)::integer as student_count
  from public.project_z_classes c
  left join public.project_z_class_members cm
    on cm.class_id = c.id
  where c.teacher_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  group by c.id
  order by c.created_at desc nulls last, c.id;
$$;

create or replace function public.project_z_teacher_smart_assignment_recommendations(
  p_class_id uuid default null
)
returns table (
  recommendation_id text,
  class_id uuid,
  class_label text,
  course_code text,
  course_skill_code text,
  skill_title text,
  affected_students integer,
  weak_students integer,
  low_confidence_students integer,
  misconception_count integer,
  hint_needed_count integer,
  action_needed_count integer,
  average_mastery numeric,
  average_confidence numeric,
  priority_score numeric,
  priority_label text,
  recommendation_type text,
  suggested_assignment_title text,
  suggested_assignment_instructions text,
  suggested_duration_minutes integer,
  suggested_question_count integer,
  teacher_action text
)
language sql
security definer
set search_path = public
as $$
  with teacher_profile as (
    select id
    from public.project_z_profiles
    where id = auth.uid()
      and role = 'teacher'
  ),
  teacher_classes as (
    select c.id as class_id
    from public.project_z_classes c
    join teacher_profile tp on tp.id = c.teacher_id
    where (p_class_id is null or c.id = p_class_id)
  ),
  roster as (
    select distinct
      tc.class_id,
      cm.student_id
    from teacher_classes tc
    join public.project_z_class_members cm
      on cm.class_id = tc.class_id
  ),
  mastery_rows as (
    select
      r.class_id,
      r.student_id,
      m.course_skill_code,
      coalesce(sk.title, m.course_skill_code) as skill_title,
      coalesce(sk.course_code, split_part(m.course_skill_code, '.', 1)) as course_code,
      coalesce(m.mastery_percent, 0) as mastery_percent,
      coalesce(m.confidence_percent, 0) as confidence_percent,
      coalesce(m.evidence_count, 0) as evidence_count
    from roster r
    join public.project_z_curriculum_mastery m
      on m.user_id = r.student_id
    left join public.project_z_curriculum_skills sk
      on sk.course_skill_code = m.course_skill_code
  ),
  tutor_rows as (
    select
      r.class_id,
      e.user_id as student_id,
      e.course_skill_code,
      count(*) filter (where e.evidence_type = 'misconception')::integer as misconception_count,
      count(*) filter (where e.evidence_type = 'hint_needed')::integer as hint_needed_count,
      count(*) filter (where coalesce(e.teacher_review_status, 'pending') = 'action_needed')::integer as action_needed_count
    from roster r
    join public.project_z_tutor_learning_evidence e
      on e.user_id = r.student_id
    where e.course_skill_code is not null
      and e.created_at >= now() - interval '60 days'
    group by r.class_id, e.user_id, e.course_skill_code
  ),
  skill_summary as (
    select
      mr.class_id,
      mr.course_code,
      mr.course_skill_code,
      max(mr.skill_title) as skill_title,
      count(distinct mr.student_id)::integer as affected_students,
      count(distinct mr.student_id) filter (where mr.mastery_percent < 65)::integer as weak_students,
      count(distinct mr.student_id) filter (where mr.confidence_percent < 55)::integer as low_confidence_students,
      coalesce(sum(tr.misconception_count), 0)::integer as misconception_count,
      coalesce(sum(tr.hint_needed_count), 0)::integer as hint_needed_count,
      coalesce(sum(tr.action_needed_count), 0)::integer as action_needed_count,
      round(avg(mr.mastery_percent)::numeric, 1) as average_mastery,
      round(avg(mr.confidence_percent)::numeric, 1) as average_confidence
    from mastery_rows mr
    left join tutor_rows tr
      on tr.class_id = mr.class_id
      and tr.student_id = mr.student_id
      and tr.course_skill_code = mr.course_skill_code
    group by mr.class_id, mr.course_code, mr.course_skill_code
  ),
  scored as (
    select
      ss.*,
      round((
        (ss.weak_students * 12)
        + (ss.low_confidence_students * 7)
        + (ss.misconception_count * 10)
        + (ss.hint_needed_count * 4)
        + (ss.action_needed_count * 15)
        + greatest(0, 70 - ss.average_mastery)
      )::numeric, 1) as priority_score
    from skill_summary ss
    where
      ss.weak_students > 0
      or ss.low_confidence_students > 0
      or ss.misconception_count > 0
      or ss.hint_needed_count > 0
      or ss.action_needed_count > 0
  )
  select
    md5(s.class_id::text || ':' || s.course_skill_code) as recommendation_id,
    s.class_id,
    'Class ' || left(s.class_id::text, 8) as class_label,
    s.course_code,
    s.course_skill_code,
    s.skill_title,
    s.affected_students,
    s.weak_students,
    s.low_confidence_students,
    s.misconception_count,
    s.hint_needed_count,
    s.action_needed_count,
    s.average_mastery,
    s.average_confidence,
    s.priority_score,
    case
      when s.priority_score >= 90 then 'Urgent'
      when s.priority_score >= 55 then 'High'
      when s.priority_score >= 30 then 'Medium'
      else 'Low'
    end as priority_label,
    case
      when s.misconception_count > 0 or s.action_needed_count > 0 then 'Misconception repair'
      when s.average_mastery < 45 then 'Foundation rebuild'
      when s.low_confidence_students > s.weak_students then 'Confidence practice'
      else 'Targeted practice'
    end as recommendation_type,
    case
      when s.misconception_count > 0 or s.action_needed_count > 0 then 'Repair misconceptions: ' || s.skill_title
      when s.average_mastery < 45 then 'Foundation rebuild: ' || s.skill_title
      when s.low_confidence_students > s.weak_students then 'Confidence practice: ' || s.skill_title
      else 'Targeted practice: ' || s.skill_title
    end as suggested_assignment_title,
    case
      when s.misconception_count > 0 or s.action_needed_count > 0 then
        'Create a short diagnostic-style assignment. Start with 2 worked examples, then include 6 to 8 questions that reveal the misconception. Ask students to explain one error and correct it.'
      when s.average_mastery < 45 then
        'Create a foundation rebuild assignment. Use simple questions first, then gradually increase difficulty. Include hints and one reflection question.'
      when s.low_confidence_students > s.weak_students then
        'Create a confidence-building assignment. Use accessible questions, immediate feedback, and one challenge question at the end.'
      else
        'Create a targeted practice assignment. Use mixed questions on this skill, include one real-world or Criterion-style explanation question, and review results next lesson.'
    end as suggested_assignment_instructions,
    case
      when s.priority_score >= 90 then 25
      when s.priority_score >= 55 then 20
      else 15
    end as suggested_duration_minutes,
    case
      when s.priority_score >= 90 then 12
      when s.priority_score >= 55 then 10
      else 8
    end as suggested_question_count,
    'Review recommendation, copy plan, then create an assignment in the normal assignment page.' as teacher_action
  from scored s
  order by s.priority_score desc, s.weak_students desc, s.course_skill_code
  limit 60;
$$;

create or replace function public.project_z_log_assignment_recommendation_action(
  p_class_id uuid,
  p_course_skill_code text,
  p_skill_title text,
  p_recommendation_type text,
  p_action text default 'copied',
  p_teacher_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  allowed boolean := false;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_action not in ('copied', 'planned', 'dismissed', 'created_elsewhere') then
    raise exception 'Invalid recommendation action';
  end if;

  select role
  into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if coalesce(caller_role, '') <> 'teacher' then
    raise exception 'Only teachers can log assignment recommendation actions';
  end if;

  select exists (
    select 1
    from public.project_z_classes c
    where c.id = p_class_id
      and c.teacher_id = auth.uid()
  )
  into allowed;

  if not allowed then
    raise exception 'You can only log recommendation actions for your own classes';
  end if;

  insert into public.project_z_assignment_recommendation_actions (
    teacher_id,
    class_id,
    course_skill_code,
    skill_title,
    recommendation_type,
    action,
    teacher_notes,
    created_at
  )
  values (
    auth.uid(),
    p_class_id,
    p_course_skill_code,
    p_skill_title,
    p_recommendation_type,
    p_action,
    p_teacher_notes,
    now()
  )
  returning id into new_id;

  return jsonb_build_object(
    'ok', true,
    'id', new_id,
    'action', p_action
  );
end;
$$;

create or replace function public.project_z_assignment_recommendation_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-28-smart-assignment-recommendations',
    'uses_mastery', true,
    'uses_confidence', true,
    'uses_tutor_evidence', true,
    'uses_teacher_review_signals', true,
    'teacher_class_scoped', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_teacher_assignment_classes() to authenticated;
grant execute on function public.project_z_teacher_smart_assignment_recommendations(uuid) to authenticated;
grant execute on function public.project_z_log_assignment_recommendation_action(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.project_z_assignment_recommendation_status() to authenticated;

select
  'Project Z Phase 28 smart assignment recommendations schema applied successfully' as status,
  now() as applied_at;
