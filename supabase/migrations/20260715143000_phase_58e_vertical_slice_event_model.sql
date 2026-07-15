-- Project Z Phase 58e: collision-free first-learning-mission event model.
--
-- This migration replaces the unusable Phase 13 practice contract with new,
-- append-only teaching, delivery, attempt, correction, mastery, reward and
-- unlock ledgers. It deliberately does not modify or delete the collided
-- project_z_practice_attempts table or its single legacy row.
--
-- The candidate place-value slice remains blocked. Serving requires a released
-- pathway, approved diagnostic calibration, a two-person approved atlas
-- placement, five independently reviewed generator families, reviewed teaching
-- assets and an explicit operator release record.

create extension if not exists pgcrypto;
create schema if not exists private;

-- The legacy functions remain preserved for forensic/rollback purposes, but no
-- application or service role may execute them after this replacement exists.
revoke all on function public.project_z_recommended_practice()
from public, anon, authenticated, service_role;
revoke all on function public.project_z_start_practice_skill(text)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_practice_next_question(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_submit_practice_answer(uuid, uuid, text)
from public, anon, authenticated, service_role;

comment on table public.project_z_practice_attempts is
  'Quarantined legacy Phase 3 practice rows. The incompatible Phase 13 RPC contract is permanently revoked; Phase 58e uses project_z_first_mission_* event ledgers.';
comment on table public.project_z_practice_sessions is
  'Quarantined legacy Phase 13 session projection. New first-mission learning uses project_z_first_learning_missions and immutable event ledgers.';

create table if not exists private.project_z_learning_slice_configs (
  course_skill_code text primary key
    references public.project_z_curriculum_skills(course_skill_code) on delete cascade,
  course_code text not null
    references public.project_z_course_catalog(course_code) on delete cascade,
  canonical_skill_id text not null,
  generator_version text not null,
  teaching_content_version text not null,
  release_state text not null default 'blocked' check (
    release_state in ('blocked', 'review_candidate', 'released', 'quarantined')
  ),
  required_teaching_steps integer not null default 5 check (required_teaching_steps >= 3),
  required_guided_attempts integer not null default 2 check (required_guided_attempts >= 2),
  required_independent_attempts integer not null default 8 check (required_independent_attempts >= 6),
  required_checkpoint_attempts integer not null default 2 check (required_checkpoint_attempts >= 2),
  required_family_count integer not null default 5 check (required_family_count >= 3),
  required_accuracy_percent numeric not null default 90 check (
    required_accuracy_percent between 80 and 100
  ),
  release_evidence_ref text,
  released_by uuid references auth.users(id) on delete set null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_code, canonical_skill_id),
  constraint project_z_learning_slice_course_skill_match check (
    course_skill_code = course_code || ':' || canonical_skill_id
  ),
  constraint project_z_learning_slice_release_record_complete check (
    release_state <> 'released'
    or (
      release_evidence_ref is not null
      and char_length(btrim(release_evidence_ref)) >= 12
      and released_by is not null
      and released_at is not null
    )
  )
);

create index if not exists project_z_learning_slice_configs_course_idx
on private.project_z_learning_slice_configs(course_code);
create index if not exists project_z_learning_slice_configs_released_by_idx
on private.project_z_learning_slice_configs(released_by)
where released_by is not null;

insert into private.project_z_learning_slice_configs (
  course_skill_code, course_code, canonical_skill_id, generator_version,
  teaching_content_version, release_state
)
select
  a.atlas_skill_code, a.course_code, a.canonical_skill_id,
  'place-value-v1.0.0', 'place-value-teaching-v1.0.0', 'blocked'
from public.project_z_skill_atlas_candidates a
where a.canonical_skill_id = 'number.place-value.round-order'
on conflict (course_skill_code) do update
set generator_version = excluded.generator_version,
    teaching_content_version = excluded.teaching_content_version,
    updated_at = now()
where private.project_z_learning_slice_configs.release_state <> 'released';

