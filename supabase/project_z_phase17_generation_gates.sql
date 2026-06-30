-- Project Z Phase 17 AI Question Generation with Quality Gates
create extension if not exists pgcrypto;

create table if not exists public.project_z_question_generation_candidates (
  id uuid primary key default gen_random_uuid(),
  generator_id uuid references public.project_z_profiles(id) on delete set null,
  source text not null default 'phase17_generation_lab',
  course_code text not null references public.project_z_course_catalog(course_code) on delete cascade,
  course_skill_code text not null references public.project_z_curriculum_skills(course_skill_code) on delete cascade,
  assessment_criterion text,
  question_type text not null default 'multiple_choice',
  difficulty_band integer not null default 1 check (difficulty_band between 1 and 5),
  prompt text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A','B','C','D')),
  explanation text not null,
  quality_score numeric not null default 0,
  flags jsonb not null default '{}'::jsonb,
  gate_status text not null default 'needs_review' check (gate_status in ('passed','needs_review','blocked','promoted')),
  teacher_notes text,
  promoted_question_id uuid references public.project_z_diagnostic_question_bank(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_z_question_generation_candidates enable row level security;

drop policy if exists generation_candidates_teacher_select on public.project_z_question_generation_candidates;
create policy generation_candidates_teacher_select
on public.project_z_question_generation_candidates
for select
to authenticated
using (exists (select 1 from public.project_z_profiles p where p.id = auth.uid() and p.role = 'teacher'));

create or replace function public.project_z_generation_teacher_allowed()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.project_z_profiles p where p.id = auth.uid() and p.role = 'teacher');
$$;

create or replace function public.project_z_score_generated_question(
  p_assessment_criterion text,
  p_question_type text,
  p_prompt text,
  p_option_a text,
  p_option_b text,
  p_option_c text,
  p_option_d text,
  p_correct_option text,
  p_explanation text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with b as (
    select
      upper(trim(coalesce(p_correct_option,''))) as correct_option,
      coalesce(p_assessment_criterion,'') as criterion,
      coalesce(p_question_type,'') as qtype,
      coalesce(p_prompt,'') as prompt,
      coalesce(p_explanation,'') as explanation,
      array[coalesce(p_option_a,''),coalesce(p_option_b,''),coalesce(p_option_c,''),coalesce(p_option_d,'')] as opts,
      case upper(trim(coalesce(p_correct_option,'')))
        when 'A' then coalesce(p_option_a,'')
        when 'B' then coalesce(p_option_b,'')
        when 'C' then coalesce(p_option_c,'')
        when 'D' then coalesce(p_option_d,'')
        else ''
      end as correct_text,
      case upper(trim(coalesce(p_correct_option,'')))
        when 'A' then array[coalesce(p_option_b,''),coalesce(p_option_c,''),coalesce(p_option_d,'')]
        when 'B' then array[coalesce(p_option_a,''),coalesce(p_option_c,''),coalesce(p_option_d,'')]
        when 'C' then array[coalesce(p_option_a,''),coalesce(p_option_b,''),coalesce(p_option_d,'')]
        when 'D' then array[coalesce(p_option_a,''),coalesce(p_option_b,''),coalesce(p_option_c,'')]
        else array[coalesce(p_option_a,''),coalesce(p_option_b,''),coalesce(p_option_c,'')]
      end as wrongs
  ), a as (
    select b.*,
      (select count(distinct lower(trim(x))) from unnest(b.opts) x)::integer as distinct_count,
      (select count(*) from unnest(b.opts) x where trim(x)='')::integer as empty_count,
      char_length(trim(b.prompt))::integer as prompt_len,
      char_length(trim(b.explanation))::integer as explanation_len,
      char_length(trim(b.correct_text))::integer as correct_len,
      (select coalesce(avg(char_length(trim(w)))::numeric,0) from unnest(b.wrongs) w) as avg_wrong_len
    from b
  ), f as (
    select a.*,
      distinct_count < 4 as duplicate_options,
      empty_count > 0 as empty_options,
      correct_option not in ('A','B','C','D') as invalid_correct,
      prompt_len < 25 as prompt_too_short,
      explanation_len < 25 as explanation_too_short,
      (avg_wrong_len > 0 and (correct_len::numeric > avg_wrong_len * 1.85 or correct_len::numeric < avg_wrong_len * 0.45)) as length_outlier,
      (criterion in ('B','C','D') and qtype = 'multiple_choice') as bcd_too_plain
    from a
  ), s as (
    select f.*,
      greatest(0, 100
        - case when duplicate_options then 35 else 0 end
        - case when empty_options then 40 else 0 end
        - case when invalid_correct then 50 else 0 end
        - case when prompt_too_short then 12 else 0 end
        - case when explanation_too_short then 12 else 0 end
        - case when length_outlier then 15 else 0 end
        - case when bcd_too_plain then 12 else 0 end
      )::numeric as score
    from f
  )
  select jsonb_build_object(
    'quality_score', round(score,2),
    'gate_status', case when invalid_correct or empty_options or duplicate_options then 'blocked' when score >= 85 then 'passed' when score >= 65 then 'needs_review' else 'blocked' end,
    'flags', jsonb_build_object(
      'duplicate_or_repeated_options', duplicate_options,
      'empty_option_present', empty_options,
      'invalid_correct_option', invalid_correct,
      'prompt_too_short', prompt_too_short,
      'explanation_too_short', explanation_too_short,
      'correct_option_length_outlier', length_outlier,
      'criterion_bcd_too_plain', bcd_too_plain,
      'correct_option_position', correct_option
    )
  ) from s;
$$;

create or replace function public.project_z_stage_generated_question(
  p_course_code text,
  p_course_skill_code text,
  p_assessment_criterion text,
  p_question_type text,
  p_difficulty_band integer,
  p_prompt text,
  p_option_a text,
  p_option_b text,
  p_option_c text,
  p_option_d text,
  p_correct_option text,
  p_explanation text,
  p_source text default 'phase17_generation_lab'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  score_result jsonb;
  candidate_id uuid;
begin
  if not public.project_z_generation_teacher_allowed() then raise exception 'Only teachers can stage generated questions'; end if;
  if not exists (select 1 from public.project_z_curriculum_skills sk where sk.course_code=p_course_code and sk.course_skill_code=p_course_skill_code) then raise exception 'Skill does not belong to selected course'; end if;

  score_result := public.project_z_score_generated_question(p_assessment_criterion,p_question_type,p_prompt,p_option_a,p_option_b,p_option_c,p_option_d,p_correct_option,p_explanation);

  insert into public.project_z_question_generation_candidates(
    generator_id, source, course_code, course_skill_code, assessment_criterion, question_type, difficulty_band,
    prompt, option_a, option_b, option_c, option_d, correct_option, explanation, quality_score, flags, gate_status
  ) values (
    auth.uid(), coalesce(p_source,'phase17_generation_lab'), p_course_code, p_course_skill_code, p_assessment_criterion, coalesce(nullif(p_question_type,''),'multiple_choice'), greatest(1,least(coalesce(p_difficulty_band,1),5)),
    p_prompt, p_option_a, p_option_b, p_option_c, p_option_d, upper(trim(p_correct_option)), p_explanation,
    (score_result->>'quality_score')::numeric, score_result->'flags', score_result->>'gate_status'
  ) returning id into candidate_id;

  return jsonb_build_object('ok',true,'candidate_id',candidate_id,'quality_score',(score_result->>'quality_score')::numeric,'gate_status',score_result->>'gate_status','flags',score_result->'flags');
end;
$$;

create or replace function public.project_z_generation_candidates(p_course_code text default null)
returns table(
  id uuid, source text, course_code text, course_skill_code text, assessment_criterion text, question_type text,
  difficulty_band integer, prompt text, option_a text, option_b text, option_c text, option_d text,
  correct_option text, explanation text, quality_score numeric, flags jsonb, gate_status text,
  teacher_notes text, promoted_question_id uuid, created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, source, course_code, course_skill_code, assessment_criterion, question_type, difficulty_band,
         prompt, option_a, option_b, option_c, option_d, correct_option, explanation,
         quality_score, flags, gate_status, teacher_notes, promoted_question_id, created_at
  from public.project_z_question_generation_candidates
  where public.project_z_generation_teacher_allowed() and (p_course_code is null or course_code=p_course_code)
  order by created_at desc
  limit 100;
$$;

create or replace function public.project_z_promote_generated_question(p_candidate_id uuid, p_teacher_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.project_z_question_generation_candidates;
  new_question_id uuid;
begin
  if not public.project_z_generation_teacher_allowed() then raise exception 'Only teachers can promote generated questions'; end if;
  select * into c from public.project_z_question_generation_candidates where id=p_candidate_id;
  if c.id is null then raise exception 'Candidate not found'; end if;
  if c.gate_status = 'blocked' then raise exception 'Blocked questions cannot be promoted'; end if;
  if c.quality_score < 85 then raise exception 'Quality score is below promotion threshold of 85'; end if;

  insert into public.project_z_diagnostic_question_bank(course_skill_code,course_code,assessment_criterion,question_type,difficulty_band,prompt,option_a,option_b,option_c,option_d,correct_option,explanation,verified)
  values(c.course_skill_code,c.course_code,c.assessment_criterion,c.question_type,c.difficulty_band,c.prompt,c.option_a,c.option_b,c.option_c,c.option_d,c.correct_option,c.explanation,true)
  returning id into new_question_id;

  update public.project_z_question_generation_candidates set gate_status='promoted', promoted_question_id=new_question_id, teacher_notes=p_teacher_notes, updated_at=now() where id=p_candidate_id;

  insert into public.project_z_question_quality_reviews(question_id,reviewer_id,status,quality_score,flags,notes,created_at,updated_at)
  values(new_question_id,auth.uid(),'approved',c.quality_score,c.flags,coalesce(p_teacher_notes,'Promoted from Phase 17 generation workflow.'),now(),now());

  return jsonb_build_object('ok',true,'candidate_id',p_candidate_id,'promoted_question_id',new_question_id);
end;
$$;

create or replace function public.project_z_reject_generated_question(p_candidate_id uuid, p_teacher_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.project_z_generation_teacher_allowed() then raise exception 'Only teachers can reject generated questions'; end if;
  update public.project_z_question_generation_candidates set gate_status='blocked', teacher_notes=p_teacher_notes, updated_at=now() where id=p_candidate_id;
  return jsonb_build_object('ok',true,'candidate_id',p_candidate_id);
end;
$$;

grant execute on function public.project_z_generation_teacher_allowed() to authenticated;
grant execute on function public.project_z_score_generated_question(text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.project_z_stage_generated_question(text,text,text,text,integer,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.project_z_generation_candidates(text) to authenticated;
grant execute on function public.project_z_promote_generated_question(uuid,text) to authenticated;
grant execute on function public.project_z_reject_generated_question(uuid,text) to authenticated;

select 'Project Z Phase 17 AI question generation with quality gates schema applied successfully' as status, now() as applied_at;

