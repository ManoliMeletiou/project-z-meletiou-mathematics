-- Phase 58d: database-authoritative diagnostic prologue and evidence gate.
--
-- This migration does not release any pathway or diagnostic item. It closes
-- the legacy browser-only boundary, records accessible prologue setup, requires
-- a calibrated pathway configuration, binds each response to a server-issued
-- item, and keeps the main game locked until a sufficient diagnostic result has
-- produced an explainable first mission.

create schema if not exists private;

create table if not exists private.project_z_diagnostic_pathway_configs (
  course_code text primary key
    references public.project_z_pathway_evidence(course_code) on delete cascade,
  engine_version text not null default 'diagnostic-prologue-v2.0.0',
  evidence_goal_per_skill integer not null default 4
    check (evidence_goal_per_skill between 2 and 12),
  minimum_skills_to_sample integer not null default 4
    check (minimum_skills_to_sample between 1 and 30),
  max_questions integer not null default 36
    check (max_questions between 4 and 80),
  required_confidence_percent numeric not null default 70
    check (required_confidence_percent between 50 and 99),
  calibration_status text not null default 'draft'
    check (calibration_status in ('draft', 'approved', 'quarantined')),
  calibration_evidence_ref text,
  reviewed_by uuid references public.project_z_profiles(id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint project_z_approved_diagnostic_config_requires_review check (
    calibration_status <> 'approved'
    or (
      calibration_evidence_ref is not null
      and btrim(calibration_evidence_ref) <> ''
      and reviewed_by is not null
      and reviewed_at is not null
    )
  )
);

insert into private.project_z_diagnostic_pathway_configs (course_code)
select p.course_code
from public.project_z_pathway_evidence p
on conflict (course_code) do nothing;

revoke all on table private.project_z_diagnostic_pathway_configs
from public, anon, authenticated;

create table if not exists public.project_z_student_prologue_profiles (
  user_id uuid primary key references public.project_z_profiles(id) on delete cascade,
  course_code text not null
    references public.project_z_pathway_evidence(course_code) on delete restrict,
  cohort_specification text not null,
  language_code text not null default 'en'
    check (language_code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  extra_time_multiplier numeric not null default 1
    check (extra_time_multiplier in (1, 1.25, 1.5, 2)),
  screen_reader boolean not null default false,
  reduced_motion boolean not null default false,
  large_text boolean not null default false,
  input_mode text not null default 'keyboard'
    check (input_mode in ('keyboard', 'touch', 'mixed')),
  tool_orientation_completed boolean not null default false,
  orientation_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_z_orientation_timestamp_consistent check (
    (tool_orientation_completed = true and orientation_completed_at is not null)
    or (tool_orientation_completed = false and orientation_completed_at is null)
  )
);

alter table public.project_z_student_prologue_profiles enable row level security;

drop policy if exists project_z_prologue_profile_select_own
on public.project_z_student_prologue_profiles;
create policy project_z_prologue_profile_select_own
on public.project_z_student_prologue_profiles
for select to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.project_z_student_prologue_profiles
from public, anon, authenticated;
grant select (
  user_id, course_code, cohort_specification, language_code,
  extra_time_multiplier, screen_reader, reduced_motion, large_text,
  input_mode, tool_orientation_completed, orientation_completed_at,
  created_at, updated_at
) on table public.project_z_student_prologue_profiles to authenticated;

alter table public.project_z_diagnostic_sessions
  add column if not exists engine_version text not null default 'legacy-diagnostic-v1',
  add column if not exists completion_outcome text not null default 'pending',
  add column if not exists required_confidence_percent numeric not null default 70,
  add column if not exists first_mission_skill_code text
    references public.project_z_curriculum_skills(course_skill_code) on delete set null,
  add column if not exists pause_reason text,
  add column if not exists paused_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.project_z_diagnostic_sessions
  drop constraint if exists project_z_diagnostic_completion_outcome_check,
  add constraint project_z_diagnostic_completion_outcome_check
    check (completion_outcome in ('pending', 'sufficient', 'inconclusive')),
  drop constraint if exists project_z_diagnostic_required_confidence_check,
  add constraint project_z_diagnostic_required_confidence_check
    check (required_confidence_percent between 50 and 99),
  drop constraint if exists project_z_diagnostic_completed_state_consistent,
  add constraint project_z_diagnostic_completed_state_consistent check (
    status <> 'completed'
    or (
      completion_outcome in ('sufficient', 'inconclusive')
      and completed_at is not null
    )
  ) not valid;

-- Historical completed rows pre-date the outcome contract. They remain
-- evidence history but are explicitly inconclusive until reviewed.
update public.project_z_diagnostic_sessions
set completion_outcome = 'inconclusive',
    updated_at = now()
where status = 'completed'
  and completion_outcome = 'pending';

alter table public.project_z_diagnostic_sessions
  validate constraint project_z_diagnostic_completed_state_consistent;

alter table public.project_z_diagnostic_question_bank
  alter column verified set default false,
  add column if not exists answer_verification_status text not null default 'pending',
  add column if not exists misconception_review_status text not null default 'pending',
  add column if not exists accessibility_review_status text not null default 'pending',
  add column if not exists human_mathematics_review_status text not null default 'pending',
  add column if not exists human_mathematics_reviewed_by uuid
    references public.project_z_profiles(id) on delete set null,
  add column if not exists human_mathematics_reviewed_at timestamptz,
  add column if not exists review_evidence_digest text,
  add column if not exists misconception_mapping jsonb not null default '[]'::jsonb;

alter table public.project_z_diagnostic_question_bank
  drop constraint if exists project_z_diagnostic_answer_verification_status_check,
  add constraint project_z_diagnostic_answer_verification_status_check
    check (answer_verification_status in ('pending', 'passed', 'failed', 'quarantined')),
  drop constraint if exists project_z_diagnostic_misconception_review_status_check,
  add constraint project_z_diagnostic_misconception_review_status_check
    check (misconception_review_status in ('pending', 'approved', 'needs_revision')),
  drop constraint if exists project_z_diagnostic_accessibility_review_status_check,
  add constraint project_z_diagnostic_accessibility_review_status_check
    check (accessibility_review_status in ('pending', 'approved', 'needs_revision')),
  drop constraint if exists project_z_diagnostic_human_math_review_status_check,
  add constraint project_z_diagnostic_human_math_review_status_check
    check (human_mathematics_review_status in ('pending', 'approved', 'needs_revision', 'rejected')),
  drop constraint if exists project_z_verified_diagnostic_item_requires_all_evidence,
  add constraint project_z_verified_diagnostic_item_requires_all_evidence check (
    verified = false
    or (
      answer_verification_status = 'passed'
      and misconception_review_status = 'approved'
      and accessibility_review_status = 'approved'
      and human_mathematics_review_status = 'approved'
      and human_mathematics_reviewed_by is not null
      and human_mathematics_reviewed_at is not null
      and review_evidence_digest ~ '^[0-9a-f]{64}$'
      and jsonb_typeof(misconception_mapping) = 'array'
      and jsonb_array_length(misconception_mapping) > 0
    )
  );

create table if not exists public.project_z_diagnostic_item_deliveries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.project_z_diagnostic_sessions(id) on delete cascade,
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  question_id uuid not null
    references public.project_z_diagnostic_question_bank(id) on delete restrict,
  course_skill_code text not null
    references public.project_z_curriculum_skills(course_skill_code) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  status text not null default 'served'
    check (status in ('served', 'answered', 'expired')),
  served_at timestamptz not null default now(),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, sequence_number),
  unique (session_id, question_id),
  constraint project_z_delivery_answered_state_consistent check (
    (status = 'answered' and answered_at is not null)
    or (status <> 'answered' and answered_at is null)
  )
);

