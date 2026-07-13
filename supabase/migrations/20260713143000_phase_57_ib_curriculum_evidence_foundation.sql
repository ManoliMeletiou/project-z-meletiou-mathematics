-- Phase 57: IB curriculum evidence foundation
--
-- This migration makes the curriculum claim measurable and fail-closed.
-- It creates the exact fourteen Project Z pathways requested by the product
-- contract, preserves the distinction between official IB framework material
-- and Project Z's school-sequenced MYP atlas, imports the useful legacy atlas
-- only as unreviewed candidates, and quarantines the small Phase 11/12 content
-- slice until it passes the same release evidence as future content.

create extension if not exists pgcrypto;

create table if not exists public.project_z_curriculum_sources (
  source_code text primary key,
  title text not null,
  source_kind text not null check (source_kind in (
    'official_overview',
    'official_subject_brief',
    'authorized_subject_guide',
    'project_z_sequence',
    'reference_audit'
  )),
  publisher text not null,
  source_url text,
  framework_version text not null,
  effective_from date,
  effective_to date,
  allowed_use_status text not null check (allowed_use_status in (
    'reference_only',
    'licensed_internal_reference',
    'project_z_original'
  )),
  notes text not null,
  last_checked_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_z_pathway_evidence (
  course_code text primary key references public.project_z_course_catalog(course_code) on delete cascade,
  year_number integer check (year_number between 1 and 5),
  framework_version text not null,
  curriculum_review_status text not null default 'candidate' check (curriculum_review_status in (
    'candidate', 'authorized_guide_review', 'educator_review', 'approved'
  )),
  release_state text not null default 'blocked' check (release_state in (
    'blocked', 'pilot', 'released', 'retired'
  )),
  required_min_variants_per_skill integer not null default 2000
    check (required_min_variants_per_skill >= 2000),
  source_reviewed boolean not null default false,
  human_curriculum_reviewer_id uuid references public.project_z_profiles(id) on delete set null,
  human_curriculum_reviewed_at timestamptz,
  release_block_reason text not null,
  advertised_complete boolean not null default false,
  last_audited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_z_pathway_never_claims_blocked_complete check (
    advertised_complete = false
    or (
      release_state = 'released'
      and curriculum_review_status = 'approved'
      and source_reviewed = true
      and human_curriculum_reviewer_id is not null
      and human_curriculum_reviewed_at is not null
    )
  )
);

create table if not exists public.project_z_pathway_sources (
  course_code text not null references public.project_z_pathway_evidence(course_code) on delete cascade,
  source_code text not null references public.project_z_curriculum_sources(source_code) on delete restrict,
  source_role text not null check (source_role in (
    'programme_framework', 'current_course_outline', 'upcoming_course_outline',
    'year_sequence_evidence', 'legacy_candidate_provenance'
  )),
  alignment_status text not null default 'unreviewed' check (alignment_status in (
    'unreviewed', 'partial', 'reviewed', 'superseded'
  )),
  reviewer_notes text,
  reviewed_by uuid references public.project_z_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (course_code, source_code, source_role)
);

create table if not exists public.project_z_skill_atlas_candidates (
  atlas_skill_code text primary key,
  course_code text not null references public.project_z_pathway_evidence(course_code) on delete cascade,
  canonical_skill_id text not null,
  title text not null,
  learning_objective text not null,
  strand_code text not null,
  subtopic_code text,
  placement_stages text[] not null default '{}',
  course_sequence integer not null,
  difficulty_band integer not null check (difficulty_band between 1 and 5),
  diagnostic_candidate boolean not null default false,
  supported_question_types text[] not null default '{}',
  common_misconceptions jsonb not null default '[]'::jsonb,
  prerequisite_canonical_skill_ids text[] not null default '{}',
  provenance_state text not null default 'legacy_candidate' check (provenance_state in (
    'legacy_candidate', 'project_z_authored', 'authorized_guide_mapped'
  )),
  review_status text not null default 'candidate' check (review_status in (
    'candidate', 'needs_revision', 'educator_review', 'approved', 'retired'
  )),
  source_code text references public.project_z_curriculum_sources(source_code) on delete set null,
  reviewed_by uuid references public.project_z_profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_code, canonical_skill_id)
);

