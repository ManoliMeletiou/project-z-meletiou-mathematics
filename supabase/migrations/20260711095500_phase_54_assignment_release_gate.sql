-- Project Z Phase 54: controlled assignment release gate.
-- Prevents answer leakage and requires a database-run structural audit plus
-- explicit teacher approval before an assignment can be published.

drop policy if exists "generated_assignments_teacher_select" on public.project_z_generated_assignments;
create policy "generated_assignments_teacher_select"
on public.project_z_generated_assignments
for select
to authenticated
using (
  teacher_id = auth.uid()
  or (
    status = 'assigned'
    and exists (
      select 1
      from public.project_z_class_members cm
      where cm.class_id = project_z_generated_assignments.class_id
        and cm.student_id = auth.uid()
    )
  )
);

-- Assignment mutations go through the audited SECURITY DEFINER functions below.
-- Do not allow a browser client to update status or quality_rules directly.
drop policy if exists "generated_assignments_teacher_update" on public.project_z_generated_assignments;

-- Correct answers and explanations are teacher-only at the table/RPC layer.
-- Students receive the sanitized projection from
-- project_z_student_generated_assignment_questions instead.
drop policy if exists "generated_assignment_questions_select" on public.project_z_generated_assignment_questions;
create policy "generated_assignment_questions_select"
on public.project_z_generated_assignment_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.project_z_generated_assignments a
    where a.id = assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "generated_assignments_teacher_delete_draft" on public.project_z_generated_assignments;
create policy "generated_assignments_teacher_delete_draft"
on public.project_z_generated_assignments
for delete
to authenticated
using (teacher_id = auth.uid() and status = 'draft');

