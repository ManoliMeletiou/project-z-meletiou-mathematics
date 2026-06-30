-- Project Z Phase 25 Teacher Review of Tutor Evidence
-- Run after the app build/push succeeds.
-- Purpose: teachers review tutor-generated learning evidence for students in their own classes.

alter table public.project_z_tutor_learning_evidence
add column if not exists teacher_review_status text not null default 'pending'
check (teacher_review_status in ('pending', 'approved', 'ignored', 'action_needed'));

alter table public.project_z_tutor_learning_evidence
add column if not exists teacher_review_notes text;

alter table public.project_z_tutor_learning_evidence
add column if not exists teacher_reviewer_id uuid references public.project_z_profiles(id) on delete set null;

alter table public.project_z_tutor_learning_evidence
add column if not exists reviewed_at timestamptz;

create or replace function public.project_z_teacher_tutor_evidence(
  p_student_id uuid default null
)
returns table (
  evidence_id uuid,
  student_id uuid,
  student_email text,
  student_name text,
  class_id uuid,
  class_label text,
  course_code text,
  course_skill_code text,
  skill_title text,
  evidence_type text,
  evidence_strength numeric,
  mastery_delta numeric,
  confidence_delta numeric,
  notes text,
  teacher_review_status text,
  teacher_review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with teacher_classes as (
    select c.id as class_id
    from public.project_z_classes c
    where c.teacher_id = auth.uid()
  ),
  roster as (
    select distinct
      cm.student_id,
      tc.class_id
    from teacher_classes tc
    join public.project_z_class_members cm
      on cm.class_id = tc.class_id
  )
  select
    e.id as evidence_id,
    e.user_id as student_id,
    coalesce(pr.email, 'unknown@student') as student_email,
    coalesce(split_part(pr.email, '@', 1), 'Student') as student_name,
    r.class_id,
    'Class ' || left(r.class_id::text, 8) as class_label,
    e.course_code,
    e.course_skill_code,
    e.skill_title,
    e.evidence_type,
    e.evidence_strength,
    e.mastery_delta,
    e.confidence_delta,
    e.notes,
    e.teacher_review_status,
    e.teacher_review_notes,
    e.reviewed_at,
    e.created_at
  from roster r
  join public.project_z_tutor_learning_evidence e
    on e.user_id = r.student_id
  left join public.project_z_profiles pr
    on pr.id = e.user_id
  where (p_student_id is null or e.user_id = p_student_id)
    and exists (
      select 1
      from public.project_z_profiles teacher_profile
      where teacher_profile.id = auth.uid()
        and teacher_profile.role = 'teacher'
    )
  order by
    case e.teacher_review_status
      when 'pending' then 1
      when 'action_needed' then 2
      when 'approved' then 3
      when 'ignored' then 4
      else 5
    end,
    e.created_at desc
  limit 200;
$$;

create or replace function public.project_z_review_tutor_evidence(
  p_evidence_id uuid,
  p_status text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  evidence_student uuid;
  teacher_allowed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_status not in ('pending', 'approved', 'ignored', 'action_needed') then
    raise exception 'Invalid tutor evidence review status';
  end if;

  select p.role
  into caller_role
  from public.project_z_profiles p
  where p.id = auth.uid();

  if coalesce(caller_role, '') <> 'teacher' then
    raise exception 'Only teachers can review tutor evidence';
  end if;

  select e.user_id
  into evidence_student
  from public.project_z_tutor_learning_evidence e
  where e.id = p_evidence_id;

  if evidence_student is null then
    raise exception 'Tutor evidence not found';
  end if;

  select exists (
    select 1
    from public.project_z_classes c
    join public.project_z_class_members cm
      on cm.class_id = c.id
    where c.teacher_id = auth.uid()
      and cm.student_id = evidence_student
  )
  into teacher_allowed;

  if not teacher_allowed then
    raise exception 'You can only review tutor evidence for students in your own classes';
  end if;

  update public.project_z_tutor_learning_evidence
  set
    teacher_review_status = p_status,
    teacher_review_notes = p_notes,
    teacher_reviewer_id = auth.uid(),
    reviewed_at = now()
  where id = p_evidence_id;

  return jsonb_build_object(
    'ok', true,
    'evidence_id', p_evidence_id,
    'status', p_status,
    'reviewed_at', now()
  );
end;
$$;

create or replace function public.project_z_teacher_tutor_evidence_summary()
returns table (
  student_id uuid,
  student_email text,
  student_name text,
  total_evidence integer,
  pending_count integer,
  approved_count integer,
  ignored_count integer,
  action_needed_count integer,
  misconception_count integer,
  hint_needed_count integer,
  independent_step_count integer,
  average_evidence_strength numeric,
  latest_evidence_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with teacher_roster as (
    select distinct cm.student_id
    from public.project_z_classes c
    join public.project_z_class_members cm
      on cm.class_id = c.id
    where c.teacher_id = auth.uid()
  )
  select
    e.user_id as student_id,
    coalesce(pr.email, 'unknown@student') as student_email,
    coalesce(split_part(pr.email, '@', 1), 'Student') as student_name,
    count(*)::integer as total_evidence,
    count(*) filter (where e.teacher_review_status = 'pending')::integer as pending_count,
    count(*) filter (where e.teacher_review_status = 'approved')::integer as approved_count,
    count(*) filter (where e.teacher_review_status = 'ignored')::integer as ignored_count,
    count(*) filter (where e.teacher_review_status = 'action_needed')::integer as action_needed_count,
    count(*) filter (where e.evidence_type = 'misconception')::integer as misconception_count,
    count(*) filter (where e.evidence_type = 'hint_needed')::integer as hint_needed_count,
    count(*) filter (where e.evidence_type = 'independent_step')::integer as independent_step_count,
    round(avg(e.evidence_strength), 2) as average_evidence_strength,
    max(e.created_at) as latest_evidence_at
  from teacher_roster tr
  join public.project_z_tutor_learning_evidence e
    on e.user_id = tr.student_id
  left join public.project_z_profiles pr
    on pr.id = e.user_id
  where exists (
    select 1
    from public.project_z_profiles teacher_profile
    where teacher_profile.id = auth.uid()
      and teacher_profile.role = 'teacher'
  )
  group by e.user_id, pr.email
  order by pending_count desc, action_needed_count desc, latest_evidence_at desc;
$$;

grant execute on function public.project_z_teacher_tutor_evidence(uuid) to authenticated;
grant execute on function public.project_z_review_tutor_evidence(uuid, text, text) to authenticated;
grant execute on function public.project_z_teacher_tutor_evidence_summary() to authenticated;

select
  'Project Z Phase 25 teacher review of tutor evidence schema applied successfully' as status,
  now() as applied_at;
