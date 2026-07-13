-- Project Z Phase 58: controlled curriculum review workbench
--
-- Candidate imports and AI output cannot approve curriculum. An authorized
-- guide mapper and a different verified mathematics educator must complete
-- the two review stages. Even then, question-variant and pathway release gates
-- remain independently blocked until their evidence is complete.

create table if not exists private.project_z_curriculum_reviewers (
  user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_kind text not null check (reviewer_kind in (
    'curriculum_mapper', 'mathematics_educator'
  )),
  active boolean not null default true,
  credential_note text not null check (char_length(btrim(credential_note)) >= 20),
  verified_by uuid not null references auth.users(id) on delete restrict,
  verified_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, reviewer_kind),
  constraint project_z_curriculum_reviewer_no_self_verification
    check (user_id <> verified_by),
  constraint project_z_curriculum_reviewer_revocation_complete check (
    (active = true and revoked_by is null and revoked_at is null)
    or (active = false and revoked_by is not null and revoked_at is not null)
  )
);

create table if not exists private.project_z_curriculum_review_events (
  id uuid primary key default gen_random_uuid(),
  atlas_skill_code text not null references public.project_z_skill_atlas_candidates(atlas_skill_code) on delete restrict,
  review_version integer not null check (review_version >= 1),
  review_stage text not null check (review_stage in (
    'source_alignment', 'educator_signoff'
  )),
  decision text not null check (decision in (
    'aligned', 'needs_revision', 'approved'
  )),
  source_code text references public.project_z_curriculum_sources(source_code) on delete restrict,
  source_locator text,
  notes text not null check (char_length(btrim(notes)) >= 20),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  prior_state jsonb not null default '{}'::jsonb,
  evidence_digest text not null,
  created_at timestamptz not null default now(),
  unique (atlas_skill_code, review_version, review_stage)
);

revoke all on table private.project_z_curriculum_reviewers from public, anon, authenticated;
revoke all on table private.project_z_curriculum_review_events from public, anon, authenticated;

create index if not exists project_z_curriculum_reviewers_active_idx
  on private.project_z_curriculum_reviewers (user_id, reviewer_kind)
  where active = true;
create index if not exists project_z_curriculum_reviewers_verified_by_idx
  on private.project_z_curriculum_reviewers (verified_by);
create index if not exists project_z_curriculum_reviewers_revoked_by_idx
  on private.project_z_curriculum_reviewers (revoked_by)
  where revoked_by is not null;
create index if not exists project_z_curriculum_review_events_skill_created_idx
  on private.project_z_curriculum_review_events (atlas_skill_code, created_at desc);
create index if not exists project_z_curriculum_review_events_reviewer_idx
  on private.project_z_curriculum_review_events (reviewer_id, created_at desc);
create index if not exists project_z_curriculum_review_events_source_idx
  on private.project_z_curriculum_review_events (source_code)
  where source_code is not null;

alter table public.project_z_skill_atlas_candidates
  add column if not exists source_alignment_status text not null default 'unreviewed',
  add column if not exists source_locator text,
  add column if not exists source_alignment_notes text,
  add column if not exists source_aligned_by uuid references auth.users(id) on delete set null,
  add column if not exists source_aligned_at timestamptz,
  add column if not exists educator_review_status text not null default 'unreviewed',
  add column if not exists educator_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists educator_reviewed_at timestamptz,
  add column if not exists educator_review_notes text,
  add column if not exists review_version integer not null default 1;

alter table public.project_z_skill_atlas_candidates
  drop constraint if exists project_z_skill_source_alignment_status_check,
  add constraint project_z_skill_source_alignment_status_check
    check (source_alignment_status in ('unreviewed', 'aligned', 'needs_revision')),
  drop constraint if exists project_z_skill_educator_review_status_check,
  add constraint project_z_skill_educator_review_status_check
    check (educator_review_status in ('unreviewed', 'approved', 'needs_revision')),
  drop constraint if exists project_z_skill_review_version_check,
  add constraint project_z_skill_review_version_check check (review_version >= 1),
  drop constraint if exists project_z_skill_approval_requires_two_people,
  add constraint project_z_skill_approval_requires_two_people check (
    review_status <> 'approved'
    or (
      source_alignment_status = 'aligned'
      and educator_review_status = 'approved'
      and source_code is not null
      and source_locator is not null
      and source_aligned_by is not null
      and source_aligned_at is not null
      and educator_reviewed_by is not null
      and educator_reviewed_at is not null
      and source_aligned_by <> educator_reviewed_by
    )
  );