create table if not exists public.project_z_legacy_content_quarantine (
  content_type text not null check (content_type in ('diagnostic_question', 'question_blueprint')),
  content_id uuid not null,
  previous_verified boolean not null,
  reason text not null,
  quarantined_at timestamptz not null default now(),
  primary key (content_type, content_id)
);

alter table public.project_z_curriculum_sources enable row level security;
alter table public.project_z_pathway_evidence enable row level security;
alter table public.project_z_pathway_sources enable row level security;
alter table public.project_z_skill_atlas_candidates enable row level security;
alter table public.project_z_legacy_content_quarantine enable row level security;

drop policy if exists project_z_curriculum_sources_read on public.project_z_curriculum_sources;
create policy project_z_curriculum_sources_read
on public.project_z_curriculum_sources for select to authenticated using (true);

drop policy if exists project_z_pathway_evidence_read on public.project_z_pathway_evidence;
create policy project_z_pathway_evidence_read
on public.project_z_pathway_evidence for select to authenticated using (true);

drop policy if exists project_z_pathway_sources_read on public.project_z_pathway_sources;
create policy project_z_pathway_sources_read
on public.project_z_pathway_sources for select to authenticated using (true);

drop policy if exists project_z_skill_atlas_candidates_read on public.project_z_skill_atlas_candidates;
create policy project_z_skill_atlas_candidates_read
on public.project_z_skill_atlas_candidates for select to authenticated using (true);

-- Quarantine history is operational evidence, not learner-facing data.
drop policy if exists project_z_legacy_content_quarantine_operator_read on public.project_z_legacy_content_quarantine;
create policy project_z_legacy_content_quarantine_operator_read
on public.project_z_legacy_content_quarantine for select to authenticated
using (public.project_z_is_operator());

revoke insert, update, delete on public.project_z_curriculum_sources from authenticated;
revoke insert, update, delete on public.project_z_pathway_evidence from authenticated;
revoke insert, update, delete on public.project_z_pathway_sources from authenticated;
revoke insert, update, delete on public.project_z_skill_atlas_candidates from authenticated;
revoke insert, update, delete on public.project_z_legacy_content_quarantine from authenticated;
grant select on public.project_z_curriculum_sources to authenticated;
grant select on public.project_z_pathway_evidence to authenticated;
grant select on public.project_z_pathway_sources to authenticated;
grant select on public.project_z_skill_atlas_candidates to authenticated;
grant select on public.project_z_legacy_content_quarantine to authenticated;

