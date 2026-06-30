-- Project Z Phase 14 Duolingo-style Skill Path
-- Safe to run more than once after Phase 13.

create extension if not exists pgcrypto;

create table if not exists public.project_z_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  course_skill_code text references public.project_z_curriculum_skills(course_skill_code) on delete set null,
  source_type text not null check (source_type in ('diagnostic', 'recommended_practice', 'review', 'assignment', 'manual')),
  xp_amount integer not null default 0 check (xp_amount >= 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_z_student_streaks (
  user_id uuid primary key references public.project_z_profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

alter table public.project_z_xp_events enable row level security;
alter table public.project_z_student_streaks enable row level security;

drop policy if exists "xp_events_select_own_teacher_parent" on public.project_z_xp_events;
create policy "xp_events_select_own_teacher_parent"
on public.project_z_xp_events
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_z_class_members cm
    join public.project_z_classes c on c.id = cm.class_id
    where cm.student_id = project_z_xp_events.user_id
      and c.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_z_parent_student_links l
    where l.parent_id = auth.uid()
      and l.student_id = project_z_xp_events.user_id
      and l.status = 'active'
  )
);

drop policy if exists "student_streaks_select_own_teacher_parent" on public.project_z_student_streaks;
create policy "student_streaks_select_own_teacher_parent"
on public.project_z_student_streaks
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_z_class_members cm
    join public.project_z_classes c on c.id = cm.class_id
    where cm.student_id = project_z_student_streaks.user_id
      and c.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_z_parent_student_links l
    where l.parent_id = auth.uid()
      and l.student_id = project_z_student_streaks.user_id
      and l.status = 'active'
  )
);

create or replace function public.project_z_touch_learning_day(
  p_student_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student uuid;
  today date := current_date;
  streak_row public.project_z_student_streaks;
  new_current integer;
  new_longest integer;
begin
  target_student := coalesce(p_student_id, auth.uid());

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if target_student <> auth.uid() then
    raise exception 'Only a student can update their own streak';
  end if;

  select *
  into streak_row
  from public.project_z_student_streaks
  where user_id = target_student;

  if streak_row.user_id is null then
    insert into public.project_z_student_streaks (
      user_id,
      current_streak,
      longest_streak,
      last_active_date,
      updated_at
    )
    values (
      target_student,
      1,
      1,
      today,
      now()
    );

    return jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'last_active_date', today
    );
  end if;

  if streak_row.last_active_date = today then
    return jsonb_build_object(
      'current_streak', streak_row.current_streak,
      'longest_streak', streak_row.longest_streak,
      'last_active_date', streak_row.last_active_date
    );
  end if;

  if streak_row.last_active_date = today - interval '1 day' then
    new_current := streak_row.current_streak + 1;
  else
    new_current := 1;
  end if;

  new_longest := greatest(streak_row.longest_streak, new_current);

  update public.project_z_student_streaks
  set current_streak = new_current,
      longest_streak = new_longest,
      last_active_date = today,
      updated_at = now()
  where user_id = target_student;

  return jsonb_build_object(
    'current_streak', new_current,
    'longest_streak', new_longest,
    'last_active_date', today
  );
end;
$$;

