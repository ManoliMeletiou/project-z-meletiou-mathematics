-- Project Z Phase 56b: complete the identity, operator, export, and deletion
-- lifecycle without introducing a browser-controlled privileged role.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.project_z_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  added_reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.project_z_operator_audit (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid,
  target_user_id uuid,
  action text not null,
  decision text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

revoke all on table private.project_z_operators from public, anon, authenticated;
revoke all on table private.project_z_operator_audit from public, anon, authenticated;

create table if not exists public.project_z_account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'cancelled', 'processing', 'completed')),
  requested_at timestamptz not null default now(),
  grace_ends_at timestamptz not null default (now() + interval '7 days'),
  cancelled_at timestamptz,
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.project_z_account_deletion_requests enable row level security;

drop policy if exists "account_deletion_select_own" on public.project_z_account_deletion_requests;
create policy "account_deletion_select_own"
on public.project_z_account_deletion_requests for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.project_z_account_deletion_requests from public, anon, authenticated;
grant select on table public.project_z_account_deletion_requests to authenticated;

create or replace function public.project_z_is_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from private.project_z_operators o
      where o.user_id = (select auth.uid())
        and o.active = true
    );
$$;

create or replace function public.project_z_operator_role_request_queue()
returns table (
  request_id uuid,
  user_id uuid,
  email text,
  requested_role text,
  reason text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from private.project_z_operators o
    where o.user_id = (select auth.uid()) and o.active = true
  ) then
    raise exception 'Operator access required';
  end if;

  return query
  select r.id, r.user_id, p.email, r.requested_role, r.reason,
         r.status, r.created_at, r.updated_at
  from public.project_z_role_requests r
  join public.project_z_profiles p on p.id = r.user_id
  where r.status = 'pending'
  order by r.created_at asc;
end;
$$;

