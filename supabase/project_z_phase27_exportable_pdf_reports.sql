-- Project Z Phase 27 Exportable Parent and Teacher PDF Reports
-- Run after the app build/push succeeds.
-- Purpose: provide clean parent-safe and teacher-internal report data for print/save-as-PDF pages.

create or replace function public.project_z_teacher_export_students()
returns table (
  student_id uuid,
  student_email text,
  student_name text,
  class_id uuid,
  class_label text,
  evidence_count integer,
  average_mastery numeric,
  latest_activity_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with teacher_roster as (
    select distinct
      cm.student_id,
      c.id as class_id
    from public.project_z_classes c
    join public.project_z_class_members cm
      on cm.class_id = c.id
    where c.teacher_id = auth.uid()
  ),
  mastery as (
    select
      m.user_id,
      count(*)::integer as evidence_count,
      round(avg(coalesce(m.mastery_percent, 0))::numeric, 1) as average_mastery
    from public.project_z_curriculum_mastery m
    group by m.user_id
  ),
  activity as (
    select
      e.user_id,
      max(e.created_at) as latest_activity_at
    from public.project_z_tutor_learning_evidence e
    group by e.user_id
  )
  select
    tr.student_id,
    coalesce(p.email, 'unknown@student') as student_email,
    coalesce(split_part(p.email, '@', 1), 'Student') as student_name,
    tr.class_id,
    'Class ' || left(tr.class_id::text, 8) as class_label,
    coalesce(m.evidence_count, 0) as evidence_count,
    coalesce(m.average_mastery, 0) as average_mastery,
    a.latest_activity_at
  from teacher_roster tr
  left join public.project_z_profiles p
    on p.id = tr.student_id
  left join mastery m
    on m.user_id = tr.student_id
  left join activity a
    on a.user_id = tr.student_id
  where exists (
    select 1
    from public.project_z_profiles teacher_profile
    where teacher_profile.id = auth.uid()
      and teacher_profile.role = 'teacher'
  )
  order by student_email;
$$;

create or replace function public.project_z_teacher_export_student_report(
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
  child_email text;
  child_name text;
  overview jsonb;
  strengths jsonb;
  needs_practice jsonb;
  tutor_review_summary jsonb;
  action_items jsonb;
  teacher_message text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1
    from public.project_z_classes c
    join public.project_z_class_members cm
      on cm.class_id = c.id
    join public.project_z_profiles p
      on p.id = auth.uid()
    where c.teacher_id = auth.uid()
      and cm.student_id = p_student_id
      and p.role = 'teacher'
  )
  into allowed;

  if not allowed then
    raise exception 'You can only export reports for students in your own classes';
  end if;

  select
    coalesce(p.email, 'unknown@student'),
    coalesce(split_part(p.email, '@', 1), 'Student')
  into child_email, child_name
  from public.project_z_profiles p
  where p.id = p_student_id;

  select jsonb_build_object(
    'average_mastery', coalesce(round(avg(m.mastery_percent)::numeric, 1), 0),
    'average_confidence', coalesce(round(avg(m.confidence_percent)::numeric, 1), 0),
    'skills_tracked', count(*)::integer,
    'total_evidence', coalesce(sum(m.evidence_count), 0)::integer,
    'skills_above_70', count(*) filter (where coalesce(m.mastery_percent, 0) >= 70)::integer,
    'skills_below_50', count(*) filter (where coalesce(m.mastery_percent, 0) < 50)::integer,
    'teacher_note', 'This is an internal teacher learning report. It supports teacher judgement and is not a final grade.'
  )
  into overview
  from public.project_z_curriculum_mastery m
  where m.user_id = p_student_id;

  select coalesce(jsonb_agg(row_to_json(strength_row)::jsonb), '[]'::jsonb)
  into strengths
  from (
    select
      m.course_skill_code,
      coalesce(sk.title, m.course_skill_code) as skill_title,
      coalesce(sk.course_code, split_part(m.course_skill_code, '.', 1)) as course_code,
      round(coalesce(m.mastery_percent, 0)::numeric, 1) as mastery_percent,
      round(coalesce(m.confidence_percent, 0)::numeric, 1) as confidence_percent,
      coalesce(m.evidence_count, 0)::integer as evidence_count
    from public.project_z_curriculum_mastery m
    left join public.project_z_curriculum_skills sk
      on sk.course_skill_code = m.course_skill_code
    where m.user_id = p_student_id
      and coalesce(m.mastery_percent, 0) >= 65
    order by coalesce(m.mastery_percent, 0) desc, coalesce(m.evidence_count, 0) desc
    limit 8
  ) strength_row;

  select coalesce(jsonb_agg(row_to_json(practice_row)::jsonb), '[]'::jsonb)
  into needs_practice
  from (
    select
      m.course_skill_code,
      coalesce(sk.title, m.course_skill_code) as skill_title,
      coalesce(sk.course_code, split_part(m.course_skill_code, '.', 1)) as course_code,
      round(coalesce(m.mastery_percent, 0)::numeric, 1) as mastery_percent,
      round(coalesce(m.confidence_percent, 0)::numeric, 1) as confidence_percent,
      coalesce(m.evidence_count, 0)::integer as evidence_count,
      'Teacher should consider targeted practice, diagnostic follow-up, or guided revision.' as teacher_next_step
    from public.project_z_curriculum_mastery m
    left join public.project_z_curriculum_skills sk
      on sk.course_skill_code = m.course_skill_code
    where m.user_id = p_student_id
      and coalesce(m.mastery_percent, 0) < 65
    order by coalesce(m.mastery_percent, 0) asc, coalesce(m.evidence_count, 0) desc
    limit 8
  ) practice_row;

  select jsonb_build_object(
    'pending_review', count(*) filter (where coalesce(e.teacher_review_status, 'pending') = 'pending')::integer,
    'approved_evidence', count(*) filter (where coalesce(e.teacher_review_status, 'pending') = 'approved')::integer,
    'ignored_evidence', count(*) filter (where coalesce(e.teacher_review_status, 'pending') = 'ignored')::integer,
    'action_needed', count(*) filter (where coalesce(e.teacher_review_status, 'pending') = 'action_needed')::integer,
    'misconceptions', count(*) filter (where e.evidence_type = 'misconception')::integer,
    'hints_needed', count(*) filter (where e.evidence_type = 'hint_needed')::integer,
    'independent_steps', count(*) filter (where e.evidence_type = 'independent_step')::integer,
    'recent_tutor_evidence', count(*)::integer
  )
  into tutor_review_summary
  from public.project_z_tutor_learning_evidence e
  where e.user_id = p_student_id
    and e.created_at >= now() - interval '60 days';

  select coalesce(jsonb_agg(row_to_json(action_row)::jsonb), '[]'::jsonb)
  into action_items
  from (
    select
      e.course_skill_code,
      e.skill_title,
      e.evidence_type,
      e.evidence_strength,
      e.teacher_review_status,
      e.teacher_review_notes,
      e.notes,
      e.created_at
    from public.project_z_tutor_learning_evidence e
    where e.user_id = p_student_id
      and coalesce(e.teacher_review_status, 'pending') = 'action_needed'
    order by e.created_at desc
    limit 10
  ) action_row;

  teacher_message :=
    case
      when coalesce((overview ->> 'skills_tracked')::integer, 0) = 0 then
        'There is not enough evidence yet. The student needs more diagnostic, practice, or tutor activity before a strong judgement can be made.'
      when coalesce((overview ->> 'skills_below_50')::integer, 0) >= 3 then
        'The student has several weaker skills. Targeted intervention or structured revision is recommended.'
      when coalesce((tutor_review_summary ->> 'action_needed')::integer, 0) > 0 then
        'There is tutor evidence marked as action needed. Review the listed action items.'
      when coalesce((overview ->> 'average_mastery')::numeric, 0) >= 70 then
        'The student is showing strong progress. Continue enrichment, mixed practice, and consolidation.'
      else
        'The student is developing. Continue targeted practice and monitor evidence over time.'
    end;

  return jsonb_build_object(
    'report_type', 'teacher_internal_pdf_report',
    'student', jsonb_build_object(
      'student_id', p_student_id,
      'student_email', child_email,
      'student_name', child_name
    ),
    'overview', overview,
    'strengths', strengths,
    'needs_practice', needs_practice,
    'tutor_review_summary', tutor_review_summary,
    'action_items', action_items,
    'teacher_message', teacher_message,
    'privacy', jsonb_build_object(
      'teacher_internal_only', true,
      'parent_safe_version_available_separately', true,
      'raw_tutor_chats_not_included', true
    ),
    'generated_at', now()
  );
end;
$$;

create or replace function public.project_z_export_report_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-27-exportable-pdf-reports',
    'parent_safe_reports', true,
    'teacher_internal_reports', true,
    'print_save_pdf_enabled', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_teacher_export_students() to authenticated;
grant execute on function public.project_z_teacher_export_student_report(uuid) to authenticated;
grant execute on function public.project_z_export_report_status() to authenticated;

select
  'Project Z Phase 27 exportable PDF reports schema applied successfully' as status,
  now() as applied_at;
