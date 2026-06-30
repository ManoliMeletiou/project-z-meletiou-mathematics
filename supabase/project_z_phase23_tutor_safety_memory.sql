-- Project Z Phase 23 Student AI Tutor Safety and Learning Memory
-- Run after the app build/push succeeds.

create extension if not exists pgcrypto;

create table if not exists public.project_z_tutor_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.project_z_profiles(id) on delete set null,
  user_role text,
  course_code text,
  course_skill_code text,
  skill_title text,
  student_message text not null,
  tutor_reply text not null,
  tutor_mode text not null default 'guided_learning',
  safety_level text not null default 'guided',
  learning_action text,
  created_at timestamptz not null default now()
);

alter table public.project_z_tutor_interactions enable row level security;

drop policy if exists "tutor_interactions_own_or_teacher_select" on public.project_z_tutor_interactions;
create policy "tutor_interactions_own_or_teacher_select"
on public.project_z_tutor_interactions
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_z_profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
  )
);

create or replace function public.project_z_log_tutor_interaction(
  p_course_code text default null,
  p_course_skill_code text default null,
  p_skill_title text default null,
  p_student_message text default '',
  p_tutor_reply text default '',
  p_tutor_mode text default 'guided_learning',
  p_safety_level text default 'guided',
  p_learning_action text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.role
  into caller_role
  from public.project_z_profiles p
  where p.id = auth.uid();

  if coalesce(caller_role, '') not in ('student', 'teacher') then
    raise exception 'Only students and teachers can use the learning tutor';
  end if;

  insert into public.project_z_tutor_interactions (
    user_id,
    user_role,
    course_code,
    course_skill_code,
    skill_title,
    student_message,
    tutor_reply,
    tutor_mode,
    safety_level,
    learning_action,
    created_at
  )
  values (
    auth.uid(),
    caller_role,
    p_course_code,
    p_course_skill_code,
    p_skill_title,
    left(coalesce(p_student_message, ''), 3000),
    left(coalesce(p_tutor_reply, ''), 5000),
    coalesce(p_tutor_mode, 'guided_learning'),
    coalesce(p_safety_level, 'guided'),
    p_learning_action,
    now()
  )
  returning id into new_id;

  return jsonb_build_object(
    'ok', true,
    'id', new_id
  );
end;
$$;

create or replace function public.project_z_my_tutor_memory()
returns table (
  id uuid,
  course_code text,
  course_skill_code text,
  skill_title text,
  student_message text,
  tutor_reply text,
  tutor_mode text,
  safety_level text,
  learning_action text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.course_code,
    t.course_skill_code,
    t.skill_title,
    t.student_message,
    t.tutor_reply,
    t.tutor_mode,
    t.safety_level,
    t.learning_action,
    t.created_at
  from public.project_z_tutor_interactions t
  where t.user_id = auth.uid()
  order by t.created_at desc
  limit 30;
$$;

create or replace function public.project_z_tutor_safety_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  recent_count integer := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Not authenticated',
      'role', 'guest'
    );
  end if;

  select p.role
  into caller_role
  from public.project_z_profiles p
  where p.id = auth.uid();

  select count(*)::integer
  into recent_count
  from public.project_z_tutor_interactions t
  where t.user_id = auth.uid()
    and t.created_at >= now() - interval '1 hour';

  return jsonb_build_object(
    'allowed', coalesce(caller_role, '') in ('student', 'teacher') and recent_count < 60,
    'reason',
      case
        when coalesce(caller_role, '') not in ('student', 'teacher') then 'Only students and teachers can use the learning tutor'
        when recent_count >= 60 then 'Tutor use limit reached for this hour'
        else 'Allowed'
      end,
    'role', coalesce(caller_role, 'unknown'),
    'hourly_limit', 60,
    'hourly_count', recent_count,
    'remaining_hourly', greatest(60 - recent_count, 0)
  );
end;
$$;

grant execute on function public.project_z_log_tutor_interaction(text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.project_z_my_tutor_memory() to authenticated;
grant execute on function public.project_z_tutor_safety_status() to authenticated;

select
  'Project Z Phase 23 student AI tutor safety and learning memory schema applied successfully' as status,
  now() as applied_at;