create index if not exists project_z_skill_atlas_source_idx
  on public.project_z_skill_atlas_candidates (source_code)
  where source_code is not null;
create index if not exists project_z_skill_atlas_source_reviewer_idx
  on public.project_z_skill_atlas_candidates (source_aligned_by)
  where source_aligned_by is not null;
create index if not exists project_z_skill_atlas_educator_reviewer_idx
  on public.project_z_skill_atlas_candidates (educator_reviewed_by)
  where educator_reviewed_by is not null;

-- Learners and teachers may read the safe atlas fields used by the Phase 57
-- SECURITY INVOKER coverage RPCs. Review notes, private guide locators and
-- reviewer identifiers are deliberately excluded from their column grants.
revoke select on table public.project_z_skill_atlas_candidates from authenticated;
grant select (
  atlas_skill_code, course_code, canonical_skill_id, title, learning_objective,
  strand_code, subtopic_code, placement_stages, course_sequence,
  difficulty_band, diagnostic_candidate, supported_question_types,
  common_misconceptions, prerequisite_canonical_skill_ids, provenance_state,
  review_status, source_code, created_at, updated_at,
  source_alignment_status, educator_review_status, review_version
) on table public.project_z_skill_atlas_candidates to authenticated;

create or replace function public.project_z_curriculum_review_access()
returns table (
  is_operator boolean,
  reviewer_roles text[],
  authorized_source_count bigint,
  active_reviewer_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from private.project_z_operators o
      where o.user_id = (select auth.uid()) and o.active = true
    ),
    coalesce((
      select array_agg(r.reviewer_kind order by r.reviewer_kind)
      from private.project_z_curriculum_reviewers r
      where r.user_id = (select auth.uid()) and r.active = true
    ), '{}'::text[]),
    (select count(*) from public.project_z_curriculum_sources s
      where s.source_kind = 'authorized_subject_guide'
        and s.allowed_use_status = 'licensed_internal_reference'),
    (select count(distinct r.user_id) from private.project_z_curriculum_reviewers r
      where r.active = true)
  where (select auth.uid()) is not null;
$$;

create or replace function public.project_z_operator_curriculum_reviewer_roster()
returns table (
  user_id uuid,
  email text,
  database_role text,
  reviewer_kind text,
  active boolean,
  credential_note text,
  verified_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from private.project_z_operators o
    where o.user_id = (select auth.uid()) and o.active = true
  ) then
    raise exception 'Operator access required';
  end if;

  return query
  select r.user_id, p.email, p.role, r.reviewer_kind,
         r.active, r.credential_note, r.verified_at
  from private.project_z_curriculum_reviewers r
  join public.project_z_profiles p on p.id = r.user_id
  order by r.active desc, p.email, r.reviewer_kind;
end;
$$;

create or replace function public.project_z_operator_register_curriculum_reviewer(
  p_user_id uuid,
  p_reviewer_kind text,
  p_credential_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  reviewer_kind text := lower(btrim(p_reviewer_kind));
  credential_note text := btrim(p_credential_note);
  target_role text;
begin
  if actor is null or not exists (
    select 1 from private.project_z_operators o
    where o.user_id = actor and o.active = true
  ) then
    raise exception 'Operator access required';
  end if;

  if actor = p_user_id then
    raise exception 'Operators cannot verify themselves as curriculum reviewers';
  end if;
  if reviewer_kind not in ('curriculum_mapper', 'mathematics_educator') then
    raise exception 'Unknown curriculum reviewer role';
  end if;
  if char_length(credential_note) < 20 then
    raise exception 'Record at least 20 characters of credential evidence';
  end if;

  select p.role into target_role
  from public.project_z_profiles p
  where p.id = p_user_id;

  if target_role is distinct from 'teacher' then
    raise exception 'Curriculum reviewers require a verified teacher profile';
  end if;

  insert into private.project_z_curriculum_reviewers (
    user_id, reviewer_kind, active, credential_note, verified_by,
    verified_at, revoked_by, revoked_at, updated_at
  ) values (
    p_user_id, reviewer_kind, true, credential_note, actor,
    now(), null, null, now()
  )
  on conflict (user_id, reviewer_kind) do update
  set active = true,
      credential_note = excluded.credential_note,
      verified_by = actor,
      verified_at = now(),
      revoked_by = null,
      revoked_at = null,
      updated_at = now();

  insert into private.project_z_operator_audit (
    operator_id, target_user_id, action, decision, metadata
  ) values (
    actor, p_user_id, 'curriculum_reviewer_registration', 'verified',
    jsonb_build_object('reviewer_kind', reviewer_kind, 'credential_note', credential_note)
  );

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'reviewer_kind', reviewer_kind);
end;
$$;