create unique index if not exists project_z_one_served_diagnostic_item_per_session
on public.project_z_diagnostic_item_deliveries(session_id)
where status = 'served';
create index if not exists project_z_diagnostic_delivery_user_created_idx
on public.project_z_diagnostic_item_deliveries(user_id, created_at desc);

alter table public.project_z_diagnostic_item_deliveries enable row level security;

drop policy if exists project_z_diagnostic_deliveries_select_own
on public.project_z_diagnostic_item_deliveries;
create policy project_z_diagnostic_deliveries_select_own
on public.project_z_diagnostic_item_deliveries
for select to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.project_z_diagnostic_item_deliveries
from public, anon, authenticated;
grant select (
  id, session_id, user_id, question_id, course_skill_code,
  sequence_number, status, served_at, answered_at, created_at
) on table public.project_z_diagnostic_item_deliveries to authenticated;

alter table public.project_z_diagnostic_evidence
  add column if not exists delivery_id uuid
    references public.project_z_diagnostic_item_deliveries(id) on delete restrict;

create unique index if not exists project_z_diagnostic_evidence_delivery_unique
on public.project_z_diagnostic_evidence(delivery_id)
where delivery_id is not null;

create or replace function private.project_z_course_release_ready(p_course_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.project_z_course_release_ready(p_course_code), false);
$$;

