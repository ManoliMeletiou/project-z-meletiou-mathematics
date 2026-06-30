-- Project Z Phase 15B Reports SQL Fix
-- Fixes Phase 15 error: project_z_profiles.full_name does not exist.
-- Run this whole file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.project_z_report_access_allowed(
  p_student_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    p_student_id = auth.uid()
    or exists (
      select 1
      from public.project_z_class_members cm
      join public.project_z_classes c on c.id = cm.class_id
      where cm.student_id = p_student_id
        and c.teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_z_parent_student_links l
      where l.parent_id = auth.uid()
        and l.student_id = p_student_id
        and l.status = 'active'
    );
$$;

create or replace function public.project_z_student_report_overview(
  p_student_id uuid default null
)
returns table (
  student_id uuid,
  student_name text,
  student_email text,
  course_code text,
  course_display_name text,
  total_diagnostic_attempts integer,
  total_practice_attempts integer,
  average_mastery numeric,
  average_confidence numeric,
  weak_skill_count integer,
  developing_skill_count integer,
  strong_skill_count integer,
  mastered_review_count integer,
  locked_skill_count integer,
  ready_skill_count integer,
  total_xp integer,
  current_streak integer,
  longest_streak integer,
  urgent_next_step text,
  report_generated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with target as (
    select coalesce(p_student_id, auth.uid()) as student_id
  ),
  allowed as (
    select t.student_id
    from target t
    where public.project_z_report_access_allowed(t.student_id)
  ),
  profile as (
    select
      a.student_id,
      coalesce(split_part(pr.email, '@', 1), 'Student') as student_name,
      pr.email as student_email
    from allowed a
    join public.project_z_profiles pr on pr.id = a.student_id
  ),
  selected_course as (
    select
      a.student_id,
      sel.course_code,
      cc.display_name as course_display_name
    from allowed a
    left join public.project_z_student_course_selection sel on sel.user_id = a.student_id
    left join public.project_z_course_catalog cc on cc.course_code = sel.course_code
  ),
  diag as (
    select
      a.student_id,
      count(de.id)::integer as total_diagnostic_attempts
    from allowed a
    left join public.project_z_diagnostic_evidence de on de.user_id = a.student_id
    group by a.student_id
  ),
  practice as (
    select
      a.student_id,
      count(pa.id)::integer as total_practice_attempts
    from allowed a
    left join public.project_z_practice_attempts pa on pa.user_id = a.student_id
    group by a.student_id
  ),
  mastery as (
    select
      a.student_id,
      coalesce(round(avg(cm.mastery_percent), 2), 0) as average_mastery,
      coalesce(round(avg(cm.confidence_percent), 2), 0) as average_confidence,
      count(cm.course_skill_code) filter (where cm.mastery_percent < 45)::integer as weak_skill_count,
      count(cm.course_skill_code) filter (where cm.mastery_percent >= 45 and cm.mastery_percent < 75)::integer as developing_skill_count,
      count(cm.course_skill_code) filter (where cm.mastery_percent >= 75)::integer as strong_skill_count
    from allowed a
    left join public.project_z_curriculum_mastery cm on cm.user_id = a.student_id
    group by a.student_id
  ),
  path_counts as (
    select
      a.student_id,
      count(sk.course_skill_code) filter (
        where coalesce(cm.mastery_percent, 0) >= 75
          and coalesce(cm.confidence_percent, 0) >= 85
      )::integer as mastered_review_count,
      0::integer as locked_skill_count,
      count(sk.course_skill_code) filter (
        where coalesce(cm.evidence_count, 0) = 0
      )::integer as ready_skill_count
    from allowed a
    left join public.project_z_student_course_selection sel on sel.user_id = a.student_id
    left join public.project_z_curriculum_skills sk
      on sk.course_code = sel.course_code
     and sk.game_path_enabled = true
    left join public.project_z_curriculum_mastery cm
      on cm.user_id = a.student_id
     and cm.course_skill_code = sk.course_skill_code
    group by a.student_id
  ),
  xp as (
    select
      a.student_id,
      coalesce(sum(x.xp_amount), 0)::integer as total_xp
    from allowed a
    left join public.project_z_xp_events x on x.user_id = a.student_id
    group by a.student_id
  ),
  streaks as (
    select
      a.student_id,
      coalesce(s.current_streak, 0)::integer as current_streak,
      coalesce(s.longest_streak, 0)::integer as longest_streak
    from allowed a
    left join public.project_z_student_streaks s on s.user_id = a.student_id
  )
  select
    p.student_id,
    p.student_name,
    p.student_email,
    sc.course_code,
    sc.course_display_name,
    coalesce(d.total_diagnostic_attempts, 0) as total_diagnostic_attempts,
    coalesce(pr.total_practice_attempts, 0) as total_practice_attempts,
    coalesce(m.average_mastery, 0) as average_mastery,
    coalesce(m.average_confidence, 0) as average_confidence,
    coalesce(m.weak_skill_count, 0) as weak_skill_count,
    coalesce(m.developing_skill_count, 0) as developing_skill_count,
    coalesce(m.strong_skill_count, 0) as strong_skill_count,
    coalesce(pc.mastered_review_count, 0) as mastered_review_count,
    coalesce(pc.locked_skill_count, 0) as locked_skill_count,
    coalesce(pc.ready_skill_count, 0) as ready_skill_count,
    coalesce(x.total_xp, 0) as total_xp,
    coalesce(st.current_streak, 0) as current_streak,
    coalesce(st.longest_streak, 0) as longest_streak,
    case
      when sc.course_code is null then 'Choose a course in Curriculum.'
      when coalesce(d.total_diagnostic_attempts, 0) = 0 then 'Complete the diagnostic so the system can identify weak and strong skills.'
      when coalesce(m.weak_skill_count, 0) > 0 then 'Focus first on weak skills using Recommended Practice.'
      when coalesce(m.developing_skill_count, 0) > 0 then 'Build developing skills to fluency with targeted practice.'
      when coalesce(m.average_confidence, 0) < 85 then 'Add more evidence through mixed practice and review.'
      else 'Continue spaced review to maintain mastery.'
    end as urgent_next_step,
    now() as report_generated_at
  from profile p
  left join selected_course sc on sc.student_id = p.student_id
  left join diag d on d.student_id = p.student_id
  left join practice pr on pr.student_id = p.student_id
  left join mastery m on m.student_id = p.student_id
  left join path_counts pc on pc.student_id = p.student_id
  left join xp x on x.student_id = p.student_id
  left join streaks st on st.student_id = p.student_id;
$$;

create or replace function public.project_z_student_report_skills(
  p_student_id uuid default null
)
returns table (
  student_id uuid,
  course_skill_code text,
  course_code text,
  strand_title text,
  assessment_criterion text,
  title text,
  description text,
  mastery_percent numeric,
  confidence_percent numeric,
  evidence_count integer,
  correct_count integer,
  skill_band text,
  next_step text,
  priority_rank integer
)
language sql
security definer
set search_path = public
as $$
  with target as (
    select coalesce(p_student_id, auth.uid()) as student_id
  ),
  allowed as (
    select t.student_id
    from target t
    where public.project_z_report_access_allowed(t.student_id)
  ),
  selected_course as (
    select
      a.student_id,
      sel.course_code
    from allowed a
    left join public.project_z_student_course_selection sel on sel.user_id = a.student_id
  ),
  base as (
    select
      a.student_id,
      sk.course_skill_code,
      sk.course_code,
      st.title as strand_title,
      sk.assessment_criterion,
      sk.title,
      sk.description,
      coalesce(m.mastery_percent, 0) as mastery_percent,
      coalesce(m.confidence_percent, 0) as confidence_percent,
      coalesce(m.evidence_count, 0) as evidence_count,
      coalesce(m.correct_count, 0) as correct_count,
      (
        (100 - coalesce(m.mastery_percent, 0)) * 0.60
        + (100 - coalesce(m.confidence_percent, 0)) * 0.25
        + case when coalesce(m.evidence_count, 0) < 4 then 15 else 0 end
      )::numeric as priority_score
    from allowed a
    join selected_course sc on sc.student_id = a.student_id
    join public.project_z_curriculum_skills sk on sk.course_code = sc.course_code
    join public.project_z_curriculum_strands st on st.strand_code = sk.strand_code
    left join public.project_z_curriculum_mastery m
      on m.user_id = a.student_id
     and m.course_skill_code = sk.course_skill_code
    where sk.practice_enabled = true
  )
  select
    b.student_id,
    b.course_skill_code,
    b.course_code,
    b.strand_title,
    b.assessment_criterion,
    b.title,
    b.description,
    b.mastery_percent,
    b.confidence_percent,
    b.evidence_count,
    b.correct_count,
    case
      when b.evidence_count = 0 then 'No evidence'
      when b.evidence_count < 3 then 'Low evidence'
      when b.mastery_percent < 45 then 'Weak'
      when b.mastery_percent < 75 then 'Developing'
      when b.confidence_percent < 85 then 'Strong but needs evidence'
      else 'Strong'
    end as skill_band,
    case
      when b.evidence_count = 0 then 'Collect diagnostic evidence for this skill.'
      when b.evidence_count < 3 then 'Answer more questions before making a final judgement.'
      when b.mastery_percent < 45 then 'Prioritise this skill in recommended practice.'
      when b.mastery_percent < 75 then 'Build fluency with targeted practice.'
      when b.confidence_percent < 85 then 'Use mixed review to increase confidence.'
      else 'Maintain with spaced review.'
    end as next_step,
    row_number() over (order by b.priority_score desc, b.mastery_percent asc, b.evidence_count asc)::integer as priority_rank
  from base b
  order by priority_rank;
$$;

create or replace function public.project_z_teacher_report_students()
returns table (
  student_id uuid,
  student_name text,
  student_email text,
  class_id uuid,
  class_name text,
  course_code text,
  course_display_name text,
  average_mastery numeric,
  average_confidence numeric,
  weak_skill_count integer,
  developing_skill_count integer,
  strong_skill_count integer,
  total_diagnostic_attempts integer,
  total_practice_attempts integer,
  urgent_next_step text
)
language sql
security definer
set search_path = public
as $$
  with teacher_classes as (
    select c.id as class_id, c.class_name
    from public.project_z_classes c
    where c.teacher_id = auth.uid()
  ),
  roster as (
    select distinct
      cm.student_id,
      tc.class_id,
      tc.class_name
    from teacher_classes tc
    join public.project_z_class_members cm on cm.class_id = tc.class_id
  )
  select
    r.student_id,
    coalesce(split_part(p.email, '@', 1), 'Student') as student_name,
    p.email as student_email,
    r.class_id,
    r.class_name,
    rep.course_code,
    rep.course_display_name,
    rep.average_mastery,
    rep.average_confidence,
    rep.weak_skill_count,
    rep.developing_skill_count,
    rep.strong_skill_count,
    rep.total_diagnostic_attempts,
    rep.total_practice_attempts,
    rep.urgent_next_step
  from roster r
  join public.project_z_profiles p on p.id = r.student_id
  left join lateral public.project_z_student_report_overview(r.student_id) rep on true
  order by r.class_name, p.email;
$$;

create or replace function public.project_z_parent_report_children()
returns table (
  student_id uuid,
  student_name text,
  student_email text,
  course_code text,
  course_display_name text,
  average_mastery numeric,
  average_confidence numeric,
  weak_skill_count integer,
  developing_skill_count integer,
  strong_skill_count integer,
  total_diagnostic_attempts integer,
  total_practice_attempts integer,
  total_xp integer,
  current_streak integer,
  urgent_next_step text
)
language sql
security definer
set search_path = public
as $$
  select
    rep.student_id,
    rep.student_name,
    rep.student_email,
    rep.course_code,
    rep.course_display_name,
    rep.average_mastery,
    rep.average_confidence,
    rep.weak_skill_count,
    rep.developing_skill_count,
    rep.strong_skill_count,
    rep.total_diagnostic_attempts,
    rep.total_practice_attempts,
    rep.total_xp,
    rep.current_streak,
    rep.urgent_next_step
  from public.project_z_parent_student_links l
  join lateral public.project_z_student_report_overview(l.student_id) rep on true
  where l.parent_id = auth.uid()
    and l.status = 'active'
  order by rep.student_name, rep.student_email;
$$;

grant execute on function public.project_z_report_access_allowed(uuid) to authenticated;
grant execute on function public.project_z_student_report_overview(uuid) to authenticated;
grant execute on function public.project_z_student_report_skills(uuid) to authenticated;
grant execute on function public.project_z_teacher_report_students() to authenticated;
grant execute on function public.project_z_parent_report_children() to authenticated;

select
  'Project Z Phase 15B reports SQL fix applied successfully' as status,
  now() as applied_at;

