-- Project Z Phase 24 Tutor Evidence to Mastery
-- Run after the app build/push succeeds.
-- Purpose: tutor conversations create learning evidence and gently update mastery signals.

create extension if not exists pgcrypto;

create table if not exists public.project_z_tutor_learning_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.project_z_profiles(id) on delete set null,
  tutor_interaction_id uuid references public.project_z_tutor_interactions(id) on delete set null,
  course_code text,
  course_skill_code text,
  skill_title text,
  evidence_type text not null default 'partial_understanding'
    check (evidence_type in ('hint_needed', 'partial_understanding', 'independent_step', 'misconception', 'review_complete')),
  evidence_strength numeric not null default 0.50,
  mastery_delta numeric not null default 0,
  confidence_delta numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.project_z_tutor_learning_evidence enable row level security;

drop policy if exists "tutor_learning_evidence_own_or_teacher_select" on public.project_z_tutor_learning_evidence;
create policy "tutor_learning_evidence_own_or_teacher_select"
on public.project_z_tutor_learning_evidence
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

create or replace function public.project_z_apply_tutor_evidence_to_mastery(
  p_user_id uuid,
  p_course_skill_code text,
  p_mastery_delta numeric,
  p_confidence_delta numeric,
  p_evidence_strength numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_course_skill_code is null or trim(p_course_skill_code) = '' then
    return;
  end if;

  update public.project_z_curriculum_mastery
  set
    evidence_count = coalesce(evidence_count, 0) + 1,
    correct_count = coalesce(correct_count, 0) + case when coalesce(p_evidence_strength, 0) >= 0.65 then 1 else 0 end,
    mastery_percent = least(95, greatest(0, coalesce(mastery_percent, 0) + coalesce(p_mastery_delta, 0))),
    confidence_percent = least(100, greatest(0, coalesce(confidence_percent, 0) + coalesce(p_confidence_delta, 0)))
  where user_id = p_user_id
    and course_skill_code = p_course_skill_code;

  if not found then
    insert into public.project_z_curriculum_mastery (
      user_id,
      course_skill_code,
      mastery_percent,
      confidence_percent,
      evidence_count,
      correct_count
    )
    values (
      p_user_id,
      p_course_skill_code,
      least(95, greatest(0, coalesce(p_mastery_delta, 0))),
      least(100, greatest(0, coalesce(p_confidence_delta, 0))),
      1,
      case when coalesce(p_evidence_strength, 0) >= 0.65 then 1 else 0 end
    );
  end if;

exception
  when others then
    -- Do not break tutor logging if mastery schema differs.
    return;
end;
$$;

create or replace function public.project_z_record_tutor_evidence(
  p_tutor_interaction_id uuid default null,
  p_course_code text default null,
  p_course_skill_code text default null,
  p_skill_title text default null,
  p_evidence_type text default 'partial_understanding',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  target_user uuid;
  evidence_strength numeric := 0.50;
  mastery_delta numeric := 1;
  confidence_delta numeric := 1;
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
    raise exception 'Only students and teachers can record tutor evidence';
  end if;

  target_user := auth.uid();

  if p_evidence_type = 'misconception' then
    evidence_strength := 0.25;
    mastery_delta := 0;
    confidence_delta := -2;
  elsif p_evidence_type = 'hint_needed' then
    evidence_strength := 0.35;
    mastery_delta := 1;
    confidence_delta := 0;
  elsif p_evidence_type = 'partial_understanding' then
    evidence_strength := 0.55;
    mastery_delta := 2;
    confidence_delta := 1;
  elsif p_evidence_type = 'independent_step' then
    evidence_strength := 0.75;
    mastery_delta := 4;
    confidence_delta := 3;
  elsif p_evidence_type = 'review_complete' then
    evidence_strength := 0.70;
    mastery_delta := 2;
    confidence_delta := 3;
  else
    raise exception 'Invalid tutor evidence type';
  end if;

  insert into public.project_z_tutor_learning_evidence (
    user_id,
    tutor_interaction_id,
    course_code,
    course_skill_code,
    skill_title,
    evidence_type,
    evidence_strength,
    mastery_delta,
    confidence_delta,
    notes,
    created_at
  )
  values (
    target_user,
    p_tutor_interaction_id,
    p_course_code,
    p_course_skill_code,
    p_skill_title,
    p_evidence_type,
    evidence_strength,
    mastery_delta,
    confidence_delta,
    p_notes,
    now()
  )
  returning id into new_id;

  perform public.project_z_apply_tutor_evidence_to_mastery(
    target_user,
    p_course_skill_code,
    mastery_delta,
    confidence_delta,
    evidence_strength
  );

  return jsonb_build_object(
    'ok', true,
    'id', new_id,
    'evidence_type', p_evidence_type,
    'evidence_strength', evidence_strength,
    'mastery_delta', mastery_delta,
    'confidence_delta', confidence_delta
  );
end;
$$;

create or replace function public.project_z_auto_tutor_evidence_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  evidence_type text := 'partial_understanding';
  evidence_strength numeric := 0.50;
  mastery_delta numeric := 1;
  confidence_delta numeric := 1;
begin
  if new.user_id is null then
    return new;
  end if;

  if new.course_skill_code is null or trim(new.course_skill_code) = '' then
    return new;
  end if;

  if new.safety_level = 'misconception_detected' then
    evidence_type := 'misconception';
    evidence_strength := 0.25;
    mastery_delta := 0;
    confidence_delta := -2;
  elsif new.safety_level = 'answer_withheld' then
    evidence_type := 'hint_needed';
    evidence_strength := 0.35;
    mastery_delta := 1;
    confidence_delta := 0;
  elsif new.safety_level = 'encouragement' then
    evidence_type := 'independent_step';
    evidence_strength := 0.75;
    mastery_delta := 4;
    confidence_delta := 3;
  elsif new.safety_level = 'review' then
    evidence_type := 'review_complete';
    evidence_strength := 0.70;
    mastery_delta := 2;
    confidence_delta := 3;
  else
    evidence_type := 'partial_understanding';
    evidence_strength := 0.55;
    mastery_delta := 2;
    confidence_delta := 1;
  end if;

  insert into public.project_z_tutor_learning_evidence (
    user_id,
    tutor_interaction_id,
    course_code,
    course_skill_code,
    skill_title,
    evidence_type,
    evidence_strength,
    mastery_delta,
    confidence_delta,
    notes,
    created_at
  )
  values (
    new.user_id,
    new.id,
    new.course_code,
    new.course_skill_code,
    new.skill_title,
    evidence_type,
    evidence_strength,
    mastery_delta,
    confidence_delta,
    'Automatically created from tutor interaction safety level: ' || coalesce(new.safety_level, 'guided'),
    now()
  );

  perform public.project_z_apply_tutor_evidence_to_mastery(
    new.user_id,
    new.course_skill_code,
    mastery_delta,
    confidence_delta,
    evidence_strength
  );

  return new;
end;
$$;

drop trigger if exists project_z_auto_tutor_evidence_after_insert on public.project_z_tutor_interactions;

create trigger project_z_auto_tutor_evidence_after_insert
after insert on public.project_z_tutor_interactions
for each row
execute function public.project_z_auto_tutor_evidence_trigger();

create or replace function public.project_z_my_tutor_learning_evidence()
returns table (
  id uuid,
  tutor_interaction_id uuid,
  course_code text,
  course_skill_code text,
  skill_title text,
  evidence_type text,
  evidence_strength numeric,
  mastery_delta numeric,
  confidence_delta numeric,
  notes text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.tutor_interaction_id,
    e.course_code,
    e.course_skill_code,
    e.skill_title,
    e.evidence_type,
    e.evidence_strength,
    e.mastery_delta,
    e.confidence_delta,
    e.notes,
    e.created_at
  from public.project_z_tutor_learning_evidence e
  where e.user_id = auth.uid()
  order by e.created_at desc
  limit 50;
$$;

create or replace function public.project_z_my_tutor_evidence_summary()
returns table (
  course_skill_code text,
  skill_title text,
  evidence_count integer,
  average_evidence_strength numeric,
  total_mastery_delta numeric,
  total_confidence_delta numeric,
  misconception_count integer,
  hint_needed_count integer,
  independent_step_count integer,
  last_evidence_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    e.course_skill_code,
    coalesce(max(e.skill_title), e.course_skill_code) as skill_title,
    count(*)::integer as evidence_count,
    round(avg(e.evidence_strength), 2) as average_evidence_strength,
    round(sum(e.mastery_delta), 2) as total_mastery_delta,
    round(sum(e.confidence_delta), 2) as total_confidence_delta,
    count(*) filter (where e.evidence_type = 'misconception')::integer as misconception_count,
    count(*) filter (where e.evidence_type = 'hint_needed')::integer as hint_needed_count,
    count(*) filter (where e.evidence_type = 'independent_step')::integer as independent_step_count,
    max(e.created_at) as last_evidence_at
  from public.project_z_tutor_learning_evidence e
  where e.user_id = auth.uid()
  group by e.course_skill_code
  order by last_evidence_at desc;
$$;

grant execute on function public.project_z_apply_tutor_evidence_to_mastery(uuid, text, numeric, numeric, numeric) to authenticated;
grant execute on function public.project_z_record_tutor_evidence(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.project_z_my_tutor_learning_evidence() to authenticated;
grant execute on function public.project_z_my_tutor_evidence_summary() to authenticated;

select
  'Project Z Phase 24 tutor evidence to mastery schema applied successfully' as status,
  now() as applied_at;