create or replace function public.project_z_operator_register_authorized_curriculum_source(
  p_source_code text,
  p_title text,
  p_publisher text,
  p_framework_version text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  source_code text := lower(btrim(p_source_code));
begin
  if actor is null or not exists (
    select 1 from private.project_z_operators o
    where o.user_id = actor and o.active = true
  ) then
    raise exception 'Operator access required';
  end if;
  if source_code !~ '^authorized_[a-z0-9_]{4,80}$' then
    raise exception 'Authorized source code must begin authorized_ and use lowercase letters, numbers or underscores';
  end if;
  if char_length(btrim(p_title)) < 5
     or char_length(btrim(p_publisher)) < 3
     or char_length(btrim(p_framework_version)) < 4
     or char_length(btrim(p_notes)) < 20 then
    raise exception 'Complete the authorized-source metadata and review notes';
  end if;
  if exists (select 1 from public.project_z_curriculum_sources s where s.source_code = source_code) then
    raise exception 'Curriculum source code already exists';
  end if;

  insert into public.project_z_curriculum_sources (
    source_code, title, source_kind, publisher, source_url,
    framework_version, effective_from, effective_to,
    allowed_use_status, notes, last_checked_at
  ) values (
    source_code, btrim(p_title), 'authorized_subject_guide', btrim(p_publisher), null,
    btrim(p_framework_version), null, null,
    'licensed_internal_reference', btrim(p_notes), now()
  );

  insert into private.project_z_operator_audit (
    operator_id, action, decision, metadata
  ) values (
    actor, 'authorized_curriculum_source_registration', 'registered',
    jsonb_build_object('source_code', source_code, 'title', btrim(p_title),
      'framework_version', btrim(p_framework_version))
  );

  return jsonb_build_object('ok', true, 'source_code', source_code);
end;
$$;

create or replace function public.project_z_operator_curriculum_review_queue(
  p_course_code text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  atlas_skill_code text,
  course_code text,
  title text,
  learning_objective text,
  strand_code text,
  course_sequence integer,
  review_status text,
  source_alignment_status text,
  source_code text,
  source_title text,
  source_kind text,
  source_locator text,
  source_aligned_at timestamptz,
  educator_review_status text,
  educator_reviewed_at timestamptz,
  strict_verified_variant_count bigint,
  required_min_variants integer,
  readiness_blockers text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from private.project_z_operators o
    where o.user_id = (select auth.uid()) and o.active = true
  ) and not exists (
    select 1 from private.project_z_curriculum_reviewers r
    where r.user_id = (select auth.uid()) and r.active = true
  ) then
    raise exception 'Curriculum review access required';
  end if;
  if p_limit < 1 or p_limit > 100 or p_offset < 0 then
    raise exception 'Use a limit from 1 to 100 and a non-negative offset';
  end if;
  if p_course_code is not null and not exists (
    select 1 from public.project_z_pathway_evidence p where p.course_code = p_course_code
  ) then
    raise exception 'Unknown Project Z curriculum pathway';
  end if;

  return query
  with evidence as (
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
      )::bigint as strict_count
    from public.project_z_skill_atlas_candidates a
    left join public.question_bank q on q.canonical_skill_id = a.canonical_skill_id
    where p_course_code is null or a.course_code = p_course_code
    group by a.atlas_skill_code
  )
  select
    a.atlas_skill_code, a.course_code, a.title, a.learning_objective,
    a.strand_code, a.course_sequence, a.review_status,
    a.source_alignment_status, a.source_code, s.title, s.source_kind,
    a.source_locator, a.source_aligned_at,
    a.educator_review_status, a.educator_reviewed_at,
    coalesce(e.strict_count, 0), p.required_min_variants_per_skill,
    array_remove(array[
      case when not exists (
        select 1 from public.project_z_curriculum_sources authorized
        where authorized.source_kind = 'authorized_subject_guide'
          and authorized.allowed_use_status = 'licensed_internal_reference'
      ) then 'authorized_guide_missing' end,
      case when a.source_alignment_status <> 'aligned' then 'source_alignment_incomplete' end,
      case when a.educator_review_status <> 'approved' then 'educator_signoff_incomplete' end,
      case when coalesce(e.strict_count, 0) < p.required_min_variants_per_skill then 'variant_floor_incomplete' end
    ], null)::text[]
  from public.project_z_skill_atlas_candidates a
  join public.project_z_pathway_evidence p on p.course_code = a.course_code
  left join public.project_z_curriculum_sources s on s.source_code = a.source_code
  left join evidence e on e.atlas_skill_code = a.atlas_skill_code
  where p_course_code is null or a.course_code = p_course_code
  order by a.course_code, a.course_sequence, a.title
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.project_z_review_curriculum_source_alignment(
  p_atlas_skill_code text,
  p_source_code text,
  p_source_locator text,
  p_decision text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  decision text := lower(btrim(p_decision));
  review_row public.project_z_skill_atlas_candidates%rowtype;
  next_version integer;
  digest text;
begin
  if actor is null or not exists (
    select 1 from private.project_z_curriculum_reviewers r
    where r.user_id = actor and r.reviewer_kind = 'curriculum_mapper' and r.active = true
  ) then
    raise exception 'Verified curriculum mapper access required';
  end if;
  if decision not in ('aligned', 'needs_revision') then
    raise exception 'Source decision must be aligned or needs_revision';
  end if;
  if char_length(btrim(p_notes)) < 20 then
    raise exception 'Record at least 20 characters of source-review evidence';
  end if;

  select * into review_row
  from public.project_z_skill_atlas_candidates a
  where a.atlas_skill_code = p_atlas_skill_code
  for update;
  if not found then raise exception 'Curriculum skill not found'; end if;

  if decision = 'aligned' then
    if char_length(btrim(coalesce(p_source_locator, ''))) < 3 then
      raise exception 'Record a non-public locator inside the authorized guide';
    end if;
    if not exists (
      select 1 from public.project_z_curriculum_sources s
      where s.source_code = p_source_code
        and s.source_kind = 'authorized_subject_guide'
        and s.allowed_use_status = 'licensed_internal_reference'
    ) then
      raise exception 'Aligned skills require a registered authorized subject guide';
    end if;
  end if;

  next_version := review_row.review_version + 1;
  digest := encode(digest(concat_ws('|', p_atlas_skill_code, next_version::text,
    'source_alignment', decision, coalesce(p_source_code, ''),
    coalesce(p_source_locator, ''), btrim(p_notes), actor::text), 'sha256'), 'hex');

  update public.project_z_skill_atlas_candidates
  set source_alignment_status = decision,
      source_code = case when decision = 'aligned' then p_source_code else source_code end,
      source_locator = case when decision = 'aligned' then btrim(p_source_locator) else source_locator end,
      source_alignment_notes = btrim(p_notes),
      source_aligned_by = actor,
      source_aligned_at = now(),
      educator_review_status = 'unreviewed',
      educator_reviewed_by = null,
      educator_reviewed_at = null,
      educator_review_notes = null,
      review_status = case when decision = 'aligned' then 'educator_review' else 'needs_revision' end,
      provenance_state = case when decision = 'aligned' then 'authorized_guide_mapped' else provenance_state end,
      reviewed_by = null,
      reviewed_at = null,
      review_notes = btrim(p_notes),
      review_version = next_version,
      updated_at = now()
  where atlas_skill_code = p_atlas_skill_code;

  insert into private.project_z_curriculum_review_events (
    atlas_skill_code, review_version, review_stage, decision,
    source_code, source_locator, notes, reviewer_id, prior_state, evidence_digest
  ) values (
    p_atlas_skill_code, next_version, 'source_alignment', decision,
    case when decision = 'aligned' then p_source_code else null end,
    nullif(btrim(coalesce(p_source_locator, '')), ''), btrim(p_notes), actor,
    jsonb_build_object('review_status', review_row.review_status,
      'source_alignment_status', review_row.source_alignment_status,
      'educator_review_status', review_row.educator_review_status,
      'review_version', review_row.review_version),
    digest
  );

  insert into private.project_z_operator_audit (
    operator_id, action, decision, metadata
  ) values (
    actor, 'curriculum_source_alignment', decision,
    jsonb_build_object('atlas_skill_code', p_atlas_skill_code,
      'source_code', p_source_code, 'review_version', next_version, 'evidence_digest', digest)
  );

  return jsonb_build_object('ok', true, 'atlas_skill_code', p_atlas_skill_code,
    'decision', decision, 'review_version', next_version, 'evidence_digest', digest);
end;
$$;

create or replace function public.project_z_review_curriculum_educator_signoff(
  p_atlas_skill_code text,
  p_decision text,
  p_notes text,
  p_attestation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  decision text := lower(btrim(p_decision));
  review_row public.project_z_skill_atlas_candidates%rowtype;
  digest text;
begin
  if actor is null or not exists (
    select 1 from private.project_z_curriculum_reviewers r
    where r.user_id = actor and r.reviewer_kind = 'mathematics_educator' and r.active = true
  ) then
    raise exception 'Verified mathematics educator access required';
  end if;
  if decision not in ('approved', 'needs_revision') then
    raise exception 'Educator decision must be approved or needs_revision';
  end if;
  if char_length(btrim(p_notes)) < 20 then
    raise exception 'Record at least 20 characters of educator evidence';
  end if;

  select * into review_row
  from public.project_z_skill_atlas_candidates a
  where a.atlas_skill_code = p_atlas_skill_code
  for update;
  if not found then raise exception 'Curriculum skill not found'; end if;
  if review_row.source_alignment_status <> 'aligned' then
    raise exception 'Source alignment must be completed first';
  end if;
  if review_row.source_aligned_by = actor then
    raise exception 'The source mapper cannot sign off the same skill';
  end if;
  if review_row.educator_review_status <> 'unreviewed' then
    raise exception 'This source-review version already has an educator decision';
  end if;
  if decision = 'approved' and btrim(p_attestation) <> 'I CONFIRM THIS SKILL ALIGNMENT' then
    raise exception 'Use the exact educator attestation before approval';
  end if;

  digest := encode(digest(concat_ws('|', p_atlas_skill_code, review_row.review_version::text,
    'educator_signoff', decision, btrim(p_notes), actor::text), 'sha256'), 'hex');

  update public.project_z_skill_atlas_candidates
  set educator_review_status = decision,
      educator_reviewed_by = actor,
      educator_reviewed_at = now(),
      educator_review_notes = btrim(p_notes),
      review_status = case when decision = 'approved' then 'approved' else 'needs_revision' end,
      reviewed_by = actor,
      reviewed_at = now(),
      review_notes = btrim(p_notes),
      updated_at = now()
  where atlas_skill_code = p_atlas_skill_code;

  insert into private.project_z_curriculum_review_events (
    atlas_skill_code, review_version, review_stage, decision,
    source_code, source_locator, notes, reviewer_id, prior_state, evidence_digest
  ) values (
    p_atlas_skill_code, review_row.review_version, 'educator_signoff', decision,
    review_row.source_code, review_row.source_locator, btrim(p_notes), actor,
    jsonb_build_object('review_status', review_row.review_status,
      'educator_review_status', review_row.educator_review_status,
      'source_aligned_by', review_row.source_aligned_by),
    digest
  );

  insert into private.project_z_operator_audit (
    operator_id, action, decision, metadata
  ) values (
    actor, 'curriculum_educator_signoff', decision,
    jsonb_build_object('atlas_skill_code', p_atlas_skill_code,
      'review_version', review_row.review_version, 'evidence_digest', digest)
  );

  return jsonb_build_object('ok', true, 'atlas_skill_code', p_atlas_skill_code,
    'decision', decision, 'review_version', review_row.review_version,
    'evidence_digest', digest);
end;
$$;

revoke all on function public.project_z_curriculum_review_access() from public, anon, authenticated;
revoke all on function public.project_z_operator_curriculum_reviewer_roster() from public, anon, authenticated;
revoke all on function public.project_z_operator_register_curriculum_reviewer(uuid, text, text) from public, anon, authenticated;
revoke all on function public.project_z_operator_register_authorized_curriculum_source(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.project_z_operator_curriculum_review_queue(text, integer, integer) from public, anon, authenticated;
revoke all on function public.project_z_review_curriculum_source_alignment(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.project_z_review_curriculum_educator_signoff(text, text, text, text) from public, anon, authenticated;

grant execute on function public.project_z_curriculum_review_access() to authenticated, service_role;
grant execute on function public.project_z_operator_curriculum_reviewer_roster() to authenticated, service_role;
grant execute on function public.project_z_operator_register_curriculum_reviewer(uuid, text, text) to authenticated, service_role;
grant execute on function public.project_z_operator_register_authorized_curriculum_source(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.project_z_operator_curriculum_review_queue(text, integer, integer) to authenticated, service_role;
grant execute on function public.project_z_review_curriculum_source_alignment(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.project_z_review_curriculum_educator_signoff(text, text, text, text) to authenticated, service_role;

select
  'Project Z Phase 58 curriculum review workbench applied' as status,
  (select count(*) from public.project_z_skill_atlas_candidates) as candidate_skills,
  (select count(*) from public.project_z_curriculum_sources where source_kind = 'authorized_subject_guide') as authorized_guides,
  (select count(*) from private.project_z_curriculum_reviewers where active) as active_reviewer_roles,
  now() as applied_at;