create or replace function public.project_z_award_xp(
  p_course_skill_code text,
  p_source_type text,
  p_xp_amount integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  xp integer;
  streak jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if caller_role <> 'student' then
    raise exception 'Only students can earn XP';
  end if;

  xp := greatest(0, least(coalesce(p_xp_amount, 0), 100));

  if xp > 0 then
    insert into public.project_z_xp_events (
      user_id,
      course_skill_code,
      source_type,
      xp_amount,
      reason
    )
    values (
      auth.uid(),
      p_course_skill_code,
      p_source_type,
      xp,
      coalesce(p_reason, 'Learning activity')
    );
  end if;

  streak := public.project_z_touch_learning_day(auth.uid());

  return jsonb_build_object(
    'ok', true,
    'xp_awarded', xp,
    'streak', streak
  );
end;
$$;

create or replace function public.project_z_my_skill_path()
returns table (
  course_skill_code text,
  course_code text,
  course_display_name text,
  strand_title text,
  assessment_criterion text,
  title text,
  description text,
  prerequisite_skill_codes text[],
  difficulty_band integer,
  sort_order integer,
  mastery_percent numeric,
  confidence_percent numeric,
  evidence_count integer,
  correct_count integer,
  path_status text,
  lock_reason text,
  next_action text,
  path_position integer
)
language sql
security definer
set search_path = public
as $$
  with selected_course as (
    select s.course_code
    from public.project_z_student_course_selection s
    where s.user_id = auth.uid()
    limit 1
  ),
  base as (
    select
      sk.course_skill_code,
      sk.course_code,
      c.display_name as course_display_name,
      st.title as strand_title,
      sk.assessment_criterion,
      sk.title,
      sk.description,
      sk.prerequisite_skill_codes,
      sk.difficulty_band,
      sk.sort_order,
      coalesce(m.mastery_percent, 0) as mastery_percent,
      coalesce(m.confidence_percent, 0) as confidence_percent,
      coalesce(m.evidence_count, 0) as evidence_count,
      coalesce(m.correct_count, 0) as correct_count,
      row_number() over (order by sk.difficulty_band, st.sort_order, sk.sort_order, sk.title)::integer as path_position
    from public.project_z_curriculum_skills sk
    join selected_course sc on sc.course_code = sk.course_code
    join public.project_z_course_catalog c on c.course_code = sk.course_code
    join public.project_z_curriculum_strands st on st.strand_code = sk.strand_code
    left join public.project_z_curriculum_mastery m
      on m.course_skill_code = sk.course_skill_code
     and m.user_id = auth.uid()
    where sk.game_path_enabled = true
  ),
  prereq_status as (
    select
      b.course_skill_code,
      case
        when cardinality(b.prerequisite_skill_codes) = 0 then true
        else not exists (
          select 1
          from unnest(b.prerequisite_skill_codes) as prereq(code)
          left join public.project_z_curriculum_mastery pm
            on pm.course_skill_code = prereq.code
           and pm.user_id = auth.uid()
          where coalesce(pm.mastery_percent, 0) < 45
             or coalesce(pm.evidence_count, 0) < 2
        )
      end as prerequisites_met
    from base b
  )
  select
    b.course_skill_code,
    b.course_code,
    b.course_display_name,
    b.strand_title,
    b.assessment_criterion,
    b.title,
    b.description,
    b.prerequisite_skill_codes,
    b.difficulty_band,
    b.sort_order,
    b.mastery_percent,
    b.confidence_percent,
    b.evidence_count,
    b.correct_count,
    case
      when ps.prerequisites_met = false then 'locked'
      when b.evidence_count = 0 then 'ready'
      when b.mastery_percent < 45 then 'weak'
      when b.mastery_percent < 75 then 'developing'
      when b.mastery_percent >= 75 and b.confidence_percent < 85 then 'strong_needs_evidence'
      when b.mastery_percent >= 75 and b.confidence_percent >= 85 then 'mastered_review'
      else 'ready'
    end as path_status,
    case
      when ps.prerequisites_met = false then 'Complete the prerequisite skills first.'
      else ''
    end as lock_reason,
    case
      when ps.prerequisites_met = false then 'Locked'
      when b.evidence_count = 0 then 'Start diagnostic/practice'
      when b.mastery_percent < 45 then 'Repair weakness'
      when b.mastery_percent < 75 then 'Build fluency'
      when b.mastery_percent >= 75 and b.confidence_percent < 85 then 'Add more evidence'
      when b.mastery_percent >= 75 and b.confidence_percent >= 85 then 'Spaced review'
      else 'Continue'
    end as next_action,
    b.path_position
  from base b
  join prereq_status ps on ps.course_skill_code = b.course_skill_code
  order by b.path_position;
$$;

create or replace function public.project_z_my_path_summary()
returns table (
  course_code text,
  course_display_name text,
  total_nodes integer,
  locked_nodes integer,
  ready_nodes integer,
  weak_nodes integer,
  developing_nodes integer,
  strong_nodes integer,
  mastered_review_nodes integer,
  total_xp integer,
  current_streak integer,
  longest_streak integer,
  next_recommended_action text
)
language sql
security definer
set search_path = public
as $$
  with path as (
    select * from public.project_z_my_skill_path()
  ),
  xp as (
    select coalesce(sum(xp_amount), 0)::integer as total_xp
    from public.project_z_xp_events
    where user_id = auth.uid()
  ),
  streak as (
    select
      coalesce(current_streak, 0)::integer as current_streak,
      coalesce(longest_streak, 0)::integer as longest_streak
    from public.project_z_student_streaks
    where user_id = auth.uid()
  )
  select
    min(p.course_code) as course_code,
    min(p.course_display_name) as course_display_name,
    count(*)::integer as total_nodes,
    count(*) filter (where p.path_status = 'locked')::integer as locked_nodes,
    count(*) filter (where p.path_status = 'ready')::integer as ready_nodes,
    count(*) filter (where p.path_status = 'weak')::integer as weak_nodes,
    count(*) filter (where p.path_status = 'developing')::integer as developing_nodes,
    count(*) filter (where p.path_status = 'strong_needs_evidence')::integer as strong_nodes,
    count(*) filter (where p.path_status = 'mastered_review')::integer as mastered_review_nodes,
    (select total_xp from xp) as total_xp,
    coalesce((select current_streak from streak), 0) as current_streak,
    coalesce((select longest_streak from streak), 0) as longest_streak,
    case
      when count(*) = 0 then 'Choose a course first.'
      when count(*) filter (where p.path_status = 'weak') > 0 then 'Repair weak skills using recommended practice.'
      when count(*) filter (where p.path_status = 'ready') > 0 then 'Start the next ready skill.'
      when count(*) filter (where p.path_status = 'developing') > 0 then 'Build developing skills to fluency.'
      when count(*) filter (where p.path_status = 'strong_needs_evidence') > 0 then 'Add more evidence to strong skills.'
      else 'Use spaced review to keep skills mastered.'
    end as next_recommended_action
  from path p;
$$;

grant execute on function public.project_z_touch_learning_day(uuid) to authenticated;
grant execute on function public.project_z_award_xp(text, text, integer, text) to authenticated;
grant execute on function public.project_z_my_skill_path() to authenticated;
grant execute on function public.project_z_my_path_summary() to authenticated;

select
  'Project Z Phase 14 Duolingo-style skill path schema applied successfully' as status,
  now() as applied_at;