insert into public.project_z_curriculum_sources (
  source_code, title, source_kind, publisher, source_url, framework_version,
  effective_from, effective_to, allowed_use_status, notes, last_checked_at
)
values
  (
    'ib_myp_math_overview_2026',
    'IB Mathematics in the Middle Years Programme',
    'official_overview',
    'International Baccalaureate Organization',
    'https://www.ibo.org/programmes/middle-years-programme/curriculum/mathematics/',
    'MYP public framework, page updated 2026-02-19',
    null, null, 'reference_only',
    'Confirms four broad mathematical areas and Standard/Extended challenge levels. It does not prescribe a universal Year 1-5 skill sequence.',
    '2026-07-13T12:00:00Z'
  ),
  (
    'ib_myp_math_brief_assessment_2022',
    'IB Middle Years Programme Subject Brief: Mathematics',
    'official_subject_brief',
    'International Baccalaureate Organization',
    'https://www.ibo.org/globalassets/new-structure/brochures-and-infographics/pdfs/myp-brief-mathematics-en.pdf',
    'From 2020, first assessment 2022',
    '2022-01-01', null, 'reference_only',
    'Public brief for framework branches, Standard/Extended distinction and MYP criteria A-D. Exact school year sequencing requires authorized guide and educator review.',
    '2026-07-13T12:00:00Z'
  ),
  (
    'ib_dp_math_overview_2026',
    'IB Mathematics in the Diploma Programme',
    'official_overview',
    'International Baccalaureate Organization',
    'https://www.ibo.org/programmes/diploma-programme/curriculum/mathematics/',
    'DP public overview, page updated 2026-03-03',
    null, null, 'reference_only',
    'Confirms AA SL, AA HL, AI SL and AI HL and links both current and first-assessment-2029 briefs.',
    '2026-07-13T12:00:00Z'
  ),
  (
    'ib_dp_aa_brief_assessment_2021',
    'IB DP Subject Brief: Mathematics analysis and approaches',
    'official_subject_brief',
    'International Baccalaureate Organization',
    'https://www.ibo.org/contentassets/5895a05412144fe890312bad52b17044/subject-brief-dp-math-analysis-and-approaches-en.pdf',
    'First assessment 2021',
    '2021-01-01', '2028-12-31', 'reference_only',
    'Current public two-page outline during the transition to the 2029 course. The authorized subject guide remains necessary for exhaustive subskill alignment.',
    '2026-07-13T12:00:00Z'
  ),
  (
    'ib_dp_ai_brief_assessment_2021',
    'IB DP Subject Brief: Mathematics applications and interpretation',
    'official_subject_brief',
    'International Baccalaureate Organization',
    'https://www.ibo.org/contentassets/5895a05412144fe890312bad52b17044/subject-brief-dp-math-applications-and-interpretations-en.pdf',
    'First assessment 2021',
    '2021-01-01', '2028-12-31', 'reference_only',
    'Current public two-page outline during the transition to the 2029 course. The authorized subject guide remains necessary for exhaustive subskill alignment.',
    '2026-07-13T12:00:00Z'
  ),
  (
    'ib_dp_aa_brief_assessment_2029',
    'IB DP Subject Brief: Mathematics Analysis and approaches',
    'official_subject_brief',
    'International Baccalaureate Organization',
    'https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/sb_maths_analysis_en.pdf',
    'First assessment 2029',
    '2029-01-01', null, 'reference_only',
    'Upcoming public course outline. Stored separately so Project Z does not silently mix 2021 and 2029 cohorts.',
    '2026-07-13T12:00:00Z'
  ),
  (
    'ib_dp_ai_brief_assessment_2029',
    'IB DP Subject Brief: Mathematics Applications and interpretation',
    'official_subject_brief',
    'International Baccalaureate Organization',
    'https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/sb_maths_application_en.pdf',
    'First assessment 2029',
    '2029-01-01', null, 'reference_only',
    'Upcoming public course outline. Stored separately so Project Z does not silently mix 2021 and 2029 cohorts.',
    '2026-07-13T12:00:00Z'
  ),
  (
    'project_z_legacy_atlas_audit_2026',
    'Project Z legacy canonical atlas audit',
    'reference_audit',
    'Project Z',
    null,
    'Legacy candidate import audited 2026-07-13',
    null, null, 'project_z_original',
    'Useful internal skill skeleton only. A row is not treated as official, approved or release-ready until authorized-guide alignment and mathematics educator review are recorded.',
    '2026-07-13T12:00:00Z'
  )
on conflict (source_code) do update set
  title = excluded.title,
  source_kind = excluded.source_kind,
  publisher = excluded.publisher,
  source_url = excluded.source_url,
  framework_version = excluded.framework_version,
  effective_from = excluded.effective_from,
  effective_to = excluded.effective_to,
  allowed_use_status = excluded.allowed_use_status,
  notes = excluded.notes,
  last_checked_at = excluded.last_checked_at,
  updated_at = now();

-- Keep the old aggregate MYP codes as non-selectable compatibility gateways.
update public.project_z_course_catalog
set is_gateway = true,
    is_selectable = false,
    display_name = case course_code
      when 'myp_standard' then 'MYP Standard (choose a year)'
      when 'myp_extended' then 'MYP Extended (choose a year)'
      else display_name
    end
where course_code in ('myp_standard', 'myp_extended');

update public.project_z_course_catalog
set display_name = case course_code
      when 'dp_aa_standard' then 'DP Mathematics: Analysis and Approaches SL'
      when 'dp_aa_higher' then 'DP Mathematics: Analysis and Approaches HL'
      when 'dp_ai_standard' then 'DP Mathematics: Applications and Interpretation SL'
      when 'dp_ai_higher' then 'DP Mathematics: Applications and Interpretation HL'
      else display_name
    end,
    level_name = case
      when course_code in ('dp_aa_standard', 'dp_ai_standard') then 'SL'
      when course_code in ('dp_aa_higher', 'dp_ai_higher') then 'HL'
      else level_name
    end
where course_code in ('dp_aa_standard', 'dp_aa_higher', 'dp_ai_standard', 'dp_ai_higher');