create or replace function public.project_z_review_role_request(
  p_request_id uuid,
  p_decision text,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  requested public.project_z_role_requests%rowtype;
  decision text := lower(trim(p_decision));
begin
  if actor is null or not exists (
    select 1 from private.project_z_operators o
    where o.user_id = actor and o.active = true
  ) then
    raise exception 'Operator access required';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into requested
  from public.project_z_role_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'Role request not found'; end if;
  if requested.status <> 'pending' then raise exception 'Role request is no longer pending'; end if;
  if requested.user_id = actor then raise exception 'Operators cannot approve their own role request'; end if;

  update public.project_z_role_requests
  set status = decision,
      reviewed_by = actor,
      reviewed_at = now(),
      updated_at = now()
  where id = requested.id;

  if decision = 'approved' then
    update public.project_z_profiles
    set role = requested.requested_role,
        updated_at = now()
    where id = requested.user_id;

    update public.project_z_role_requests
    set status = 'rejected',
        reviewed_by = actor,
        reviewed_at = now(),
        updated_at = now()
    where user_id = requested.user_id
      and id <> requested.id
      and status = 'pending';
  end if;

  insert into private.project_z_operator_audit (
    operator_id, target_user_id, action, decision, metadata
  ) values (
    actor,
    requested.user_id,
    'role_request_review',
    decision,
    jsonb_build_object(
      'request_id', requested.id,
      'requested_role', requested.requested_role,
      'review_note', nullif(trim(p_review_note), '')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'request_id', requested.id,
    'decision', decision,
    'active_role', case when decision = 'approved' then requested.requested_role else null end
  );
end;
$$;

create or replace function public.project_z_export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  account_id uuid := (select auth.uid());
begin
  if account_id is null then raise exception 'Not authenticated'; end if;

  return jsonb_build_object(
    'schema_version', 'project-z-account-export-v1',
    'generated_at', now(),
    'account', coalesce((
      select to_jsonb(p) from public.project_z_profiles p where p.id = account_id
    ), '{}'::jsonb),
    'access_requests', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at)
      from public.project_z_role_requests r where r.user_id = account_id
    ), '[]'::jsonb),
    'deletion_request', coalesce((
      select to_jsonb(d) from public.project_z_account_deletion_requests d where d.user_id = account_id
    ), '{}'::jsonb),
    'learning', jsonb_build_object(
      'course_selection', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_student_course_selection x where x.user_id = account_id), '[]'::jsonb),
      'curriculum_mastery', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_curriculum_mastery x where x.user_id = account_id), '[]'::jsonb),
      'skill_mastery', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_skill_mastery x where x.user_id = account_id), '[]'::jsonb),
      'practice_sessions', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_practice_sessions x where x.user_id = account_id), '[]'::jsonb),
      'practice_attempts', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_practice_attempts x where x.user_id = account_id), '[]'::jsonb),
      'diagnostic_sessions', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_diagnostic_sessions x where x.user_id = account_id), '[]'::jsonb),
      'diagnostic_evidence', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_diagnostic_evidence x where x.user_id = account_id), '[]'::jsonb),
      'tutor_interactions', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_tutor_interactions x where x.user_id = account_id), '[]'::jsonb),
      'tutor_evidence', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_tutor_learning_evidence x where x.user_id = account_id), '[]'::jsonb)
    ),
    'assessment', jsonb_build_object(
      'assignment_submissions', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_assignment_submissions x where x.student_id = account_id), '[]'::jsonb),
      'generated_responses', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_generated_assignment_student_responses x where x.student_id = account_id), '[]'::jsonb),
      'corrections', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_generated_assignment_corrections x where x.student_id = account_id), '[]'::jsonb)
    ),
    'motivation', jsonb_build_object(
      'game_profile', coalesce((select to_jsonb(x) from public.project_z_student_game_profiles x where x.student_id = account_id), '{}'::jsonb),
      'streak', coalesce((select to_jsonb(x) from public.project_z_student_streaks x where x.user_id = account_id), '{}'::jsonb),
      'daily_checkins', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_student_daily_checkins x where x.student_id = account_id), '[]'::jsonb),
      'achievements', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_student_achievement_unlocks x where x.student_id = account_id), '[]'::jsonb),
      'companion_events', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_companion_upgrade_events x where x.student_id = account_id), '[]'::jsonb),
      'xp_events', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_xp_events x where x.user_id = account_id), '[]'::jsonb)
    ),
    'relationships', jsonb_build_object(
      'class_memberships', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_class_members x where x.student_id = account_id), '[]'::jsonb),
      'parent_links', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_parent_student_links x where x.parent_id = account_id or x.student_id = account_id), '[]'::jsonb),
      'parent_link_codes', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_parent_link_codes x where x.student_id = account_id), '[]'::jsonb)
    ),
    'teacher_created', jsonb_build_object(
      'classes', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_classes x where x.teacher_id = account_id), '[]'::jsonb),
      'assignments', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_assignments x where x.teacher_id = account_id), '[]'::jsonb),
      'generated_assignments', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_generated_assignments x where x.teacher_id = account_id), '[]'::jsonb),
      'quality_audits', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_assignment_quality_audits x where x.teacher_id = account_id), '[]'::jsonb),
      'recommendation_actions', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_assignment_recommendation_actions x where x.teacher_id = account_id), '[]'::jsonb),
      'ai_generation_logs', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_ai_generation_logs x where x.user_id = account_id), '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.project_z_request_account_deletion(
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := (select auth.uid());
  request_id uuid;
  grace_end timestamptz;
begin
  if account_id is null then raise exception 'Not authenticated'; end if;
  if p_confirmation <> 'DELETE PROJECT Z ACCOUNT' then
    raise exception 'Type the full deletion confirmation exactly';
  end if;

  insert into public.project_z_account_deletion_requests (
    user_id, status, requested_at, grace_ends_at,
    cancelled_at, processed_at, processed_by, updated_at
  ) values (
    account_id, 'pending', now(), now() + interval '7 days',
    null, null, null, now()
  )
  on conflict (user_id) do update
  set status = 'pending',
      requested_at = now(),
      grace_ends_at = now() + interval '7 days',
      cancelled_at = null,
      processed_at = null,
      processed_by = null,
      updated_at = now()
  returning id, grace_ends_at into request_id, grace_end;

  return jsonb_build_object(
    'ok', true,
    'request_id', request_id,
    'status', 'pending',
    'grace_ends_at', grace_end
  );
end;
$$;

create or replace function public.project_z_cancel_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := (select auth.uid());
  request_id uuid;
begin
  if account_id is null then raise exception 'Not authenticated'; end if;

  update public.project_z_account_deletion_requests
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where user_id = account_id and status = 'pending'
  returning id into request_id;

  if request_id is null then raise exception 'No pending deletion request'; end if;
  return jsonb_build_object('ok', true, 'request_id', request_id, 'status', 'cancelled');
end;
$$;

