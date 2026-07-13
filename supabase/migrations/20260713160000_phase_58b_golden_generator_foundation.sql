-- Project Z Phase 58b: golden deterministic generator evidence.
-- This migration records reproducible automated evidence only. It does not
-- approve curriculum, replace human mathematics review, insert learner-facing
-- questions, or release a pathway.

create schema if not exists private;

create table if not exists private.project_z_generator_families (
  family_code text primary key,
  canonical_skill_id text not null,
  generator_version text not null,
  title text not null,
  mathematical_purpose text not null,
  answer_strategy text not null,
  required_sample_size integer not null default 500 check (required_sample_size >= 500),
  tested_variant_count integer not null check (tested_variant_count >= required_sample_size),
  distinct_variant_count integer not null check (
    distinct_variant_count >= required_sample_size
    and distinct_variant_count <= tested_variant_count
  ),
  duplicate_variant_count integer not null default 0 check (duplicate_variant_count >= 0),
  independent_answer_check_count integer not null check (
    independent_answer_check_count >= tested_variant_count
  ),
  deterministic boolean not null default true,
  automated_verification_status text not null check (
    automated_verification_status in ('pending', 'passed', 'failed', 'quarantined')
  ),
  human_mathematics_review_status text not null default 'pending' check (
    human_mathematics_review_status in ('pending', 'approved', 'needs_revision', 'rejected')
  ),
  human_reviewed_by uuid references public.project_z_profiles(id) on delete set null,
  human_reviewed_at timestamptz,
  release_state text not null default 'blocked' check (
    release_state in ('blocked', 'review_candidate', 'approved', 'quarantined')
  ),
  evidence_digest text not null check (evidence_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (canonical_skill_id, generator_version, family_code),
  constraint project_z_generator_family_release_requires_human_review check (
    release_state <> 'approved'
    or (
      automated_verification_status = 'passed'
      and human_mathematics_review_status = 'approved'
      and human_reviewed_by is not null
      and human_reviewed_at is not null
      and duplicate_variant_count = 0
    )
  )
);

create index if not exists project_z_generator_families_skill_version_idx
  on private.project_z_generator_families (canonical_skill_id, generator_version);
create index if not exists project_z_generator_families_human_reviewer_idx
  on private.project_z_generator_families (human_reviewed_by)
  where human_reviewed_by is not null;

create table if not exists private.project_z_generator_verification_runs (
  id uuid primary key default gen_random_uuid(),
  canonical_skill_id text not null,
  generator_version text not null,
  run_kind text not null check (run_kind in ('ci_regression', 'operator_recheck', 'release_candidate')),
  family_count integer not null check (family_count > 0),
  sample_size_per_family integer not null check (sample_size_per_family >= 500),
  tested_variant_count integer not null check (tested_variant_count > 0),
  distinct_variant_count integer not null check (
    distinct_variant_count > 0 and distinct_variant_count <= tested_variant_count
  ),
  duplicate_variant_count integer not null check (duplicate_variant_count >= 0),
  independent_answer_check_count integer not null check (
    independent_answer_check_count >= tested_variant_count
  ),
  evidence_digest text not null check (evidence_digest ~ '^[0-9a-f]{64}$'),
  suite_results jsonb not null default '{}'::jsonb,
  passed boolean not null,
  created_at timestamptz not null default now(),
  constraint project_z_generator_passed_run_is_complete check (
    not passed
    or (
      duplicate_variant_count = 0
      and distinct_variant_count = tested_variant_count
      and tested_variant_count >= family_count * sample_size_per_family
    )
  )
);

create index if not exists project_z_generator_runs_skill_version_created_idx
  on private.project_z_generator_verification_runs (
    canonical_skill_id, generator_version, created_at desc
  );

revoke all on table private.project_z_generator_families from public, anon, authenticated;
revoke all on table private.project_z_generator_verification_runs from public, anon, authenticated;

insert into private.project_z_generator_families (
  family_code, canonical_skill_id, generator_version, title,
  mathematical_purpose, answer_strategy, required_sample_size,
  tested_variant_count, distinct_variant_count, duplicate_variant_count,
  independent_answer_check_count, deterministic,
  automated_verification_status, human_mathematics_review_status,
  release_state, evidence_digest
)
values
  (
    'place-value-digit', 'number.place-value.round-order', 'place-value-v1.0.0',
    'Digit value by place',
    'Distinguish a digit from the value created by its position.',
    'Exact integer recalculation from digit and place.',
    500, 500, 500, 0, 500, true, 'passed', 'pending', 'blocked',
    'cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f'
  ),
  (
    'integer-rounding', 'number.place-value.round-order', 'place-value-v1.0.0',
    'Integer rounding',
    'Round positive integers to tens, hundreds and thousands.',
    'Exact integer quotient and remainder recalculation.',
    500, 500, 500, 0, 500, true, 'passed', 'pending', 'blocked',
    'cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f'
  ),
  (
    'decimal-rounding', 'number.place-value.round-order', 'place-value-v1.0.0',
    'Decimal rounding',
    'Round exact fixed-point decimals to tenths and hundredths.',
    'Integer-scaled recalculation without floating-point comparison.',
    500, 500, 500, 0, 500, true, 'passed', 'pending', 'blocked',
    'cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f'
  ),
  (
    'order-decimals', 'number.place-value.round-order', 'place-value-v1.0.0',
    'Order decimals',
    'Order four fixed-point decimals by place value.',
    'Exact scaled-integer sorting and canonical sequence comparison.',
    500, 500, 500, 0, 500, true, 'passed', 'pending', 'blocked',
    'cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f'
  ),
  (
    'compare-signed-decimals', 'number.place-value.round-order', 'place-value-v1.0.0',
    'Compare signed decimals',
    'Compare positive and negative fixed-point values on a number line.',
    'Exact scaled-integer comparison.',
    500, 500, 500, 0, 500, true, 'passed', 'pending', 'blocked',
    'cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f'
  )
on conflict (family_code) do update
set canonical_skill_id = excluded.canonical_skill_id,
    generator_version = excluded.generator_version,
    title = excluded.title,
    mathematical_purpose = excluded.mathematical_purpose,
    answer_strategy = excluded.answer_strategy,
    required_sample_size = excluded.required_sample_size,
    tested_variant_count = excluded.tested_variant_count,
    distinct_variant_count = excluded.distinct_variant_count,
    duplicate_variant_count = excluded.duplicate_variant_count,
    independent_answer_check_count = excluded.independent_answer_check_count,
    deterministic = excluded.deterministic,
    automated_verification_status = excluded.automated_verification_status,
    release_state = case
      when private.project_z_generator_families.human_mathematics_review_status = 'approved'
        then private.project_z_generator_families.release_state
      else 'blocked'
    end,
    evidence_digest = excluded.evidence_digest,
    updated_at = now();

insert into private.project_z_generator_verification_runs (
  canonical_skill_id, generator_version, run_kind, family_count,
  sample_size_per_family, tested_variant_count, distinct_variant_count,
  duplicate_variant_count, independent_answer_check_count,
  evidence_digest, suite_results, passed
)
select
  'number.place-value.round-order',
  'place-value-v1.0.0',
  'ci_regression',
  5,
  500,
  2500,
  2500,
  0,
  2500,
  'cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f',
  jsonb_build_object(
    'deterministic', true,
    'fixed_point_arithmetic', true,
    'independent_answer_recalculation', true,
    'prompt_solution_hint_contract', true,
    'curriculum_approval', false,
    'human_mathematics_review', false,
    'learner_serving_enabled', false
  ),
  true
where not exists (
  select 1
  from private.project_z_generator_verification_runs r
  where r.canonical_skill_id = 'number.place-value.round-order'
    and r.generator_version = 'place-value-v1.0.0'
    and r.run_kind = 'ci_regression'
    and r.evidence_digest = 'cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f'
);

comment on table private.project_z_generator_families is
  'Automated generator evidence. A passed row is not curriculum or human mathematics approval and remains blocked until both are independently satisfied.';
comment on table private.project_z_generator_verification_runs is
  'Immutable-style reproducible verification summaries. Source tests and digest are tracked in the Project Z repository.';
