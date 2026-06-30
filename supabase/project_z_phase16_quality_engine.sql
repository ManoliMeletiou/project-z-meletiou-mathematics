-- Project Z Phase 16 Accuracy and Question Quality Engine
-- Safe to run after Phase 15C.

create extension if not exists pgcrypto;

create table if not exists public.project_z_question_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.project_z_diagnostic_question_bank(id) on delete cascade,
  reviewer_id uuid references public.project_z_profiles(id) on delete set null,
  status text not null default 'needs_review' check (status in ('approved', 'needs_review', 'revise', 'rejected')),
  quality_score numeric not null default 0,
  flags jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_z_question_quality_reviews enable row level security;

drop policy if exists "question_quality_reviews_teacher_select" on public.project_z_question_quality_reviews;
create policy "question_quality_reviews_teacher_select"
on public.project_z_question_quality_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.project_z_profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
  )
  or reviewer_id = auth.uid()
);

create or replace function public.project_z_quality_teacher_allowed()
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() is null
    or exists (
      select 1
      from public.project_z_profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    );
$$;

create or replace function public.project_z_question_quality_items(
  p_course_code text default null
)
returns table (
  question_id uuid,
  course_code text,
  course_skill_code text,
  assessment_criterion text,
  question_type text,
  difficulty_band integer,
  prompt text,
  correct_option text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  distinct_option_count integer,
  empty_option_count integer,
  correct_length integer,
  average_wrong_length numeric,
  quality_score numeric,
  flags jsonb,
  review_status text,
  review_notes text
)
language sql
security definer
set search_path = public
as $$
  with permitted as (
    select public.project_z_quality_teacher_allowed() as ok
  ),
  base as (
    select
      q.id as question_id,
      q.course_code,
      q.course_skill_code,
      q.assessment_criterion,
      q.question_type,
      q.difficulty_band,
      q.prompt,
      q.correct_option,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      case q.correct_option
        when 'A' then q.option_a
        when 'B' then q.option_b
        when 'C' then q.option_c
        when 'D' then q.option_d
      end as correct_text,
      case q.correct_option
        when 'A' then array[q.option_b, q.option_c, q.option_d]
        when 'B' then array[q.option_a, q.option_c, q.option_d]
        when 'C' then array[q.option_a, q.option_b, q.option_d]
        when 'D' then array[q.option_a, q.option_b, q.option_c]
      end as wrong_options
    from public.project_z_diagnostic_question_bank q
    cross join permitted p
    where p.ok = true
      and (p_course_code is null or q.course_code = p_course_code)
  ),
  analysed as (
    select
      b.*,
      opt_stats.distinct_option_count,
      opt_stats.empty_option_count,
      char_length(coalesce(b.correct_text, ''))::integer as correct_length,
      wrong_stats.average_wrong_length
    from base b
    cross join lateral (
      select
        count(distinct lower(trim(coalesce(option_text, ''))))::integer as distinct_option_count,
        count(*) filter (where trim(coalesce(option_text, '')) = '')::integer as empty_option_count
      from unnest(array[b.option_a, b.option_b, b.option_c, b.option_d]) as option_text
    ) opt_stats
    cross join lateral (
      select
        coalesce(round(avg(char_length(coalesce(wrong_text, '')))::numeric, 2), 0) as average_wrong_length
      from unnest(b.wrong_options) as wrong_text
    ) wrong_stats
  ),
  scored as (
    select
      a.*,
      greatest(
        0,
        100
        - case when a.distinct_option_count < 4 then 35 else 0 end
        - case when a.empty_option_count > 0 then 40 else 0 end
        - case
            when a.average_wrong_length > 0
             and (
               a.correct_length::numeric > a.average_wrong_length * 1.85
               or a.correct_length::numeric < a.average_wrong_length * 0.45
             )
            then 15
            else 0
          end
        - case when char_length(trim(coalesce(a.prompt, ''))) < 20 then 15 else 0 end
        - case when a.assessment_criterion in ('B','C','D') and a.question_type = 'multiple_choice' then 8 else 0 end
      )::numeric as quality_score,
      jsonb_build_object(
        'duplicate_or_repeated_options', a.distinct_option_count < 4,
        'empty_option_present', a.empty_option_count > 0,
        'correct_option_length_outlier',
          a.average_wrong_length > 0
          and (
            a.correct_length::numeric > a.average_wrong_length * 1.85
            or a.correct_length::numeric < a.average_wrong_length * 0.45
          ),
        'prompt_too_short', char_length(trim(coalesce(a.prompt, ''))) < 20,
        'criterion_bcd_should_use_structured_reasoning',
          a.assessment_criterion in ('B','C','D') and a.question_type = 'multiple_choice',
        'correct_option_position', a.correct_option
      ) as flags
    from analysed a
  ),
  latest_review as (
    select distinct on (r.question_id)
      r.question_id,
      r.status,
      r.notes
    from public.project_z_question_quality_reviews r
    order by r.question_id, r.updated_at desc
  )
  select
    s.question_id,
    s.course_code,
    s.course_skill_code,
    s.assessment_criterion,
    s.question_type,
    s.difficulty_band,
    s.prompt,
    s.correct_option,
    s.option_a,
    s.option_b,
    s.option_c,
    s.option_d,
    s.distinct_option_count,
    s.empty_option_count,
    s.correct_length,
    s.average_wrong_length,
    round(s.quality_score, 2) as quality_score,
    s.flags,
    coalesce(lr.status, case when s.quality_score >= 85 then 'approved' else 'needs_review' end) as review_status,
    lr.notes as review_notes
  from scored s
  left join latest_review lr on lr.question_id = s.question_id
  order by s.quality_score asc, s.course_code, s.assessment_criterion, s.difficulty_band;