create or replace function public.project_z_my_account_deletion_request()
returns table (
  request_id uuid,
  status text,
  requested_at timestamptz,
  grace_ends_at timestamptz,
  cancelled_at timestamptz,
  processed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.status, d.requested_at, d.grace_ends_at,
         d.cancelled_at, d.processed_at
  from public.project_z_account_deletion_requests d
  where d.user_id = (select auth.uid());
$$;

create or replace function public.project_z_operator_deletion_queue()
returns table (
  request_id uuid,
  user_id uuid,
  email text,
  role text,
  status text,
  requested_at timestamptz,
  grace_ends_at timestamptz,
  eligible boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from private.project_z_operators o
    where o.user_id = (select auth.uid()) and o.active = true
  ) then
    raise exception 'Operator access required';
  end if;

  return query
  select d.id, d.user_id, p.email, p.role, d.status,
         d.requested_at, d.grace_ends_at, now() >= d.grace_ends_at
  from public.project_z_account_deletion_requests d
  join public.project_z_profiles p on p.id = d.user_id
  where d.status = 'pending'
  order by d.requested_at asc;
end;
$$;

create or replace function public.project_z_operator_process_account_deletion(
  p_request_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  deletion public.project_z_account_deletion_requests%rowtype;
  target_email text;
  target_role text;
begin
  if actor is null or not exists (
    select 1 from private.project_z_operators o
    where o.user_id = actor and o.active = true
  ) then
    raise exception 'Operator access required';
  end if;
  if p_confirmation <> 'PROCESS APPROVED DELETION' then
    raise exception 'Operator confirmation does not match';
  end if;

  select * into deletion
  from public.project_z_account_deletion_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'Deletion request not found'; end if;
  if deletion.status <> 'pending' then raise exception 'Deletion request is no longer pending'; end if;
  if deletion.grace_ends_at > now() then raise exception 'Deletion grace period has not ended'; end if;
  if deletion.user_id = actor then raise exception 'Operators cannot process their own deletion'; end if;

  select p.email, p.role into target_email, target_role
  from public.project_z_profiles p where p.id = deletion.user_id;

  update public.project_z_account_deletion_requests
  set status = 'processing', processed_by = actor, updated_at = now()
  where id = deletion.id;

  insert into private.project_z_operator_audit (
    operator_id, target_user_id, action, decision, metadata
  ) values (
    actor,
    deletion.user_id,
    'account_deletion',
    'completed',
    jsonb_build_object(
      'request_id', deletion.id,
      'requested_at', deletion.requested_at,
      'grace_ends_at', deletion.grace_ends_at,
      'email_domain', split_part(coalesce(target_email, ''), '@', 2),
      'role', target_role
    )
  );

  -- Remove server sessions first. Access tokens already issued may remain valid
  -- until expiry, but the profile and all Project Z ownership rows disappear in
  -- the same transaction, so role and RLS checks fail closed immediately.
  delete from auth.sessions where user_id = deletion.user_id;
  delete from auth.users where id = deletion.user_id;

  return jsonb_build_object('ok', true, 'request_id', deletion.id, 'status', 'completed');
end;
$$;

revoke all on function public.project_z_is_operator() from public, anon;
revoke all on function public.project_z_operator_role_request_queue() from public, anon;
revoke all on function public.project_z_review_role_request(uuid, text, text) from public, anon;
revoke all on function public.project_z_export_my_data() from public, anon;
revoke all on function public.project_z_request_account_deletion(text) from public, anon;
revoke all on function public.project_z_cancel_account_deletion() from public, anon;
revoke all on function public.project_z_my_account_deletion_request() from public, anon;
revoke all on function public.project_z_operator_deletion_queue() from public, anon;
revoke all on function public.project_z_operator_process_account_deletion(uuid, text) from public, anon;

grant execute on function public.project_z_is_operator() to authenticated;
grant execute on function public.project_z_operator_role_request_queue() to authenticated;
grant execute on function public.project_z_review_role_request(uuid, text, text) to authenticated;
grant execute on function public.project_z_export_my_data() to authenticated;
grant execute on function public.project_z_request_account_deletion(text) to authenticated;
grant execute on function public.project_z_cancel_account_deletion() to authenticated;
grant execute on function public.project_z_my_account_deletion_request() to authenticated;
grant execute on function public.project_z_operator_deletion_queue() to authenticated;
grant execute on function public.project_z_operator_process_account_deletion(uuid, text) to authenticated;