insert into public.project_z_course_catalog (
  course_code, program, level_name, track_name, display_name,
  parent_course_code, is_gateway, is_selectable, sort_order
)
select
  format('myp_%s_%s', year_number, lower(level_name)),
  'MYP', level_name, format('Year %s', year_number),
  format('MYP Year %s %s', year_number, level_name),
  case level_name when 'Standard' then 'myp_standard' else 'myp_extended' end,
  false, true,
  year_number * 10 + case level_name when 'Standard' then 1 else 2 end
from generate_series(1, 5) year_number
cross join (values ('Standard'), ('Extended')) levels(level_name)
on conflict (course_code) do update set
  program = excluded.program,
  level_name = excluded.level_name,
  track_name = excluded.track_name,
  display_name = excluded.display_name,
  parent_course_code = excluded.parent_course_code,
  is_gateway = excluded.is_gateway,
  is_selectable = excluded.is_selectable,
  sort_order = excluded.sort_order;

insert into public.project_z_pathway_evidence (
  course_code, year_number, framework_version, curriculum_review_status,
  release_state, required_min_variants_per_skill, source_reviewed,
  release_block_reason, advertised_complete, last_audited_at
)
select
  c.course_code,
  case when c.program = 'MYP' then substring(c.course_code from 'myp_([1-5])_')::integer else null end,
  case
    when c.program = 'MYP' then 'MYP framework; Project Z school sequence candidate v0.1'
    else 'DP first assessment 2021; 2029 transition tracked separately'
  end,
  'candidate', 'blocked', 2000, false,
  'Authorized-guide alignment, educator approval and 2,000 verified distinct variants per approved skill are incomplete.',
  false, now()
from public.project_z_course_catalog c
where c.course_code in (
  'myp_1_standard', 'myp_1_extended',
  'myp_2_standard', 'myp_2_extended',
  'myp_3_standard', 'myp_3_extended',
  'myp_4_standard', 'myp_4_extended',
  'myp_5_standard', 'myp_5_extended',
  'dp_aa_standard', 'dp_aa_higher', 'dp_ai_standard', 'dp_ai_higher'
)
on conflict (course_code) do update set
  year_number = excluded.year_number,
  framework_version = excluded.framework_version,
  required_min_variants_per_skill = greatest(
    public.project_z_pathway_evidence.required_min_variants_per_skill,
    excluded.required_min_variants_per_skill
  ),
  last_audited_at = now(),
  updated_at = now();

insert into public.project_z_pathway_sources (course_code, source_code, source_role, alignment_status)
select p.course_code, 'project_z_legacy_atlas_audit_2026', 'legacy_candidate_provenance', 'unreviewed'
from public.project_z_pathway_evidence p
on conflict do nothing;

insert into public.project_z_pathway_sources (course_code, source_code, source_role, alignment_status)
select p.course_code, s.source_code, s.source_role, 'unreviewed'
from public.project_z_pathway_evidence p
cross join (values
  ('ib_myp_math_overview_2026', 'programme_framework'),
  ('ib_myp_math_brief_assessment_2022', 'current_course_outline')
) s(source_code, source_role)
where p.course_code like 'myp\_%' escape '\'
on conflict do nothing;

insert into public.project_z_pathway_sources (course_code, source_code, source_role, alignment_status)
select p.course_code, 'ib_dp_math_overview_2026', 'programme_framework', 'unreviewed'
from public.project_z_pathway_evidence p
where p.course_code like 'dp\_%' escape '\'
on conflict do nothing;

insert into public.project_z_pathway_sources (course_code, source_code, source_role, alignment_status)
select
  p.course_code,
  case when p.course_code like 'dp_aa_%' then 'ib_dp_aa_brief_assessment_2021' else 'ib_dp_ai_brief_assessment_2021' end,
  'current_course_outline', 'unreviewed'
from public.project_z_pathway_evidence p
where p.course_code like 'dp\_%' escape '\'
on conflict do nothing;

insert into public.project_z_pathway_sources (course_code, source_code, source_role, alignment_status)
select
  p.course_code,
  case when p.course_code like 'dp_aa_%' then 'ib_dp_aa_brief_assessment_2029' else 'ib_dp_ai_brief_assessment_2029' end,
  'upcoming_course_outline', 'unreviewed'
