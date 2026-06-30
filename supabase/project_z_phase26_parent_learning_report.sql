-- Project Z Phase 26 Parent Learning Report Upgrade
-- Parent-safe reports: no raw tutor chats, no teacher-private notes.

create or replace function public.project_z_parent_child_report_access_allowed(p_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.project_z_parent_student_links l
      join public.project_z_profiles p on p.id = auth.uid()
      where l.parent_id = auth.uid()
        and l.student_id = p_student_id
        and p.role = 'parent'
    )
    or exists (
      select 1
      from public.project_z_classes c
      join public.project_z_class_members cm on cm.class_id = c.id
      join public.project_z_profiles p on p.id = auth.uid()
      where c.teacher_id = auth.uid()
        and cm.student_id = p_student_id
        and p.role = 'teacher'
    );
$$;

create or replace function public.project_z_parent_learning_children()
returns table (
  student_id uuid,
  student_email text,
  student_name text,
  link_status text,
  linked_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select distinct
    l.student_id,
    coalesce(sp.email, 'unknown@student') as student_email,
    coalesce(split_part(sp.email, '@', 1), 'Student') as student_name,
    coalesce(l.status, 'linked') as link_status,
    coalesce(l.created_at, now()) as linked_at
  from public.project_z_parent_student_links l
  join public.project_z_profiles parent_profile on parent_profile.id = auth.uid()
  left join public.project_z_profiles sp on sp.id = l.student_id
  where l.parent_id = auth.uid()
    and parent_profile.role = 'parent'
  order by linked_at desc;
$$;

create or replace function public.project_z_parent_learning_report(p_student_id uuid)
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
  tutor_summary jsonb;
  parent_message text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  allowed := public.project_z_parent_child_report_access_allowed(p_student_id);
  if not allowed then
    raise exception 'You can only view parent-safe reports for linked children or students in your class';
  end if;

  select coalesce(p.email, 'unknown@student'), coalesce(split_part(p.email, '@', 1), 'Student')
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
    'safe_note', 'Mastery values are learning signals, not final grades.'
  )
  into overview
  from public.project_z_curriculum_mastery m
  where m.user_id = p_student_id;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
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
    left join public.project_z_curriculum_skills sk on sk.course_skill_code = m.course_skill_code
    where m.user_id = p_student_id
      and coalesce(m.mastery_percent, 0) >= 65
    order by coalesce(m.mastery_percent, 0) desc, coalesce(m.evidence_count, 0) desc
    limit 6
  ) x;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into needs_practice
  from (
    select
      m.course_skill_code,
      coalesce(sk.title, m.course_skill_code) as skill_title,
      coalesce(sk.course_code, split_part(m.course_skill_code, '.', 1)) as course_code,
      round(coalesce(m.mastery_percent, 0)::numeric, 1) as mastery_percent,
      round(coalesce(m.confidence_percent, 0)::numeric, 1) as confidence_percent,
      coalesce(m.evidence_count, 0)::integer as evidence_count,
      'Recommended for extra practice' as parent_friendly_next_step
    from public.project_z_curriculum_mastery m
    left join public.project_z_curriculum_skills sk on sk.course_skill_code = m.course_skill_code
    where m.user_id = p_student_id
      and coalesce(m.mastery_percent, 0) < 65
    order by coalesce(m.mastery_percent, 0) asc, coalesce(m.evidence_count, 0) desc
    limit 6
  ) x;

  select jsonb_build_object(
    'approved_evidence', count(*) filter (where coalesce(e.teacher_review_status, 'pending') = 'approved')::integer,
    'action_needed', count(*) filter (where coalesce(e.teacher_review_status, 'pending') = 'action_needed')::integer,
    'misconceptions', count(*) filter (where e.evidence_type = 'misconception')::integer,
    'hints_needed', count(*) filter (where e.evidence_type = 'hint_needed')::integer,
    'independent_steps', count(*) filter (where e.evidence_type = 'independent_step')::integer,
    'recent_tutor_evidence', count(*)::integer,
    'safe_note', 'This is a summary only. Raw tutor chats and teacher-only notes are not shown.'
  )
  into tutor_summary
  from public.project_z_tutor_learning_evidence e
  where e.user_id = p_student_id
    and e.created_at >= now() - interval '30 days'
    and coalesce(e.teacher_review_status, 'pending') in ('approved', 'action_needed', 'pending');

  parent_message :=
    case
      when coalesce((overview ->> 'skills_tracked')::integer, 0) = 0 then
        'There is not enough learning evidence yet. Encourage regular practice so the system can build a clearer picture.'
      when coalesce((overview ->> 'average_mastery')::numeric, 0) >= 70 then
        'Your child is showing strong progress overall. Continue regular practice and review weaker skills to keep improving.'
      when coalesce((overview ->> 'average_mastery')::numeric, 0) >= 45 then
        'Your child is developing steadily. The next best step is regular targeted practice on the recommended skills.'
      else
        'Your child may need extra support with foundation skills. Short, regular practice and guided tutor help are recommended.'
    end;

  return jsonb_build_object(
    'child', jsonb_build_object('student_id', p_student_id, 'student_email', child_email, 'student_name', child_name),
    'overview', overview,
    'strengths', strengths,
    'needs_practice', needs_practice,
    'tutor_summary', tutor_summary,
    'parent_message', parent_message,
    'privacy', jsonb_build_object(
      'raw_tutor_chats_hidden', true,
      'teacher_private_notes_hidden', true,
      'teacher_only_review_details_hidden', true,
      'report_type', 'parent_safe_summary'
    ),
    'generated_at', now()
  );
end;
$$;

grant execute on function public.project_z_parent_child_report_access_allowed(uuid) to authenticated;
grant execute on function public.project_z_parent_learning_children() to authenticated;
grant execute on function public.project_z_parent_learning_report(uuid) to authenticated;

select 'Project Z Phase 26 parent learning report schema applied successfully' as status, now() as applied_at;
