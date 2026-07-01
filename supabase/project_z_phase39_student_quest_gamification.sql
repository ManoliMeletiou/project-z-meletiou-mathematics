-- Project Z Phase 39 Student Quest Gamification
-- Purpose: student-friendly, age-appropriate streaks, XP, levels, achievements, and a neutral Math Companion.
-- Design rule: gamification supports learning habits. It does not replace formal marks, mastery, or teacher judgement.

create table if not exists public.project_z_student_game_profiles (
  student_id uuid primary key references public.project_z_profiles(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  level integer not null default 1 check (level >= 1),
  coins integer not null default 0 check (coins >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_checkin_date date,
  selected_companion text not null default 'nova',
  companion_stage integer not null default 1 check (companion_stage between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_z_student_daily_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.project_z_profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  xp_awarded integer not null default 10 check (xp_awarded >= 0),
  reason text not null default 'Daily learning streak',
  created_at timestamptz not null default now(),
  unique (student_id, checkin_date)
);

create table if not exists public.project_z_student_quest_achievements (
  achievement_key text primary key,
  title text not null,
  description text not null,
  icon text not null default '✨',
  xp_reward integer not null default 0 check (xp_reward >= 0),
  display_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.project_z_student_achievement_unlocks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.project_z_profiles(id) on delete cascade,
  achievement_key text not null references public.project_z_student_quest_achievements(achievement_key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (student_id, achievement_key)
);

alter table public.project_z_student_game_profiles enable row level security;
alter table public.project_z_student_daily_checkins enable row level security;
alter table public.project_z_student_quest_achievements enable row level security;
alter table public.project_z_student_achievement_unlocks enable row level security;

drop policy if exists project_z_game_profile_student_select on public.project_z_student_game_profiles;
create policy project_z_game_profile_student_select
on public.project_z_student_game_profiles
for select
using (student_id = auth.uid());

drop policy if exists project_z_daily_checkins_student_select on public.project_z_student_daily_checkins;
create policy project_z_daily_checkins_student_select
on public.project_z_student_daily_checkins
for select
using (student_id = auth.uid());

drop policy if exists project_z_achievements_public_select on public.project_z_student_quest_achievements;
create policy project_z_achievements_public_select
on public.project_z_student_quest_achievements
for select
using (true);

drop policy if exists project_z_achievement_unlocks_student_select on public.project_z_student_achievement_unlocks;
create policy project_z_achievement_unlocks_student_select
on public.project_z_student_achievement_unlocks
for select
using (student_id = auth.uid());

insert into public.project_z_student_quest_achievements (
  achievement_key,
  title,
  description,
  icon,
  xp_reward,
  display_order
)
values
  ('first_step', 'First Step', 'Submit your first answer in Project Z.', '🚀', 20, 10),
  ('accuracy_spark', 'Accuracy Spark', 'Get 10 answers correct.', '✨', 30, 20),
  ('assignment_finisher', 'Assignment Finisher', 'Complete a full generated assignment.', '✅', 40, 30),
  ('correction_champion', 'Correction Champion', 'Have 3 corrections accepted.', '🔁', 50, 40),
  ('level_3', 'Level 3 Explorer', 'Reach Level 3.', '🧭', 30, 50),
  ('level_5', 'Level 5 Strategist', 'Reach Level 5.', '🌟', 60, 60),
  ('streak_3', 'Three-Day Streak', 'Check in for 3 learning days in a row.', '🔥', 30, 70),
  ('streak_7', 'Seven-Day Streak', 'Check in for 7 learning days in a row.', '⚡', 70, 80)
on conflict (achievement_key) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  xp_reward = excluded.xp_reward,
  display_order = excluded.display_order;

create or replace function public.project_z_assert_student_for_quest()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.project_z_profiles p
    where p.id = auth.uid()
      and p.role = 'student'
  ) then
    raise exception 'Student account required for Project Z quest features.';
  end if;
end;
$$;

create or replace function public.project_z_ensure_student_game_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.project_z_assert_student_for_quest();

  insert into public.project_z_student_game_profiles (student_id)
  values (auth.uid())
  on conflict (student_id) do nothing;
end;
$$;

create or replace function public.project_z_student_quest_profile()
returns table (
  student_id uuid,
  total_xp integer,
  level integer,
  coins integer,
  current_streak integer,
  longest_streak integer,
  last_checkin_date date,
  selected_companion text,
  companion_stage integer,
  current_level_xp integer,
  next_level_xp integer,
  level_progress_percent numeric,
  checked_in_today boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submitted_answers integer := 0;
  v_correct_answers integer := 0;
  v_accepted_corrections integer := 0;
  v_completed_assignments integer := 0;
  v_checkin_xp integer := 0;
  v_total_xp integer := 0;
  v_level integer := 1;
  v_companion_stage integer := 1;
begin
  perform public.project_z_ensure_student_game_profile();

  select
    count(*) filter (where r.is_submitted = true),
    count(*) filter (where r.is_correct = true)
  into v_submitted_answers, v_correct_answers
  from public.project_z_generated_assignment_student_responses r
  where r.student_id = auth.uid();

  select count(*)
  into v_accepted_corrections
  from public.project_z_generated_assignment_corrections c
  where c.student_id = auth.uid()
    and c.status = 'accepted';

  with my_assignments as (
    select distinct r.assignment_id
    from public.project_z_generated_assignment_student_responses r
    where r.student_id = auth.uid()
  ),
  question_counts as (
    select
      q.assignment_id,
      count(q.id)::integer as total_questions
    from public.project_z_generated_assignment_questions q
    join my_assignments ma
      on ma.assignment_id = q.assignment_id
    group by q.assignment_id
  ),
  submission_counts as (
    select
      r.assignment_id,
      count(r.id) filter (where r.is_submitted = true)::integer as submitted_questions
    from public.project_z_generated_assignment_student_responses r
    where r.student_id = auth.uid()
    group by r.assignment_id
  )
  select count(*)::integer
  into v_completed_assignments
  from question_counts qc
  join submission_counts sc
    on sc.assignment_id = qc.assignment_id
  where qc.total_questions > 0
    and sc.submitted_questions >= qc.total_questions;

  select coalesce(sum(d.xp_awarded), 0)::integer
  into v_checkin_xp
  from public.project_z_student_daily_checkins d
  where d.student_id = auth.uid();

  v_total_xp :=
    coalesce(v_submitted_answers, 0) * 8 +
    coalesce(v_correct_answers, 0) * 6 +
    coalesce(v_accepted_corrections, 0) * 25 +
    coalesce(v_completed_assignments, 0) * 50 +
    coalesce(v_checkin_xp, 0);

  v_level := greatest(1, floor(sqrt(greatest(v_total_xp, 0)::numeric / 80))::integer + 1);
  v_companion_stage := least(5, greatest(1, floor((v_level - 1)::numeric / 3)::integer + 1));

  update public.project_z_student_game_profiles g
  set
    total_xp = v_total_xp,
    level = v_level,
    coins = floor(v_total_xp::numeric / 20)::integer,
    companion_stage = v_companion_stage,
    updated_at = now()
  where g.student_id = auth.uid();

  return query
  select
    g.student_id,
    g.total_xp,
    g.level,
    g.coins,
    g.current_streak,
    g.longest_streak,
    g.last_checkin_date,
    g.selected_companion,
    g.companion_stage,
    (((g.level - 1) * (g.level - 1)) * 80)::integer as current_level_xp,
    ((g.level * g.level) * 80)::integer as next_level_xp,
    round(
      (
        (g.total_xp - (((g.level - 1) * (g.level - 1)) * 80))::numeric /
        nullif((((g.level * g.level) * 80) - (((g.level - 1) * (g.level - 1)) * 80))::numeric, 0)
      ) * 100,
      1
    ) as level_progress_percent,
    (g.last_checkin_date = current_date) as checked_in_today
  from public.project_z_student_game_profiles g
  where g.student_id = auth.uid();
end;
$$;

create or replace function public.project_z_student_daily_streak_checkin()
returns table (
  student_id uuid,
  total_xp integer,
  level integer,
  coins integer,
  current_streak integer,
  longest_streak integer,
  last_checkin_date date,
  selected_companion text,
  companion_stage integer,
  current_level_xp integer,
  next_level_xp integer,
  level_progress_percent numeric,
  checked_in_today boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_previous_date date;
  v_previous_streak integer := 0;
  v_new_streak integer := 1;
begin
  perform public.project_z_ensure_student_game_profile();

  select g.last_checkin_date, g.current_streak
  into v_previous_date, v_previous_streak
  from public.project_z_student_game_profiles g
  where g.student_id = auth.uid();

  if v_previous_date = v_today then
    return query select * from public.project_z_student_quest_profile();
    return;
  end if;

  if v_previous_date = v_today - interval '1 day' then
    v_new_streak := coalesce(v_previous_streak, 0) + 1;
  else
    v_new_streak := 1;
  end if;

  insert into public.project_z_student_daily_checkins (
    student_id,
    checkin_date,
    xp_awarded,
    reason
  )
  values (
    auth.uid(),
    v_today,
    10,
    'Daily learning streak'
  )
  on conflict (student_id, checkin_date) do nothing;

  update public.project_z_student_game_profiles g
  set
    current_streak = v_new_streak,
    longest_streak = greatest(coalesce(g.longest_streak, 0), v_new_streak),
    last_checkin_date = v_today,
    updated_at = now()
  where g.student_id = auth.uid();

  return query select * from public.project_z_student_quest_profile();
end;
$$;

create or replace function public.project_z_student_quest_achievements()
returns table (
  achievement_key text,
  title text,
  description text,
  icon text,
  xp_reward integer,
  display_order integer,
  unlocked boolean,
  unlocked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submitted_answers integer := 0;
  v_correct_answers integer := 0;
  v_accepted_corrections integer := 0;
  v_completed_assignments integer := 0;
  v_level integer := 1;
  v_current_streak integer := 0;
begin
  perform public.project_z_ensure_student_game_profile();
  perform public.project_z_student_quest_profile();

  select
    g.level,
    g.current_streak
  into v_level, v_current_streak
  from public.project_z_student_game_profiles g
  where g.student_id = auth.uid();

  select
    count(*) filter (where r.is_submitted = true),
    count(*) filter (where r.is_correct = true)
  into v_submitted_answers, v_correct_answers
  from public.project_z_generated_assignment_student_responses r
  where r.student_id = auth.uid();

  select count(*)
  into v_accepted_corrections
  from public.project_z_generated_assignment_corrections c
  where c.student_id = auth.uid()
    and c.status = 'accepted';

  with my_assignments as (
    select distinct r.assignment_id
    from public.project_z_generated_assignment_student_responses r
    where r.student_id = auth.uid()
  ),
  question_counts as (
    select q.assignment_id, count(q.id)::integer as total_questions
    from public.project_z_generated_assignment_questions q
    join my_assignments ma on ma.assignment_id = q.assignment_id
    group by q.assignment_id
  ),
  submission_counts as (
    select r.assignment_id, count(r.id) filter (where r.is_submitted = true)::integer as submitted_questions
    from public.project_z_generated_assignment_student_responses r
    where r.student_id = auth.uid()
    group by r.assignment_id
  )
  select count(*)::integer
  into v_completed_assignments
  from question_counts qc
  join submission_counts sc on sc.assignment_id = qc.assignment_id
  where qc.total_questions > 0
    and sc.submitted_questions >= qc.total_questions;

  insert into public.project_z_student_achievement_unlocks (student_id, achievement_key)
  select auth.uid(), possible.key
  from (
    values
      ('first_step', v_submitted_answers >= 1),
      ('accuracy_spark', v_correct_answers >= 10),
      ('assignment_finisher', v_completed_assignments >= 1),
      ('correction_champion', v_accepted_corrections >= 3),
      ('level_3', v_level >= 3),
      ('level_5', v_level >= 5),
      ('streak_3', v_current_streak >= 3),
      ('streak_7', v_current_streak >= 7)
  ) as possible(key, unlocked)
  where possible.unlocked = true
  on conflict (student_id, achievement_key) do nothing;

  return query
  select
    a.achievement_key,
    a.title,
    a.description,
    a.icon,
    a.xp_reward,
    a.display_order,
    (u.id is not null) as unlocked,
    u.unlocked_at
  from public.project_z_student_quest_achievements a
  left join public.project_z_student_achievement_unlocks u
    on u.achievement_key = a.achievement_key
    and u.student_id = auth.uid()
  order by
    case when u.id is not null then 0 else 1 end,
    a.display_order;
end;
$$;

create or replace function public.project_z_student_quest_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-39-student-quest-gamification',
    'student_streaks', true,
    'xp_levels', true,
    'neutral_math_companion', true,
    'achievements', true,
    'effort_not_marks', true,
    'age_12_to_19_friendly', true,
    'gender_neutral_design', true,
    'separate_from_assessment', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_assert_student_for_quest() to authenticated;
grant execute on function public.project_z_ensure_student_game_profile() to authenticated;
grant execute on function public.project_z_student_daily_streak_checkin() to authenticated;
grant execute on function public.project_z_student_quest_profile() to authenticated;
grant execute on function public.project_z_student_quest_achievements() to authenticated;
grant execute on function public.project_z_student_quest_status() to authenticated;

select
  'Project Z Phase 39 student quest gamification schema applied successfully' as status,
  now() as applied_at;
