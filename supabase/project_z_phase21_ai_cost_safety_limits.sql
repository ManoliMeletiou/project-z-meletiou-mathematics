-- Project Z Phase 21 AI Cost, Safety, and Rate Limits
-- Run after Phase 20.
-- Purpose: only teachers can trigger costly AI calls, and teachers have usage limits.

create extension if not exists pgcrypto;

create table if not exists public.project_z_ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.project_z_profiles(id) on delete set null,
  action text not null default 'generate_question',
  status text not null default 'unknown',
  generation_mode text,
  model text,
  course_code text,
  course_skill_code text,
  quality_score numeric,
  input_summary text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.project_z_ai_generation_logs enable row level security;

drop policy if exists "ai_generation_logs_teacher_own_select" on public.project_z_ai_generation_logs;
create policy "ai_generation_logs_teacher_own_select"
on public.project_z_ai_generation_logs
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

create or replace function public.project_z_ai_generation_allowance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  hourly_limit integer := 20;
  daily_limit integer := 80;
  hourly_count integer := 0;
  daily_count integer := 0;
  allowed boolean := false;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Not authenticated',
      'role', 'guest',
      'hourly_limit', hourly_limit,
      'daily_limit', daily_limit,
      'hourly_count', 0,
      'daily_count', 0
    );
  end if;

  select p.role
  into caller_role
  from public.project_z_profiles p
  where p.id = auth.uid();

  if coalesce(caller_role, '') <> 'teacher' then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Only teachers can use real AI generation',
      'role', coalesce(caller_role, 'unknown'),
      'hourly_limit', hourly_limit,
      'daily_limit', daily_limit,
      'hourly_count', 0,
      'daily_count', 0
    );
  end if;

  select count(*)::integer
  into hourly_count
  from public.project_z_ai_generation_logs l
  where l.user_id = auth.uid()
    and l.created_at >= now() - interval '1 hour'
    and l.action in ('generate_question', 'self_test');

  select count(*)::integer
  into daily_count
  from public.project_z_ai_generation_logs l
  where l.user_id = auth.uid()
    and l.created_at >= now() - interval '24 hours'
    and l.action in ('generate_question', 'self_test');

  allowed := hourly_count < hourly_limit and daily_count < daily_limit;

  return jsonb_build_object(
    'allowed', allowed,
    'reason',
      case
        when hourly_count >= hourly_limit then 'Hourly AI generation limit reached'
        when daily_count >= daily_limit then 'Daily AI generation limit reached'
        else 'Allowed'
      end,
    'role', caller_role,
    'hourly_limit', hourly_limit,
    'daily_limit', daily_limit,
    'hourly_count', hourly_count,
    'daily_count', daily_count,
    'remaining_hourly', greatest(hourly_limit - hourly_count, 0),
    'remaining_daily', greatest(daily_limit - daily_count, 0),
    'reset_hint', 'Hourly limit resets gradually over the next hour; daily limit resets gradually over 24 hours.'
  );
end;
$$;

create or replace function public.project_z_log_ai_generation(
  p_action text default 'generate_question',
  p_status text default 'unknown',
  p_generation_mode text default null,
  p_model text default null,
  p_course_code text default null,
  p_course_skill_code text default null,
  p_quality_score numeric default null,
  p_input_summary text default null,
  p_error_message text default null
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

  if coalesce(caller_role, '') <> 'teacher' then
    raise exception 'Only teachers can log AI generation';
  end if;

  insert into public.project_z_ai_generation_logs (
    user_id,
    action,
    status,
    generation_mode,
    model,
    course_code,
    course_skill_code,
    quality_score,
    input_summary,
    error_message,
    created_at
  )
  values (
    auth.uid(),
    coalesce(p_action, 'generate_question'),
    coalesce(p_status, 'unknown'),
    p_generation_mode,
    p_model,
    p_course_code,
    p_course_skill_code,
    p_quality_score,
    left(p_input_summary, 1000),
    left(p_error_message, 1000),
    now()
  )
  returning id into new_id;

  return jsonb_build_object(
    'ok', true,
    'id', new_id
  );
end;
$$;

create or replace function public.project_z_my_ai_generation_logs()
returns table (
  id uuid,
  action text,
  status text,
  generation_mode text,
  model text,
  course_code text,
  course_skill_code text,
  quality_score numeric,
  input_summary text,
  error_message text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    l.action,
    l.status,
    l.generation_mode,
    l.model,
    l.course_code,
    l.course_skill_code,
    l.quality_score,
    l.input_summary,
    l.error_message,
    l.created_at
  from public.project_z_ai_generation_logs l
  where l.user_id = auth.uid()
  order by l.created_at desc
  limit 50;
$$;

grant execute on function public.project_z_ai_generation_allowance() to authenticated;
grant execute on function public.project_z_log_ai_generation(text, text, text, text, text, text, numeric, text, text) to authenticated;
grant execute on function public.project_z_my_ai_generation_logs() to authenticated;

select
  'Project Z Phase 21 AI cost, safety, and rate limits schema applied successfully' as status,
  now() as applied_at;
