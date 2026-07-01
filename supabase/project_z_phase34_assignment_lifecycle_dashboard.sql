-- Project Z Phase 34 User-friendly Teacher Assignment Lifecycle Dashboard
-- Run after the app build/push succeeds.
-- Purpose: one dashboard showing generated, audited, published, submitted, reviewed, memo, corrections, and next action.

create or replace function public.project_z_teacher_assignment_lifecycle_dashboard()
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
  actual_question_count integer,
  status text,
  memorandum_released boolean,
  created_at timestamptz,
  updated_at timestamptz,
  student_count integer,
  audit_count integer,
  unresolved_flag_count integer,
  answered_responses integer,
  submitted_responses integer,
  reviewed_responses integer,
  needs_revision_responses integer,
  corrections_submitted integer,
  corrections_reviewed integer,
  corrections_accepted integer,
  corrections_needing_more_work integer,
  lifecycle_stage text,
  urgency_label text,
  user_friendly_next_action text,
  next_page_path text,
  completion_percent numeric
)
language sql
security definer
set search_path = public
as $$
  with teacher_assignments as (
    select a.*
    from public.project_z_generated_assignments a
    join public.project_z_profiles p
      on p.id = auth.uid()
    where a.teacher_id = auth.uid()
      and p.role = 'teacher'
  ),
  question_counts as (
    select
      q.assignment_id,
      count(*)::integer as actual_question_count
    from public.project_z_generated_assignment_questions q
    group by q.assignment_id
  ),
  roster_counts as (
    select
      cm.class_id,
      count(distinct cm.student_id)::integer as student_count
    from public.project_z_class_members cm
    group by cm.class_id
  ),
  audit_counts as (
    select
      l.assignment_id,
      count(*)::integer as audit_count,
      count(*) filter (
        where l.audit_status = 'flagged'
          and not exists (
            select 1
            from public.project_z_assignment_quality_audits later_log
            where later_log.assignment_id = l.assignment_id
              and later_log.question_id is not distinct from l.question_id
              and later_log.created_at > l.created_at
              and later_log.audit_status in ('approved', 'regenerated', 'ignored', 'passed')
          )
      )::integer as unresolved_flag_count
    from public.project_z_assignment_quality_audits l
    group by l.assignment_id
  ),
  response_counts as (
    select
      r.assignment_id,
      count(r.id) filter (where coalesce(r.answer_text, '') <> '' or coalesce(r.selected_option, '') <> '')::integer as answered_responses,
      count(r.id) filter (where r.is_submitted = true)::integer as submitted_responses,
      count(r.id) filter (where r.teacher_review_status = 'reviewed')::integer as reviewed_responses,
      count(r.id) filter (where r.teacher_review_status = 'needs_revision')::integer as needs_revision_responses
    from public.project_z_generated_assignment_student_responses r
    group by r.assignment_id
  ),
  correction_counts as (
    select
      c.assignment_id,
      count(c.id) filter (where c.status in ('submitted', 'reviewed', 'accepted', 'needs_more_work'))::integer as corrections_submitted,
      count(c.id) filter (where c.status in ('reviewed', 'accepted', 'needs_more_work'))::integer as corrections_reviewed,
      count(c.id) filter (where c.status = 'accepted')::integer as corrections_accepted,
      count(c.id) filter (where c.status = 'needs_more_work')::integer as corrections_needing_more_work
    from public.project_z_generated_assignment_corrections c
    group by c.assignment_id
  ),
  combined as (
    select
      a.id as assignment_id,
      a.class_id,
      'Class ' || left(a.class_id::text, 8) as class_label,
      a.assignment_title,
      a.course_code,
      a.course_skill_code,
      a.skill_title,
      a.assignment_level,
      coalesce(a.question_count, 0)::integer as question_count,
      coalesce(qc.actual_question_count, 0)::integer as actual_question_count,
      a.status,
      coalesce(a.memorandum_released, false) as memorandum_released,
      a.created_at,
      a.updated_at,
      coalesce(rc.student_count, 0)::integer as student_count,
      coalesce(ac.audit_count, 0)::integer as audit_count,
      coalesce(ac.unresolved_flag_count, 0)::integer as unresolved_flag_count,
      coalesce(resp.answered_responses, 0)::integer as answered_responses,
      coalesce(resp.submitted_responses, 0)::integer as submitted_responses,
      coalesce(resp.reviewed_responses, 0)::integer as reviewed_responses,
      coalesce(resp.needs_revision_responses, 0)::integer as needs_revision_responses,
      coalesce(corr.corrections_submitted, 0)::integer as corrections_submitted,
      coalesce(corr.corrections_reviewed, 0)::integer as corrections_reviewed,
      coalesce(corr.corrections_accepted, 0)::integer as corrections_accepted,
      coalesce(corr.corrections_needing_more_work, 0)::integer as corrections_needing_more_work
    from teacher_assignments a
    left join question_counts qc
      on qc.assignment_id = a.id
    left join roster_counts rc
      on rc.class_id = a.class_id
    left join audit_counts ac
      on ac.assignment_id = a.id
    left join response_counts resp
      on resp.assignment_id = a.id
    left join correction_counts corr
      on corr.assignment_id = a.id
  )
  select
    c.assignment_id,
    c.class_id,
    c.class_label,
    c.assignment_title,
    c.course_code,
    c.course_skill_code,
    c.skill_title,
    c.assignment_level,
    c.question_count,
    c.actual_question_count,
    c.status,
    c.memorandum_released,
    c.created_at,
    c.updated_at,
    c.student_count,
    c.audit_count,
    c.unresolved_flag_count,
    c.answered_responses,
    c.submitted_responses,
    c.reviewed_responses,
    c.needs_revision_responses,
    c.corrections_submitted,
    c.corrections_reviewed,
    c.corrections_accepted,
    c.corrections_needing_more_work,
    case
      when c.actual_question_count < 30 then 'Fix generated assignment'
      when c.unresolved_flag_count > 0 then 'Resolve audit flags'
      when c.status <> 'assigned' then 'Ready to publish'
      when c.status = 'assigned' and c.submitted_responses = 0 then 'Waiting for students'
      when c.submitted_responses > c.reviewed_responses then 'Review submissions'
      when c.memorandum_released = false then 'Release memorandum'
      when c.corrections_submitted > c.corrections_reviewed then 'Review corrections'
      when c.corrections_needing_more_work > 0 then 'Corrections need follow-up'
      else 'Lifecycle complete'
    end as lifecycle_stage,
    case
      when c.actual_question_count < 30 then 'Urgent'
      when c.unresolved_flag_count > 0 then 'Urgent'
      when c.submitted_responses > c.reviewed_responses then 'High'
      when c.corrections_submitted > c.corrections_reviewed then 'High'
      when c.status <> 'assigned' then 'Medium'
      when c.memorandum_released = false and c.submitted_responses > 0 then 'Medium'
      else 'Low'
    end as urgency_label,
    case
      when c.actual_question_count < 30 then 'Open Generated Assignments and regenerate or rebuild this assignment so it has at least 30 questions.'
      when c.unresolved_flag_count > 0 then 'Open Quality Audit and fix flagged questions before publishing.'
      when c.status <> 'assigned' then 'Publish this assignment to students when you are ready.'
      when c.status = 'assigned' and c.submitted_responses = 0 then 'No student submissions yet. Give students time or remind the class.'
      when c.submitted_responses > c.reviewed_responses then 'Review submitted student answers and give feedback.'
      when c.memorandum_released = false then 'Release the memorandum so students can study corrections.'
      when c.corrections_submitted > c.corrections_reviewed then 'Review student corrections and accept or send back for more work.'
      when c.corrections_needing_more_work > 0 then 'Some corrections need more work. Follow up with those students.'
      else 'No immediate action needed. This assignment cycle is complete.'
    end as user_friendly_next_action,
    case
      when c.actual_question_count < 30 then '/generated-assignments'
      when c.unresolved_flag_count > 0 then '/assignment-audit'
      when c.status <> 'assigned' then '/generated-assignments'
      when c.status = 'assigned' and c.submitted_responses = 0 then '/student-generated-assignments'
      when c.submitted_responses > c.reviewed_responses then '/teacher-submission-review'
      when c.memorandum_released = false then '/teacher-submission-review'
      when c.corrections_submitted > c.corrections_reviewed then '/teacher-corrections-review'
      when c.corrections_needing_more_work > 0 then '/teacher-corrections-review'
      else '/generated-assignments'
    end as next_page_path,
    least(100, greatest(0,
      round((
        (case when c.actual_question_count >= 30 then 15 else 0 end) +
        (case when c.audit_count > 0 and c.unresolved_flag_count = 0 then 15 else 0 end) +
        (case when c.status = 'assigned' then 15 else 0 end) +
        (case when c.submitted_responses > 0 then 15 else 0 end) +
        (case when c.reviewed_responses >= c.submitted_responses and c.submitted_responses > 0 then 15 else 0 end) +
        (case when c.memorandum_released then 15 else 0 end) +
        (case when c.corrections_submitted = 0 then 0 when c.corrections_reviewed >= c.corrections_submitted then 10 else 5 end)
      )::numeric, 1)
    )) as completion_percent
  from combined c
  order by
    case
      when c.actual_question_count < 30 then 0
      when c.unresolved_flag_count > 0 then 1
      when c.submitted_responses > c.reviewed_responses then 2
      when c.corrections_submitted > c.corrections_reviewed then 3
      when c.status <> 'assigned' then 4
      when c.memorandum_released = false then 5
      else 6
    end,
    c.updated_at desc nulls last,
    c.created_at desc;
