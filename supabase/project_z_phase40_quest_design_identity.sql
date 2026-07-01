-- Project Z Phase 40 Quest Design Upgrade and Student Visual Identity
-- Purpose: premium student-friendly quest identity: companion cosmetics, titles, auras, badges, and themes.
-- Rule: visual identity rewards learning habits; it does not replace formal assessment, mastery, or teacher judgement.

alter table public.project_z_student_game_profiles
  add column if not exists selected_aura text not null default 'aura_focus_blue',
  add column if not exists selected_badge text not null default 'badge_first_steps',
  add column if not exists selected_title text not null default 'title_math_explorer',
  add column if not exists selected_theme text not null default 'theme_cosmic_light';

create table if not exists public.project_z_quest_cosmetics (
  cosmetic_key text primary key,
  cosmetic_type text not null check (cosmetic_type in ('companion_skin', 'aura', 'badge', 'title', 'theme')),
  display_name text not null,
  description text not null,
  icon text not null default '✨',
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  min_level integer not null default 1 check (min_level >= 1),
  min_streak integer not null default 0 check (min_streak >= 0),
  required_achievement_key text references public.project_z_student_quest_achievements(achievement_key) on delete set null,
  display_order integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.project_z_quest_cosmetics enable row level security;

drop policy if exists project_z_quest_cosmetics_public_select on public.project_z_quest_cosmetics;
create policy project_z_quest_cosmetics_public_select
on public.project_z_quest_cosmetics
for select
using (true);

insert into public.project_z_quest_cosmetics (
  cosmetic_key,
  cosmetic_type,
  display_name,
  description,
  icon,
  rarity,
  min_level,
  min_streak,
  required_achievement_key,
  display_order
)
values
  ('title_math_explorer', 'title', 'Math Explorer', 'For students beginning their Project Z journey.', '🧭', 'common', 1, 0, null, 10),
  ('title_pattern_hunter', 'title', 'Pattern Hunter', 'For students who search for structure and connections.', '🔎', 'common', 2, 0, null, 20),
  ('title_correction_champion', 'title', 'Correction Champion', 'For students who turn mistakes into progress.', '🔁', 'rare', 3, 0, 'correction_champion', 30),
  ('title_strategy_builder', 'title', 'Strategy Builder', 'For students who keep improving their methods.', '♟️', 'rare', 4, 0, null, 40),
  ('title_quantum_thinker', 'title', 'Quantum Thinker', 'For advanced progress and consistent learning habits.', '⚛️', 'epic', 5, 0, 'level_5', 50),

  ('aura_focus_blue', 'aura', 'Focus Blue', 'A calm learning aura for steady work.', '🔵', 'common', 1, 0, null, 110),
  ('aura_growth_green', 'aura', 'Growth Green', 'A growth aura for practice and improvement.', '🟢', 'common', 2, 0, null, 120),
  ('aura_streak_flame', 'aura', 'Streak Flame', 'Unlocked by keeping a learning streak alive.', '🔥', 'rare', 2, 3, 'streak_3', 130),
  ('aura_starfield', 'aura', 'Starfield', 'A premium aura for stronger long-term consistency.', '🌌', 'epic', 5, 7, 'streak_7', 140),

  ('badge_first_steps', 'badge', 'First Steps Badge', 'A clean starter badge for joining the quest.', '🚀', 'common', 1, 0, null, 210),
  ('badge_accuracy_spark', 'badge', 'Accuracy Spark Badge', 'For building accuracy through careful work.', '✨', 'rare', 2, 0, 'accuracy_spark', 220),
  ('badge_finisher', 'badge', 'Assignment Finisher Badge', 'For completing full assignments.', '✅', 'rare', 2, 0, 'assignment_finisher', 230),
  ('badge_correction_loop', 'badge', 'Correction Loop Badge', 'For using feedback and improving corrections.', '🔁', 'epic', 3, 0, 'correction_champion', 240),

  ('skin_nova_core', 'companion_skin', 'Nova Core', 'A clean cosmic companion form.', '✨', 'common', 1, 0, null, 310),
  ('skin_pulse_vector', 'companion_skin', 'Pulse Vector', 'A sharper tech-style companion skin.', '🌟', 'common', 2, 0, null, 320),
  ('skin_orbit_prime', 'companion_skin', 'Orbit Prime', 'A mature orbital companion style.', '🪐', 'rare', 3, 0, 'level_3', 330),
  ('skin_quasar_edge', 'companion_skin', 'Quasar Edge', 'A high-energy companion skin for committed learners.', '☄️', 'epic', 5, 0, 'level_5', 340),

  ('theme_cosmic_light', 'theme', 'Cosmic Light', 'A bright, clean, cosmic theme.', '🌤️', 'common', 1, 0, null, 410),
  ('theme_midnight_focus', 'theme', 'Midnight Focus', 'A deeper focus-style identity.', '🌙', 'rare', 3, 0, null, 420),
  ('theme_neon_grid', 'theme', 'Neon Grid', 'A modern tech-inspired theme for strong progress.', '🕹️', 'epic', 5, 0, 'level_5', 430)
on conflict (cosmetic_key) do update set
  cosmetic_type = excluded.cosmetic_type,
  display_name = excluded.display_name,
  description = excluded.description,
  icon = excluded.icon,
  rarity = excluded.rarity,
  min_level = excluded.min_level,
  min_streak = excluded.min_streak,
  required_achievement_key = excluded.required_achievement_key,
  display_order = excluded.display_order;

create or replace function public.project_z_student_quest_cosmetics()
returns table (
  cosmetic_key text,
  cosmetic_type text,
  display_name text,
  description text,
  icon text,
  rarity text,
  min_level integer,
  min_streak integer,
  required_achievement_key text,
  display_order integer,
  unlocked boolean,
  unlock_reason text,
  selected boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level integer := 1;
  v_streak integer := 0;
  v_skin text := 'skin_nova_core';
  v_aura text := 'aura_focus_blue';
  v_badge text := 'badge_first_steps';
  v_title text := 'title_math_explorer';
  v_theme text := 'theme_cosmic_light';
begin
  perform public.project_z_sync_student_quest_achievements();

  select
    g.level,
    g.current_streak,
    coalesce(g.selected_companion, 'skin_nova_core'),
    coalesce(g.selected_aura, 'aura_focus_blue'),
    coalesce(g.selected_badge, 'badge_first_steps'),
    coalesce(g.selected_title, 'title_math_explorer'),
    coalesce(g.selected_theme, 'theme_cosmic_light')
  into
    v_level,
    v_streak,
    v_skin,
    v_aura,
    v_badge,
    v_title,
    v_theme
  from public.project_z_student_game_profiles g
  where g.student_id = auth.uid();

  return query
  select
    c.cosmetic_key,
    c.cosmetic_type,
    c.display_name,
    c.description,
    c.icon,
    c.rarity,
    c.min_level,
    c.min_streak,
    c.required_achievement_key,
    c.display_order,
    (
      coalesce(v_level, 1) >= c.min_level
      and coalesce(v_streak, 0) >= c.min_streak
      and (
        c.required_achievement_key is null
        or exists (
          select 1
          from public.project_z_student_achievement_unlocks u
          where u.student_id = auth.uid()
            and u.achievement_key = c.required_achievement_key
        )
      )
    ) as unlocked,
    case
      when coalesce(v_level, 1) < c.min_level then 'Reach Level ' || c.min_level::text
      when coalesce(v_streak, 0) < c.min_streak then 'Reach a ' || c.min_streak::text || '-day streak'
      when c.required_achievement_key is not null and not exists (
        select 1
        from public.project_z_student_achievement_unlocks u
        where u.student_id = auth.uid()
          and u.achievement_key = c.required_achievement_key
      ) then 'Unlock achievement: ' || c.required_achievement_key
      else 'Unlocked'
    end as unlock_reason,
    case
      when c.cosmetic_type = 'companion_skin' then c.cosmetic_key in (v_skin, 'skin_' || v_skin)
      when c.cosmetic_type = 'aura' then c.cosmetic_key = v_aura
      when c.cosmetic_type = 'badge' then c.cosmetic_key = v_badge
      when c.cosmetic_type = 'title' then c.cosmetic_key = v_title
      when c.cosmetic_type = 'theme' then c.cosmetic_key = v_theme
      else false
    end as selected
  from public.project_z_quest_cosmetics c
  order by c.cosmetic_type, c.display_order;
end;
$$;

create or replace function public.project_z_student_quest_identity()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_skin record;
  v_aura record;
  v_badge record;
  v_title record;
  v_theme record;
begin
  perform public.project_z_sync_student_quest_achievements();

  select *
  into v_profile
  from public.project_z_student_game_profiles g
  where g.student_id = auth.uid();

  select * into v_skin
  from public.project_z_quest_cosmetics c
  where c.cosmetic_key = coalesce(v_profile.selected_companion, 'skin_nova_core')
     or c.cosmetic_key = 'skin_' || coalesce(v_profile.selected_companion, 'nova_core')
  order by
    case when c.cosmetic_key = coalesce(v_profile.selected_companion, 'skin_nova_core') then 0 else 1 end
  limit 1;

  select * into v_aura
  from public.project_z_quest_cosmetics c
  where c.cosmetic_key = coalesce(v_profile.selected_aura, 'aura_focus_blue')
  limit 1;

  select * into v_badge
  from public.project_z_quest_cosmetics c
  where c.cosmetic_key = coalesce(v_profile.selected_badge, 'badge_first_steps')
  limit 1;

  select * into v_title
  from public.project_z_quest_cosmetics c
  where c.cosmetic_key = coalesce(v_profile.selected_title, 'title_math_explorer')
  limit 1;

  select * into v_theme
  from public.project_z_quest_cosmetics c
  where c.cosmetic_key = coalesce(v_profile.selected_theme, 'theme_cosmic_light')
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'student_id', auth.uid(),
    'level', coalesce(v_profile.level, 1),
    'total_xp', coalesce(v_profile.total_xp, 0),
    'current_streak', coalesce(v_profile.current_streak, 0),
    'companion_stage', coalesce(v_profile.companion_stage, 1),
    'skin', jsonb_build_object(
      'key', coalesce(v_skin.cosmetic_key, 'skin_nova_core'),
      'name', coalesce(v_skin.display_name, 'Nova Core'),
      'icon', coalesce(v_skin.icon, '✨'),
      'rarity', coalesce(v_skin.rarity, 'common')
    ),
    'aura', jsonb_build_object(
      'key', coalesce(v_aura.cosmetic_key, 'aura_focus_blue'),
      'name', coalesce(v_aura.display_name, 'Focus Blue'),
      'icon', coalesce(v_aura.icon, '🔵'),
      'rarity', coalesce(v_aura.rarity, 'common')
    ),
    'badge', jsonb_build_object(
      'key', coalesce(v_badge.cosmetic_key, 'badge_first_steps'),
      'name', coalesce(v_badge.display_name, 'First Steps Badge'),
      'icon', coalesce(v_badge.icon, '🚀'),
      'rarity', coalesce(v_badge.rarity, 'common')
    ),
    'title', jsonb_build_object(
      'key', coalesce(v_title.cosmetic_key, 'title_math_explorer'),
      'name', coalesce(v_title.display_name, 'Math Explorer'),
      'icon', coalesce(v_title.icon, '🧭'),
      'rarity', coalesce(v_title.rarity, 'common')
    ),
    'theme', jsonb_build_object(
      'key', coalesce(v_theme.cosmetic_key, 'theme_cosmic_light'),
      'name', coalesce(v_theme.display_name, 'Cosmic Light'),
      'icon', coalesce(v_theme.icon, '🌤️'),
      'rarity', coalesce(v_theme.rarity, 'common')
    )
  );
end;
$$;

create or replace function public.project_z_update_student_quest_identity(
  p_cosmetic_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cosmetic record;
  v_unlocked boolean := false;
begin
  perform public.project_z_sync_student_quest_achievements();

  select *
  into v_cosmetic
  from public.project_z_student_quest_cosmetics()
  where cosmetic_key = p_cosmetic_key;

  if v_cosmetic.cosmetic_key is null then
    raise exception 'Cosmetic not found.';
  end if;

  v_unlocked := coalesce(v_cosmetic.unlocked, false);

  if v_unlocked is not true then
    raise exception 'This cosmetic is locked.';
  end if;

  if v_cosmetic.cosmetic_type = 'companion_skin' then
    update public.project_z_student_game_profiles
    set selected_companion = v_cosmetic.cosmetic_key, updated_at = now()
    where student_id = auth.uid();
  elsif v_cosmetic.cosmetic_type = 'aura' then
    update public.project_z_student_game_profiles
    set selected_aura = v_cosmetic.cosmetic_key, updated_at = now()
    where student_id = auth.uid();
  elsif v_cosmetic.cosmetic_type = 'badge' then
    update public.project_z_student_game_profiles
    set selected_badge = v_cosmetic.cosmetic_key, updated_at = now()
    where student_id = auth.uid();
  elsif v_cosmetic.cosmetic_type = 'title' then
    update public.project_z_student_game_profiles
    set selected_title = v_cosmetic.cosmetic_key, updated_at = now()
    where student_id = auth.uid();
  elsif v_cosmetic.cosmetic_type = 'theme' then
    update public.project_z_student_game_profiles
    set selected_theme = v_cosmetic.cosmetic_key, updated_at = now()
    where student_id = auth.uid();
  end if;

  return public.project_z_student_quest_identity();
end;
$$;

create or replace function public.project_z_quest_design_identity_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-40-quest-design-identity',
    'quest_studio_page', true,
    'student_visual_identity', true,
    'cosmetic_unlocks', true,
    'companion_skins', true,
    'titles_auras_badges_themes', true,
    'premium_age_12_to_19_design', true,
    'gender_neutral_identity', true,
    'separate_from_assessment', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_student_quest_cosmetics() to authenticated;
grant execute on function public.project_z_student_quest_identity() to authenticated;
grant execute on function public.project_z_update_student_quest_identity(text) to authenticated;
grant execute on function public.project_z_quest_design_identity_status() to authenticated;

select
  'Project Z Phase 40 quest design identity schema applied successfully' as status,
  now() as applied_at;
