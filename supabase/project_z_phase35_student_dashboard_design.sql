-- Project Z Phase 35 User-Friendly Student Dashboard
-- Run after the app build/push succeeds.
-- Purpose: one beautiful, simple student home page showing next actions, progress, assignments, memo, corrections, and tutor.

create or replace function public.project_z_student_dashboard_summary()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with student_profile as (
    select p.id, p.email
    from public.project_z_profiles p
    where p.id = auth.uid()
      and p.role = 'student'
  ),
  assigned as (
    select
      a.id as assignment_id,
      a.question_count,
      a.memorandum_released
    from public.project_z_generated_assignments a
    join public.project_z_class_members cm
      on cm.class_id = a.class_id
    join student_profile sp
      on sp.id = cm.student_id
    where a.status = 'assigned'
  ),
  responses as (
    select
      r.assignment_id,
      count(r.id) filter (where coalesce(r.answer_text, '') <> '' or coalesce(r.selected_option, '') <> '')::integer as answered_count,
      count(r.id) filter (where r.is_submitted = true)::integer as submitted_count,
      count(r.id) filter (where r.is_correct = true)::integer as correct_count,
      count(r.id) filter (where r.is_correct = false or r.teacher_review_status = 'needs_revision')::integer as needs_correction_count
    from public.project_z_generated_assignment_student_responses r
    where r.student_id = auth.uid()
    group by r.assignment_id
  ),
  corrections as (
    select
      c.assignment_id,
      count(c.id) filter (where c.status in ('draft', 'submitted', 'reviewed', 'accepted', 'needs_more_work'))::integer as corrections_started,
      count(c.id) filter (where c.status in ('submitted', 'reviewed', 'accepted', 'needs_more_work'))::integer as corrections_submitted,
      count(c.id) filter (where c.status = 'accepted')::integer as corrections_accepted,
      count(c.id) filter (where c.status = 'needs_more_work')::integer as corrections_needing_more_work
    from public.project_z_generated_assignment_corrections c
    where c.student_id = auth.uid()
    group by c.assignment_id
  ),
  mastery as (
    select
      round(avg(m.mastery_percent)::numeric, 1) as average_mastery,
      round(avg(m.confidence_percent)::numeric, 1) as average_confidence,
      count(*)::integer as skill_count,
      count(*) filter (where m.mastery_percent >= 75)::integer as strong_skills,
      count(*) filter (where m.mastery_percent < 50)::integer as weak_skills
    from public.project_z_curriculum_mastery m
    where m.user_id = auth.uid()
  ),
  totals as (
    select
      count(a.assignment_id)::integer as active_assignments,
      count(a.assignment_id) filter (where coalesce(r.submitted_count, 0) < a.question_count)::integer as assignments_to_do,
      coalesce(sum(greatest(a.question_count - coalesce(r.submitted_count, 0), 0)), 0)::integer as questions_left,
      count(a.assignment_id) filter (where a.memorandum_released = true)::integer as released_memorandums,
      coalesce(sum(coalesce(r.needs_correction_count, 0)), 0)::integer as corrections_needed,
      coalesce(sum(coalesce(c.corrections_submitted, 0)), 0)::integer as corrections_submitted,
      coalesce(sum(coalesce(c.corrections_accepted, 0)), 0)::integer as corrections_accepted,
      coalesce(sum(coalesce(c.corrections_needing_more_work, 0)), 0)::integer as corrections_needing_more_work
    from assigned a
    left join responses r
      on r.assignment_id = a.assignment_id
    left join corrections c
      on c.assignment_id = a.assignment_id
  )
  select jsonb_build_object(
    'ok', true,
    'student_email', (select email from student_profile limit 1),
    'active_assignments', coalesce(t.active_assignments, 0),
    'assignments_to_do', coalesce(t.assignments_to_do, 0),
    'questions_left', coalesce(t.questions_left, 0),
    'released_memorandums', coalesce(t.released_memorandums, 0),
    'corrections_needed', coalesce(t.corrections_needed, 0),
    'corrections_submitted', coalesce(t.corrections_submitted, 0),
    'corrections_accepted', coalesce(t.corrections_accepted, 0),
    'corrections_needing_more_work', coalesce(t.corrections_needing_more_work, 0),
    'average_mastery', coalesce(m.average_mastery, 0),
    'average_confidence', coalesce(m.average_confidence, 0),
    'skill_count', coalesce(m.skill_count, 0),
    'strong_skills', coalesce(m.strong_skills, 0),
    'weak_skills', coalesce(m.weak_skills, 0),
    'generated_at', now()
  )
  from totals t
  cross join mastery m;