$$;

create or replace function public.project_z_teacher_assignment_lifecycle_summary()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with rows as (
    select *
    from public.project_z_teacher_assignment_lifecycle_dashboard()
  )
  select jsonb_build_object(
    'ok', true,
    'total_assignments', count(*),
    'urgent_count', count(*) filter (where urgency_label = 'Urgent'),
    'high_count', count(*) filter (where urgency_label = 'High'),
    'ready_to_publish', count(*) filter (where lifecycle_stage = 'Ready to publish'),
    'needs_submission_review', count(*) filter (where lifecycle_stage = 'Review submissions'),
    'needs_correction_review', count(*) filter (where lifecycle_stage = 'Review corrections'),
    'complete_count', count(*) filter (where lifecycle_stage = 'Lifecycle complete'),
    'average_completion_percent', round(avg(completion_percent)::numeric, 1)
  )
  from rows;
$$;

create or replace function public.project_z_assignment_lifecycle_dashboard_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-34-assignment-lifecycle-dashboard',
    'user_friendly_dashboard', true,
    'single_teacher_overview', true,
    'next_action_guidance', true,
    'lifecycle_stage_tracking', true,
    'urgent_items_first', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_teacher_assignment_lifecycle_dashboard() to authenticated;
grant execute on function public.project_z_teacher_assignment_lifecycle_summary() to authenticated;
grant execute on function public.project_z_assignment_lifecycle_dashboard_status() to authenticated;

select
  'Project Z Phase 34 assignment lifecycle dashboard schema applied successfully' as status,
  now() as applied_at;