from public.project_z_pathway_evidence p
where p.course_code like 'dp\_%' escape '\'
on conflict do nothing;

-- Import the richer legacy skeleton as candidates only. This is intentionally
-- not an approval, and it does not enable diagnostics, practice or game paths.
do $$
begin
  if to_regclass('public.canonical_skills') is not null
     and to_regclass('public.canonical_skill_placements') is not null
     and to_regclass('public.canonical_skill_prerequisites') is not null then
    insert into public.project_z_skill_atlas_candidates (
      atlas_skill_code, course_code, canonical_skill_id, title, learning_objective,
      strand_code, subtopic_code, placement_stages, course_sequence,
      difficulty_band, diagnostic_candidate, supported_question_types,
      common_misconceptions, prerequisite_canonical_skill_ids,
      provenance_state, review_status, source_code
    )
    select
      mapped.course_code || ':' || cs.canonical_skill_id,
      mapped.course_code,
      cs.canonical_skill_id,
      cs.title,
      cs.description,
      cs.strand_id,
      cs.substrand_id,
      array_agg(distinct p.year_level order by p.year_level),
      coalesce(min(p.sequence), 100000),
      greatest(1, least(5, max(coalesce(p.course_difficulty, cs.difficulty, 1))))::integer,
      bool_or(p.diagnostic_eligible and cs.diagnostic_suitable),
      coalesce(cs.supported_question_types, '{}'::text[]),
      coalesce(cs.common_misconceptions, '[]'::jsonb),
      coalesce((
        select array_agg(pr.prereq_id order by pr.prereq_id)
        from public.canonical_skill_prerequisites pr
        where pr.skill_id = cs.canonical_skill_id
      ), '{}'::text[]),
      'legacy_candidate', 'candidate', 'project_z_legacy_atlas_audit_2026'
    from public.canonical_skill_placements p
    join public.canonical_skills cs on cs.canonical_skill_id = p.canonical_skill_id
    cross join lateral (
      select case
        when p.programme_id = 'myp-standard' then 'myp_' || substring(p.year_level from '([1-5])') || '_standard'
        when p.programme_id = 'myp-extended' then 'myp_' || substring(p.year_level from '([1-5])') || '_extended'
        when p.programme_id = 'dp-aa-sl' then 'dp_aa_standard'
        when p.programme_id = 'dp-aa-hl' then 'dp_aa_higher'
        when p.programme_id = 'dp-ai-sl' then 'dp_ai_standard'
        when p.programme_id = 'dp-ai-hl' then 'dp_ai_higher'
        else null
      end as course_code
    ) mapped
    where mapped.course_code is not null
      and cs.status = 'active'
    group by
      mapped.course_code, cs.canonical_skill_id, cs.title, cs.description,
      cs.strand_id, cs.substrand_id, cs.supported_question_types,
      cs.common_misconceptions
    on conflict (atlas_skill_code) do update set
      title = excluded.title,
      learning_objective = excluded.learning_objective,
      strand_code = excluded.strand_code,
      subtopic_code = excluded.subtopic_code,
      placement_stages = excluded.placement_stages,
      course_sequence = excluded.course_sequence,
      difficulty_band = excluded.difficulty_band,
      diagnostic_candidate = excluded.diagnostic_candidate,
      supported_question_types = excluded.supported_question_types,
      common_misconceptions = excluded.common_misconceptions,
      prerequisite_canonical_skill_ids = excluded.prerequisite_canonical_skill_ids,
      updated_at = now();
  end if;
end
$$;

-- Materialize candidate strands and skills into the Project Z curriculum graph
-- in a disabled state, so the UI can show the atlas while serving remains shut.
insert into public.project_z_curriculum_strands (
  strand_code, course_code, title, description, sort_order
)
select distinct
  'atlas.' || a.course_code || '.' || a.strand_code,
  a.course_code,
  initcap(replace(a.strand_code, '-', ' ')),
  'Candidate Project Z strand. Awaiting authorized-guide alignment and educator approval.',
  case a.strand_code
    when 'number' then 10 when 'algebra' then 20 when 'functions' then 30
    when 'geometry' then 40 when 'trigonometry' then 50 when 'vectors' then 60
    when 'statistics' then 70 when 'probability' then 80 when 'calculus' then 90
    when 'discrete' then 100 when 'financial-maths' then 110
    when 'modelling-applications' then 120 when 'proof-reasoning' then 130
    when 'technology' then 140 else 900
  end
