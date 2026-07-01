-- Project Z Phase 36 User-Friendly Parent Dashboard
-- Run after the app build/push succeeds.
-- Purpose: parents get a simple, beautiful, safe overview of child progress, assignments, corrections, and support steps.

create or replace function public.project_z_parent_dashboard_overview(
  p_student_id uuid default null
)
returns table (
  student_id uuid,
  child_email text,
  child_name text,
  active_assignments integer,
  assignments_to_do integer,
  questions_left integer,
  memorandums_released integer,
  corrections_needed integer,
  corrections_submitted integer,
  corrections_accepted integer,
  corrections_needing_more_work integer,
  average_mastery numeric,
  average_confidence numeric,
  strong_skills integer,
  weak_skills integer,
  status_label text,
  parent_friendly_next_step text,
  support_tip text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with allowed_children as (
    select
      l.student_id,
      coalesce(p.email, 'student') as child_email,
      coalesce(split_part(p.email, '@', 1), 'Student') as child_name
    from public.project_z_parent_student_links l
    join public.project_z_profiles parent_profile
      on parent_profile.id = auth.uid()
      and parent_profile.role = 'parent'
    left join public.project_z_profiles p
      on p.id = l.student_id
    where l.parent_id = auth.uid()
      and (p_student_id is null or l.student_id = p_student_id)
  ),
  assigned as (
    select
      ac.student_id,
      a.id as assignment_id,
      a.question_count,
      a.memorandum_released,
      a.updated_at
    from allowed_children ac
    join public.project_z_class_members cm
      on cm.student_id = ac.student_id
    join public.project_z_generated_assignments a
      on a.class_id = cm.class_id
    where a.status = 'assigned'
  ),
  response_summary as (
    select
      r.student_id,
      r.assignment_id,
      count(r.id) filter (where coalesce(r.answer_text, '') <> '' or coalesce(r.selected_option, '') <> '')::integer as answered_count,
      count(r.id) filter (where r.is_submitted = true)::integer as submitted_count,
      count(r.id) filter (where r.is_correct = false or r.teacher_review_status = 'needs_revision')::integer as needs_correction_count,
      max(r.updated_at) as latest_response_at
    from public.project_z_generated_assignment_student_responses r
    join allowed_children ac
      on ac.student_id = r.student_id
    group by r.student_id, r.assignment_id
  ),
  correction_summary as (
    select
      c.student_id,
      c.assignment_id,
      count(c.id) filter (where c.status in ('submitted', 'reviewed', 'accepted', 'needs_more_work'))::integer as corrections_submitted,
      count(c.id) filter (where c.status = 'accepted')::integer as corrections_accepted,
      count(c.id) filter (where c.status = 'needs_more_work')::integer as corrections_needing_more_work,
      max(c.updated_at) as latest_correction_at
    from public.project_z_generated_assignment_corrections c
    join allowed_children ac
      on ac.student_id = c.student_id
    group by c.student_id, c.assignment_id
  ),
  mastery_summary as (
    select
      m.user_id as student_id,
      round(avg(m.mastery_percent)::numeric, 1) as average_mastery,
      round(avg(m.confidence_percent)::numeric, 1) as average_confidence,
      count(*) filter (where m.mastery_percent >= 75)::integer as strong_skills,
      count(*) filter (where m.mastery_percent < 50)::integer as weak_skills,
      max(m.updated_at) as latest_mastery_at
    from public.project_z_curriculum_mastery m
    join allowed_children ac
      on ac.student_id = m.user_id
    group by m.user_id
  ),
  totals as (
    select
      ac.student_id,
      count(distinct a.assignment_id)::integer as active_assignments,
      count(distinct a.assignment_id) filter (where coalesce(rs.submitted_count, 0) < a.question_count)::integer as assignments_to_do,
      coalesce(sum(greatest(a.question_count - coalesce(rs.submitted_count, 0), 0)), 0)::integer as questions_left,
      count(distinct a.assignment_id) filter (where a.memorandum_released = true)::integer as memorandums_released,
      coalesce(sum(coalesce(rs.needs_correction_count, 0)), 0)::integer as corrections_needed,
      coalesce(sum(coalesce(cs.corrections_submitted, 0)), 0)::integer as corrections_submitted,
      coalesce(sum(coalesce(cs.corrections_accepted, 0)), 0)::integer as corrections_accepted,
      coalesce(sum(coalesce(cs.corrections_needing_more_work, 0)), 0)::integer as corrections_needing_more_work,
      greatest(
        coalesce(max(a.updated_at), 'epoch'::timestamptz),
        coalesce(max(rs.latest_response_at), 'epoch'::timestamptz),
        coalesce(max(cs.latest_correction_at), 'epoch'::timestamptz)
      ) as latest_activity_at
    from allowed_children ac
    left join assigned a
      on a.student_id = ac.student_id
    left join response_summary rs
      on rs.student_id = ac.student_id
      and rs.assignment_id = a.assignment_id
    left join correction_summary cs
      on cs.student_id = ac.student_id
      and cs.assignment_id = a.assignment_id
    group by ac.student_id
  )
  select
    ac.student_id,
    ac.child_email,
    ac.child_name,
    coalesce(t.active_assignments, 0) as active_assignments,
    coalesce(t.assignments_to_do, 0) as assignments_to_do,
    coalesce(t.questions_left, 0) as questions_left,
    coalesce(t.memorandums_released, 0) as memorandums_released,
    coalesce(t.corrections_needed, 0) as corrections_needed,
    coalesce(t.corrections_submitted, 0) as corrections_submitted,
    coalesce(t.corrections_accepted, 0) as corrections_accepted,
    coalesce(t.corrections_needing_more_work, 0) as corrections_needing_more_work,
    coalesce(ms.average_mastery, 0) as average_mastery,
    coalesce(ms.average_confidence, 0) as average_confidence,
    coalesce(ms.strong_skills, 0) as strong_skills,
    coalesce(ms.weak_skills, 0) as weak_skills,
    case
      when coalesce(t.corrections_needing_more_work, 0) > 0 then 'Needs support'
      when coalesce(t.assignments_to_do, 0) > 0 then 'Work to complete'
      when coalesce(t.corrections_needed, 0) > coalesce(t.corrections_submitted, 0) then 'Corrections to do'
      when coalesce(ms.average_mastery, 0) >= 75 then 'Doing well'
      when coalesce(ms.average_mastery, 0) >= 50 then 'Making progress'
      else 'Needs practice'
    end as status_label,
    case
      when coalesce(t.corrections_needing_more_work, 0) > 0 then 'Your child has corrections that need another try. Encourage them to read the feedback carefully and explain their improved answer.'
      when coalesce(t.assignments_to_do, 0) > 0 then 'Your child has an assignment to finish. A helpful check-in is: “What is the next question you need to complete?”'
      when coalesce(t.corrections_needed, 0) > coalesce(t.corrections_submitted, 0) then 'The memorandum is available and corrections are still needed. Encourage your child to write what they now understand, not just copy the answer.'
      when coalesce(t.memorandums_released, 0) > 0 then 'A memorandum has been released. Ask your child to explain one corrected question in their own words.'
      else 'There is no urgent action right now. Encourage steady practice and confidence.'
    end as parent_friendly_next_step,
    case
      when coalesce(ms.average_confidence, 0) < 45 then 'Keep the tone calm: confidence grows when mistakes are treated as useful information.'
      when coalesce(t.questions_left, 0) > 0 then 'Set a short focused study block rather than a long stressful session.'
      when coalesce(t.corrections_accepted, 0) > 0 then 'Praise the improvement process, not only the final mark.'
      else 'A good support question is: “Can you teach me the idea in one minute?”'
    end as support_tip,
    greatest(
      coalesce(t.latest_activity_at, 'epoch'::timestamptz),
      coalesce(ms.latest_mastery_at, 'epoch'::timestamptz)
    ) as updated_at
  from allowed_children ac
  left join totals t
    on t.student_id = ac.student_id
  left join mastery_summary ms
    on ms.student_id = ac.student_id
  order by
    case
      when coalesce(t.corrections_needing_more_work, 0) > 0 then 0
      when coalesce(t.assignments_to_do, 0) > 0 then 1
      when coalesce(t.corrections_needed, 0) > coalesce(t.corrections_submitted, 0) then 2
      else 3
    end,
    updated_at desc nulls last;
$$;

create or replace function public.project_z_parent_dashboard_activity(
  p_student_id uuid
)
returns table (
  assignment_id uuid,
  assignment_title text,
  skill_title text,
  course_skill_code text,
  question_count integer,
  submitted_count integer,
  reviewed_count integer,
  memorandums_released boolean,
  corrections_needed integer,
  corrections_submitted integer,
  corrections_accepted integer,
  progress_percent numeric,
  parent_message text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with allowed as (
    select l.student_id
    from public.project_z_parent_student_links l
    join public.project_z_profiles p
      on p.id = auth.uid()
      and p.role = 'parent'
    where l.parent_id = auth.uid()
      and l.student_id = p_student_id
  ),
  assignments as (
    select
      a.id,
      a.assignment_title,
      a.skill_title,
      a.course_skill_code,
      a.question_count,
      a.memorandum_released,
      a.updated_at
    from allowed al
    join public.project_z_class_members cm
      on cm.student_id = al.student_id
    join public.project_z_generated_assignments a
      on a.class_id = cm.class_id
    where a.status = 'assigned'
  ),
  response_summary as (
    select
      r.assignment_id,
      count(r.id) filter (where r.is_submitted = true)::integer as submitted_count,
      count(r.id) filter (where r.teacher_review_status = 'reviewed')::integer as reviewed_count,
      count(r.id) filter (where r.is_correct = false or r.teacher_review_status = 'needs_revision')::integer as corrections_needed,
      max(r.updated_at) as latest_response_at
    from public.project_z_generated_assignment_student_responses r
    join allowed al
      on al.student_id = r.student_id
    group by r.assignment_id
  ),
  correction_summary as (
    select
      c.assignment_id,
      count(c.id) filter (where c.status in ('submitted', 'reviewed', 'accepted', 'needs_more_work'))::integer as corrections_submitted,
      count(c.id) filter (where c.status = 'accepted')::integer as corrections_accepted,
      max(c.updated_at) as latest_correction_at
    from public.project_z_generated_assignment_corrections c
    join allowed al
      on al.student_id = c.student_id
    group by c.assignment_id
  )
  select
    a.id as assignment_id,
    a.assignment_title,
    a.skill_title,
    a.course_skill_code,
    a.question_count,
    coalesce(rs.submitted_count, 0) as submitted_count,
    coalesce(rs.reviewed_count, 0) as reviewed_count,
    coalesce(a.memorandum_released, false) as memorandums_released,
    coalesce(rs.corrections_needed, 0) as corrections_needed,
    coalesce(cs.corrections_submitted, 0) as corrections_submitted,
    coalesce(cs.corrections_accepted, 0) as corrections_accepted,
    case
      when a.question_count > 0 then round((coalesce(rs.submitted_count, 0)::numeric / a.question_count::numeric) * 100, 1)
      else 0
    end as progress_percent,
    case
      when coalesce(rs.submitted_count, 0) < a.question_count then 'Assignment still in progress.'
      when coalesce(rs.reviewed_count, 0) < coalesce(rs.submitted_count, 0) then 'Teacher review is still in progress.'
      when coalesce(a.memorandum_released, false) = true and coalesce(rs.corrections_needed, 0) > coalesce(cs.corrections_submitted, 0) then 'Corrections are recommended after the memorandum.'
      when coalesce(cs.corrections_accepted, 0) > 0 then 'Corrections have been accepted. This is positive learning evidence.'
      else 'No urgent action on this assignment.'
    end as parent_message,
    greatest(
      coalesce(a.updated_at, 'epoch'::timestamptz),
      coalesce(rs.latest_response_at, 'epoch'::timestamptz),
      coalesce(cs.latest_correction_at, 'epoch'::timestamptz)
    ) as updated_at
  from assignments a
  left join response_summary rs
    on rs.assignment_id = a.id
  left join correction_summary cs
    on cs.assignment_id = a.id
  order by updated_at desc nulls last
  limit 10;
$$;

create or replace function public.project_z_parent_dashboard_skills(
  p_student_id uuid
)
returns table (
  course_skill_code text,
  skill_title text,
  mastery_percent numeric,
  confidence_percent numeric,
  status_label text,
  parent_tip text,
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
    case
      when m.mastery_percent >= 75 then 'Strength'
      when m.mastery_percent >= 50 then 'Developing'
      else 'Needs practice'
    end as status_label,
    case
      when m.mastery_percent >= 75 then 'Ask your child to explain the idea aloud to keep it strong.'
      when m.mastery_percent >= 50 then 'Short regular practice will help this become secure.'
      else 'Encourage your child to use hints, examples, and corrections instead of guessing.'
    end as parent_tip,
    m.updated_at
  from public.project_z_curriculum_mastery m
  join public.project_z_parent_student_links l
    on l.student_id = m.user_id
    and l.parent_id = auth.uid()
  join public.project_z_profiles parent_profile
    on parent_profile.id = auth.uid()
    and parent_profile.role = 'parent'
  left join public.project_z_curriculum_skills cs
    on cs.course_skill_code = m.course_skill_code
  where m.user_id = p_student_id
  order by
    case
      when m.mastery_percent < 50 then 0
      when m.mastery_percent >= 75 then 2
      else 1
    end,
    m.updated_at desc nulls last
  limit 8;
$$;

create or replace function public.project_z_parent_dashboard_design_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-36-parent-dashboard-design',
    'user_friendly_parent_home', true,
    'child_progress_overview', true,
    'parent_safe_no_raw_chats', true,
    'support_tips', true,
    'assignments_memos_corrections_progress', true,
    'beautiful_parent_dashboard', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_parent_dashboard_overview(uuid) to authenticated;
grant execute on function public.project_z_parent_dashboard_activity(uuid) to authenticated;
grant execute on function public.project_z_parent_dashboard_skills(uuid) to authenticated;
grant execute on function public.project_z_parent_dashboard_design_status() to authenticated;

select
  'Project Z Phase 36 parent dashboard design schema applied successfully' as status,
  now() as applied_at;