$$;

create or replace function public.project_z_student_dashboard_next_actions()
returns table (
  action_id text,
  priority_label text,
  action_type text,
  title text,
  description text,
  button_label text,
  page_path text,
  assignment_id uuid,
  assignment_title text,
  course_skill_code text,
  skill_title text,
  progress_percent numeric,
  sort_order integer
)
language sql
security definer
set search_path = public
as $$
  with student_profile as (
    select p.id
    from public.project_z_profiles p
    where p.id = auth.uid()
      and p.role = 'student'
  ),
  assigned as (
    select
      a.id as assignment_id,
      a.assignment_title,
      a.course_skill_code,
      a.skill_title,
      a.question_count,
      a.memorandum_released,
      a.updated_at
    from public.project_z_generated_assignments a
    join public.project_z_class_members cm
      on cm.class_id = a.class_id
    join student_profile sp
      on sp.id = cm.student_id
    where a.status = 'assigned'
  ),
  response_summary as (
    select
      r.assignment_id,
      count(r.id) filter (where coalesce(r.answer_text, '') <> '' or coalesce(r.selected_option, '') <> '')::integer as answered_count,
      count(r.id) filter (where r.is_submitted = true)::integer as submitted_count,
      count(r.id) filter (where r.is_correct = false or r.teacher_review_status = 'needs_revision')::integer as needs_correction_count
    from public.project_z_generated_assignment_student_responses r
    where r.student_id = auth.uid()
    group by r.assignment_id
  ),
  correction_summary as (
    select
      c.assignment_id,
      count(c.id) filter (where c.status in ('submitted', 'reviewed', 'accepted', 'needs_more_work'))::integer as corrections_submitted,
      count(c.id) filter (where c.status = 'needs_more_work')::integer as corrections_needing_more_work
    from public.project_z_generated_assignment_corrections c
    where c.student_id = auth.uid()
    group by c.assignment_id
  ),
  assignment_actions as (
    select
      ('assignment-' || a.assignment_id::text) as action_id,
      case
        when coalesce(r.submitted_count, 0) = 0 then 'Important'
        else 'Continue'
      end as priority_label,
      'assignment' as action_type,
      case
        when coalesce(r.submitted_count, 0) = 0 then 'Start your assignment'
        else 'Continue your assignment'
      end as title,
      case
        when coalesce(r.submitted_count, 0) = 0 then 'Your teacher has published this assignment. Start with question 1 and save your answers as you go.'
        else 'You have started this assignment. Finish the remaining questions and submit them.'
      end as description,
      case
        when coalesce(r.submitted_count, 0) = 0 then 'Start assignment'
        else 'Continue assignment'
      end as button_label,
      '/student-generated-assignments' as page_path,
      a.assignment_id,
      a.assignment_title,
      a.course_skill_code,
      a.skill_title,
      case
        when a.question_count > 0 then round((coalesce(r.submitted_count, 0)::numeric / a.question_count::numeric) * 100, 1)
        else 0
      end as progress_percent,
      case
        when coalesce(r.submitted_count, 0) = 0 then 10
        else 20
      end as sort_order,
      a.updated_at
    from assigned a
    left join response_summary r
      on r.assignment_id = a.assignment_id
    where coalesce(r.submitted_count, 0) < a.question_count
  ),
  corrections_actions as (
    select
      ('corrections-' || a.assignment_id::text) as action_id,
      case
        when coalesce(c.corrections_needing_more_work, 0) > 0 then 'Urgent'
        else 'Important'
      end as priority_label,
      'corrections' as action_type,
      case
        when coalesce(c.corrections_needing_more_work, 0) > 0 then 'Improve your corrections'
        else 'Submit your corrections'
      end as title,
      case
        when coalesce(c.corrections_needing_more_work, 0) > 0 then 'Your teacher wants you to improve one or more corrections. Read the feedback and try again.'
        else 'Use the memorandum to fix your mistakes and explain what you understand now.'
      end as description,
      case
        when coalesce(c.corrections_needing_more_work, 0) > 0 then 'Improve corrections'
        else 'Open corrections'
      end as button_label,
      '/student-corrections' as page_path,
      a.assignment_id,
      a.assignment_title,
      a.course_skill_code,
      a.skill_title,
      case
        when coalesce(r.needs_correction_count, 0) > 0 then
          round((coalesce(c.corrections_submitted, 0)::numeric / r.needs_correction_count::numeric) * 100, 1)
        else 0
      end as progress_percent,
      case
        when coalesce(c.corrections_needing_more_work, 0) > 0 then 1
        else 5
      end as sort_order,
      a.updated_at
    from assigned a
    left join response_summary r
      on r.assignment_id = a.assignment_id
    left join correction_summary c
      on c.assignment_id = a.assignment_id
    where a.memorandum_released = true
      and coalesce(r.needs_correction_count, 0) > coalesce(c.corrections_submitted, 0)
       or coalesce(c.corrections_needing_more_work, 0) > 0
  ),
  memo_actions as (
    select
      ('memo-' || a.assignment_id::text) as action_id,
      'Review' as priority_label,
      'memorandum' as action_type,
      'Review the memorandum' as title,
      'Your teacher released the memorandum. Check the correct answers and explanations before doing corrections.'
        as description,
      'Open memorandum' as button_label,
      '/student-memorandum' as page_path,
      a.assignment_id,
      a.assignment_title,
      a.course_skill_code,
      a.skill_title,
      100::numeric as progress_percent,
      30 as sort_order,
      a.updated_at
    from assigned a
    left join response_summary r
      on r.assignment_id = a.assignment_id
    where a.memorandum_released = true
      and coalesce(r.submitted_count, 0) > 0
  ),
  tutor_action as (
    select
      'tutor-help' as action_id,
      'Help' as priority_label,
      'tutor' as action_type,
      'Need help? Ask the tutor' as title,
      'Use the tutor to get hints, not just final answers. It can help you understand the next step.'
        as description,
      'Open tutor' as button_label,
      '/tutor' as page_path,
      null::uuid as assignment_id,
      null::text as assignment_title,
      null::text as course_skill_code,
      'Personal help' as skill_title,
      0::numeric as progress_percent,
      90 as sort_order,
      now() as updated_at
    from student_profile
  )
  select
    action_id,
    priority_label,
    action_type,
    title,
    description,
    button_label,
    page_path,
    assignment_id,
    assignment_title,
    course_skill_code,
    skill_title,
    progress_percent,
    sort_order
  from (
    select * from corrections_actions
    union all
    select * from assignment_actions
    union all
    select * from memo_actions
    union all
    select * from tutor_action
  ) actions
  order by sort_order, updated_at desc nulls last
  limit 12;