from public.project_z_skill_atlas_candidates a
on conflict (strand_code) do update set
  course_code = excluded.course_code,
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.project_z_curriculum_skills (
  course_skill_code, course_code, strand_code, assessment_criterion,
  title, description, prerequisite_skill_codes, diagnostic_enabled,
  practice_enabled, game_path_enabled, difficulty_band,
  target_mastery_percent, max_mastery_percent, sort_order
)
select
  a.atlas_skill_code,
  a.course_code,
  'atlas.' || a.course_code || '.' || a.strand_code,
  null,
  a.title,
  a.learning_objective,
  coalesce((
    select array_agg(a.course_code || ':' || prereq order by prereq)
    from unnest(a.prerequisite_canonical_skill_ids) prereq
    where exists (
      select 1 from public.project_z_skill_atlas_candidates same_path
      where same_path.course_code = a.course_code
        and same_path.canonical_skill_id = prereq
    )
  ), '{}'::text[]),
  false, false, false,
  a.difficulty_band, 85, 96, a.course_sequence
from public.project_z_skill_atlas_candidates a
on conflict (course_skill_code) do update set
  course_code = excluded.course_code,
  strand_code = excluded.strand_code,
  title = excluded.title,
  description = excluded.description,
  prerequisite_skill_codes = excluded.prerequisite_skill_codes,
  diagnostic_enabled = false,
  practice_enabled = false,
  game_path_enabled = false,
  difficulty_band = excluded.difficulty_band,
  sort_order = excluded.sort_order;

-- No skill is serveable until its pathway is explicitly released.
update public.project_z_curriculum_skills
set diagnostic_enabled = false,
    practice_enabled = false,
    game_path_enabled = false;

-- Preserve and then remove the old boolean "verified" claim. Those booleans
-- pre-date the 2,000-distinct-variant and educator-review contract.
insert into public.project_z_legacy_content_quarantine (content_type, content_id, previous_verified, reason)
select 'question_blueprint', id, verified,
       'Phase 57: legacy boolean verification does not satisfy curriculum provenance, educator review and distinct-variant evidence.'
from public.project_z_question_blueprints
where verified = true
on conflict do nothing;

update public.project_z_question_blueprints set verified = false where verified = true;

insert into public.project_z_legacy_content_quarantine (content_type, content_id, previous_verified, reason)
select 'diagnostic_question', id, verified,
       'Phase 57: legacy boolean verification does not satisfy curriculum provenance, educator review and distinct-variant evidence.'
from public.project_z_diagnostic_question_bank
where verified = true
on conflict do nothing;

update public.project_z_diagnostic_question_bank set verified = false where verified = true;

-- Direct table reads must follow the same fail-closed release status as RPCs.
drop policy if exists question_blueprints_select_authenticated on public.project_z_question_blueprints;
drop policy if exists "question_blueprints_select_authenticated" on public.project_z_question_blueprints;
create policy project_z_question_blueprints_released_only
on public.project_z_question_blueprints for select to authenticated
using (
  verified = true
  and exists (
    select 1 from public.project_z_pathway_evidence p
    where p.course_code = project_z_question_blueprints.course_code
      and p.release_state = 'released'
      and p.advertised_complete = true
  )
);

drop policy if exists diagnostic_question_bank_select_authenticated on public.project_z_diagnostic_question_bank;
drop policy if exists "diagnostic_question_bank_select_authenticated" on public.project_z_diagnostic_question_bank;
create policy project_z_diagnostic_questions_released_only
on public.project_z_diagnostic_question_bank for select to authenticated
using (
  verified = true
  and exists (
    select 1 from public.project_z_pathway_evidence p
    where p.course_code = project_z_diagnostic_question_bank.course_code
      and p.release_state = 'released'
      and p.advertised_complete = true
  )
);