create table if not exists private.project_z_first_mission_teaching_assets (
  asset_code text primary key,
  canonical_skill_id text not null,
  content_version text not null,
  step_order integer not null check (step_order > 0),
  family_code text not null references private.project_z_generator_families(family_code) on delete restrict,
  title text not null,
  explanation text not null,
  worked_example_prompt text not null,
  worked_example_solution text not null,
  check_prompt text not null,
  check_answer text not null,
  check_answer_kind text not null check (
    check_answer_kind in ('integer', 'decimal', 'ordered-sequence', 'comparison')
  ),
  scaffold_hint text not null,
  misconception_tag text not null,
  review_status text not null default 'pending' check (
    review_status in ('pending', 'approved', 'needs_revision', 'rejected', 'quarantined')
  ),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  evidence_digest text not null check (evidence_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (canonical_skill_id, content_version, step_order),
  constraint project_z_teaching_asset_review_complete check (
    review_status <> 'approved'
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists project_z_teaching_assets_reviewer_idx
on private.project_z_first_mission_teaching_assets(reviewed_by)
where reviewed_by is not null;
create index if not exists project_z_teaching_assets_family_idx
on private.project_z_first_mission_teaching_assets(family_code);

insert into private.project_z_first_mission_teaching_assets (
  asset_code, canonical_skill_id, content_version, step_order, family_code,
  title, explanation, worked_example_prompt, worked_example_solution,
  check_prompt, check_answer, check_answer_kind, scaffold_hint,
  misconception_tag, review_status, evidence_digest
)
values
  (
    'place-value-teaching-v1-step-1', 'number.place-value.round-order',
    'place-value-teaching-v1.0.0', 1, 'place-value-digit',
    'A digit and its value are different',
    'A digit names a symbol. Its position tells us the value it contributes to the whole number.',
    'In 47,302, what value does the digit 7 contribute?',
    'The 7 is in the thousands place, so it contributes 7 × 1,000 = 7,000.',
    'In 27,405, what value does the digit 7 contribute?', '7000', 'integer',
    'Name the place first, then multiply the digit by that place value.',
    'digit-versus-value', 'pending',
    encode(digest('place-value-teaching-v1-step-1', 'sha256'), 'hex')
  ),
  (
    'place-value-teaching-v1-step-2', 'number.place-value.round-order',
    'place-value-teaching-v1.0.0', 2, 'integer-rounding',
    'Rounding keeps the nearest place',
    'Choose the rounding place, inspect the digit immediately to its right, then keep or increase the rounding digit.',
    'Round 46,372 to the nearest hundred.',
    'The hundreds digit is 3 and the tens digit is 7, so the hundreds digit increases. The result is 46,400.',
    'Round 83,649 to the nearest hundred.', '83600', 'integer',
    'Underline the hundreds digit and inspect only the tens digit.',
    'rounding-place', 'pending',
    encode(digest('place-value-teaching-v1-step-2', 'sha256'), 'hex')
  ),
  (
    'place-value-teaching-v1-step-3', 'number.place-value.round-order',
    'place-value-teaching-v1.0.0', 3, 'decimal-rounding',
    'Decimal places follow the same rounding rule',
    'Keep the requested decimal place and use the next digit to decide whether that place stays or increases.',
    'Round 12.476 to two decimal places.',
    'Keep the hundredths digit 7 and inspect the thousandths digit 6. Increase 7 to 8, giving 12.48.',
    'Round 8.342 to two decimal places.', '8.34', 'decimal',
    'Keep the hundredths digit and inspect the thousandths digit.',
    'decimal-place-value', 'pending',
    encode(digest('place-value-teaching-v1-step-3', 'sha256'), 'hex')
  ),
  (
    'place-value-teaching-v1-step-4', 'number.place-value.round-order',
    'place-value-teaching-v1.0.0', 4, 'order-decimals',
    'Align decimal places before ordering',
    'Compare whole-number parts first, then tenths, hundredths and later places from left to right.',
    'Order 5.71, 5.04, 5.39 and 5.86 from least to greatest.',
    'The whole-number parts match. Comparing tenths and then hundredths gives 5.04 < 5.39 < 5.71 < 5.86.',
    'Order 3.71, 3.04, 3.39 and 3.86 from least to greatest.',
    '3.04 < 3.39 < 3.71 < 3.86', 'ordered-sequence',
    'Write each number with the decimal points vertically aligned.',
    'decimal-length', 'pending',
    encode(digest('place-value-teaching-v1-step-4', 'sha256'), 'hex')
  ),
  (
    'place-value-teaching-v1-step-5', 'number.place-value.round-order',
    'place-value-teaching-v1.0.0', 5, 'compare-signed-decimals',
    'Use position on a number line for signed values',
    'A value farther right on a number line is greater. Among negative numbers, the value closer to zero is greater.',
    'Choose the true comparison between -2.4 and -1.8.',
    '-2.4 lies farther left than -1.8, so -2.4 < -1.8.',
    'Choose <, > or =: -3.2 ___ -3.7.', '>', 'comparison',
    'Place both numbers on a number line and look for the value farther right.',
    'negative-number-order', 'pending',
    encode(digest('place-value-teaching-v1-step-5', 'sha256'), 'hex')
  )
on conflict (asset_code) do update
set title = excluded.title,
    explanation = excluded.explanation,
    worked_example_prompt = excluded.worked_example_prompt,
    worked_example_solution = excluded.worked_example_solution,
    check_prompt = excluded.check_prompt,
    check_answer = excluded.check_answer,
    check_answer_kind = excluded.check_answer_kind,
    scaffold_hint = excluded.scaffold_hint,
    misconception_tag = excluded.misconception_tag,
    evidence_digest = excluded.evidence_digest,
    updated_at = now()
where private.project_z_first_mission_teaching_assets.review_status <> 'approved';

create table if not exists public.project_z_first_learning_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  diagnostic_session_id uuid not null unique
    references public.project_z_diagnostic_sessions(id) on delete restrict,
  course_code text not null references public.project_z_course_catalog(course_code) on delete restrict,
  course_skill_code text not null
    references public.project_z_curriculum_skills(course_skill_code) on delete restrict,
  canonical_skill_id text not null,
  generator_version text not null,
  teaching_content_version text not null,
  status text not null default 'teaching' check (
    status in ('teaching', 'guided', 'independent', 'correction', 'checkpoint',
               'remediation', 'mastered', 'paused', 'quarantined')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint project_z_first_mission_completion_consistent check (
    (status = 'mastered' and completed_at is not null)
    or (status <> 'mastered' and completed_at is null)
  )
);

create index if not exists project_z_first_missions_user_created_idx
on public.project_z_first_learning_missions(user_id, created_at desc);
create index if not exists project_z_first_missions_course_skill_idx
on public.project_z_first_learning_missions(course_skill_code);
create index if not exists project_z_first_missions_course_idx
on public.project_z_first_learning_missions(course_code);

create table if not exists public.project_z_first_mission_teaching_events (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.project_z_first_learning_missions(id) on delete cascade,
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  asset_code text not null
    references private.project_z_first_mission_teaching_assets(asset_code) on delete restrict,
  client_event_id uuid not null,
  response_text text not null,
  is_correct boolean not null,
  event_type text not null check (event_type in ('attempted', 'completed')),
  created_at timestamptz not null default now(),
  unique (mission_id, client_event_id)
);

create unique index if not exists project_z_teaching_events_one_completion_idx
on public.project_z_first_mission_teaching_events(mission_id, asset_code)
where is_correct = true;
create index if not exists project_z_teaching_events_user_idx
on public.project_z_first_mission_teaching_events(user_id, created_at desc);
create index if not exists project_z_teaching_events_asset_idx
on public.project_z_first_mission_teaching_events(asset_code);

create table if not exists public.project_z_first_mission_practice_deliveries (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.project_z_first_learning_missions(id) on delete cascade,
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  phase text not null check (phase in ('guided', 'independent', 'checkpoint', 'remediation')),
  sequence_number integer not null check (sequence_number > 0),
  generator_version text not null,
  family_code text not null,
  seed integer not null check (seed between 0 and 499),
  prompt text not null,
  answer_kind text not null check (
    answer_kind in ('integer', 'decimal', 'ordered-sequence', 'comparison')
  ),
  difficulty integer not null check (difficulty between 1 and 3),
  hint_one text not null,
  hint_two text not null,
  created_at timestamptz not null default now(),
  unique (mission_id, sequence_number),
  unique (mission_id, family_code, seed)
);

create index if not exists project_z_practice_deliveries_user_idx
on public.project_z_first_mission_practice_deliveries(user_id, created_at desc);
create index if not exists project_z_practice_deliveries_family_idx
on public.project_z_first_mission_practice_deliveries(family_code);

create table if not exists private.project_z_first_mission_answer_keys (
  delivery_id uuid primary key
    references public.project_z_first_mission_practice_deliveries(id) on delete cascade,
  canonical_answer text not null,
  worked_solution text not null,
  misconception_tags text[] not null default '{}',
  parameters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.project_z_first_mission_attempt_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null unique
    references public.project_z_first_mission_practice_deliveries(id) on delete restrict,
  mission_id uuid not null references public.project_z_first_learning_missions(id) on delete cascade,
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  client_event_id uuid not null,
  phase text not null check (phase in ('guided', 'independent', 'checkpoint', 'remediation')),
  family_code text not null,
  seed integer not null check (seed between 0 and 499),
  submitted_answer text not null,
  answer_normalized text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (mission_id, client_event_id)
);

create index if not exists project_z_attempt_events_user_idx
on public.project_z_first_mission_attempt_events(user_id, created_at desc);
create index if not exists project_z_attempt_events_mission_phase_idx
on public.project_z_first_mission_attempt_events(mission_id, phase, created_at);

create table if not exists public.project_z_first_mission_correction_events (
  id uuid primary key default gen_random_uuid(),
  original_attempt_id uuid not null
    references public.project_z_first_mission_attempt_events(id) on delete restrict,
  mission_id uuid not null references public.project_z_first_learning_missions(id) on delete cascade,
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  client_event_id uuid not null,
  retry_answer text not null,
  reflection_text text not null check (char_length(btrim(reflection_text)) >= 20),
  answer_repaired boolean not null,
  created_at timestamptz not null default now(),
  unique (mission_id, client_event_id)
);

create unique index if not exists project_z_corrections_one_repair_idx
on public.project_z_first_mission_correction_events(original_attempt_id)
where answer_repaired = true;
create index if not exists project_z_correction_events_user_idx
on public.project_z_first_mission_correction_events(user_id, created_at desc);
create index if not exists project_z_correction_events_attempt_idx
on public.project_z_first_mission_correction_events(original_attempt_id);

create table if not exists public.project_z_first_mission_mastery_events (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.project_z_first_learning_missions(id) on delete cascade,
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  decision text not null check (decision in ('not_yet', 'mastered')),
  teaching_steps_completed integer not null,
  guided_attempts integer not null,
  scored_attempts integer not null,
  scored_correct integer not null,
  family_count integer not null,
  checkpoint_correct integer not null,
  unresolved_corrections integer not null,
  mastery_percent numeric not null check (mastery_percent between 0 and 100),
  confidence_percent numeric not null check (confidence_percent between 0 and 100),
  explanation jsonb not null,
  evidence_digest text not null check (evidence_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (mission_id, evidence_digest)
);

create index if not exists project_z_mastery_events_user_idx
on public.project_z_first_mission_mastery_events(user_id, created_at desc);

create table if not exists public.project_z_first_mission_game_unlock_events (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.project_z_first_learning_missions(id) on delete cascade,
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  unlock_code text not null,
  game_node_path text not null,
  source_mastery_event_id uuid not null
    references public.project_z_first_mission_mastery_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (mission_id, unlock_code)
);

create index if not exists project_z_game_unlock_events_user_idx
on public.project_z_first_mission_game_unlock_events(user_id, created_at desc);
create index if not exists project_z_game_unlock_events_mastery_idx
on public.project_z_first_mission_game_unlock_events(source_mastery_event_id);

create table if not exists public.project_z_first_mission_reward_events (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.project_z_first_learning_missions(id) on delete cascade,
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  reward_code text not null,
  xp_amount integer not null default 0 check (xp_amount between 0 and 500),
  coin_amount integer not null default 0 check (coin_amount between 0 and 200),
  motivation_only boolean not null default true check (motivation_only = true),
  source_mastery_event_id uuid not null
    references public.project_z_first_mission_mastery_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (mission_id, reward_code)
);

create index if not exists project_z_reward_events_user_idx
on public.project_z_first_mission_reward_events(user_id, created_at desc);
create index if not exists project_z_reward_events_mastery_idx
on public.project_z_first_mission_reward_events(source_mastery_event_id);

revoke all on table private.project_z_learning_slice_configs
from public, anon, authenticated, service_role;
revoke all on table private.project_z_first_mission_teaching_assets
from public, anon, authenticated, service_role;
revoke all on table private.project_z_first_mission_answer_keys
from public, anon, authenticated, service_role;

-- Public ledgers are readable only through owner-scoped RLS. All writes are
-- revoked and occur through the signed, identity-checking RPCs below.
alter table public.project_z_first_learning_missions enable row level security;
alter table public.project_z_first_mission_teaching_events enable row level security;
alter table public.project_z_first_mission_practice_deliveries enable row level security;
alter table public.project_z_first_mission_attempt_events enable row level security;
alter table public.project_z_first_mission_correction_events enable row level security;
alter table public.project_z_first_mission_mastery_events enable row level security;
alter table public.project_z_first_mission_game_unlock_events enable row level security;
alter table public.project_z_first_mission_reward_events enable row level security;

create policy project_z_first_missions_select_own
on public.project_z_first_learning_missions for select to authenticated
using ((select auth.uid()) = user_id);
create policy project_z_teaching_events_select_own
on public.project_z_first_mission_teaching_events for select to authenticated
using ((select auth.uid()) = user_id);
create policy project_z_practice_deliveries_select_own
on public.project_z_first_mission_practice_deliveries for select to authenticated
using ((select auth.uid()) = user_id);
create policy project_z_attempt_events_select_own
on public.project_z_first_mission_attempt_events for select to authenticated
using ((select auth.uid()) = user_id);
create policy project_z_correction_events_select_own
on public.project_z_first_mission_correction_events for select to authenticated
using ((select auth.uid()) = user_id);
create policy project_z_mastery_events_select_own
on public.project_z_first_mission_mastery_events for select to authenticated
using ((select auth.uid()) = user_id);
create policy project_z_game_unlock_events_select_own
on public.project_z_first_mission_game_unlock_events for select to authenticated
using ((select auth.uid()) = user_id);
create policy project_z_reward_events_select_own
on public.project_z_first_mission_reward_events for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.project_z_first_learning_missions
from public, anon, authenticated;
revoke all on table public.project_z_first_mission_teaching_events
from public, anon, authenticated;
revoke all on table public.project_z_first_mission_practice_deliveries
from public, anon, authenticated;
revoke all on table public.project_z_first_mission_attempt_events
from public, anon, authenticated;
revoke all on table public.project_z_first_mission_correction_events
from public, anon, authenticated;
revoke all on table public.project_z_first_mission_mastery_events
from public, anon, authenticated;
revoke all on table public.project_z_first_mission_game_unlock_events
from public, anon, authenticated;
revoke all on table public.project_z_first_mission_reward_events
from public, anon, authenticated;

grant select on table public.project_z_first_learning_missions to authenticated;
grant select on table public.project_z_first_mission_teaching_events to authenticated;
grant select on table public.project_z_first_mission_practice_deliveries to authenticated;
grant select on table public.project_z_first_mission_attempt_events to authenticated;
grant select on table public.project_z_first_mission_correction_events to authenticated;
grant select on table public.project_z_first_mission_mastery_events to authenticated;
grant select on table public.project_z_first_mission_game_unlock_events to authenticated;
grant select on table public.project_z_first_mission_reward_events to authenticated;

create or replace function private.project_z_reject_learning_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Project Z learning evidence is append-only';
end;
$$;

create trigger project_z_teaching_events_append_only
before update or delete on public.project_z_first_mission_teaching_events
for each row execute function private.project_z_reject_learning_event_mutation();
create trigger project_z_practice_deliveries_append_only
before update or delete on public.project_z_first_mission_practice_deliveries
for each row execute function private.project_z_reject_learning_event_mutation();
create trigger project_z_answer_keys_append_only
before update or delete on private.project_z_first_mission_answer_keys
for each row execute function private.project_z_reject_learning_event_mutation();
create trigger project_z_attempt_events_append_only
before update or delete on public.project_z_first_mission_attempt_events
for each row execute function private.project_z_reject_learning_event_mutation();
create trigger project_z_correction_events_append_only
before update or delete on public.project_z_first_mission_correction_events
for each row execute function private.project_z_reject_learning_event_mutation();
create trigger project_z_mastery_events_append_only
before update or delete on public.project_z_first_mission_mastery_events
for each row execute function private.project_z_reject_learning_event_mutation();
create trigger project_z_game_unlock_events_append_only
before update or delete on public.project_z_first_mission_game_unlock_events
for each row execute function private.project_z_reject_learning_event_mutation();
create trigger project_z_reward_events_append_only
before update or delete on public.project_z_first_mission_reward_events
for each row execute function private.project_z_reject_learning_event_mutation();

revoke all on function private.project_z_reject_learning_event_mutation()
from public, anon, authenticated, service_role;

create or replace function private.project_z_format_integer(p_value bigint)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select to_char(p_value, 'FM999,999,999,999,990');
$$;

create or replace function private.project_z_format_scaled(
  p_value bigint,
  p_scale integer,
  p_fixed_digits integer
)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  magnitude bigint := abs(p_value);
  sign_text text := case when p_value < 0 then '-' else '' end;
  integer_part bigint;
  fractional_part text;
begin
  if p_scale not in (10, 100, 1000) then
    raise exception 'Unsupported fixed-point scale';
  end if;
  if p_fixed_digits < 1 or p_fixed_digits > length(p_scale::text) - 1 then
    raise exception 'Unsupported fixed-point precision';
  end if;

  integer_part := magnitude / p_scale;
  fractional_part := lpad(mod(magnitude, p_scale)::text, length(p_scale::text) - 1, '0');
  return sign_text || integer_part::text || '.' || substr(fractional_part, 1, p_fixed_digits);
end;
$$;

create or replace function private.project_z_generate_place_value_item(
  p_family_code text,
  p_seed integer
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  place_value integer;
  place_name text;
  digit_value integer;
  high_block bigint;
  lower_value bigint;
  integer_value bigint;
  integer_answer bigint;
  rounding_unit integer;
  remainder_value integer;
  decimal_places integer;
  fractional_value integer;
  scaled_value bigint;
  rounded_scaled bigint;
  base_value bigint;
  source_values bigint[];
  presented_values bigint[];
  ordered_values bigint[];
  rotation integer;
  left_scaled bigint;
  right_scaled bigint;
  comparison text;
begin
  if p_seed < 0 or p_seed > 499 then
    raise exception 'First-mission seed must be between 0 and 499';
  end if;

  if p_family_code = 'place-value-digit' then
    place_value := (array[1, 10, 100, 1000])[mod(p_seed, 4) + 1];
    place_name := case place_value
      when 1 then 'ones' when 10 then 'tens'
      when 100 then 'hundreds' else 'thousands' end;
    digit_value := 1 + mod(p_seed / 4, 9);
    high_block := p_seed + 11;
    lower_value := mod(p_seed * 37 + 19, place_value);
    integer_value := high_block * 10000 + digit_value * place_value + lower_value;
    integer_answer := digit_value * place_value;

    return jsonb_build_object(
      'prompt', 'What is the value of the digit in the ' || place_name ||
        ' place in ' || private.project_z_format_integer(integer_value) || '?',
      'answer_kind', 'integer',
      'canonical_answer', integer_answer::text,
      'worked_solution', 'The ' || place_name || ' place has value ' ||
        private.project_z_format_integer(place_value) || '. Its digit is ' ||
        digit_value || ', so ' || digit_value || ' × ' ||
        private.project_z_format_integer(place_value) || ' = ' ||
        private.project_z_format_integer(integer_answer) || '.',
      'hints', jsonb_build_array(
        'Locate the ' || place_name || ' column.',
        'Multiply that digit by its place value.'
      ),
      'difficulty', case when place_value >= 100 then 2 else 1 end,
      'misconception_tags', jsonb_build_array('digit-versus-value', 'place-value-column'),
      'parameters', jsonb_build_object(
        'value', integer_value, 'place', place_value, 'digit', digit_value
      )
    );
  end if;

  if p_family_code = 'integer-rounding' then
    rounding_unit := (array[10, 100, 1000])[mod(p_seed, 3) + 1];
    remainder_value := mod(p_seed * 137 + 31, rounding_unit);
    if remainder_value = rounding_unit / 2 then
      remainder_value := remainder_value + 1;
    end if;
    integer_value := (p_seed + 17)::bigint * rounding_unit * 10 + remainder_value;
    integer_answer := ((integer_value + rounding_unit / 2) / rounding_unit) * rounding_unit;

    return jsonb_build_object(
      'prompt', 'Round ' || private.project_z_format_integer(integer_value) ||
        ' to the nearest ' || private.project_z_format_integer(rounding_unit) || '.',
      'answer_kind', 'integer',
      'canonical_answer', integer_answer::text,
      'worked_solution', 'The rounding unit is ' ||
        private.project_z_format_integer(rounding_unit) ||
        '. The part beyond that place is ' ||
        private.project_z_format_integer(remainder_value) || ', so ' ||
        private.project_z_format_integer(integer_value) || ' rounds to ' ||
        private.project_z_format_integer(integer_answer) || '.',
      'hints', jsonb_build_array(
        'Find the digit immediately to the right of the rounding place.',
        'Use 0–4 to round down and 5–9 to round up.'
      ),
      'difficulty', case when rounding_unit = 1000 then 2 else 1 end,
      'misconception_tags', jsonb_build_array('rounding-place', 'rounding-direction'),
      'parameters', jsonb_build_object('value', integer_value, 'unit', rounding_unit)
    );
  end if;

  if p_family_code = 'decimal-rounding' then
    decimal_places := case when mod(p_seed, 2) = 0 then 1 else 2 end;
    rounding_unit := case when decimal_places = 1 then 100 else 10 end;
    fractional_value := mod(p_seed * 137 + 41, 1000);
    if mod(fractional_value, rounding_unit) = rounding_unit / 2 then
      fractional_value := mod(fractional_value + 1, 1000);
    end if;
    scaled_value := (p_seed + 3)::bigint * 1000 + fractional_value;
    rounded_scaled := ((scaled_value + rounding_unit / 2) / rounding_unit) * rounding_unit;

    return jsonb_build_object(
      'prompt', 'Round ' || private.project_z_format_scaled(scaled_value, 1000, 3) ||
        ' to ' || decimal_places || ' decimal ' ||
        case when decimal_places = 1 then 'place.' else 'places.' end,
      'answer_kind', 'decimal',
      'canonical_answer', private.project_z_format_scaled(rounded_scaled, 1000, decimal_places),
      'worked_solution', 'Keep ' || decimal_places || ' decimal ' ||
        case when decimal_places = 1 then 'place' else 'places' end ||
        ' and inspect the next digit. This gives ' ||
        private.project_z_format_scaled(rounded_scaled, 1000, decimal_places) || '.',
      'hints', jsonb_build_array(
        'Underline the digit in the ' ||
          case when decimal_places = 1 then 'tenths' else 'hundredths' end || ' place.',
        'Use the next digit to decide whether the underlined digit changes.'
      ),
      'difficulty', case when decimal_places = 2 then 2 else 1 end,
      'misconception_tags', jsonb_build_array('decimal-place-value', 'rounding-direction'),
      'parameters', jsonb_build_object(
        'scaledValue', scaled_value, 'decimalPlaces', decimal_places, 'unit', rounding_unit
      )
    );
  end if;

  if p_family_code = 'order-decimals' then
    base_value := (p_seed + 2)::bigint * 100;
    source_values := array[base_value + 71, base_value + 4, base_value + 39, base_value + 86];
    rotation := mod(p_seed, 4);
    select array_agg(source_values[mod(i + rotation - 1, 4) + 1] order by i)
    into presented_values
    from generate_series(1, 4) i;
    ordered_values := array[base_value + 4, base_value + 39, base_value + 71, base_value + 86];

    return jsonb_build_object(
      'prompt', 'Write these numbers in ascending order: ' ||
        array_to_string(array(
          select private.project_z_format_scaled(value, 100, 2)
          from unnest(presented_values) value
        ), ', ') || '.',
      'answer_kind', 'ordered-sequence',
      'canonical_answer', array_to_string(array(
        select private.project_z_format_scaled(value, 100, 2)
        from unnest(ordered_values) value
      ), ' < '),
      'worked_solution', 'The whole-number parts match, so compare tenths and then hundredths. ' ||
        'The ascending order is ' || array_to_string(array(
          select private.project_z_format_scaled(value, 100, 2)
          from unnest(ordered_values) value
        ), ' < ') || '.',
      'hints', jsonb_build_array(
        'Align the decimal points before comparing.',
        'Compare tenths first; use hundredths only when needed.'
      ),
      'difficulty', 2,
      'misconception_tags', jsonb_build_array('decimal-length', 'ascending-descending'),
      'parameters', jsonb_build_object('scaledValues', source_values, 'scale', 100)
    );
  end if;

  if p_family_code = 'compare-signed-decimals' then
    left_scaled := (p_seed - 250)::bigint * 3;
    right_scaled := (250 - p_seed)::bigint * 2;
    comparison := case when left_scaled < right_scaled then '<'
      when left_scaled > right_scaled then '>' else '=' end;

    return jsonb_build_object(
      'prompt', 'Choose <, > or = to make this statement true: ' ||
        private.project_z_format_scaled(left_scaled, 10, 1) || ' ___ ' ||
        private.project_z_format_scaled(right_scaled, 10, 1) || '.',
      'answer_kind', 'comparison',
      'canonical_answer', comparison,
      'worked_solution', 'Compare positions on the number line. ' ||
        private.project_z_format_scaled(left_scaled, 10, 1) || ' is ' ||
        case when comparison = '<' then 'to the left of'
          when comparison = '>' then 'to the right of' else 'at the same point as' end ||
        ' ' || private.project_z_format_scaled(right_scaled, 10, 1) ||
        ', so the correct symbol is ' || comparison || '.',
      'hints', jsonb_build_array(
        'Negative numbers farther left are smaller.',
        'Compare the two positions on a number line.'
      ),
      'difficulty', 3,
      'misconception_tags', jsonb_build_array('negative-number-order', 'comparison-symbol-direction'),
      'parameters', jsonb_build_object(
        'leftScaled', left_scaled, 'rightScaled', right_scaled, 'scale', 10
      )
    );
  end if;

  raise exception 'Unknown reviewed place-value family';
end;
$$;

create or replace function private.project_z_answer_matches(
  p_answer_kind text,
  p_submitted text,
  p_expected text
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  submitted_text text := lower(btrim(coalesce(p_submitted, '')));
  expected_text text := lower(btrim(coalesce(p_expected, '')));
  submitted_parts text[];
  expected_parts text[];
  part_index integer;
begin
  if submitted_text = '' then return false; end if;

  if p_answer_kind in ('integer', 'decimal') then
    submitted_text := regexp_replace(submitted_text, '[,[:space:]]', '', 'g');
    expected_text := regexp_replace(expected_text, '[,[:space:]]', '', 'g');
    if submitted_text !~ '^[+-]?[0-9]+(?:\.[0-9]+)?$'
       or expected_text !~ '^[+-]?[0-9]+(?:\.[0-9]+)?$' then
      return false;
    end if;
    return submitted_text::numeric = expected_text::numeric;
  end if;

  if p_answer_kind = 'comparison' then
    submitted_text := regexp_replace(submitted_text, '[[:space:]]', '', 'g');
    return submitted_text = expected_text and submitted_text in ('<', '>', '=');
  end if;

  if p_answer_kind = 'ordered-sequence' then
    submitted_parts := regexp_split_to_array(submitted_text, '\s*(?:<|,)\s*');
    expected_parts := regexp_split_to_array(expected_text, '\s*<\s*');
    if array_length(submitted_parts, 1) is distinct from array_length(expected_parts, 1) then
      return false;
    end if;
    for part_index in 1..array_length(expected_parts, 1) loop
      if submitted_parts[part_index] !~ '^[+-]?[0-9]+(?:\.[0-9]+)?$'
         or submitted_parts[part_index]::numeric <> expected_parts[part_index]::numeric then
        return false;
      end if;
    end loop;
    return true;
  end if;

  return false;
end;
$$;

create or replace function private.project_z_learning_slice_release_ready(
  p_course_skill_code text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.project_z_learning_slice_configs config
    join public.project_z_skill_atlas_candidates atlas
      on atlas.atlas_skill_code = config.course_skill_code
     and atlas.course_code = config.course_code
     and atlas.canonical_skill_id = config.canonical_skill_id
    join public.project_z_pathway_evidence pathway
      on pathway.course_code = config.course_code
    where config.course_skill_code = p_course_skill_code
      and config.release_state = 'released'
      and atlas.provenance_state = 'authorized_guide_mapped'
      and atlas.review_status = 'approved'
      and atlas.source_alignment_status = 'aligned'
      and atlas.educator_review_status = 'approved'
      and atlas.source_aligned_by is not null
      and atlas.educator_reviewed_by is not null
      and atlas.source_aligned_by <> atlas.educator_reviewed_by
      and pathway.curriculum_review_status = 'approved'
      and pathway.release_state = 'released'
      and pathway.source_reviewed = true
      and private.project_z_diagnostic_release_ready(config.course_code)
      and (
        select count(*) = config.required_family_count
          and coalesce(sum(f.distinct_variant_count), 0) >= 2000
          and bool_and(
            f.generator_version = config.generator_version
            and f.automated_verification_status = 'passed'
            and f.human_mathematics_review_status = 'approved'
            and f.release_state = 'approved'
            and f.duplicate_variant_count = 0
            and f.human_reviewed_by is not null
            and exists (
              select 1
              from private.project_z_curriculum_reviewers reviewer
              where reviewer.user_id = f.human_reviewed_by
                and reviewer.reviewer_kind = 'mathematics_educator'
                and reviewer.active = true
            )
          )
        from private.project_z_generator_families f
        where f.canonical_skill_id = config.canonical_skill_id
          and f.generator_version = config.generator_version
      )
      and exists (
        select 1
        from private.project_z_generator_verification_runs run
        where run.canonical_skill_id = config.canonical_skill_id
          and run.generator_version = config.generator_version
          and run.passed = true
          and run.distinct_variant_count >= 2000
          and run.duplicate_variant_count = 0
          and run.independent_answer_check_count >= run.tested_variant_count
      )
      and (
        select count(*) = config.required_teaching_steps
          and bool_and(
            asset.review_status = 'approved'
            and asset.reviewed_by is not null
            and exists (
              select 1
              from private.project_z_curriculum_reviewers reviewer
              where reviewer.user_id = asset.reviewed_by
                and reviewer.reviewer_kind = 'mathematics_educator'
                and reviewer.active = true
            )
          )
        from private.project_z_first_mission_teaching_assets asset
        where asset.canonical_skill_id = config.canonical_skill_id
          and asset.content_version = config.teaching_content_version
      )
  );
$$;

create or replace function private.project_z_learning_slice_blockers(
  p_course_skill_code text
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  config private.project_z_learning_slice_configs;
  blockers text[] := '{}';
begin
  select * into config
  from private.project_z_learning_slice_configs c
  where c.course_skill_code = p_course_skill_code;

  if config.course_skill_code is null then
    return array['slice_not_registered'];
  end if;
  if not private.project_z_diagnostic_release_ready(config.course_code) then
    blockers := array_append(blockers, 'reviewed_diagnostic_release_required');
  end if;
  if not exists (
    select 1 from public.project_z_skill_atlas_candidates a
    where a.atlas_skill_code = p_course_skill_code
      and a.provenance_state = 'authorized_guide_mapped'
      and a.review_status = 'approved'
      and a.source_alignment_status = 'aligned'
      and a.educator_review_status = 'approved'
      and a.source_aligned_by <> a.educator_reviewed_by
  ) then
    blockers := array_append(blockers, 'authorized_source_and_two_person_placement_review_required');
  end if;
  if not exists (
    select 1 from public.project_z_pathway_evidence p
    where p.course_code = config.course_code
      and p.curriculum_review_status = 'approved'
      and p.release_state = 'released'
      and p.source_reviewed = true
  ) then
    blockers := array_append(blockers, 'pathway_release_required');
  end if;
  if exists (
    select 1 from private.project_z_generator_families f
    where f.canonical_skill_id = config.canonical_skill_id
      and f.generator_version = config.generator_version
      and (
        f.human_mathematics_review_status <> 'approved'
        or f.release_state <> 'approved'
        or f.human_reviewed_by is null
      )
  ) then
    blockers := array_append(blockers, 'generator_family_mathematics_review_required');
  end if;
  if exists (
    select 1 from private.project_z_first_mission_teaching_assets a
    where a.canonical_skill_id = config.canonical_skill_id
      and a.content_version = config.teaching_content_version
      and (a.review_status <> 'approved' or a.reviewed_by is null)
  ) then
    blockers := array_append(blockers, 'teaching_asset_mathematics_review_required');
  end if;
  if config.release_state <> 'released' then
    blockers := array_append(blockers, 'operator_slice_release_required');
  end if;
  return blockers;
end;
$$;

revoke all on function private.project_z_format_integer(bigint)
from public, anon, authenticated, service_role;
revoke all on function private.project_z_format_scaled(bigint, integer, integer)
from public, anon, authenticated, service_role;
revoke all on function private.project_z_generate_place_value_item(text, integer)
from public, anon, authenticated, service_role;
revoke all on function private.project_z_answer_matches(text, text, text)
from public, anon, authenticated, service_role;
revoke all on function private.project_z_learning_slice_release_ready(text)
from public, anon, authenticated, service_role;
revoke all on function private.project_z_learning_slice_blockers(text)
from public, anon, authenticated, service_role;

create or replace function private.project_z_assert_student_actor()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text;
begin
  if actor is null then raise exception 'Not authenticated'; end if;
  select p.role into actor_role
  from public.project_z_profiles p
  where p.id = actor;
  if actor_role is distinct from 'student' then
    raise exception 'Only students can use the first learning mission';
  end if;
  return actor;
end;
$$;

create or replace function private.project_z_record_first_mission_mastery(
  p_mission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  mission public.project_z_first_learning_missions;
  config private.project_z_learning_slice_configs;
  teaching_count integer;
  guided_count integer;
  independent_count integer;
  checkpoint_count integer;
  scored_count integer;
  scored_correct integer;
  family_count integer;
  checkpoint_correct integer;
  unresolved_count integer;
  accuracy_percent numeric;
  confidence_percent numeric;
  mastery_decision text;
  evidence_digest text;
  mastery_event public.project_z_first_mission_mastery_events;
  next_status text;
  reward_inserted integer := 0;
begin
  select * into mission
  from public.project_z_first_learning_missions m
  where m.id = p_mission_id
  for update;
  if mission.id is null then raise exception 'First learning mission not found'; end if;

  select * into config
  from private.project_z_learning_slice_configs c
  where c.course_skill_code = mission.course_skill_code;
  if config.course_skill_code is null then raise exception 'Learning slice configuration missing'; end if;

  select count(distinct e.asset_code)::integer into teaching_count
  from public.project_z_first_mission_teaching_events e
  where e.mission_id = mission.id and e.is_correct = true;

  select count(*)::integer into guided_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase = 'guided';

  select count(*)::integer into independent_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase in ('independent', 'remediation');

  select count(*)::integer into checkpoint_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase = 'checkpoint';

  select
    count(*)::integer,
    count(*) filter (where a.is_correct)::integer,
    count(distinct a.family_code)::integer,
    count(*) filter (where a.phase = 'checkpoint' and a.is_correct)::integer
  into scored_count, scored_correct, family_count, checkpoint_correct
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id
    and a.phase in ('independent', 'checkpoint', 'remediation');

  select count(*)::integer into unresolved_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id
    and a.phase in ('independent', 'checkpoint', 'remediation')
    and a.is_correct = false
    and not exists (
      select 1
      from public.project_z_first_mission_correction_events correction
      where correction.original_attempt_id = a.id
        and correction.answer_repaired = true
    );

  accuracy_percent := case when scored_count = 0 then 0
    else round(scored_correct::numeric * 100 / scored_count::numeric, 2) end;
  confidence_percent := least(
    100,
    round(scored_count::numeric * 100 /
      (config.required_independent_attempts + config.required_checkpoint_attempts)::numeric, 2)
  );

  mastery_decision := case when
    teaching_count >= config.required_teaching_steps
    and guided_count >= config.required_guided_attempts
    and independent_count >= config.required_independent_attempts
    and checkpoint_count >= config.required_checkpoint_attempts
    and family_count >= config.required_family_count
    and checkpoint_correct >= config.required_checkpoint_attempts
    and unresolved_count = 0
    and accuracy_percent >= config.required_accuracy_percent
    then 'mastered' else 'not_yet' end;

  evidence_digest := encode(digest(concat_ws('|',
    mission.id::text, teaching_count, guided_count, independent_count,
    checkpoint_count, scored_count, scored_correct, family_count,
    checkpoint_correct, unresolved_count, mastery_decision
  ), 'sha256'), 'hex');

  insert into public.project_z_first_mission_mastery_events (
    mission_id, user_id, decision, teaching_steps_completed, guided_attempts,
    scored_attempts, scored_correct, family_count, checkpoint_correct,
    unresolved_corrections, mastery_percent, confidence_percent,
    explanation, evidence_digest
  ) values (
    mission.id, mission.user_id, mastery_decision, teaching_count, guided_count,
    scored_count, scored_correct, family_count, checkpoint_correct,
    unresolved_count, accuracy_percent, confidence_percent,
    jsonb_build_object(
      'rule_version', 'first-mission-mastery-v1.0.0',
      'teaching_required', config.required_teaching_steps,
      'guided_required', config.required_guided_attempts,
      'independent_required', config.required_independent_attempts,
      'checkpoint_required', config.required_checkpoint_attempts,
      'families_required', config.required_family_count,
      'accuracy_required_percent', config.required_accuracy_percent,
      'corrections_must_be_resolved', true,
      'motivation_excluded_from_mastery', true
    ),
    evidence_digest
  )
  on conflict (mission_id, evidence_digest) do nothing
  returning * into mastery_event;

  if mastery_event.id is null then
    select * into mastery_event
    from public.project_z_first_mission_mastery_events e
    where e.mission_id = mission.id and e.evidence_digest = evidence_digest;
  end if;

  if mastery_decision = 'mastered' then
    update public.project_z_first_learning_missions m
    set status = 'mastered', completed_at = coalesce(m.completed_at, now()), updated_at = now()
    where m.id = mission.id;

    insert into public.project_z_first_mission_game_unlock_events (
      mission_id, user_id, unlock_code, game_node_path, source_mastery_event_id
    ) values (
      mission.id, mission.user_id, 'first-place-value-stage',
      'foundations/number/place-value/first-stage', mastery_event.id
    ) on conflict (mission_id, unlock_code) do nothing;

    insert into public.project_z_first_mission_reward_events (
      mission_id, user_id, reward_code, xp_amount, coin_amount,
      motivation_only, source_mastery_event_id
    ) values (
      mission.id, mission.user_id, 'first-mission-mastery', 100, 25,
      true, mastery_event.id
    ) on conflict (mission_id, reward_code) do nothing;
    get diagnostics reward_inserted = row_count;

    if reward_inserted = 1 then
      insert into public.project_z_student_game_profiles (
        student_id, total_xp, level, coins, current_streak, longest_streak,
        selected_companion, companion_stage, selected_aura, selected_badge,
        selected_title, selected_theme, created_at, updated_at
      ) values (
        mission.user_id, 100, 1, 25, 0, 0,
        'nova', 1, 'aura_focus_blue', 'badge_first_steps',
        'title_math_explorer', 'theme_cosmic_light', now(), now()
      )
      on conflict (student_id) do update
      set total_xp = public.project_z_student_game_profiles.total_xp + 100,
          coins = public.project_z_student_game_profiles.coins + 25,
          level = greatest(
            public.project_z_student_game_profiles.level,
            1 + ((public.project_z_student_game_profiles.total_xp + 100) / 500)
          ),
          updated_at = now();
    end if;
  else
    next_status := case
      when teaching_count < config.required_teaching_steps then 'teaching'
      when guided_count < config.required_guided_attempts then 'guided'
      when unresolved_count > 0 then 'correction'
      when independent_count < config.required_independent_attempts then 'independent'
      when checkpoint_count < config.required_checkpoint_attempts
        or checkpoint_correct < config.required_checkpoint_attempts then 'checkpoint'
      else 'remediation'
    end;
    update public.project_z_first_learning_missions m
    set status = next_status, updated_at = now()
    where m.id = mission.id and m.status <> 'mastered';
  end if;

  return jsonb_build_object(
    'decision', mastery_decision,
    'mastery_percent', accuracy_percent,
    'confidence_percent', confidence_percent,
    'teaching_steps_completed', teaching_count,
    'guided_attempts', guided_count,
    'independent_attempts', independent_count,
    'checkpoint_attempts', checkpoint_count,
    'family_count', family_count,
    'checkpoint_correct', checkpoint_correct,
    'unresolved_corrections', unresolved_count,
    'game_stage_unlocked', mastery_decision = 'mastered',
    'reward_is_motivation_only', true
  );
end;
$$;

revoke all on function private.project_z_assert_student_actor()
from public, anon, authenticated, service_role;
revoke all on function private.project_z_record_first_mission_mastery(uuid)
from public, anon, authenticated, service_role;

create or replace function public.project_z_my_first_learning_mission()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := private.project_z_assert_student_actor();
  diagnostic public.project_z_diagnostic_sessions;
  mission public.project_z_first_learning_missions;
  blockers text[] := '{}';
  teaching_count integer := 0;
  guided_count integer := 0;
  independent_count integer := 0;
  checkpoint_count integer := 0;
  correction_count integer := 0;
  latest_mastery public.project_z_first_mission_mastery_events;
  unlocked boolean := false;
  rewarded boolean := false;
begin
  select * into diagnostic
  from public.project_z_diagnostic_sessions d
  where d.user_id = actor
  order by d.created_at desc
  limit 1;

  if diagnostic.id is null
     or diagnostic.status <> 'completed'
     or diagnostic.completion_outcome <> 'sufficient'
     or diagnostic.first_mission_skill_code is null then
    return jsonb_build_object(
      'state', 'diagnostic_required',
      'mission_started', false,
      'game_stage_unlocked', false,
      'message', 'Complete the reviewed diagnostic prologue before the first learning mission.'
    );
  end if;

  blockers := private.project_z_learning_slice_blockers(diagnostic.first_mission_skill_code);
  select * into mission
  from public.project_z_first_learning_missions m
  where m.user_id = actor and m.diagnostic_session_id = diagnostic.id;

  if mission.id is null then
    return jsonb_build_object(
      'state', case when cardinality(blockers) = 0 then 'ready_to_start'
        else 'awaiting_reviewed_slice' end,
      'mission_started', false,
      'course_code', diagnostic.course_code,
      'course_skill_code', diagnostic.first_mission_skill_code,
      'release_blockers', blockers,
      'game_stage_unlocked', false,
      'message', case when cardinality(blockers) = 0
        then 'Your reviewed first learning mission is ready.'
        else 'The first mission remains locked until its curriculum, teaching and mathematics evidence is approved.' end
    );
  end if;

  select count(distinct e.asset_code)::integer into teaching_count
  from public.project_z_first_mission_teaching_events e
  where e.mission_id = mission.id and e.is_correct = true;
  select count(*)::integer into guided_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase = 'guided';
  select count(*)::integer into independent_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase in ('independent', 'remediation');
  select count(*)::integer into checkpoint_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase = 'checkpoint';
  select count(*)::integer into correction_count
  from public.project_z_first_mission_correction_events c
  where c.mission_id = mission.id and c.answer_repaired = true;

  select * into latest_mastery
  from public.project_z_first_mission_mastery_events e
  where e.mission_id = mission.id
  order by e.created_at desc, e.id desc
  limit 1;
  select exists (
    select 1 from public.project_z_first_mission_game_unlock_events u
    where u.mission_id = mission.id
  ) into unlocked;
  select exists (
    select 1 from public.project_z_first_mission_reward_events r
    where r.mission_id = mission.id
  ) into rewarded;

  return jsonb_build_object(
    'state', mission.status,
    'mission_started', true,
    'mission_id', mission.id,
    'course_code', mission.course_code,
    'course_skill_code', mission.course_skill_code,
    'canonical_skill_id', mission.canonical_skill_id,
    'teaching_steps_completed', teaching_count,
    'guided_attempts', guided_count,
    'independent_attempts', independent_count,
    'checkpoint_attempts', checkpoint_count,
    'corrections_completed', correction_count,
    'mastery_decision', latest_mastery.decision,
    'mastery_percent', latest_mastery.mastery_percent,
    'confidence_percent', latest_mastery.confidence_percent,
    'game_stage_unlocked', unlocked,
    'reward_recorded', rewarded,
    'reward_is_motivation_only', true,
    'release_blockers', blockers
  );
end;
$$;

create or replace function public.project_z_start_first_learning_mission()
returns public.project_z_first_learning_missions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.project_z_assert_student_actor();
  diagnostic public.project_z_diagnostic_sessions;
  config private.project_z_learning_slice_configs;
  mission public.project_z_first_learning_missions;
begin
  select * into diagnostic
  from public.project_z_diagnostic_sessions d
  where d.user_id = actor
    and d.status = 'completed'
    and d.completion_outcome = 'sufficient'
    and d.first_mission_skill_code is not null
  order by d.completed_at desc
  limit 1;
  if diagnostic.id is null then
    raise exception 'Complete a sufficient reviewed diagnostic before starting the first mission';
  end if;
  if not private.project_z_student_main_game_unlocked(actor, diagnostic.course_code) then
    raise exception 'The diagnostic prologue has not unlocked the first mission';
  end if;
  if not private.project_z_learning_slice_release_ready(diagnostic.first_mission_skill_code) then
    raise exception 'The first learning slice is awaiting independent review and release';
  end if;

  select * into config
  from private.project_z_learning_slice_configs c
  where c.course_skill_code = diagnostic.first_mission_skill_code;

  insert into public.project_z_first_learning_missions (
    user_id, diagnostic_session_id, course_code, course_skill_code,
    canonical_skill_id, generator_version, teaching_content_version, status
  ) values (
    actor, diagnostic.id, diagnostic.course_code, diagnostic.first_mission_skill_code,
    config.canonical_skill_id, config.generator_version,
    config.teaching_content_version, 'teaching'
  )
  on conflict (diagnostic_session_id) do nothing
  returning * into mission;

  if mission.id is null then
    select * into mission
    from public.project_z_first_learning_missions m
    where m.diagnostic_session_id = diagnostic.id and m.user_id = actor;
  end if;
  return mission;
end;
$$;

create or replace function public.project_z_next_first_mission_teaching_step(
  p_mission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.project_z_assert_student_actor();
  mission public.project_z_first_learning_missions;
  asset private.project_z_first_mission_teaching_assets;
begin
  select * into mission
  from public.project_z_first_learning_missions m
  where m.id = p_mission_id and m.user_id = actor;
  if mission.id is null then raise exception 'First learning mission not found'; end if;
  if not private.project_z_learning_slice_release_ready(mission.course_skill_code) then
    raise exception 'The reviewed learning slice is no longer release-ready';
  end if;
  if mission.status in ('mastered', 'quarantined', 'paused') then
    return jsonb_build_object('done', true, 'state', mission.status);
  end if;

  select * into asset
  from private.project_z_first_mission_teaching_assets a
  where a.canonical_skill_id = mission.canonical_skill_id
    and a.content_version = mission.teaching_content_version
    and a.review_status = 'approved'
    and not exists (
      select 1
      from public.project_z_first_mission_teaching_events e
      where e.mission_id = mission.id
        and e.asset_code = a.asset_code
        and e.is_correct = true
    )
  order by a.step_order
  limit 1;

  if asset.asset_code is null then
    update public.project_z_first_learning_missions m
    set status = case when m.status = 'teaching' then 'guided' else m.status end,
        updated_at = now()
    where m.id = mission.id;
    return jsonb_build_object(
      'done', true, 'state', 'teaching_complete',
      'message', 'Teaching checks are complete. Guided practice is ready.'
    );
  end if;

  return jsonb_build_object(
    'done', false,
    'state', 'teaching',
    'mission_id', mission.id,
    'asset_code', asset.asset_code,
    'step_order', asset.step_order,
    'title', asset.title,
    'explanation', asset.explanation,
    'worked_example_prompt', asset.worked_example_prompt,
    'worked_example_solution', asset.worked_example_solution,
    'check_prompt', asset.check_prompt,
    'answer_kind', asset.check_answer_kind
  );
end;
$$;

create or replace function public.project_z_submit_first_mission_teaching_check(
  p_mission_id uuid,
  p_asset_code text,
  p_response_text text,
  p_client_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.project_z_assert_student_actor();
  mission public.project_z_first_learning_missions;
  asset private.project_z_first_mission_teaching_assets;
  existing public.project_z_first_mission_teaching_events;
  answer_correct boolean;
  completed_steps integer;
  required_steps integer;
begin
  if p_client_event_id is null then raise exception 'A client event id is required'; end if;
  if char_length(btrim(coalesce(p_response_text, ''))) < 1
     or char_length(p_response_text) > 1000 then
    raise exception 'Enter a concise response before continuing';
  end if;

  select * into mission
  from public.project_z_first_learning_missions m
  where m.id = p_mission_id and m.user_id = actor
  for update;
  if mission.id is null then raise exception 'First learning mission not found'; end if;
  if not private.project_z_learning_slice_release_ready(mission.course_skill_code) then
    raise exception 'The reviewed learning slice is no longer release-ready';
  end if;

  select * into existing
  from public.project_z_first_mission_teaching_events e
  where e.mission_id = mission.id and e.client_event_id = p_client_event_id;
  if existing.id is not null then
    return jsonb_build_object(
      'recorded', true, 'replayed', true, 'correct', existing.is_correct,
      'next_action', case when existing.is_correct then 'next_teaching_step' else 'try_scaffold' end
    );
  end if;

  select * into asset
  from private.project_z_first_mission_teaching_assets a
  where a.asset_code = p_asset_code
    and a.canonical_skill_id = mission.canonical_skill_id
    and a.content_version = mission.teaching_content_version
    and a.review_status = 'approved';
  if asset.asset_code is null then raise exception 'Reviewed teaching step not found'; end if;

  answer_correct := private.project_z_answer_matches(
    asset.check_answer_kind, p_response_text, asset.check_answer
  );

  insert into public.project_z_first_mission_teaching_events (
    mission_id, user_id, asset_code, client_event_id, response_text,
    is_correct, event_type
  ) values (
    mission.id, actor, asset.asset_code, p_client_event_id, btrim(p_response_text),
    answer_correct, case when answer_correct then 'completed' else 'attempted' end
  );

  select count(distinct e.asset_code)::integer into completed_steps
  from public.project_z_first_mission_teaching_events e
  where e.mission_id = mission.id and e.is_correct = true;
  select c.required_teaching_steps into required_steps
  from private.project_z_learning_slice_configs c
  where c.course_skill_code = mission.course_skill_code;

  if completed_steps >= required_steps then
    update public.project_z_first_learning_missions m
    set status = 'guided', updated_at = now()
    where m.id = mission.id and m.status = 'teaching';
  end if;

  return jsonb_build_object(
    'recorded', true,
    'replayed', false,
    'correct', answer_correct,
    'completed_steps', completed_steps,
    'worked_solution', case when answer_correct then asset.worked_example_solution else null end,
    'scaffold_hint', case when answer_correct then null else asset.scaffold_hint end,
    'next_action', case
      when not answer_correct then 'try_scaffold'
      when completed_steps >= required_steps then 'guided_practice'
      else 'next_teaching_step' end
  );
end;
$$;

create or replace function public.project_z_next_first_mission_practice(
  p_mission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.project_z_assert_student_actor();
  mission public.project_z_first_learning_missions;
  config private.project_z_learning_slice_configs;
  delivery public.project_z_first_mission_practice_deliveries;
  open_attempt public.project_z_first_mission_attempt_events;
  guided_count integer;
  independent_count integer;
  checkpoint_count integer;
  checkpoint_correct_count integer;
  remediation_count integer;
  completed_teaching integer;
  delivery_count integer;
  phase_sequence integer;
  next_phase text;
  family_code text;
  family_codes text[] := array[
    'place-value-digit', 'integer-rounding', 'decimal-rounding',
    'order-decimals', 'compare-signed-decimals'
  ];
  candidate_seed integer;
  seed_tries integer := 0;
  generated jsonb;
begin
  select * into mission
  from public.project_z_first_learning_missions m
  where m.id = p_mission_id and m.user_id = actor
  for update;
  if mission.id is null then raise exception 'First learning mission not found'; end if;
  if not private.project_z_learning_slice_release_ready(mission.course_skill_code) then
    raise exception 'The reviewed learning slice is no longer release-ready';
  end if;
  if mission.status = 'mastered' then
    return jsonb_build_object(
      'done', true, 'state', 'mastered', 'game_stage_unlocked', true,
      'message', 'Mastery is recorded and the first game stage is unlocked.'
    );
  end if;
  if mission.status in ('paused', 'quarantined') then
    return jsonb_build_object('done', true, 'state', mission.status);
  end if;

  select * into config
  from private.project_z_learning_slice_configs c
  where c.course_skill_code = mission.course_skill_code;

  select count(distinct e.asset_code)::integer into completed_teaching
  from public.project_z_first_mission_teaching_events e
  where e.mission_id = mission.id and e.is_correct = true;
  if completed_teaching < config.required_teaching_steps then
    return jsonb_build_object(
      'done', true, 'state', 'teaching_required',
      'message', 'Complete each teaching check before practice.'
    );
  end if;

  -- A refresh returns exactly the same outstanding item. Arbitrary question
  -- identifiers and replayed deliveries cannot create evidence.
  select d.* into delivery
  from public.project_z_first_mission_practice_deliveries d
  where d.mission_id = mission.id
    and not exists (
      select 1 from public.project_z_first_mission_attempt_events a
      where a.delivery_id = d.id
    )
  order by d.sequence_number desc
  limit 1;
  if delivery.id is not null then
    return jsonb_build_object(
      'done', false, 'state', delivery.phase, 'mission_id', mission.id,
      'delivery_id', delivery.id, 'phase', delivery.phase,
      'sequence_number', delivery.sequence_number,
      'family_code', delivery.family_code, 'prompt', delivery.prompt,
      'answer_kind', delivery.answer_kind, 'difficulty', delivery.difficulty,
      'hints', jsonb_build_array(delivery.hint_one, delivery.hint_two)
    );
  end if;

  -- Any unresolved independent/checkpoint error blocks new questions until the
  -- learner retries the mathematics and explains what changed.
  select a.* into open_attempt
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id
    and a.phase in ('independent', 'checkpoint', 'remediation')
    and a.is_correct = false
    and not exists (
      select 1
      from public.project_z_first_mission_correction_events c
      where c.original_attempt_id = a.id and c.answer_repaired = true
    )
  order by a.created_at
  limit 1;
  if open_attempt.id is not null then
    update public.project_z_first_learning_missions m
    set status = 'correction', updated_at = now()
    where m.id = mission.id;
    select d.* into delivery
    from public.project_z_first_mission_practice_deliveries d
    where d.id = open_attempt.delivery_id;
    return jsonb_build_object(
      'done', true, 'state', 'correction_required',
      'mission_id', mission.id, 'attempt_id', open_attempt.id,
      'prompt', delivery.prompt, 'answer_kind', delivery.answer_kind,
      'scaffold_hint', delivery.hint_two,
      'message', 'Repair the missed item and explain what you changed before continuing.'
    );
  end if;

  select count(*)::integer into guided_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase = 'guided';
  select count(*)::integer into independent_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase = 'independent';
  select count(*)::integer into checkpoint_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase = 'checkpoint';
  select count(*)::integer into checkpoint_correct_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase = 'checkpoint' and a.is_correct = true;
  select count(*)::integer into remediation_count
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.phase = 'remediation';

  if guided_count < config.required_guided_attempts then
    next_phase := 'guided';
    phase_sequence := guided_count + 1;
    family_code := family_codes[phase_sequence];
  elsif independent_count < config.required_independent_attempts then
    next_phase := 'independent';
    phase_sequence := independent_count + 1;
    family_code := family_codes[mod(phase_sequence - 1, cardinality(family_codes)) + 1];
  elsif checkpoint_count < config.required_checkpoint_attempts
     or checkpoint_correct_count < config.required_checkpoint_attempts then
    next_phase := 'checkpoint';
    phase_sequence := checkpoint_count + 1;
    family_code := case when mod(phase_sequence, 2) = 1 then 'order-decimals'
      else 'compare-signed-decimals' end;
  elsif remediation_count < 12 then
    next_phase := 'remediation';
    phase_sequence := remediation_count + 1;
    family_code := family_codes[mod(phase_sequence + 1, cardinality(family_codes)) + 1];
  else
    update public.project_z_first_learning_missions m
    set status = 'paused', updated_at = now()
    where m.id = mission.id;
    return jsonb_build_object(
      'done', true, 'state', 'support_required',
      'message', 'This mission needs a calm teacher-supported review before more independent items.'
    );
  end if;

  select count(*)::integer into delivery_count
  from public.project_z_first_mission_practice_deliveries d
  where d.mission_id = mission.id;

  candidate_seed := mod(
    (hashtextextended(mission.id::text || ':' || family_code || ':' ||
      (delivery_count + 1)::text, 0) & 9223372036854775807)::bigint,
    500
  )::integer;

  while exists (
    select 1
    from public.project_z_first_mission_practice_deliveries d
    where d.mission_id = mission.id
      and d.family_code = family_code
      and d.seed = candidate_seed
  ) loop
    candidate_seed := mod(candidate_seed + 1, 500);
    seed_tries := seed_tries + 1;
    if seed_tries >= 500 then raise exception 'No unused reviewed seed remains'; end if;
  end loop;

  generated := private.project_z_generate_place_value_item(family_code, candidate_seed);
  insert into public.project_z_first_mission_practice_deliveries (
    mission_id, user_id, phase, sequence_number, generator_version,
    family_code, seed, prompt, answer_kind, difficulty, hint_one, hint_two
  ) values (
    mission.id, actor, next_phase, delivery_count + 1, mission.generator_version,
    family_code, candidate_seed, generated->>'prompt', generated->>'answer_kind',
    (generated->>'difficulty')::integer, generated->'hints'->>0, generated->'hints'->>1
  ) returning * into delivery;

  insert into private.project_z_first_mission_answer_keys (
    delivery_id, canonical_answer, worked_solution, misconception_tags, parameters
  ) values (
    delivery.id, generated->>'canonical_answer', generated->>'worked_solution',
    array(select jsonb_array_elements_text(generated->'misconception_tags')),
    generated->'parameters'
  );

  update public.project_z_first_learning_missions m
  set status = next_phase, updated_at = now()
  where m.id = mission.id;

  return jsonb_build_object(
    'done', false, 'state', next_phase, 'mission_id', mission.id,
    'delivery_id', delivery.id, 'phase', next_phase,
    'sequence_number', delivery.sequence_number,
    'family_code', delivery.family_code, 'prompt', delivery.prompt,
    'answer_kind', delivery.answer_kind, 'difficulty', delivery.difficulty,
    'hints', jsonb_build_array(delivery.hint_one, delivery.hint_two)
  );
end;
$$;

create or replace function public.project_z_submit_first_mission_practice(
  p_mission_id uuid,
  p_delivery_id uuid,
  p_submitted_answer text,
  p_client_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.project_z_assert_student_actor();
  mission public.project_z_first_learning_missions;
  delivery public.project_z_first_mission_practice_deliveries;
  answer_key private.project_z_first_mission_answer_keys;
  existing public.project_z_first_mission_attempt_events;
  attempt public.project_z_first_mission_attempt_events;
  answer_correct boolean;
  mastery jsonb;
begin
  if p_client_event_id is null then raise exception 'A client event id is required'; end if;
  if char_length(btrim(coalesce(p_submitted_answer, ''))) < 1
     or char_length(p_submitted_answer) > 500 then
    raise exception 'Enter a concise answer before submitting';
  end if;

  select * into mission
  from public.project_z_first_learning_missions m
  where m.id = p_mission_id and m.user_id = actor
  for update;
  if mission.id is null then raise exception 'First learning mission not found'; end if;
  if mission.status = 'mastered' then
    return jsonb_build_object('recorded', false, 'state', 'mastered', 'game_stage_unlocked', true);
  end if;
  if not private.project_z_learning_slice_release_ready(mission.course_skill_code) then
    raise exception 'The reviewed learning slice is no longer release-ready';
  end if;

  select * into existing
  from public.project_z_first_mission_attempt_events a
  where a.mission_id = mission.id and a.client_event_id = p_client_event_id;
  if existing.id is not null then
    return jsonb_build_object(
      'recorded', true, 'replayed', true, 'attempt_id', existing.id,
      'correct', existing.is_correct,
      'correction_required', not existing.is_correct and existing.phase <> 'guided'
    );
  end if;

  select * into delivery
  from public.project_z_first_mission_practice_deliveries d
  where d.id = p_delivery_id and d.mission_id = mission.id and d.user_id = actor
  for update;
  if delivery.id is null then raise exception 'Only a server-issued mission item can be answered'; end if;
  if exists (
    select 1 from public.project_z_first_mission_attempt_events a
    where a.delivery_id = delivery.id
  ) then
    raise exception 'This server-issued mission item was already answered';
  end if;
  if exists (
    select 1 from public.project_z_first_mission_practice_deliveries outstanding
    where outstanding.mission_id = mission.id
      and not exists (
        select 1 from public.project_z_first_mission_attempt_events a
        where a.delivery_id = outstanding.id
      )
      and outstanding.id <> delivery.id
  ) then
    raise exception 'Only the outstanding server-issued item can be answered';
  end if;

  select * into answer_key
  from private.project_z_first_mission_answer_keys k
  where k.delivery_id = delivery.id;
  if answer_key.delivery_id is null then raise exception 'Practice answer key missing'; end if;

  answer_correct := private.project_z_answer_matches(
    delivery.answer_kind, p_submitted_answer, answer_key.canonical_answer
  );
  insert into public.project_z_first_mission_attempt_events (
    delivery_id, mission_id, user_id, client_event_id, phase, family_code,
    seed, submitted_answer, answer_normalized, is_correct
  ) values (
    delivery.id, mission.id, actor, p_client_event_id, delivery.phase,
    delivery.family_code, delivery.seed, btrim(p_submitted_answer),
    lower(regexp_replace(btrim(p_submitted_answer), '[[:space:]]+', ' ', 'g')),
    answer_correct
  ) returning * into attempt;

  mastery := private.project_z_record_first_mission_mastery(mission.id);
  return jsonb_build_object(
    'recorded', true, 'replayed', false, 'attempt_id', attempt.id,
    'correct', answer_correct, 'phase', delivery.phase,
    'worked_solution', answer_key.worked_solution,
    'correction_required', not answer_correct and delivery.phase <> 'guided',
    'next_action', case
      when mastery->>'decision' = 'mastered' then 'game_stage_unlocked'
      when not answer_correct and delivery.phase <> 'guided' then 'complete_correction'
      else 'next_question' end,
    'mastery', mastery,
    'reward_is_motivation_only', true
  );
end;
$$;

create or replace function public.project_z_submit_first_mission_correction(
  p_mission_id uuid,
  p_attempt_id uuid,
  p_retry_answer text,
  p_reflection_text text,
  p_client_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.project_z_assert_student_actor();
  mission public.project_z_first_learning_missions;
  attempt public.project_z_first_mission_attempt_events;
  delivery public.project_z_first_mission_practice_deliveries;
  answer_key private.project_z_first_mission_answer_keys;
  existing public.project_z_first_mission_correction_events;
  answer_repaired boolean;
  mastery jsonb;
begin
  if p_client_event_id is null then raise exception 'A client event id is required'; end if;
  if char_length(btrim(coalesce(p_reflection_text, ''))) < 20
     or char_length(p_reflection_text) > 1500 then
    raise exception 'Explain what changed in at least 20 characters';
  end if;
  if char_length(btrim(coalesce(p_retry_answer, ''))) < 1
     or char_length(p_retry_answer) > 500 then
    raise exception 'Enter the repaired answer';
  end if;

  select * into mission
  from public.project_z_first_learning_missions m
  where m.id = p_mission_id and m.user_id = actor
  for update;
  if mission.id is null then raise exception 'First learning mission not found'; end if;
  if not private.project_z_learning_slice_release_ready(mission.course_skill_code) then
    raise exception 'The reviewed learning slice is no longer release-ready';
  end if;

  select * into existing
  from public.project_z_first_mission_correction_events c
  where c.mission_id = mission.id and c.client_event_id = p_client_event_id;
  if existing.id is not null then
    return jsonb_build_object(
      'recorded', true, 'replayed', true, 'answer_repaired', existing.answer_repaired
    );
  end if;

  select * into attempt
  from public.project_z_first_mission_attempt_events a
  where a.id = p_attempt_id and a.mission_id = mission.id and a.user_id = actor;
  if attempt.id is null or attempt.is_correct = true or attempt.phase = 'guided' then
    raise exception 'An unresolved independent or checkpoint attempt is required';
  end if;
  if exists (
    select 1 from public.project_z_first_mission_correction_events c
    where c.original_attempt_id = attempt.id and c.answer_repaired = true
  ) then
    raise exception 'This correction was already resolved';
  end if;

  select * into delivery
  from public.project_z_first_mission_practice_deliveries d
  where d.id = attempt.delivery_id;
  select * into answer_key
  from private.project_z_first_mission_answer_keys k
  where k.delivery_id = attempt.delivery_id;
  answer_repaired := private.project_z_answer_matches(
    delivery.answer_kind, p_retry_answer, answer_key.canonical_answer
  );

  insert into public.project_z_first_mission_correction_events (
    original_attempt_id, mission_id, user_id, client_event_id,
    retry_answer, reflection_text, answer_repaired
  ) values (
    attempt.id, mission.id, actor, p_client_event_id,
    btrim(p_retry_answer), btrim(p_reflection_text), answer_repaired
  );

  mastery := private.project_z_record_first_mission_mastery(mission.id);
  return jsonb_build_object(
    'recorded', true, 'replayed', false, 'answer_repaired', answer_repaired,
    'worked_solution', answer_key.worked_solution,
    'next_action', case
      when not answer_repaired then 'try_correction_again'
      when mastery->>'decision' = 'mastered' then 'game_stage_unlocked'
      else 'next_question' end,
    'mastery', mastery,
    'reward_is_motivation_only', true
  );
end;
$$;

-- Account export includes every new learner-owned event while keeping private
-- answer keys and reviewer evidence out of the learner payload.
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
    'schema_version', 'project-z-account-export-v2',
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
      'legacy_practice_sessions', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_practice_sessions x where x.user_id = account_id), '[]'::jsonb),
      'legacy_practice_attempts', coalesce((select jsonb_agg(to_jsonb(x)) from public.project_z_practice_attempts x where x.user_id = account_id), '[]'::jsonb),
      'first_learning_missions', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.project_z_first_learning_missions x where x.user_id = account_id), '[]'::jsonb),
      'first_mission_teaching_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.project_z_first_mission_teaching_events x where x.user_id = account_id), '[]'::jsonb),
      'first_mission_practice_deliveries', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.project_z_first_mission_practice_deliveries x where x.user_id = account_id), '[]'::jsonb),
      'first_mission_attempt_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.project_z_first_mission_attempt_events x where x.user_id = account_id), '[]'::jsonb),
      'first_mission_correction_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.project_z_first_mission_correction_events x where x.user_id = account_id), '[]'::jsonb),
      'first_mission_mastery_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.project_z_first_mission_mastery_events x where x.user_id = account_id), '[]'::jsonb),
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
      'first_mission_unlock_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.project_z_first_mission_game_unlock_events x where x.user_id = account_id), '[]'::jsonb),
      'first_mission_reward_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.project_z_first_mission_reward_events x where x.user_id = account_id), '[]'::jsonb),
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

revoke all on function public.project_z_my_first_learning_mission()
from public, anon, authenticated, service_role;
revoke all on function public.project_z_start_first_learning_mission()
from public, anon, authenticated, service_role;
revoke all on function public.project_z_next_first_mission_teaching_step(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_submit_first_mission_teaching_check(uuid, text, text, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_next_first_mission_practice(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_submit_first_mission_practice(uuid, uuid, text, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_submit_first_mission_correction(uuid, uuid, text, text, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.project_z_my_first_learning_mission()
to authenticated, service_role;
grant execute on function public.project_z_start_first_learning_mission()
to authenticated, service_role;
grant execute on function public.project_z_next_first_mission_teaching_step(uuid)
to authenticated, service_role;
grant execute on function public.project_z_submit_first_mission_teaching_check(uuid, text, text, uuid)
to authenticated, service_role;
grant execute on function public.project_z_next_first_mission_practice(uuid)
to authenticated, service_role;
grant execute on function public.project_z_submit_first_mission_practice(uuid, uuid, text, uuid)
to authenticated, service_role;
grant execute on function public.project_z_submit_first_mission_correction(uuid, uuid, text, text, uuid)
to authenticated, service_role;

do $$
declare
  config_count integer;
  candidate_count integer;
  asset_count integer;
  variant_count integer;
  distinct_count integer;
  generator_digest text;
  rls_count integer;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'project_z_practice_attempts'
      and column_name = 'session_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'project_z_practice_attempts'
      and column_name = 'skill_id'
  ) then
    raise exception 'Legacy practice collision was modified instead of quarantined';
  end if;

  select count(*)::integer into candidate_count
  from public.project_z_skill_atlas_candidates a
  where a.canonical_skill_id = 'number.place-value.round-order';
  select count(*)::integer into config_count
  from private.project_z_learning_slice_configs c
  where c.canonical_skill_id = 'number.place-value.round-order';
  if candidate_count < 1 or config_count <> candidate_count then
    raise exception 'Every place-value candidate placement requires a blocked slice config';
  end if;

  select count(*)::integer into asset_count
  from private.project_z_first_mission_teaching_assets a
  where a.canonical_skill_id = 'number.place-value.round-order'
    and a.content_version = 'place-value-teaching-v1.0.0';
  if asset_count <> 5 then raise exception 'Exactly five draft teaching steps are required'; end if;
  if exists (
    select 1 from private.project_z_learning_slice_configs c
    where c.release_state = 'released'
  ) then raise exception 'Phase 58e must not release an unreviewed slice'; end if;

  with generated as (
    select
      family_code,
      seed,
      private.project_z_generate_place_value_item(family_code, seed) as item
    from unnest(array[
      'place-value-digit', 'integer-rounding', 'decimal-rounding',
      'order-decimals', 'compare-signed-decimals'
    ]) family_code
    cross join generate_series(0, 499) seed
  ), normalized as (
    select family_code || '|' ||
      regexp_replace(lower(replace(btrim(item->>'prompt'), ',', '')), '[[:space:]]+', ' ', 'g') || '|' ||
      regexp_replace(lower(replace(btrim(item->>'canonical_answer'), ',', '')), '[[:space:]]+', ' ', 'g') as item_key
    from generated
  )
  select count(*)::integer, count(distinct item_key)::integer,
         encode(digest(string_agg(item_key, E'\n' order by item_key), 'sha256'), 'hex')
  into variant_count, distinct_count, generator_digest
  from normalized;

  if variant_count <> 2500 or distinct_count <> 2500 then
    raise exception 'Database serving generator must retain 2,500 distinct instances';
  end if;
  if generator_digest <> 'cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f' then
    raise exception 'Database serving generator diverges from the independently verified Phase 58b digest: %', generator_digest;
  end if;

  select count(*)::integer into rls_count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'project_z_first_learning_missions',
      'project_z_first_mission_teaching_events',
      'project_z_first_mission_practice_deliveries',
      'project_z_first_mission_attempt_events',
      'project_z_first_mission_correction_events',
      'project_z_first_mission_mastery_events',
      'project_z_first_mission_game_unlock_events',
      'project_z_first_mission_reward_events'
    )
    and c.relrowsecurity = true;
  if rls_count <> 8 then raise exception 'All first-mission public ledgers require RLS'; end if;

  if has_function_privilege('anon', 'public.project_z_my_first_learning_mission()', 'EXECUTE')
     or has_function_privilege('anon', 'public.project_z_start_first_learning_mission()', 'EXECUTE')
     or has_function_privilege('anon', 'public.project_z_next_first_mission_practice(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.project_z_submit_first_mission_practice(uuid,uuid,text,uuid)', 'EXECUTE') then
    raise exception 'Anonymous first-mission RPC execution must remain denied';
  end if;
end;
$$;

comment on function private.project_z_learning_slice_release_ready(text) is
  'Fail-closed release boundary requiring released curriculum/diagnostic evidence, two different approved placement reviewers, five reviewed generator families, reviewed teaching assets, >=2,000 verified instances and explicit operator release.';
comment on table public.project_z_first_mission_attempt_events is
  'Immutable server-issued practice evidence. This table replaces the structurally collided legacy project_z_practice_attempts contract.';
comment on table public.project_z_first_mission_mastery_events is
  'Explainable append-only mastery decisions. XP, coins and other motivation events are excluded from the decision.';
comment on table public.project_z_first_mission_reward_events is
  'Idempotent motivation-only rewards derived from server-verified mastery; never grades or formal assessment evidence.';