$$;

create or replace function public.project_z_student_dashboard_recent_skills()
returns table (
  course_skill_code text,
  skill_title text,
  mastery_percent numeric,
  confidence_percent numeric,
  evidence_count integer,
  status_label text,
  suggestion text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    m.course_skill_code,
    coalesce(cs.title, m.course_skill_code) as skill_title,
    round(m.mastery_percent::numeric, 1) as mastery_percent,
    round(m.confidence_percent::numeric, 1) as confidence_percent,
    m.evidence_count,
    case
      when m.mastery_percent >= 75 then 'Strong'
      when m.mastery_percent >= 50 then 'Growing'
      else 'Needs practice'
    end as status_label,
    case
      when m.mastery_percent >= 75 then 'Keep it fresh with a few mixed questions.'
      when m.mastery_percent >= 50 then 'Practise two or three more examples to make it stick.'
      else 'Ask the tutor for help and review the basics before trying harder questions.'
    end as suggestion,
    m.updated_at
  from public.project_z_curriculum_mastery m
  left join public.project_z_curriculum_skills cs
    on cs.course_skill_code = m.course_skill_code
  where m.user_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )
  order by m.updated_at desc nulls last, m.mastery_percent asc
  limit 8;
$$;

create or replace function public.project_z_student_dashboard_design_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-35-student-dashboard-design',
    'user_friendly_student_home', true,
    'next_actions', true,
    'beautiful_student_dashboard', true,
    'assignments_memorandums_corrections_tutor_progress', true,
    'student_language_not_teacher_language', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_student_dashboard_summary() to authenticated;
grant execute on function public.project_z_student_dashboard_next_actions() to authenticated;
grant execute on function public.project_z_student_dashboard_recent_skills() to authenticated;
grant execute on function public.project_z_student_dashboard_design_status() to authenticated;

select
  'Project Z Phase 35 student dashboard design schema applied successfully' as status,
  now() as applied_at;
