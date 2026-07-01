-- Project Z Phase 30 Assignment Quality Audit and Regeneration
-- Run after the app build/push succeeds.
-- Purpose: audit generated assignments and regenerate weak questions before assigning.

create extension if not exists pgcrypto;

create table if not exists public.project_z_assignment_quality_audits (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.project_z_profiles(id) on delete set null,
  assignment_id uuid references public.project_z_generated_assignments(id) on delete cascade,
  question_id uuid references public.project_z_generated_assignment_questions(id) on delete set null,
  audit_type text not null default 'teacher_review'
    check (audit_type in ('automatic_check', 'teacher_review', 'regeneration', 'bulk_regeneration')),
  audit_status text not null default 'flagged'
    check (audit_status in ('passed', 'flagged', 'regenerated', 'approved', 'ignored')),
  issue_codes jsonb not null default '[]'::jsonb,
  notes text,
  before_question jsonb,
  after_question jsonb,
  created_at timestamptz not null default now()
);

alter table public.project_z_assignment_quality_audits enable row level security;

drop policy if exists "assignment_quality_audits_teacher_select" on public.project_z_assignment_quality_audits;
create policy "assignment_quality_audits_teacher_select"
on public.project_z_assignment_quality_audits
for select
to authenticated
using (
  teacher_id = auth.uid()
);

drop policy if exists "assignment_quality_audits_teacher_insert" on public.project_z_assignment_quality_audits;
create policy "assignment_quality_audits_teacher_insert"
on public.project_z_assignment_quality_audits
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.project_z_generated_assignments a
    where a.id = assignment_id
      and a.teacher_id = auth.uid()
  )
);

create or replace function public.project_z_log_assignment_quality_audit(
  p_assignment_id uuid,
  p_question_id uuid default null,
  p_audit_type text default 'teacher_review',
  p_audit_status text default 'flagged',
  p_issue_codes jsonb default '[]'::jsonb,
  p_notes text default null,
  p_before_question jsonb default null,
  p_after_question jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  allowed boolean := false;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_audit_type not in ('automatic_check', 'teacher_review', 'regeneration', 'bulk_regeneration') then
    raise exception 'Invalid audit type';
  end if;

  if p_audit_status not in ('passed', 'flagged', 'regenerated', 'approved', 'ignored') then
    raise exception 'Invalid audit status';
  end if;

  select role
  into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if coalesce(caller_role, '') <> 'teacher' then
    raise exception 'Only teachers can log assignment quality audits';
  end if;

  select exists (
    select 1
    from public.project_z_generated_assignments a
    where a.id = p_assignment_id
      and a.teacher_id = auth.uid()
  )
  into allowed;

  if not allowed then
    raise exception 'You can only audit your own generated assignments';
  end if;

  insert into public.project_z_assignment_quality_audits (
    teacher_id,
    assignment_id,
    question_id,
    audit_type,
    audit_status,
    issue_codes,
    notes,
    before_question,
    after_question,
    created_at
  )
  values (
    auth.uid(),
    p_assignment_id,
    p_question_id,
    p_audit_type,
    p_audit_status,
    coalesce(p_issue_codes, '[]'::jsonb),
    p_notes,
    p_before_question,
    p_after_question,
    now()
  )
  returning id into new_id;

  return jsonb_build_object(
    'ok', true,
    'id', new_id,
    'assignment_id', p_assignment_id,
    'question_id', p_question_id,
    'audit_status', p_audit_status
  );
end;
$$;

create or replace function public.project_z_assignment_quality_audit_logs(
  p_assignment_id uuid
)
returns table (
  audit_id uuid,
  assignment_id uuid,
  question_id uuid,
  audit_type text,
  audit_status text,
  issue_codes jsonb,
  notes text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.id as audit_id,
    l.assignment_id,
    l.question_id,
    l.audit_type,
    l.audit_status,
    l.issue_codes,
    l.notes,
    l.created_at
  from public.project_z_assignment_quality_audits l
  join public.project_z_generated_assignments a
    on a.id = l.assignment_id
  where l.assignment_id = p_assignment_id
    and a.teacher_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  order by l.created_at desc
  limit 200;
$$;

create or replace function public.project_z_assignment_quality_audit_summary()
returns table (
  assignment_id uuid,
  assignment_title text,
  question_count integer,
  audit_count integer,
  flagged_count integer,
  regenerated_count integer,
  approved_count integer,
  latest_audit_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id as assignment_id,
    a.assignment_title,
    a.question_count,
    count(l.id)::integer as audit_count,
    count(l.id) filter (where l.audit_status = 'flagged')::integer as flagged_count,
    count(l.id) filter (where l.audit_status = 'regenerated')::integer as regenerated_count,
    count(l.id) filter (where l.audit_status = 'approved')::integer as approved_count,
    max(l.created_at) as latest_audit_at
  from public.project_z_generated_assignments a
  left join public.project_z_assignment_quality_audits l
    on l.assignment_id = a.id
  where a.teacher_id = auth.uid()
    and exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  group by a.id, a.assignment_title, a.question_count
  order by a.created_at desc;
$$;

create or replace function public.project_z_assignment_quality_audit_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-30-assignment-quality-audit-regeneration',
    'audit_generated_assignments', true,
    'regenerate_single_question', true,
    'same_skill_same_criterion_same_difficulty', true,
    'minimum_questions_preserved', 30,
    'teacher_only', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_log_assignment_quality_audit(uuid, uuid, text, text, jsonb, text, jsonb, jsonb) to authenticated;
grant execute on function public.project_z_assignment_quality_audit_logs(uuid) to authenticated;
grant execute on function public.project_z_assignment_quality_audit_summary() to authenticated;
grant execute on function public.project_z_assignment_quality_audit_status() to authenticated;

select
  'Project Z Phase 30 assignment quality audit and regeneration schema applied successfully' as status,
  now() as applied_at;
