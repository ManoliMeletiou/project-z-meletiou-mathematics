-- Project Z Phase 3 Database Persistence
-- Safe to run more than once.
-- Paste this into Supabase SQL Editor and click Run.

create extension if not exists pgcrypto;

create table if not exists public.project_z_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'student' check (role in ('student', 'teacher', 'parent')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_z_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null,
  question_text text not null,
  given_answer text not null,
  correct boolean not null,
  source text not null default 'unknown',
  difficulty integer not null default 2,
  created_at timestamptz not null default now()
);

create table if not exists public.project_z_skill_mastery (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null,
  attempts integer not null default 0,
  correct integer not null default 0,
  mastery_score numeric(5,2) not null default 0,
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table if not exists public.project_z_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.project_z_class_members (
  class_id uuid not null references public.project_z_classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

alter table public.project_z_profiles enable row level security;
alter table public.project_z_practice_attempts enable row level security;
alter table public.project_z_skill_mastery enable row level security;
alter table public.project_z_classes enable row level security;
alter table public.project_z_class_members enable row level security;

drop policy if exists "profiles_select_own" on public.project_z_profiles;
create policy "profiles_select_own"
on public.project_z_profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.project_z_profiles;
create policy "profiles_insert_own"
on public.project_z_profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.project_z_profiles;
create policy "profiles_update_own"
on public.project_z_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "attempts_select_own" on public.project_z_practice_attempts;
create policy "attempts_select_own"
on public.project_z_practice_attempts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "attempts_insert_own" on public.project_z_practice_attempts;
create policy "attempts_insert_own"
on public.project_z_practice_attempts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "mastery_select_own" on public.project_z_skill_mastery;
create policy "mastery_select_own"
on public.project_z_skill_mastery
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "classes_teacher_select" on public.project_z_classes;
create policy "classes_teacher_select"
on public.project_z_classes
for select
to authenticated
using (teacher_id = auth.uid());

drop policy if exists "classes_teacher_insert" on public.project_z_classes;
create policy "classes_teacher_insert"
on public.project_z_classes
for insert
to authenticated
with check (teacher_id = auth.uid());

drop policy if exists "classes_teacher_update" on public.project_z_classes;
create policy "classes_teacher_update"
on public.project_z_classes
for update
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

drop policy if exists "members_select_student_or_teacher" on public.project_z_class_members;
create policy "members_select_student_or_teacher"
on public.project_z_class_members
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.project_z_classes c
    where c.id = class_id
      and c.teacher_id = auth.uid()
  )
);

create or replace function public.project_z_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_z_profiles_touch_updated_at on public.project_z_profiles;
create trigger project_z_profiles_touch_updated_at
before update on public.project_z_profiles
for each row execute function public.project_z_touch_updated_at();

create or replace function public.project_z_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_z_profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = excluded.role,
    display_name = excluded.display_name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists project_z_on_auth_user_created on auth.users;
create trigger project_z_on_auth_user_created
after insert on auth.users
for each row execute function public.project_z_handle_new_user();

create or replace function public.project_z_upsert_profile(
  p_role text default 'student',
  p_display_name text default null
)
returns public.project_z_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.project_z_profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.project_z_profiles (id, email, role, display_name)
  select
    auth.uid(),
    auth.email(),
    case when p_role in ('student', 'teacher', 'parent') then p_role else 'student' end,
    coalesce(p_display_name, split_part(auth.email(), '@', 1))
  on conflict (id) do update
  set
    email = excluded.email,
    role = excluded.role,
    display_name = coalesce(excluded.display_name, public.project_z_profiles.display_name),
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.project_z_record_attempt(
  p_skill_id text,
  p_question_text text,
  p_given_answer text,
  p_correct boolean,
  p_source text default 'unknown',
  p_difficulty integer default 2
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_row public.project_z_practice_attempts;
  mastery_row public.project_z_skill_mastery;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.project_z_practice_attempts (
    user_id,
    skill_id,
    question_text,
    given_answer,
    correct,
    source,
    difficulty
  )
  values (
    auth.uid(),
    p_skill_id,
    p_question_text,
    p_given_answer,
    p_correct,
    coalesce(p_source, 'unknown'),
    coalesce(p_difficulty, 2)
  )
  returning * into attempt_row;

  insert into public.project_z_skill_mastery (
    user_id,
    skill_id,
    attempts,
    correct,
    mastery_score,
    last_attempt_at,
    updated_at
  )
  values (
    auth.uid(),
    p_skill_id,
    1,
    case when p_correct then 1 else 0 end,
    case when p_correct then 100 else 0 end,
    now(),
    now()
  )
  on conflict (user_id, skill_id) do update
  set
    attempts = public.project_z_skill_mastery.attempts + 1,
    correct = public.project_z_skill_mastery.correct + case when p_correct then 1 else 0 end,
    mastery_score = round(
      (
        (
          public.project_z_skill_mastery.correct + case when p_correct then 1 else 0 end
        )::numeric
        /
        nullif(public.project_z_skill_mastery.attempts + 1, 0)::numeric
      ) * 100,
      2
    ),
    last_attempt_at = now(),
    updated_at = now()
  returning * into mastery_row;

  return jsonb_build_object(
    'attempt', to_jsonb(attempt_row),
    'mastery', to_jsonb(mastery_row)
  );
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.project_z_profiles to authenticated;
grant select, insert on public.project_z_practice_attempts to authenticated;
grant select on public.project_z_skill_mastery to authenticated;
grant select, insert, update on public.project_z_classes to authenticated;
grant select on public.project_z_class_members to authenticated;
grant execute on function public.project_z_upsert_profile(text, text) to authenticated;
grant execute on function public.project_z_record_attempt(text, text, text, boolean, text, integer) to authenticated;

select
  'Project Z Phase 3 schema applied successfully' as status,
  now() as applied_at;