create or replace function private.project_z_diagnostic_release_ready(p_course_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.project_z_course_release_ready(p_course_code)
    and exists (
      select 1
      from private.project_z_diagnostic_pathway_configs c
      where c.course_code = p_course_code
        and c.calibration_status = 'approved'
        and c.reviewed_by is not null
        and c.reviewed_at is not null
        and c.calibration_evidence_ref is not null
    );
$$;

create or replace function private.project_z_student_main_game_unlocked(
  p_student_id uuid,
  p_course_code text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.project_z_diagnostic_release_ready(p_course_code)
    and exists (
      select 1
      from public.project_z_student_prologue_profiles p
      where p.user_id = p_student_id
        and p.course_code = p_course_code
        and p.tool_orientation_completed = true
    )
    and exists (
      select 1
      from public.project_z_diagnostic_sessions s
      where s.user_id = p_student_id
        and s.course_code = p_course_code
        and s.status = 'completed'
        and s.completion_outcome = 'sufficient'
        and s.first_mission_skill_code is not null
    );
$$;

revoke all on function private.project_z_course_release_ready(text)
from public, anon, authenticated;
revoke all on function private.project_z_diagnostic_release_ready(text)
from public, anon, authenticated;
revoke all on function private.project_z_student_main_game_unlocked(uuid, text)
from public, anon, authenticated;

create or replace function public.project_z_prepare_diagnostic_prologue(
  p_course_code text,
  p_cohort_specification text,
  p_language_code text default 'en',
  p_extra_time_multiplier numeric default 1,
  p_screen_reader boolean default false,
  p_reduced_motion boolean default false,
  p_large_text boolean default false,
  p_input_mode text default 'keyboard',
  p_tool_orientation_completed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text;
  normalized_cohort text := lower(btrim(p_cohort_specification));
  normalized_language text := btrim(p_language_code);
  normalized_input text := lower(btrim(p_input_mode));
begin
  if actor is null then raise exception 'Not authenticated'; end if;

  select p.role into actor_role
  from public.project_z_profiles p
  where p.id = actor;

  if actor_role is distinct from 'student' then
    raise exception 'Only students can prepare their own diagnostic prologue';
  end if;

  if not exists (
    select 1
    from public.project_z_pathway_evidence p
    join public.project_z_course_catalog c on c.course_code = p.course_code
    where p.course_code = p_course_code and c.is_selectable = true
  ) then
    raise exception 'Choose one of the fourteen Project Z pathways';
  end if;

  if p_course_code like 'myp\_%' escape '\' then
    if normalized_cohort <> 'myp_current_framework' then
      raise exception 'MYP pathways require the current MYP framework selection';
    end if;
  elsif p_course_code like 'dp\_%' escape '\' then
    if normalized_cohort not in ('first_assessment_2021', 'first_assessment_2029') then
      raise exception 'Choose the learner''s registered DP cohort specification';
    end if;
  else
    raise exception 'Unknown Project Z pathway';
  end if;

  if normalized_language !~ '^[a-z]{2}(-[A-Z]{2})?$' then
    raise exception 'Use a supported language code';
  end if;
  if p_extra_time_multiplier not in (1, 1.25, 1.5, 2) then
    raise exception 'Extra-time multiplier must be 1, 1.25, 1.5, or 2';
  end if;
  if normalized_input not in ('keyboard', 'touch', 'mixed') then
    raise exception 'Input mode must be keyboard, touch, or mixed';
  end if;

  insert into public.project_z_student_course_selection (
    user_id, course_code, selected_at, updated_at
  ) values (
    actor, p_course_code, now(), now()
  )
  on conflict (user_id) do update
  set course_code = excluded.course_code,
      updated_at = now();

  insert into public.project_z_student_prologue_profiles (
    user_id, course_code, cohort_specification, language_code,
    extra_time_multiplier, screen_reader, reduced_motion, large_text,
    input_mode, tool_orientation_completed, orientation_completed_at,
    updated_at
  ) values (
    actor, p_course_code, normalized_cohort, normalized_language,
    p_extra_time_multiplier, coalesce(p_screen_reader, false),
    coalesce(p_reduced_motion, false), coalesce(p_large_text, false),
    normalized_input, coalesce(p_tool_orientation_completed, false),
    case when coalesce(p_tool_orientation_completed, false) then now() else null end,
    now()
  )
  on conflict (user_id) do update
  set course_code = excluded.course_code,
      cohort_specification = excluded.cohort_specification,
      language_code = excluded.language_code,
      extra_time_multiplier = excluded.extra_time_multiplier,
      screen_reader = excluded.screen_reader,
      reduced_motion = excluded.reduced_motion,
      large_text = excluded.large_text,
      input_mode = excluded.input_mode,
      tool_orientation_completed = excluded.tool_orientation_completed,
      orientation_completed_at = excluded.orientation_completed_at,
      updated_at = now();

  return public.project_z_my_game_entry_state();
end;
$$;

create or replace function public.project_z_my_game_entry_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text;
  selected_course text;
  selected_name text;
  profile_row public.project_z_student_prologue_profiles;
  session_row public.project_z_diagnostic_sessions;
  pathway_ready boolean := false;
  diagnostic_ready boolean := false;
  main_game_unlocked boolean := false;
  calibration_status text;
  first_mission_title text;
  state_code text;
  blockers text[];
begin
  if actor is null then raise exception 'Not authenticated'; end if;

  select p.role into actor_role
  from public.project_z_profiles p where p.id = actor;
  if actor_role is distinct from 'student' then
    return jsonb_build_object(
      'state', 'student_role_required',
      'main_game_unlocked', false,
      'diagnostic_required', true
    );
  end if;

  select s.course_code, c.display_name
  into selected_course, selected_name
  from public.project_z_student_course_selection s
  join public.project_z_course_catalog c on c.course_code = s.course_code
  where s.user_id = actor;

  if selected_course is null then
    return jsonb_build_object(
      'state', 'pathway_required',
      'main_game_unlocked', false,
      'diagnostic_required', true,
      'blockers', jsonb_build_array('Select one of the fourteen Project Z pathways.')
    );
  end if;

  select * into profile_row
  from public.project_z_student_prologue_profiles p
  where p.user_id = actor and p.course_code = selected_course;

  pathway_ready := private.project_z_course_release_ready(selected_course);
  select c.calibration_status into calibration_status
  from private.project_z_diagnostic_pathway_configs c
  where c.course_code = selected_course;
  diagnostic_ready := private.project_z_diagnostic_release_ready(selected_course);

  select * into session_row
  from public.project_z_diagnostic_sessions s
  where s.user_id = actor and s.course_code = selected_course
  order by s.created_at desc
  limit 1;

  main_game_unlocked := private.project_z_student_main_game_unlocked(actor, selected_course);

  if session_row.first_mission_skill_code is not null then
    select s.title into first_mission_title
    from public.project_z_curriculum_skills s
    where s.course_skill_code = session_row.first_mission_skill_code;
  end if;

  blockers := array_remove(array[
    case when profile_row.user_id is null then 'Confirm pathway, cohort, language, and access preferences.' end,
    case when profile_row.user_id is not null and not profile_row.tool_orientation_completed then 'Complete the two unscored input examples.' end,
    case when not pathway_ready then 'The approved curriculum atlas and verified practice depth are not released.' end,
    case when coalesce(calibration_status, 'draft') <> 'approved' then 'Diagnostic calibration against teacher-reviewed cases is not approved.' end,
    case when session_row.status = 'completed' and session_row.completion_outcome = 'inconclusive' then 'The diagnostic ended inconclusively and needs another evidence plan.' end
  ], null);

  state_code := case
    when profile_row.user_id is null then 'setup_required'
    when not profile_row.tool_orientation_completed then 'tool_orientation_required'
    when not diagnostic_ready then 'awaiting_reviewed_release'
    when session_row.id is null then 'diagnostic_ready'
    when session_row.status = 'active' then 'diagnostic_active'
    when session_row.status = 'paused' then 'diagnostic_paused'
    when session_row.completion_outcome = 'inconclusive' then 'diagnostic_inconclusive'
    when main_game_unlocked then 'first_mission_ready'
    else 'diagnostic_required'
  end;

  return jsonb_build_object(
    'state', state_code,
    'course_code', selected_course,
    'course_display_name', selected_name,
    'cohort_specification', profile_row.cohort_specification,
    'language_code', profile_row.language_code,
    'tool_orientation_completed', coalesce(profile_row.tool_orientation_completed, false),
    'pathway_release_ready', pathway_ready,
    'diagnostic_calibration_status', coalesce(calibration_status, 'draft'),
    'diagnostic_release_ready', diagnostic_ready,
    'diagnostic_required', true,
    'session_id', session_row.id,
    'session_status', session_row.status,
    'completion_outcome', session_row.completion_outcome,
    'first_mission_skill_code', session_row.first_mission_skill_code,
    'first_mission_title', first_mission_title,
    'main_game_unlocked', main_game_unlocked,
    'blockers', to_jsonb(coalesce(blockers, '{}'::text[]))
  );
end;
$$;

create or replace function public.project_z_start_diagnostic(p_course_code text)
returns public.project_z_diagnostic_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text;
  profile_row public.project_z_student_prologue_profiles;
  config_row private.project_z_diagnostic_pathway_configs;
  session_row public.project_z_diagnostic_sessions;
begin
  if actor is null then raise exception 'Not authenticated'; end if;

  select p.role into actor_role
  from public.project_z_profiles p where p.id = actor;
  if actor_role is distinct from 'student' then
    raise exception 'Only students can start their own diagnostic prologue';
  end if;

  select * into profile_row
  from public.project_z_student_prologue_profiles p
  where p.user_id = actor and p.course_code = p_course_code;

  if profile_row.user_id is null or not profile_row.tool_orientation_completed then
    raise exception 'Complete pathway setup and the unscored tool orientation first';
  end if;

  if not private.project_z_diagnostic_release_ready(p_course_code) then
    raise exception 'Diagnostic remains locked until curriculum, item review, practice depth, and calibration gates pass';
  end if;

  select * into config_row
  from private.project_z_diagnostic_pathway_configs c
  where c.course_code = p_course_code and c.calibration_status = 'approved';

  select * into session_row
  from public.project_z_diagnostic_sessions s
  where s.user_id = actor
    and s.course_code = p_course_code
    and s.status in ('active', 'paused')
  order by s.created_at desc
  limit 1
  for update;

  if session_row.id is not null then return session_row; end if;

  insert into public.project_z_diagnostic_sessions (
    user_id, course_code, status, evidence_goal_per_skill,
    minimum_skills_to_sample, max_questions, engine_version,
    completion_outcome, required_confidence_percent, updated_at
  ) values (
    actor, p_course_code, 'active', config_row.evidence_goal_per_skill,
    config_row.minimum_skills_to_sample, config_row.max_questions,
    config_row.engine_version, 'pending', config_row.required_confidence_percent,
    now()
  ) returning * into session_row;

  return session_row;
end;
$$;

create or replace function public.project_z_set_diagnostic_session_state(
  p_session_id uuid,
  p_requested_state text
)
returns public.project_z_diagnostic_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  requested_state text := lower(btrim(p_requested_state));
  session_row public.project_z_diagnostic_sessions;
begin
  if actor is null then raise exception 'Not authenticated'; end if;
  if requested_state not in ('active', 'paused') then
    raise exception 'A diagnostic can only be paused or resumed';
  end if;

  select * into session_row
  from public.project_z_diagnostic_sessions s
  where s.id = p_session_id and s.user_id = actor
  for update;

  if session_row.id is null then raise exception 'Diagnostic session not found'; end if;
  if session_row.status = 'completed' then raise exception 'A completed diagnostic cannot be resumed'; end if;
  if requested_state = 'active'
     and not private.project_z_diagnostic_release_ready(session_row.course_code) then
    raise exception 'Diagnostic release evidence is no longer valid';
  end if;

  update public.project_z_diagnostic_sessions s
  set status = requested_state,
      pause_reason = case when requested_state = 'paused' then 'Learner paused and saved progress' else null end,
      paused_at = case when requested_state = 'paused' then now() else null end,
      updated_at = now()
  where s.id = p_session_id
  returning * into session_row;

  return session_row;
end;
$$;

create or replace function private.project_z_complete_diagnostic(
  p_session_id uuid,
  p_outcome text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.project_z_diagnostic_sessions;
  first_mission text;
  first_mission_title text;
begin
  if p_outcome not in ('sufficient', 'inconclusive') then
    raise exception 'Unknown diagnostic completion outcome';
  end if;

  select * into session_row
  from public.project_z_diagnostic_sessions s
  where s.id = p_session_id
  for update;

  if session_row.id is null then raise exception 'Diagnostic session not found'; end if;

  if p_outcome = 'sufficient' then
    select sk.course_skill_code, sk.title
    into first_mission, first_mission_title
    from public.project_z_curriculum_skills sk
    join public.project_z_skill_atlas_candidates a
      on a.atlas_skill_code = sk.course_skill_code
     and a.course_code = sk.course_code
    left join public.project_z_curriculum_mastery m
      on m.user_id = session_row.user_id
     and m.course_skill_code = sk.course_skill_code
    where sk.course_code = session_row.course_code
      and sk.game_path_enabled = true
      and a.review_status = 'approved'
      and a.source_alignment_status = 'aligned'
      and a.educator_review_status = 'approved'
    order by coalesce(m.mastery_percent, 0),
             coalesce(m.confidence_percent, 0),
             sk.sort_order,
             sk.course_skill_code
    limit 1;

    if first_mission is null then
      p_outcome := 'inconclusive';
      p_reason := p_reason || ' No approved first mission was available.';
    end if;
  end if;

  update public.project_z_diagnostic_sessions s
  set status = 'completed',
      completion_outcome = p_outcome,
      conclusion_summary = p_reason,
      first_mission_skill_code = case when p_outcome = 'sufficient' then first_mission else null end,
      completed_at = now(),
      pause_reason = null,
      paused_at = null,
      updated_at = now()
  where s.id = p_session_id;

  update public.project_z_diagnostic_item_deliveries d
  set status = 'expired'
  where d.session_id = p_session_id and d.status = 'served';

  return jsonb_build_object(
    'done', true,
    'status', 'completed',
    'completion_outcome', p_outcome,
    'message', p_reason,
    'first_mission_skill_code', case when p_outcome = 'sufficient' then first_mission else null end,
    'first_mission_title', case when p_outcome = 'sufficient' then first_mission_title else null end,
    'main_game_unlocked',
      p_outcome = 'sufficient'
      and private.project_z_student_main_game_unlocked(
        session_row.user_id,
        session_row.course_code
      )
  );
end;
$$;

revoke all on function private.project_z_complete_diagnostic(uuid, text, text)
from public, anon, authenticated;

create or replace function public.project_z_diagnostic_next_question(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  session_row public.project_z_diagnostic_sessions;
  delivery_row public.project_z_diagnostic_item_deliveries;
  question_row public.project_z_diagnostic_question_bank;
  skill_row public.project_z_curriculum_skills;
  total_evidence integer := 0;
  confident_skills integer := 0;
  delivery_sequence integer := 1;
  selected_question_id uuid;
begin
  if actor is null then raise exception 'Not authenticated'; end if;

  select * into session_row
  from public.project_z_diagnostic_sessions s
  where s.id = p_session_id and s.user_id = actor
  for update;

  if session_row.id is null then raise exception 'Diagnostic session not found'; end if;

  if session_row.status <> 'active' then
    return jsonb_build_object(
      'done', session_row.status = 'completed',
      'status', session_row.status,
      'completion_outcome', session_row.completion_outcome,
      'message', case
        when session_row.status = 'paused' then 'Diagnostic paused. Resume when ready.'
        else coalesce(session_row.conclusion_summary, 'Diagnostic is complete.')
      end
    );
  end if;

  if not private.project_z_diagnostic_release_ready(session_row.course_code) then
    update public.project_z_diagnostic_sessions s
    set status = 'paused',
        pause_reason = 'Release evidence became invalid while the diagnostic was active',
        paused_at = now(),
        updated_at = now()
    where s.id = p_session_id;

    return jsonb_build_object(
      'done', false,
      'status', 'paused',
      'message', 'Diagnostic paused because release evidence must be reviewed again.'
    );
  end if;

  -- Refresh and retry must return the same unanswered item. A new item is not
  -- issued until the active delivery is answered or explicitly expired.
  select * into delivery_row
  from public.project_z_diagnostic_item_deliveries d
  where d.session_id = p_session_id and d.user_id = actor and d.status = 'served'
  order by d.sequence_number desc
  limit 1;

  if delivery_row.id is not null then
    select * into question_row
    from public.project_z_diagnostic_question_bank q
    where q.id = delivery_row.question_id;
    select * into skill_row
    from public.project_z_curriculum_skills sk
    where sk.course_skill_code = delivery_row.course_skill_code;

    return jsonb_build_object(
      'done', false,
      'status', 'active',
      'session_id', p_session_id,
      'delivery_id', delivery_row.id,
      'question_id', question_row.id,
      'course_skill_code', question_row.course_skill_code,
      'skill_title', skill_row.title,
      'skill_description', skill_row.description,
      'assessment_criterion', question_row.assessment_criterion,
      'question_type', question_row.question_type,
      'difficulty_band', question_row.difficulty_band,
      'prompt', question_row.prompt,
      'options', jsonb_build_object(
        'A', question_row.option_a, 'B', question_row.option_b,
        'C', question_row.option_c, 'D', question_row.option_d
      ),
      'question_number', delivery_row.sequence_number,
      'max_questions', session_row.max_questions
    );
  end if;

  select count(*)::integer into total_evidence
  from public.project_z_diagnostic_evidence e
  where e.session_id = p_session_id and e.delivery_id is not null;

  select count(*)::integer into confident_skills
  from (
    select e.course_skill_code
    from public.project_z_diagnostic_evidence e
    where e.session_id = p_session_id and e.delivery_id is not null
    group by e.course_skill_code
    having count(*) >= session_row.evidence_goal_per_skill
       and least(
         100,
         round(
           (sum(e.evidence_strength) / session_row.evidence_goal_per_skill::numeric) * 100,
           2
         )
       ) >= session_row.required_confidence_percent
  ) confident;

  if confident_skills >= session_row.minimum_skills_to_sample then
    return private.project_z_complete_diagnostic(
      p_session_id,
      'sufficient',
      'The diagnostic collected sufficient repeated evidence across the configured entry skills.'
    );
  end if;

  if total_evidence >= session_row.max_questions then
    return private.project_z_complete_diagnostic(
      p_session_id,
      'inconclusive',
      'The question limit was reached before sufficient confidence was established.'
    );
  end if;

  select q.id
  into selected_question_id
  from public.project_z_diagnostic_question_bank q
  join public.project_z_curriculum_skills sk
    on sk.course_skill_code = q.course_skill_code
   and sk.course_code = q.course_code
  join public.project_z_skill_atlas_candidates a
    on a.atlas_skill_code = sk.course_skill_code
   and a.course_code = sk.course_code
  left join lateral (
    select
      count(e.id)::integer as evidence_count,
      coalesce(avg(case when e.is_correct then 1.0 else 0.0 end), 0.5) as accuracy
    from public.project_z_diagnostic_evidence e
    where e.session_id = p_session_id
      and e.course_skill_code = sk.course_skill_code
      and e.delivery_id is not null
  ) evidence on true
  where q.course_code = session_row.course_code
    and q.verified = true
    and q.answer_verification_status = 'passed'
    and q.misconception_review_status = 'approved'
    and q.accessibility_review_status = 'approved'
    and q.human_mathematics_review_status = 'approved'
    and sk.diagnostic_enabled = true
    and a.diagnostic_candidate = true
    and a.review_status = 'approved'
    and a.source_alignment_status = 'aligned'
    and a.educator_review_status = 'approved'
    and not exists (
      select 1
      from public.project_z_diagnostic_item_deliveries prior
      where prior.session_id = p_session_id and prior.question_id = q.id
    )
  order by
    evidence.evidence_count,
    abs(q.difficulty_band - case
      when evidence.evidence_count = 0 then 2
      when evidence.accuracy < 0.4 then 1
      when evidence.accuracy < 0.75 then 2
      else 3
    end),
    sk.sort_order,
    q.id
  limit 1;

  if selected_question_id is not null then
    select * into question_row
    from public.project_z_diagnostic_question_bank q
    where q.id = selected_question_id;

    select * into skill_row
    from public.project_z_curriculum_skills sk
    where sk.course_code = question_row.course_code
      and sk.course_skill_code = question_row.course_skill_code;
  end if;

  if question_row.id is null then
    return private.project_z_complete_diagnostic(
      p_session_id,
      'inconclusive',
      'No further approved, independently verified diagnostic item was available.'
    );
  end if;

  delivery_sequence := total_evidence + 1;
  insert into public.project_z_diagnostic_item_deliveries (
    session_id, user_id, question_id, course_skill_code, sequence_number
  ) values (
    p_session_id, actor, question_row.id, question_row.course_skill_code,
    delivery_sequence
  ) returning * into delivery_row;

  return jsonb_build_object(
    'done', false,
    'status', 'active',
    'session_id', p_session_id,
    'delivery_id', delivery_row.id,
    'question_id', question_row.id,
    'course_skill_code', question_row.course_skill_code,
    'skill_title', skill_row.title,
    'skill_description', skill_row.description,
    'assessment_criterion', question_row.assessment_criterion,
    'question_type', question_row.question_type,
    'difficulty_band', question_row.difficulty_band,
    'prompt', question_row.prompt,
    'options', jsonb_build_object(
      'A', question_row.option_a, 'B', question_row.option_b,
      'C', question_row.option_c, 'D', question_row.option_d
    ),
    'question_number', delivery_sequence,
    'max_questions', session_row.max_questions
  );
end;
$$;

create or replace function public.project_z_submit_diagnostic_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_selected_option text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  selected_option text := upper(btrim(p_selected_option));
  session_row public.project_z_diagnostic_sessions;
  delivery_row public.project_z_diagnostic_item_deliveries;
  question_row public.project_z_diagnostic_question_bank;
  answer_correct boolean;
  total_evidence integer;
  total_correct integer;
  accuracy numeric;
  confidence numeric;
  mastery numeric;
  skill_max numeric;
begin
  if actor is null then raise exception 'Not authenticated'; end if;
  if selected_option not in ('A', 'B', 'C', 'D') then
    raise exception 'Choose one of the four displayed options';
  end if;

  select * into session_row
  from public.project_z_diagnostic_sessions s
  where s.id = p_session_id and s.user_id = actor and s.status = 'active'
  for update;

  if session_row.id is null then raise exception 'Active diagnostic session not found'; end if;
  if not private.project_z_diagnostic_release_ready(session_row.course_code) then
    raise exception 'Diagnostic release evidence is no longer valid';
  end if;

  select * into delivery_row
  from public.project_z_diagnostic_item_deliveries d
  where d.session_id = p_session_id
    and d.user_id = actor
    and d.question_id = p_question_id
    and d.status = 'served'
  for update;

  if delivery_row.id is null then
    raise exception 'Only the currently served diagnostic item can be answered once';
  end if;

  select * into question_row
  from public.project_z_diagnostic_question_bank q
  where q.id = p_question_id
    and q.course_code = session_row.course_code
    and q.course_skill_code = delivery_row.course_skill_code
    and q.verified = true
    and q.answer_verification_status = 'passed'
    and q.misconception_review_status = 'approved'
    and q.accessibility_review_status = 'approved'
    and q.human_mathematics_review_status = 'approved';

  if question_row.id is null then
    raise exception 'The served diagnostic item is no longer approved';
  end if;

  answer_correct := selected_option = question_row.correct_option;

  insert into public.project_z_diagnostic_evidence (
    session_id, user_id, course_skill_code, diagnostic_question_id,
    assessment_criterion, difficulty_band, is_correct, score,
    evidence_strength, response_summary, selected_option, correct_option,
    question_prompt, delivery_id
  ) values (
    p_session_id, actor, question_row.course_skill_code, question_row.id,
    question_row.assessment_criterion, question_row.difficulty_band,
    answer_correct, case when answer_correct then 1 else 0 end,
    1, 'Diagnostic response recorded without answer reveal',
    selected_option, question_row.correct_option, question_row.prompt,
    delivery_row.id
  );

  update public.project_z_diagnostic_item_deliveries d
  set status = 'answered', answered_at = now()
  where d.id = delivery_row.id;

  select
    count(*)::integer,
    count(*) filter (where e.is_correct = true)::integer
  into total_evidence, total_correct
  from public.project_z_diagnostic_evidence e
  where e.user_id = actor
    and e.course_skill_code = question_row.course_skill_code
    and e.delivery_id is not null;

  select sk.max_mastery_percent into skill_max
  from public.project_z_curriculum_skills sk
  where sk.course_skill_code = question_row.course_skill_code;

  accuracy := case when total_evidence = 0 then 0
    else total_correct::numeric / total_evidence::numeric end;
  confidence := least(100, round((total_evidence::numeric / 8.0) * 100, 2));
  mastery := least(
    coalesce(skill_max, 96),
    round((accuracy * 100) * (0.35 + 0.65 * least(1, total_evidence::numeric / 8.0)), 2)
  );

  insert into public.project_z_curriculum_mastery (
    user_id, course_skill_code, evidence_count, correct_count,
    mastery_percent, confidence_percent, last_practised_at,
    next_review_at, updated_at
  ) values (
    actor, question_row.course_skill_code, total_evidence, total_correct,
    mastery, confidence, now(), now() + interval '2 days', now()
  )
  on conflict (user_id, course_skill_code) do update
  set evidence_count = excluded.evidence_count,
      correct_count = excluded.correct_count,
      mastery_percent = excluded.mastery_percent,
      confidence_percent = excluded.confidence_percent,
      last_practised_at = excluded.last_practised_at,
      next_review_at = excluded.next_review_at,
      updated_at = now();

  -- Correctness, the correct option, explanation, and interim mastery are not
  -- returned during the adaptive prologue. This prevents answer leakage and
  -- avoids turning the diagnostic into answer-conditioned practice.
  return jsonb_build_object(
    'ok', true,
    'recorded', true,
    'session_id', p_session_id,
    'delivery_id', delivery_row.id,
    'question_number', delivery_row.sequence_number,
    'next_action', 'continue_diagnostic'
  );
end;
$$;

create or replace function public.project_z_my_diagnostic_summary()
returns table (
  course_skill_code text,
  title text,
  assessment_criterion text,
  evidence_count integer,
  correct_count integer,
  mastery_percent numeric,
  confidence_percent numeric,
  strength_band text,
  next_step text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    sk.course_skill_code,
    sk.title,
    sk.assessment_criterion,
    coalesce(m.evidence_count, 0),
    coalesce(m.correct_count, 0),
    coalesce(m.mastery_percent, 0),
    coalesce(m.confidence_percent, 0),
    case
      when coalesce(m.evidence_count, 0) < 3 then 'Not enough evidence'
      when coalesce(m.mastery_percent, 0) >= 75 then 'Strong'
      when coalesce(m.mastery_percent, 0) >= 45 then 'Developing'
      else 'Priority foundation'
    end,
    case
      when coalesce(m.evidence_count, 0) < 3 then 'Collect more independent evidence.'
      when coalesce(m.mastery_percent, 0) >= 75 then 'Maintain with spaced, mixed review.'
      when coalesce(m.mastery_percent, 0) >= 45 then 'Use guided practice, then check independently.'
      else 'Begin with the recommended prerequisite or first mission.'
    end
  from public.project_z_curriculum_skills sk
  join public.project_z_student_course_selection selected
    on selected.user_id = (select auth.uid())
   and selected.course_code = sk.course_code
  join public.project_z_skill_atlas_candidates a
    on a.atlas_skill_code = sk.course_skill_code
   and a.review_status = 'approved'
  left join public.project_z_curriculum_mastery m
    on m.user_id = (select auth.uid())
   and m.course_skill_code = sk.course_skill_code
  where exists (
    select 1
    from public.project_z_diagnostic_sessions s
    where s.user_id = (select auth.uid())
      and s.course_code = selected.course_code
      and s.status = 'completed'
      and s.completion_outcome = 'sufficient'
  )
  order by coalesce(m.mastery_percent, 0), sk.sort_order;
$$;

-- Direct access to answer-bearing diagnostic rows is removed. The serving RPC
-- exposes prompts/options only; the submission RPC keeps answers private.
revoke all on table public.project_z_diagnostic_question_bank
from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
on table public.project_z_diagnostic_sessions
from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
on table public.project_z_diagnostic_evidence
from anon, authenticated;

-- These legacy practice RPCs depend on a collided table shape and cannot form
-- objective evidence. Keep them unavailable until the reviewed vertical-slice
-- practice event model replaces them. Client-awarded XP is disabled for the
-- same reason; game rewards must derive from server-verified learning events.
revoke all on function public.project_z_recommended_practice()
from public, anon, authenticated;
revoke all on function public.project_z_start_practice_skill(text)
from public, anon, authenticated;
revoke all on function public.project_z_practice_next_question(uuid)
from public, anon, authenticated;
revoke all on function public.project_z_submit_practice_answer(uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.project_z_award_xp(text, text, integer, text)
from public, anon, authenticated;
revoke all on function public.project_z_my_skill_path()
from public, anon, authenticated;
revoke all on function public.project_z_my_path_summary()
from public, anon, authenticated;

-- The current quest/studio RPCs pre-date the mandatory prologue and do not call
-- the database unlock predicate. Keep the main game unavailable until they are
-- rebuilt on server-verified vertical-slice events and explicitly re-granted.
revoke all on function public.project_z_student_quest_profile()
from public, anon, authenticated;
revoke all on function public.project_z_student_daily_streak_checkin()
from public, anon, authenticated;
revoke all on function public.project_z_student_quest_achievements()
from public, anon, authenticated;
revoke all on function public.project_z_student_quest_cosmetics()
from public, anon, authenticated;
revoke all on function public.project_z_student_quest_identity()
from public, anon, authenticated;
revoke all on function public.project_z_student_quest_status()
from public, anon, authenticated;
revoke all on function public.project_z_update_student_quest_identity(text)
from public, anon, authenticated;
revoke all on function public.project_z_companion_evolution_path()
from public, anon, authenticated;
revoke all on function public.project_z_companion_upgrade_summary()
from public, anon, authenticated;
revoke all on function public.project_z_log_companion_upgrade_event(
  text, text, integer, integer, text, jsonb
) from public, anon, authenticated;
revoke all on function public.project_z_touch_learning_day(uuid)
from public, anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
on table public.project_z_student_game_profiles
from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
on table public.project_z_student_daily_checkins
from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
on table public.project_z_student_achievement_unlocks
from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
on table public.project_z_companion_upgrade_events
from anon, authenticated;

revoke all on function public.project_z_prepare_diagnostic_prologue(
  text, text, text, numeric, boolean, boolean, boolean, text, boolean
) from public, anon, authenticated;
revoke all on function public.project_z_my_game_entry_state()
from public, anon, authenticated;
revoke all on function public.project_z_start_diagnostic(text)
from public, anon, authenticated;
revoke all on function public.project_z_set_diagnostic_session_state(uuid, text)
from public, anon, authenticated;
revoke all on function public.project_z_diagnostic_next_question(uuid)
from public, anon, authenticated;
revoke all on function public.project_z_submit_diagnostic_answer(uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.project_z_my_diagnostic_summary()
from public, anon, authenticated;

grant execute on function public.project_z_prepare_diagnostic_prologue(
  text, text, text, numeric, boolean, boolean, boolean, text, boolean
) to authenticated, service_role;
grant execute on function public.project_z_my_game_entry_state()
to authenticated, service_role;
grant execute on function public.project_z_start_diagnostic(text)
to authenticated, service_role;
grant execute on function public.project_z_set_diagnostic_session_state(uuid, text)
to authenticated, service_role;
grant execute on function public.project_z_diagnostic_next_question(uuid)
to authenticated, service_role;
grant execute on function public.project_z_submit_diagnostic_answer(uuid, uuid, text)
to authenticated, service_role;
grant execute on function public.project_z_my_diagnostic_summary()
to authenticated, service_role;

-- Any previously active legacy session is paused when its pathway is not
-- release-ready. No evidence is deleted and no learner-facing pathway is opened.
update public.project_z_diagnostic_sessions s
set status = 'paused',
    pause_reason = 'Phase 58d fail-closed release reconciliation',
    paused_at = now(),
    updated_at = now()
where s.status = 'active'
  and not private.project_z_diagnostic_release_ready(s.course_code);

comment on table public.project_z_student_prologue_profiles is
  'Non-medical access preferences and cohort/pathway setup for the mandatory first diagnostic. Formal accommodations remain teacher/school controlled.';
comment on table public.project_z_diagnostic_item_deliveries is
  'Server-issued diagnostic items. One outstanding delivery per session prevents arbitrary or repeated response submission.';
comment on function public.project_z_my_game_entry_state() is
  'Authoritative main-game gate. Returns unlocked only after reviewed release, completed tool orientation, sufficient diagnostic evidence, and a first mission.';