$$;

-- The audit function above uses FILTER syntax. PostgreSQL requires the exact form below.
create or replace function public.project_z_question_quality_audit()
returns table (
  course_code text,
  total_questions integer,
  correct_a integer,
  correct_b integer,
  correct_c integer,
  correct_d integer,
  average_quality_score numeric,
  needs_review_count integer,
  duplicate_option_count integer,
  length_outlier_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    qi.course_code,
    count(*)::integer as total_questions,
    count(*) filter (where qi.correct_option = 'A')::integer as correct_a,
    count(*) filter (where qi.correct_option = 'B')::integer as correct_b,
    count(*) filter (where qi.correct_option = 'C')::integer as correct_c,
    count(*) filter (where qi.correct_option = 'D')::integer as correct_d,
    coalesce(round(avg(qi.quality_score), 2), 0) as average_quality_score,
    count(*) filter (where qi.quality_score < 85)::integer as needs_review_count,
    count(*) filter (where (qi.flags ->> 'duplicate_or_repeated_options')::boolean)::integer as duplicate_option_count,
    count(*) filter (where (qi.flags ->> 'correct_option_length_outlier')::boolean)::integer as length_outlier_count
  from public.project_z_question_quality_items(null) qi
  group by qi.course_code
  order by qi.course_code;
$$;

create or replace function public.project_z_shuffle_question_bank_options(
  p_course_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
  correct_text text;
  wrongs text[];
  shuffled_wrongs text[];
  choices text[] := array['A','B','C','D'];
  target text;
  new_a text;
  new_b text;
  new_c text;
  new_d text;
  updated_count integer := 0;
begin
  if not public.project_z_quality_teacher_allowed() then
    raise exception 'Only teachers can shuffle stored answer options';
  end if;

  for q in
    select *
    from public.project_z_diagnostic_question_bank
    where p_course_code is null or course_code = p_course_code
  loop
    correct_text := case q.correct_option
      when 'A' then q.option_a
      when 'B' then q.option_b
      when 'C' then q.option_c
      when 'D' then q.option_d
    end;

    wrongs := array[]::text[];

    if q.correct_option <> 'A' then wrongs := wrongs || q.option_a; end if;
    if q.correct_option <> 'B' then wrongs := wrongs || q.option_b; end if;
    if q.correct_option <> 'C' then wrongs := wrongs || q.option_c; end if;
    if q.correct_option <> 'D' then wrongs := wrongs || q.option_d; end if;

    select array_agg(w order by random())
    into shuffled_wrongs
    from unnest(wrongs) as w;

    target := choices[1 + floor(random() * 4)::integer];

    if target = 'A' then
      new_a := correct_text;
      new_b := shuffled_wrongs[1];
      new_c := shuffled_wrongs[2];
      new_d := shuffled_wrongs[3];
    elsif target = 'B' then
      new_a := shuffled_wrongs[1];
      new_b := correct_text;
      new_c := shuffled_wrongs[2];
      new_d := shuffled_wrongs[3];
    elsif target = 'C' then
      new_a := shuffled_wrongs[1];
      new_b := shuffled_wrongs[2];
      new_c := correct_text;
      new_d := shuffled_wrongs[3];
    else
      new_a := shuffled_wrongs[1];
      new_b := shuffled_wrongs[2];
      new_c := shuffled_wrongs[3];
      new_d := correct_text;
    end if;

    update public.project_z_diagnostic_question_bank
    set option_a = new_a,
        option_b = new_b,
        option_c = new_c,
        option_d = new_d,
        correct_option = target
    where id = q.id;

    updated_count := updated_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'updated_questions', updated_count,
    'message', 'Stored answer options were shuffled while preserving the correct answer mapping.'
  );
end;
$$;

create or replace function public.project_z_review_question_quality(
  p_question_id uuid,
  p_status text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  if not public.project_z_quality_teacher_allowed() then
    raise exception 'Only teachers can review question quality';
  end if;

  if p_status not in ('approved', 'needs_review', 'revise', 'rejected') then
    raise exception 'Invalid quality status';
  end if;

  select *
  into item
  from public.project_z_question_quality_items(null)
  where question_id = p_question_id
  limit 1;

  if item.question_id is null then
    raise exception 'Question not found';
  end if;

  insert into public.project_z_question_quality_reviews (
    question_id,
    reviewer_id,
    status,
    quality_score,
    flags,
    notes,
    created_at,
    updated_at
  )
  values (
    p_question_id,
    auth.uid(),
    p_status,
    item.quality_score,
    item.flags,
    p_notes,
    now(),
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'question_id', p_question_id,
    'status', p_status,
    'quality_score', item.quality_score
  );
end;
$$;

grant execute on function public.project_z_quality_teacher_allowed() to authenticated;
grant execute on function public.project_z_question_quality_items(text) to authenticated;
grant execute on function public.project_z_question_quality_audit() to authenticated;
grant execute on function public.project_z_shuffle_question_bank_options(text) to authenticated;
grant execute on function public.project_z_review_question_quality(uuid, text, text) to authenticated;

-- Run once from SQL Editor to fix the old "correct answer always A" stored-question problem.
select public.project_z_shuffle_question_bank_options(null) as shuffle_result;

select
  'Project Z Phase 16 accuracy and question quality engine schema applied successfully' as status,
  now() as applied_at;