create or replace function public.project_z_curriculum_pathways()
returns table (
  course_code text,
  program text,
  year_number integer,
  level_name text,
  track_name text,
  display_name text,
  sort_order integer,
  atlas_skill_count integer,
  reviewed_skill_count integer,
  variant_ready_skill_count integer,
  strict_verified_variant_count bigint,
  release_state text,
  advertised_complete boolean,
  required_min_variants_per_skill integer,
  source_reviewed boolean,
  release_block_reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  with question_evidence as (
    select
      a.atlas_skill_code,
      count(distinct q.normalized_hash) filter (
        where q.status = 'approved'
          and q.quality_status = 'reviewed'
          and q.verifier_status in ('passed', 'human_verified')
          and q.normalized_hash is not null
          and q.allowed_use_status in ('original_created', 'licensed', 'public_domain')
          and q.worked_solution is not null
          and btrim(q.worked_solution) <> ''
      )::bigint as strict_variants
    from public.project_z_skill_atlas_candidates a
    left join public.question_bank q on q.canonical_skill_id = a.canonical_skill_id
    group by a.atlas_skill_code
  ), skill_rollup as (
    select
      a.course_code,
      count(*)::integer as atlas_skill_count,
      count(*) filter (where a.review_status = 'approved')::integer as reviewed_skill_count,
      count(*) filter (
        where a.review_status = 'approved'
          and coalesce(q.strict_variants, 0) >= p.required_min_variants_per_skill
      )::integer as variant_ready_skill_count,
      coalesce(sum(q.strict_variants), 0)::bigint as strict_verified_variant_count
    from public.project_z_skill_atlas_candidates a
    join public.project_z_pathway_evidence p on p.course_code = a.course_code
    left join question_evidence q on q.atlas_skill_code = a.atlas_skill_code
    group by a.course_code
  )
  select
    c.course_code, c.program, p.year_number, c.level_name, c.track_name,
    c.display_name, c.sort_order,
    coalesce(r.atlas_skill_count, 0),
    coalesce(r.reviewed_skill_count, 0),
    coalesce(r.variant_ready_skill_count, 0),
    coalesce(r.strict_verified_variant_count, 0),
    p.release_state, p.advertised_complete,
    p.required_min_variants_per_skill, p.source_reviewed,
    p.release_block_reason
  from public.project_z_pathway_evidence p
  join public.project_z_course_catalog c on c.course_code = p.course_code
  left join skill_rollup r on r.course_code = p.course_code
  order by c.sort_order, c.display_name;
end;
$$;

create or replace function public.project_z_atlas_skill_coverage(p_course_code text)
returns table (
  atlas_skill_code text,
  canonical_skill_id text,
  title text,
  learning_objective text,
  strand_code text,
  subtopic_code text,
  placement_stages text[],
  course_sequence integer,
  difficulty_band integer,
  prerequisite_count integer,
  review_status text,
  candidate_verified_variant_count bigint,
  strict_verified_variant_count bigint,
  required_min_variants integer,
  release_ready boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.project_z_pathway_evidence p where p.course_code = p_course_code) then
    raise exception 'Unknown Project Z curriculum pathway';
  end if;

  return query
  select
    a.atlas_skill_code,
    a.canonical_skill_id,
    a.title,
    a.learning_objective,
    a.strand_code,
    a.subtopic_code,
    a.placement_stages,
    a.course_sequence,
    a.difficulty_band,
    cardinality(a.prerequisite_canonical_skill_ids),
    a.review_status,
    count(distinct q.normalized_hash) filter (
      where q.status in ('draft', 'approved')
        and q.verifier_status in ('passed', 'human_verified')
        and q.normalized_hash is not null
    )::bigint,
    count(distinct q.normalized_hash) filter (
      where q.status = 'approved'
        and q.quality_status = 'reviewed'
        and q.verifier_status in ('passed', 'human_verified')
        and q.normalized_hash is not null
        and q.allowed_use_status in ('original_created', 'licensed', 'public_domain')
        and q.worked_solution is not null
        and btrim(q.worked_solution) <> ''
    )::bigint,
    p.required_min_variants_per_skill,
    (
      a.review_status = 'approved'
      and count(distinct q.normalized_hash) filter (
        where q.status = 'approved'
          and q.quality_status = 'reviewed'
          and q.verifier_status in ('passed', 'human_verified')
          and q.normalized_hash is not null
          and q.allowed_use_status in ('original_created', 'licensed', 'public_domain')
          and q.worked_solution is not null
          and btrim(q.worked_solution) <> ''
      ) >= p.required_min_variants_per_skill
    )
  from public.project_z_skill_atlas_candidates a
  join public.project_z_pathway_evidence p on p.course_code = a.course_code
  left join public.question_bank q on q.canonical_skill_id = a.canonical_skill_id
  where a.course_code = p_course_code
  group by a.atlas_skill_code, a.canonical_skill_id, a.title, a.learning_objective,
           a.strand_code, a.subtopic_code, a.placement_stages, a.course_sequence,
           a.difficulty_band, a.prerequisite_canonical_skill_ids,
           a.review_status, p.required_min_variants_per_skill
  order by a.course_sequence, a.title;
end;
$$;

create or replace function public.project_z_course_release_ready(p_course_code text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select
      p.release_state = 'released'
      and p.advertised_complete = true
      and p.curriculum_review_status = 'approved'
      and p.source_reviewed = true
      and count(a.atlas_skill_code) > 0
      and count(a.atlas_skill_code) = count(a.atlas_skill_code) filter (where a.review_status = 'approved')
      and count(a.atlas_skill_code) = count(a.atlas_skill_code) filter (
        where (
          select count(distinct q.normalized_hash)
          from public.question_bank q
          where q.canonical_skill_id = a.canonical_skill_id
            and q.status = 'approved'
            and q.quality_status = 'reviewed'
            and q.verifier_status in ('passed', 'human_verified')
            and q.normalized_hash is not null
            and q.allowed_use_status in ('original_created', 'licensed', 'public_domain')
            and q.worked_solution is not null
            and btrim(q.worked_solution) <> ''
        ) >= p.required_min_variants_per_skill
      )
    from public.project_z_pathway_evidence p
    left join public.project_z_skill_atlas_candidates a on a.course_code = p.course_code
    where p.course_code = p_course_code
    group by p.course_code, p.release_state, p.advertised_complete,
             p.curriculum_review_status, p.source_reviewed
  ), false);
