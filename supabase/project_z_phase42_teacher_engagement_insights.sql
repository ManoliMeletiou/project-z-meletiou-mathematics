-- Project Z Phase 42 Teacher Engagement Insights
-- Purpose: teacher-safe view of student engagement signals from assignments, corrections, and quest progress.
-- Important: engagement signals are not formal marks, grades, IB criteria scores, or teacher judgement.

create or replace function public.project_z_teacher_engagement_classes()
returns table (
  class_id uuid,
  class_label text,
  assignment_count integer,
  student_count integer,
  latest_assignment_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with teacher_check as (
    select p.id
    from public.project_z_profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
  ),
  teacher_classes as (
    select
      a.class_id,
      count(distinct a.id)::integer as assignment_count,
      max(a.updated_at) as latest_assignment_at
    from public.project_z_generated_assignments a
    join teacher_check tc on tc.id = a.teacher_id
    group by a.class_id
  )
  select
    tc.class_id,
    'Class ' || left(tc.class_id::text, 8) as class_label,
    tc.assignment_count,
    count(distinct cm.student_id)::integer as student_count,
    tc.latest_assignment_at
  from teacher_classes tc
  left join public.project_z_class_members cm
    on cm.class_id = tc.class_id
  group by tc.class_id, tc.assignment_count, tc.latest_assignment_at
  order by tc.latest_assignment_at desc nulls last;
$$;

create or replace function public.project_z_teacher_engagement_insights(
  p_class_id uuid default null
)
returns table (
  student_id uuid,
  student_email text,
  class_id uuid,
  class_label text,
  active_assignments integer,
  submitted_responses integer,
  correct_responses integer,
  reviewed_responses integer,
  completion_percent numeric,
  accuracy_percent numeric,
  corrections_needed integer,
  corrections_submitted integer,
  corrections_accepted integer,
  correction_effort_percent numeric,
  total_xp integer,
  level integer,
  current_streak integer,
  longest_streak integer,
  last_checkin_date date,
  checked_in_today boolean,
  achievements_unlocked integer,
  engagement_status text,
  teacher_next_action text,
  caution_note text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with teacher_check as (
    select p.id
    from public.project_z_profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
  ),
  teacher_assignments as (
    select a.*
    from public.project_z_generated_assignments a
    join teacher_check tc
      on tc.id = a.teacher_id
    where p_class_id is null or a.class_id = p_class_id
  ),
  roster as (
    select distinct
      cm.student_id,
      cm.class_id
    from public.project_z_class_members cm
    join teacher_assignments a
      on a.class_id = cm.class_id
  ),
  questions as (
    select
      a.class_id,
      q.assignment_id,
      count(q.id)::integer as question_count
    from teacher_assignments a
    join public.project_z_generated_assignment_questions q
      on q.assignment_id = a.id
    group by a.class_id, q.assignment_id
  ),
  student_question_totals as (
    select
      r.student_id,
      ro.class_id,
      coalesce(sum(q.question_count), 0)::integer as total_questions
    from roster ro
    left join questions q
      on q.class_id = ro.class_id
    left join public.project_z_generated_assignment_student_responses r
      on r.student_id = ro.student_id
      and r.assignment_id = q.assignment_id
    group by r.student_id, ro.class_id
  ),
  response_summary as (
    select
      ro.student_id,
      ro.class_id,
      count(resp.id) filter (where resp.is_submitted = true)::integer as submitted_responses,
      count(resp.id) filter (where resp.is_correct = true)::integer as correct_responses,
      count(resp.id) filter (where resp.teacher_review_status = 'reviewed')::integer as reviewed_responses,
      count(resp.id) filter (where resp.is_correct = false or resp.teacher_review_status = 'needs_revision')::integer as corrections_needed,
      max(resp.updated_at) as latest_response_at
    from roster ro
    left join teacher_assignments a
      on a.class_id = ro.class_id
    left join public.project_z_generated_assignment_student_responses resp
      on resp.assignment_id = a.id
      and resp.student_id = ro.student_id
    group by ro.student_id, ro.class_id
  ),
  correction_summary as (
    select
      ro.student_id,
      ro.class_id,
      count(c.id) filter (where c.status in ('submitted', 'reviewed', 'accepted', 'needs_more_work'))::integer as corrections_submitted,
      count(c.id) filter (where c.status = 'accepted')::integer as corrections_accepted,
      max(c.updated_at) as latest_correction_at
    from roster ro
    left join teacher_assignments a
      on a.class_id = ro.class_id
    left join public.project_z_generated_assignment_corrections c
      on c.assignment_id = a.id
      and c.student_id = ro.student_id
    group by ro.student_id, ro.class_id
  ),
  assignment_counts as (
    select
      ro.student_id,
      ro.class_id,
      count(distinct a.id)::integer as active_assignments
    from roster ro
    left join teacher_assignments a
      on a.class_id = ro.class_id
      and a.status = 'assigned'
    group by ro.student_id, ro.class_id
  ),
  achievement_counts as (
    select
      u.student_id,
      count(u.id)::integer as achievements_unlocked,
      max(u.unlocked_at) as latest_achievement_at
    from public.project_z_student_achievement_unlocks u
    group by u.student_id
  ),
  combined as (
    select
      ro.student_id,
      coalesce(p.email, 'student') as student_email,
      ro.class_id,
      'Class ' || left(ro.class_id::text, 8) as class_label,
      coalesce(ac.active_assignments, 0)::integer as active_assignments,
      coalesce(rs.submitted_responses, 0)::integer as submitted_responses,
      coalesce(rs.correct_responses, 0)::integer as correct_responses,
      coalesce(rs.reviewed_responses, 0)::integer as reviewed_responses,
      coalesce(rs.corrections_needed, 0)::integer as corrections_needed,
      coalesce(cs.corrections_submitted, 0)::integer as corrections_submitted,
      coalesce(cs.corrections_accepted, 0)::integer as corrections_accepted,
      coalesce(sqt.total_questions, 0)::integer as total_questions,
      coalesce(g.total_xp, 0)::integer as total_xp,
      coalesce(g.level, 1)::integer as level,
      coalesce(g.current_streak, 0)::integer as current_streak,
      coalesce(g.longest_streak, 0)::integer as longest_streak,
      g.last_checkin_date,
      (g.last_checkin_date = current_date) as checked_in_today,
      coalesce(ach.achievements_unlocked, 0)::integer as achievements_unlocked,
      greatest(
        coalesce(g.updated_at, 'epoch'::timestamptz),
        coalesce(rs.latest_response_at, 'epoch'::timestamptz),
        coalesce(cs.latest_correction_at, 'epoch'::timestamptz),
        coalesce(ach.latest_achievement_at, 'epoch'::timestamptz)
      ) as updated_at
    from roster ro
    left join public.project_z_profiles p
      on p.id = ro.student_id
    left join response_summary rs
      on rs.student_id = ro.student_id
      and rs.class_id = ro.class_id
    left join correction_summary cs
      on cs.student_id = ro.student_id
      and cs.class_id = ro.class_id
    left join assignment_counts ac
      on ac.student_id = ro.student_id
      and ac.class_id = ro.class_id
    left join student_question_totals sqt
      on sqt.student_id = ro.student_id
      and sqt.class_id = ro.class_id
    left join public.project_z_student_game_profiles g
      on g.student_id = ro.student_id
    left join achievement_counts ach
      on ach.student_id = ro.student_id
  )
  select
    c.student_id,
    c.student_email,
    c.class_id,
    c.class_label,
    c.active_assignments,
    c.submitted_responses,
    c.correct_responses,
    c.reviewed_responses,
    case
      when c.total_questions > 0 then round((c.submitted_responses::numeric / c.total_questions::numeric) * 100, 1)
      else 0
    end as completion_percent,
    case
      when c.submitted_responses > 0 then round((c.correct_responses::numeric / c.submitted_responses::numeric) * 100, 1)
      else 0
    end as accuracy_percent,
    c.corrections_needed,
    c.corrections_submitted,
    c.corrections_accepted,
    case
      when c.corrections_needed > 0 then round((c.corrections_submitted::numeric / c.corrections_needed::numeric) * 100, 1)
      else 100
    end as correction_effort_percent,
    c.total_xp,
    c.level,
    c.current_streak,
    c.longest_streak,
    c.last_checkin_date,
    coalesce(c.checked_in_today, false) as checked_in_today,
    c.achievements_unlocked,
    case
      when c.submitted_responses = 0 and c.current_streak = 0 and c.total_xp = 0 then 'No engagement yet'
      when c.corrections_needed > c.corrections_submitted then 'Needs correction support'
      when c.active_assignments > 0 and c.total_questions > 0 and c.submitted_responses < c.total_questions * 0.35 then 'Low assignment engagement'
      when c.current_streak >= 3 and c.level >= 3 and c.submitted_responses > 0 then 'Building momentum'
      when c.current_streak >= 1 or c.submitted_responses > 0 or c.total_xp > 0 then 'Active'
      else 'Monitor'
    end as engagement_status,
    case
      when c.submitted_responses = 0 and c.current_streak = 0 and c.total_xp = 0 then 'Check in personally and help the student start with one small task.'
      when c.corrections_needed > c.corrections_submitted then 'Encourage the student to use feedback and submit corrections. Focus on learning from mistakes.'
      when c.active_assignments > 0 and c.total_questions > 0 and c.submitted_responses < c.total_questions * 0.35 then 'Give a short reminder and direct the student to the first unfinished assignment.'
      when c.current_streak >= 3 and c.level >= 3 and c.submitted_responses > 0 then 'Praise consistency and offer an extension or challenge question.'
      when c.current_streak >= 1 or c.submitted_responses > 0 or c.total_xp > 0 then 'Encourage continued practice and ask the student to explain one recent correction.'
      else 'Monitor progress over the next lesson.'
    end as teacher_next_action,
    'Engagement signals are for support only. They are not marks, grades, or IB criteria scores.' as caution_note,
    c.updated_at
  from combined c
  order by
    case
      when c.submitted_responses = 0 and c.current_streak = 0 and c.total_xp = 0 then 0
      when c.corrections_needed > c.corrections_submitted then 1
      when c.active_assignments > 0 and c.total_questions > 0 and c.submitted_responses < c.total_questions * 0.35 then 2
      when c.current_streak >= 3 and c.level >= 3 and c.submitted_responses > 0 then 4
      else 3
    end,
    c.updated_at desc nulls last,
    c.student_email;
$$;

create or replace function public.project_z_teacher_engagement_summary(
  p_class_id uuid default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with rows as (
    select *
    from public.project_z_teacher_engagement_insights(p_class_id)
  )
  select jsonb_build_object(
    'ok', true,
    'student_count', count(*),
    'no_engagement_count', count(*) filter (where engagement_status = 'No engagement yet'),
    'correction_support_count', count(*) filter (where engagement_status = 'Needs correction support'),
    'low_assignment_engagement_count', count(*) filter (where engagement_status = 'Low assignment engagement'),
    'active_count', count(*) filter (where engagement_status = 'Active'),
    'building_momentum_count', count(*) filter (where engagement_status = 'Building momentum'),
    'average_completion_percent', coalesce(round(avg(completion_percent)::numeric, 1), 0),
    'average_correction_effort_percent', coalesce(round(avg(correction_effort_percent)::numeric, 1), 0),
    'average_level', coalesce(round(avg(level)::numeric, 1), 0),
    'total_xp', coalesce(sum(total_xp), 0),
    'generated_at', now()
  )
  from rows;
$$;

create or replace function public.project_z_teacher_engagement_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-42-teacher-engagement-insights',
    'teacher_engagement_page', true,
    'quest_signals_visible_to_teacher', true,
    'assignment_completion_visible', true,
    'correction_effort_visible', true,
    'streak_xp_level_visible', true,
    'support_not_grading', true,
    'teacher_next_actions', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_teacher_engagement_classes() to authenticated;
grant execute on function public.project_z_teacher_engagement_insights(uuid) to authenticated;
grant execute on function public.project_z_teacher_engagement_summary(uuid) to authenticated;
grant execute on function public.project_z_teacher_engagement_status() to authenticated;

select
  'Project Z Phase 42 teacher engagement insights schema applied successfully' as status,
  now() as applied_at;
