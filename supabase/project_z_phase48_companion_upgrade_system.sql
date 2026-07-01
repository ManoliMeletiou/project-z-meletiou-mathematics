-- Project Z Phase 48 — Advanced Companion Upgrade System
-- Run this manually in Supabase SQL Editor for project jlesueqjdvmxkqaqmnke.
-- Purpose: add companion evolution milestones, upgrade events, and read-only RPCs
-- for a richer 3D companion upgrade system.
-- Safety rules:
-- - This does not change formal grades or IB assessment.
-- - XP, streaks, levels, cosmetics, and companion progress remain motivation signals only.
-- - It does not weaken existing RLS.

create extension if not exists pgcrypto;

create table if not exists public.project_z_companion_evolution_milestones (
  stage integer primary key check (stage between 1 and 5),
  title text not null,
  description text not null,
  required_level integer not null default 1 check (required_level >= 1),
  required_streak integer not null default 0 check (required_streak >= 0),
  visual_trait text not null,
  learning_focus text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_z_companion_upgrade_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  event_type text not null check (
    event_type in (
      'daily_checkin', 'level_up', 'achievement_unlocked', 'cosmetic_equipped',
      'assignment_completed', 'correction_submitted', 'tutor_used', 'mastery_growth', 'manual_note'
    )
  ),
  xp_delta integer not null default 0,
  companion_xp_delta integer not null default 0,
  mood text not null default 'idle' check (mood in ('idle', 'celebrate', 'thinking', 'encourage', 'studio')),
  source_table text,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_z_companion_upgrade_events_student_created
  on public.project_z_companion_upgrade_events(student_id, created_at desc);

create index if not exists idx_project_z_companion_upgrade_events_type
  on public.project_z_companion_upgrade_events(event_type);

alter table public.project_z_companion_evolution_milestones enable row level security;
alter table public.project_z_companion_upgrade_events enable row level security;

drop policy if exists "project_z_companion_milestones_select_authenticated" on public.project_z_companion_evolution_milestones;
create policy "project_z_companion_milestones_select_authenticated"
  on public.project_z_companion_evolution_milestones
  for select
  to authenticated
  using (true);

drop policy if exists "project_z_companion_events_select_own" on public.project_z_companion_upgrade_events;
create policy "project_z_companion_events_select_own"
  on public.project_z_companion_upgrade_events
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists "project_z_companion_events_insert_own" on public.project_z_companion_upgrade_events;
create policy "project_z_companion_events_insert_own"
  on public.project_z_companion_upgrade_events
  for insert
  to authenticated
  with check (student_id = auth.uid());

insert into public.project_z_companion_evolution_milestones (
  stage, title, description, required_level, required_streak, visual_trait, learning_focus, display_order
)
values
  (1, 'Spark Form', 'The companion begins as a small learning spark. It responds to first actions and daily momentum.', 1, 0, 'small glowing core, simple orbit ring', 'start learning, first practice, first check-in', 1),
  (2, 'Nova Form', 'The companion brightens when the student begins to build regular learning habits.', 2, 1, 'brighter glow, stronger colour palette, extra orbit sparkle', 'consistency, early confidence, assignment completion', 2),
  (3, 'Orbit Form', 'The companion develops a stronger mathematical identity as the student corrects mistakes and uses feedback.', 3, 2, 'visible orbit system, top crystal, clearer animated reactions', 'corrections, reflection, misconception repair', 3),
  (4, 'Quasar Form', 'The companion becomes more powerful when the student shows persistence over time.', 4, 4, 'multiple orbit rings, stronger aura, deeper 3D presence', 'persistence, mastery growth, challenging tasks', 4),
  (5, 'Constellation Form', 'The companion reaches its legendary form when the student shows long-term mastery habits.', 5, 7, 'constellation shell, legendary aura, high-energy celebration state', 'long-term retrieval, mastery evidence, independence', 5)
on conflict (stage) do update set
  title = excluded.title,
  description = excluded.description,
  required_level = excluded.required_level,
  required_streak = excluded.required_streak,
  visual_trait = excluded.visual_trait,
  learning_focus = excluded.learning_focus,
  display_order = excluded.display_order,
  updated_at = now();

create or replace function public.project_z_companion_upgrade_summary()
returns table (
  companion_stage integer,
  current_stage_xp integer,
  next_stage_xp integer,
  stage_progress_percent integer,
  next_upgrade_title text,
  next_upgrade_description text,
  next_required_level integer,
  next_required_streak integer,
  suggested_mood text,
  recent_event_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_stage integer := 1;
  v_level integer := 1;
  v_streak integer := 0;
  v_total_xp integer := 0;
  v_next_stage integer := 2;
  v_event_count integer := 0;
  v_progress integer := 0;
begin
  if v_student_id is null then
    return;
  end if;

  begin
    select
      coalesce(q.companion_stage, 1),
      coalesce(q.level, 1),
      coalesce(q.current_streak, 0),
      coalesce(q.total_xp, 0)
    into v_stage, v_level, v_streak, v_total_xp
    from public.project_z_student_quest_profile() q
    limit 1;
  exception when others then
    v_stage := 1;
    v_level := 1;
    v_streak := 0;
    v_total_xp := 0;
  end;

  v_stage := greatest(1, least(5, coalesce(v_stage, 1)));
  v_next_stage := greatest(1, least(5, v_stage + 1));
  v_progress := least(100, greatest(0, (coalesce(v_total_xp, 0) % 100)));

  select count(*)::integer
  into v_event_count
  from public.project_z_companion_upgrade_events e
  where e.student_id = v_student_id
    and e.created_at > now() - interval '14 days';

  return query
  select
    v_stage,
    v_progress,
    100,
    v_progress,
    coalesce(m.title, 'Legendary mastery path'),
    coalesce(m.description, 'Keep practising, correcting, reflecting, and building long-term mathematical confidence.'),
    coalesce(m.required_level, v_level),
    coalesce(m.required_streak, v_streak),
    case
      when v_streak = 0 then 'encourage'
      when v_progress >= 85 then 'celebrate'
      when v_event_count >= 3 then 'thinking'
      else 'idle'
    end,
    v_event_count
  from public.project_z_companion_evolution_milestones m
  where m.stage = v_next_stage
  union all
  select
    v_stage,
    v_progress,
    100,
    v_progress,
    'Constellation maintenance',
    'The companion is at its highest stage. Keep using retrieval practice, corrections, and reflection to maintain mastery habits.',
    v_level,
    v_streak,
    case when v_progress >= 85 then 'celebrate' else 'idle' end,
    v_event_count
  where v_stage >= 5
  limit 1;
end;
$$;

create or replace function public.project_z_companion_evolution_path()
returns table (
  stage integer,
  title text,
  description text,
  required_level integer,
  required_streak integer,
  visual_trait text,
  learning_focus text,
  active boolean,
  current_stage boolean,
  locked boolean,
  display_order integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_stage integer := 1;
  v_level integer := 1;
  v_streak integer := 0;
begin
  if v_student_id is null then
    return;
  end if;

  begin
    select
      coalesce(q.companion_stage, 1),
      coalesce(q.level, 1),
      coalesce(q.current_streak, 0)
    into v_stage, v_level, v_streak
    from public.project_z_student_quest_profile() q
    limit 1;
  exception when others then
    v_stage := 1;
    v_level := 1;
    v_streak := 0;
  end;

  v_stage := greatest(1, least(5, coalesce(v_stage, 1)));

  return query
  select
    m.stage,
    m.title,
    m.description,
    m.required_level,
    m.required_streak,
    m.visual_trait,
    m.learning_focus,
    (m.stage <= v_stage) as active,
    (m.stage = v_stage) as current_stage,
    not (v_level >= m.required_level and v_streak >= m.required_streak) as locked,
    m.display_order
  from public.project_z_companion_evolution_milestones m
  order by m.display_order, m.stage;
end;
$$;

create or replace function public.project_z_log_companion_upgrade_event(
  p_event_key text,
  p_event_type text,
  p_xp_delta integer default 0,
  p_companion_xp_delta integer default 0,
  p_mood text default 'idle',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_event_id uuid;
begin
  if v_student_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  if p_event_type not in (
    'daily_checkin', 'level_up', 'achievement_unlocked', 'cosmetic_equipped',
    'assignment_completed', 'correction_submitted', 'tutor_used', 'mastery_growth', 'manual_note'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_event_type');
  end if;

  if p_mood not in ('idle', 'celebrate', 'thinking', 'encourage', 'studio') then
    p_mood := 'idle';
  end if;

  insert into public.project_z_companion_upgrade_events (
    student_id, event_key, event_type, xp_delta, companion_xp_delta, mood, metadata
  )
  values (
    v_student_id,
    coalesce(nullif(trim(p_event_key), ''), 'companion_event'),
    p_event_type,
    coalesce(p_xp_delta, 0),
    coalesce(p_companion_xp_delta, 0),
    p_mood,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return jsonb_build_object('ok', true, 'event_id', v_event_id);
end;
$$;

grant select on public.project_z_companion_evolution_milestones to authenticated;
grant select, insert on public.project_z_companion_upgrade_events to authenticated;
grant execute on function public.project_z_companion_upgrade_summary() to authenticated;
grant execute on function public.project_z_companion_evolution_path() to authenticated;
grant execute on function public.project_z_log_companion_upgrade_event(text, text, integer, integer, text, jsonb) to authenticated;

select
  'phase-48-companion-upgrade-system' as expected_phase,
  to_regclass('public.project_z_companion_evolution_milestones') is not null as milestones_table_exists,
  to_regclass('public.project_z_companion_upgrade_events') is not null as upgrade_events_table_exists,
  to_regprocedure('public.project_z_companion_upgrade_summary()') is not null as upgrade_summary_rpc_exists,
  to_regprocedure('public.project_z_companion_evolution_path()') is not null as evolution_path_rpc_exists,
  to_regprocedure('public.project_z_log_companion_upgrade_event(text,text,integer,integer,text,jsonb)') is not null as log_event_rpc_exists,
  (select count(*) from public.project_z_companion_evolution_milestones) as milestone_count;