$$;

-- Selecting a pathway is allowed before content release so a learner can set
-- their intended route. Serving questions remains separately fail-closed.
create or replace function public.project_z_select_student_course(p_course_code text)
returns public.project_z_student_course_selection
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
  selected_row public.project_z_student_course_selection;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select role into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if caller_role <> 'student' then
    raise exception 'Only student accounts can select their own course';
  end if;

  if not exists (
    select 1
    from public.project_z_pathway_evidence p
    join public.project_z_course_catalog c on c.course_code = p.course_code
    where p.course_code = p_course_code
      and c.is_selectable = true
  ) then
    raise exception 'Choose one of the fourteen Project Z pathways';
  end if;

  insert into public.project_z_student_course_selection (user_id, course_code, selected_at, updated_at)
  values (auth.uid(), p_course_code, now(), now())
  on conflict (user_id) do update
  set course_code = excluded.course_code,
      updated_at = now()
  returning * into selected_row;

  return selected_row;
end;
$$;

create or replace function public.project_z_my_selected_course()
returns table (
  course_code text,
  display_name text,
  program text,
  level_name text,
  track_name text,
  selected_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select c.course_code, c.display_name, c.program, c.level_name, c.track_name, s.selected_at
  from public.project_z_student_course_selection s
  join public.project_z_course_catalog c on c.course_code = s.course_code
  join public.project_z_pathway_evidence p on p.course_code = s.course_code
  where s.user_id = auth.uid();
$$;

revoke execute on function public.project_z_curriculum_pathways() from public, anon;
revoke execute on function public.project_z_atlas_skill_coverage(text) from public, anon;
revoke execute on function public.project_z_course_release_ready(text) from public, anon;
revoke execute on function public.project_z_select_student_course(text) from public, anon;
revoke execute on function public.project_z_my_selected_course() from public, anon;
grant execute on function public.project_z_curriculum_pathways() to authenticated, service_role;
grant execute on function public.project_z_atlas_skill_coverage(text) to authenticated, service_role;
grant execute on function public.project_z_course_release_ready(text) to authenticated, service_role;
grant execute on function public.project_z_select_student_course(text) to authenticated, service_role;
grant execute on function public.project_z_my_selected_course() to authenticated, service_role;

select
  'Project Z Phase 57 IB curriculum evidence foundation applied' as status,
  (select count(*) from public.project_z_pathway_evidence) as pathway_count,
  (select count(*) from public.project_z_skill_atlas_candidates) as candidate_skill_placements,
  now() as applied_at;