create or replace function public.project_z_generated_assignment_questions(
  p_assignment_id uuid
)
returns table (
  question_id uuid,
  question_number integer,
  course_skill_code text,
  skill_title text,
  criterion text,
  difficulty_band text,
  question_type text,
  prompt text,
  options jsonb,
  correct_answer text,
  correct_option text,
  explanation text,
  quality_notes jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    q.id,
    q.question_number,
    q.course_skill_code,
    q.skill_title,
    q.criterion,
    q.difficulty_band,
    q.question_type,
    q.prompt,
    q.options,
    q.correct_answer,
    q.correct_option,
    q.explanation,
    q.quality_notes,
    q.created_at
  from public.project_z_generated_assignment_questions q
  join public.project_z_generated_assignments a on a.id = q.assignment_id
  where q.assignment_id = p_assignment_id
    and a.teacher_id = auth.uid()
    and exists (
      select 1 from public.project_z_profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  order by q.question_number;
$$;

create or replace function public.project_z_run_assignment_release_audit(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  assignment_row public.project_z_generated_assignments%rowtype;
  actual_question_count integer := 0;
  issue_codes jsonb := '[]'::jsonb;
  audit_status text;
  audit_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if coalesce(caller_role, '') <> 'teacher' then
    raise exception 'Only teachers can run assignment release audits';
  end if;

  select * into assignment_row
  from public.project_z_generated_assignments
  where id = p_assignment_id and teacher_id = auth.uid();

  if assignment_row.id is null then
    raise exception 'Assignment not found or not yours';
  end if;

  select count(*)::integer into actual_question_count
  from public.project_z_generated_assignment_questions
  where assignment_id = p_assignment_id;

  select coalesce(jsonb_agg(code order by code), '[]'::jsonb)
  into issue_codes
  from (
    select 'QUESTION_COUNT_BELOW_30'::text as code
    where actual_question_count < 30 or assignment_row.question_count < 30

    union all
    select 'QUESTION_COUNT_MISMATCH'
    where actual_question_count <> assignment_row.question_count

    union all
    select 'PROMPT_TOO_SHORT'
    where exists (
      select 1 from public.project_z_generated_assignment_questions q
      where q.assignment_id = p_assignment_id and length(trim(q.prompt)) < 18
    )

    union all
    select 'EXPLANATION_TOO_SHORT'
    where exists (
      select 1 from public.project_z_generated_assignment_questions q
      where q.assignment_id = p_assignment_id and length(trim(q.explanation)) < 20
    )

    union all
    select 'MISSING_ANSWER'
    where exists (
      select 1 from public.project_z_generated_assignment_questions q
      where q.assignment_id = p_assignment_id and length(trim(q.correct_answer)) = 0
    )

    union all
    select 'SKILL_LOCK_MISMATCH'
    where exists (
      select 1 from public.project_z_generated_assignment_questions q
      where q.assignment_id = p_assignment_id
        and (q.course_skill_code <> assignment_row.course_skill_code or q.skill_title <> assignment_row.skill_title)
    )

    union all
    select 'MCQ_INVALID'
    where exists (
      select 1
      from public.project_z_generated_assignment_questions q
      where q.assignment_id = p_assignment_id
        and q.question_type = 'multiple_choice'
        and (
          q.options is null
          or nullif(trim(q.options->>'A'), '') is null
          or nullif(trim(q.options->>'B'), '') is null
          or nullif(trim(q.options->>'C'), '') is null
          or nullif(trim(q.options->>'D'), '') is null
          or coalesce(q.correct_option, '') not in ('A', 'B', 'C', 'D')
          or (select count(distinct trim(value)) from jsonb_each_text(q.options)) < 4
        )
    )

    union all
    select 'DUPLICATE_PROMPT'
    where exists (
      select 1
      from public.project_z_generated_assignment_questions q
      where q.assignment_id = p_assignment_id
      group by lower(regexp_replace(trim(q.prompt), '[[:space:]]+', ' ', 'g'))
      having count(*) > 1
    )
  ) issues;

  audit_status := case when jsonb_array_length(issue_codes) = 0 then 'passed' else 'flagged' end;

  insert into public.project_z_assignment_quality_audits (
    teacher_id, assignment_id, question_id, audit_type, audit_status,
    issue_codes, notes, created_at
  ) values (
    auth.uid(), p_assignment_id, null, 'automatic_check', audit_status,
    issue_codes,
    case when audit_status = 'passed'
      then 'Database release audit passed.'
      else 'Database release audit found blocking structural issues.'
    end,
    now()
  ) returning id into audit_id;

  return jsonb_build_object(
    'ok', audit_status = 'passed',
    'audit_id', audit_id,
    'audit_status', audit_status,
    'issue_codes', issue_codes,
    'question_count', actual_question_count
  );
end;
$$;

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
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  if p_audit_type = 'automatic_check' then
    raise exception 'Use project_z_run_assignment_release_audit for automatic checks';
  end if;

  if p_audit_type not in ('teacher_review', 'regeneration', 'bulk_regeneration') then
    raise exception 'Invalid audit type';
  end if;

  if p_audit_status not in ('passed', 'flagged', 'regenerated', 'approved', 'ignored') then
    raise exception 'Invalid audit status';
  end if;

  select role into caller_role from public.project_z_profiles where id = auth.uid();
  if coalesce(caller_role, '') <> 'teacher' then
    raise exception 'Only teachers can log assignment quality audits';
  end if;

  select exists (
    select 1 from public.project_z_generated_assignments a
    where a.id = p_assignment_id and a.teacher_id = auth.uid()
  ) into allowed;
  if not allowed then raise exception 'You can only audit your own generated assignments'; end if;

  insert into public.project_z_assignment_quality_audits (
    teacher_id, assignment_id, question_id, audit_type, audit_status,
    issue_codes, notes, before_question, after_question, created_at
  ) values (
    auth.uid(), p_assignment_id, p_question_id, p_audit_type, p_audit_status,
    coalesce(p_issue_codes, '[]'::jsonb), p_notes, p_before_question, p_after_question, now()
  ) returning id into new_id;

  return jsonb_build_object('ok', true, 'id', new_id, 'assignment_id', p_assignment_id,
    'question_id', p_question_id, 'audit_status', p_audit_status);
end;
$$;

create or replace function public.project_z_generated_assignment_release_readiness(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_row public.project_z_generated_assignments%rowtype;
  actual_question_count integer := 0;
  unresolved_flags integer := 0;
  latest_content_change timestamptz;
  latest_automatic_pass timestamptz;
  latest_teacher_approval timestamptz;
  rights_status_confirmed boolean := false;
  ready boolean := false;
begin
  select * into assignment_row
  from public.project_z_generated_assignments
  where id = p_assignment_id and teacher_id = auth.uid();

  if assignment_row.id is null then raise exception 'Assignment not found or not yours'; end if;

  select count(*)::integer, greatest(
    assignment_row.created_at,
    coalesce(max(q.created_at), assignment_row.created_at),
    coalesce((
      select max(l.created_at)
      from public.project_z_assignment_quality_audits l
      where l.assignment_id = p_assignment_id
        and l.audit_type in ('regeneration', 'bulk_regeneration')
    ), assignment_row.created_at)
  )
  into actual_question_count, latest_content_change
  from public.project_z_generated_assignment_questions q
  where q.assignment_id = p_assignment_id;

  select count(*)::integer into unresolved_flags
  from public.project_z_assignment_quality_audits l
  where l.assignment_id = p_assignment_id
    and l.audit_status = 'flagged'
    and not exists (
      select 1 from public.project_z_assignment_quality_audits later_log
      where later_log.assignment_id = l.assignment_id
        and later_log.question_id is not distinct from l.question_id
        and later_log.created_at > l.created_at
        and later_log.audit_status in ('approved', 'regenerated', 'passed')
    );

  select max(created_at) into latest_automatic_pass
  from public.project_z_assignment_quality_audits
  where assignment_id = p_assignment_id and question_id is null
    and audit_type = 'automatic_check' and audit_status = 'passed';

  select max(created_at) into latest_teacher_approval
  from public.project_z_assignment_quality_audits
  where assignment_id = p_assignment_id and question_id is null
    and audit_type = 'teacher_review' and audit_status = 'approved';

  rights_status_confirmed := coalesce(assignment_row.quality_rules->>'rights_status', '') = 'teacher_confirmed';

  ready := actual_question_count >= 30
    and assignment_row.question_count >= 30
    and unresolved_flags = 0
    and latest_automatic_pass is not null
    and coalesce(latest_automatic_pass >= latest_content_change, false)
    and latest_teacher_approval is not null
    and coalesce(latest_teacher_approval >= latest_automatic_pass, false)
    and rights_status_confirmed;

  return jsonb_build_object(
    'ready', ready,
    'assignment_id', p_assignment_id,
    'question_count_ok', actual_question_count >= 30 and assignment_row.question_count >= 30,
    'actual_question_count', actual_question_count,
    'unresolved_flags', unresolved_flags,
    'automatic_audit_current', latest_automatic_pass is not null and coalesce(latest_automatic_pass >= latest_content_change, false),
    'teacher_approval_current', latest_teacher_approval is not null and coalesce(latest_teacher_approval >= latest_automatic_pass, false),
    'rights_status_confirmed', rights_status_confirmed,
    'latest_content_change', latest_content_change,
    'latest_automatic_pass', latest_automatic_pass,
    'latest_teacher_approval', latest_teacher_approval
  );
end;
$$;

create or replace function public.project_z_approve_generated_assignment_release(
  p_assignment_id uuid,
  p_originality_and_rights_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  readiness jsonb;
  approval_id uuid;
begin
  if not coalesce(p_originality_and_rights_confirmed, false) then
    raise exception 'Confirm the originality and content-rights review before approval';
  end if;

  readiness := public.project_z_generated_assignment_release_readiness(p_assignment_id);

  if not coalesce((readiness->>'question_count_ok')::boolean, false)
    or not coalesce((readiness->>'automatic_audit_current')::boolean, false)
    or coalesce((readiness->>'unresolved_flags')::integer, 0) > 0 then
    raise exception 'Run and pass the current release audit before teacher approval';
  end if;

  update public.project_z_generated_assignments
  set status = 'reviewed',
      quality_rules = coalesce(quality_rules, '{}'::jsonb) || jsonb_build_object(
        'content_origin', 'ai_generated_original',
        'rights_status', 'teacher_confirmed',
        'rights_confirmed_by', auth.uid(),
        'rights_confirmed_at', now()
      ),
      updated_at = now()
  where id = p_assignment_id and teacher_id = auth.uid();
  if not found then raise exception 'Assignment not found or not yours'; end if;

  insert into public.project_z_assignment_quality_audits (
    teacher_id, assignment_id, question_id, audit_type, audit_status,
    issue_codes, notes, created_at
  ) values (
    auth.uid(), p_assignment_id, null, 'teacher_review', 'approved', '[]'::jsonb,
    'Teacher approved the current audited version and confirmed originality/content-rights review.', now()
  ) returning id into approval_id;

  return jsonb_build_object('ok', true, 'assignment_id', p_assignment_id,
    'approval_id', approval_id, 'status', 'reviewed', 'rights_status', 'teacher_confirmed');
end;
$$;

create or replace function public.project_z_mark_generated_assignment_status(
  p_assignment_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('draft', 'reviewed', 'archived') then
    if p_status = 'assigned' then
      raise exception 'Use the controlled publish action to assign work';
    end if;
    raise exception 'Invalid generated assignment status';
  end if;

  update public.project_z_generated_assignments
  set status = p_status, updated_at = now()
  where id = p_assignment_id and teacher_id = auth.uid();
  if not found then raise exception 'Assignment not found or not yours'; end if;

  return jsonb_build_object('ok', true, 'assignment_id', p_assignment_id, 'status', p_status);
end;
$$;

create or replace function public.project_z_guard_assigned_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'assigned'
    and old.status is distinct from 'assigned'
    and coalesce(current_setting('project_z.controlled_publish', true), '') <> 'allowed' then
    raise exception 'Assignments may become assigned only through the controlled publish function';
  end if;
  return new;
end;
$$;

drop trigger if exists project_z_guard_assigned_transition on public.project_z_generated_assignments;
create trigger project_z_guard_assigned_transition
before update of status on public.project_z_generated_assignments
for each row execute function public.project_z_guard_assigned_transition();

create or replace function public.project_z_publish_generated_assignment(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  readiness jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  if not exists (
    select 1 from public.project_z_profiles p
    where p.id = auth.uid() and p.role = 'teacher'
  ) then raise exception 'Only teachers can publish generated assignments'; end if;

  readiness := public.project_z_generated_assignment_release_readiness(p_assignment_id);
  if not coalesce((readiness->>'ready')::boolean, false) then
    raise exception 'Assignment release gate is incomplete: %', readiness::text;
  end if;

  perform set_config('project_z.controlled_publish', 'allowed', true);

  update public.project_z_generated_assignments
  set status = 'assigned', updated_at = now()
  where id = p_assignment_id and teacher_id = auth.uid();
  if not found then raise exception 'Assignment not found or not yours'; end if;

  return jsonb_build_object('ok', true, 'assignment_id', p_assignment_id,
    'status', 'assigned', 'readiness', readiness,
    'message', 'Verified assignment published to students in the class');
end;
$$;

revoke all on function public.project_z_run_assignment_release_audit(uuid) from public, anon;
revoke all on function public.project_z_generated_assignment_release_readiness(uuid) from public, anon;
grant execute on function public.project_z_run_assignment_release_audit(uuid) to authenticated;
grant execute on function public.project_z_generated_assignment_release_readiness(uuid) to authenticated;
revoke all on function public.project_z_approve_generated_assignment_release(uuid, boolean) from public, anon;
grant execute on function public.project_z_approve_generated_assignment_release(uuid, boolean) to authenticated;
revoke all on function public.project_z_guard_assigned_transition() from public, anon, authenticated;
