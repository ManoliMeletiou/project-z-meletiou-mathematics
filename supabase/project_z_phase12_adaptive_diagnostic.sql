-- Project Z Phase 12 Adaptive Diagnostic Engine
-- Safe to run more than once after Phase 11B.

create extension if not exists pgcrypto;

create table if not exists public.project_z_diagnostic_question_bank (
  id uuid primary key default gen_random_uuid(),
  course_skill_code text not null references public.project_z_curriculum_skills(course_skill_code) on delete cascade,
  course_code text not null references public.project_z_course_catalog(course_code) on delete cascade,
  assessment_criterion text,
  question_type text not null default 'multiple_choice',
  difficulty_band integer not null default 1 check (difficulty_band between 1 and 5),
  prompt text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation text not null,
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.project_z_diagnostic_question_bank enable row level security;

drop policy if exists "diagnostic_question_bank_select_authenticated" on public.project_z_diagnostic_question_bank;
create policy "diagnostic_question_bank_select_authenticated"
on public.project_z_diagnostic_question_bank
for select
to authenticated
using (verified = true);

alter table public.project_z_diagnostic_evidence
add column if not exists diagnostic_question_id uuid references public.project_z_diagnostic_question_bank(id) on delete set null;

alter table public.project_z_diagnostic_evidence
add column if not exists selected_option text;

alter table public.project_z_diagnostic_evidence
add column if not exists correct_option text;

alter table public.project_z_diagnostic_evidence
add column if not exists question_prompt text;

insert into public.project_z_diagnostic_question_bank (
  course_skill_code, course_code, assessment_criterion, question_type, difficulty_band,
  prompt, option_a, option_b, option_c, option_d, correct_option, explanation, verified
)
values
  ('myp_standard.integer_operations.A', 'myp_standard', 'A', 'multiple_choice', 1,
   'Calculate: -6 + 14 - 3.',
   '5', '-23', '11', '-5', 'A',
   'The calculation is -6 + 14 = 8, and 8 - 3 = 5.', true),

  ('myp_standard.integer_operations.A', 'myp_standard', 'A', 'multiple_choice', 1,
   'Calculate: 4 - 3 × 5.',
   '-11', '5', '-15', '20', 'A',
   'Multiplication is completed first: 3 × 5 = 15, so 4 - 15 = -11.', true),

  ('myp_standard.fractions_percentages.A', 'myp_standard', 'A', 'multiple_choice', 1,
   'Which value is equivalent to 35%?',
   '0.35', '3.5', '0.035', '35.0', 'A',
   '35% means 35 out of 100, which is 0.35.', true),

  ('myp_standard.fractions_percentages.A', 'myp_standard', 'A', 'multiple_choice', 1,
   'A price increases from 80 to 100. What is the percentage increase?',
   '25%', '20%', '80%', '125%', 'A',
   'The increase is 20. The percentage increase is 20/80 × 100 = 25%.', true),

  ('myp_standard.linear_equations.A', 'myp_standard', 'A', 'multiple_choice', 2,
   'Solve: 3x + 5 = 20.',
   'x = 5', 'x = 15', 'x = 25/3', 'x = 45', 'A',
   'Subtract 5 from both sides to get 3x = 15, then divide by 3, so x = 5.', true),

  ('myp_standard.linear_equations.A', 'myp_standard', 'A', 'multiple_choice', 2,
   'Solve: 2(x - 4) = 18.',
   'x = 13', 'x = 5', 'x = 7', 'x = 22', 'A',
   'Divide by 2 to get x - 4 = 9, then add 4, so x = 13.', true),

  ('myp_standard.sequences_patterns.B', 'myp_standard', 'B', 'explanation_choice', 2,
   'A sequence is 4, 7, 10, 13, ... Which explanation best identifies and justifies the rule?',
   'The sequence increases by 3 each time, so the nth term is 3n + 1 because n = 1 gives 4 and each next term adds 3.',
   'The sequence is odd because the numbers go up and they are close together.',
   'The rule is n + 3 because the sequence increases by 3.',
   'The rule is 4n because the first term is 4.',
   'A',
   'The best answer identifies the common difference, gives a general rule, and checks the rule.', true),

  ('myp_standard.mathematical_communication.C', 'myp_standard', 'C', 'rubric_choice', 2,
   'A student solves an equation. Which explanation communicates the mathematics most clearly?',
   'Subtract 5 from both sides: 3x = 15. Divide both sides by 3: x = 5. Therefore the solution is x = 5.',
   'Move the 5 and then divide, answer 5.',
   '3x + 5 = 20, so x is 5 because it works.',
   'Take away and divide and you get x.',
   'A',
   'The best communication uses correct terminology, notation, structure, and a clear conclusion.', true),

  ('myp_standard.real_life_interpretation.D', 'myp_standard', 'D', 'error_analysis', 2,
   'A taxi costs €4 plus €2 per kilometre. A trip costs €18. Which interpretation is best?',
   'The distance is 7 km because 18 - 4 = 14 and 14 ÷ 2 = 7. This makes sense because the fixed charge is removed before dividing by the rate.',
   'The distance is 9 km because 18 ÷ 2 = 9.',
   'The trip is 7 because you subtract and divide, but the context does not matter.',
   'The answer is €7 because the taxi costs money.',
   'A',
   'Criterion D requires interpreting the calculation in context and justifying why the method is reasonable.', true),

  ('myp_extended.surds_indices.A', 'myp_extended', 'A', 'multiple_choice', 3,
   'Simplify: √50.',
   '5√2', '25√2', '2√5', '10√5', 'A',
   '√50 = √(25 × 2) = 5√2.', true),

  ('myp_extended.quadratics.A', 'myp_extended', 'A', 'multiple_choice', 3,
   'Factorise: x² + 7x + 12.',
   '(x + 3)(x + 4)', '(x + 6)(x + 2)', '(x - 3)(x - 4)', '(x + 12)(x + 1)', 'A',
   'The numbers 3 and 4 multiply to 12 and add to 7.', true),

  ('myp_extended.pattern_proof.B', 'myp_extended', 'B', 'explanation_choice', 4,
   'Which is the strongest justification for why the sum of two even numbers is always even?',
   'Let the even numbers be 2a and 2b. Their sum is 2a + 2b = 2(a + b), which is divisible by 2, so it is even.',
   'It is true because 2 + 4 = 6 and 8 + 10 = 18.',
   'Even numbers end in 0, 2, 4, 6, or 8, so the answer looks even.',
   'Adding even numbers usually gives an even number.',
   'A',
   'The strongest answer uses algebraic generalisation and proof-style reasoning.', true),

  ('myp_extended.precise_communication.C', 'myp_extended', 'C', 'rubric_choice', 4,
   'Which explanation communicates the factorisation most precisely?',
   'To factorise x² + 7x + 12, find two numbers with product 12 and sum 7: 3 and 4. Therefore x² + 7x + 12 = (x + 3)(x + 4).',
   'You put 3 and 4 in brackets because they work.',
   'The answer is brackets with x because it is a quadratic.',
   'x² + 7x + 12 is equal to x + 3 and x + 4.',
   'A',
   'The correct response uses precise terminology, notation, and logical structure.', true),

  ('myp_extended.modelling_reflection.D', 'myp_extended', 'D', 'rubric_choice', 4,
   'A model predicts student revision time from test score. Which reflection is strongest?',
   'The model may be useful for estimating trends, but it should not be used as the only explanation because factors such as prior knowledge, sleep, and test difficulty may also affect scores.',
   'The model is correct because it gives a line.',
   'The model is wrong because students are different.',
   'The answer is useful but there are many numbers.',
   'A',
   'The best reflection interprets the model, recognises limitations, and explains why context matters.', true),

  ('dp_aa_standard.functions.A', 'dp_aa_standard', null, 'multiple_choice', 3,
   'If f(x) = 2x + 3, find f(5).',
   '13', '10', '8', '25', 'A',
   'Substitute x = 5: f(5) = 2(5) + 3 = 13.', true),

  ('dp_aa_standard.differentiation.A', 'dp_aa_standard', null, 'multiple_choice', 3,
   'Differentiate f(x) = x² + 3x.',
   'f''(x) = 2x + 3', 'f''(x) = x + 3', 'f''(x) = 2x² + 3', 'f''(x) = 3x²', 'A',
   'Use the power rule: derivative of x² is 2x and derivative of 3x is 3.', true),

  ('dp_ai_standard.modelling.A', 'dp_ai_standard', null, 'modelling_choice', 3,
   'A scatter plot shows a roughly linear positive relationship. Which model choice is most appropriate first?',
   'A linear regression model, then check residuals and context to decide whether the fit is reasonable.',
   'A quadratic model because all data can be curved.',
   'No model because scatter plots cannot be modelled.',
   'An exponential model because the values increase.',
   'A',
   'The best first model matches the visible trend and includes checking fit and context.', true),

  ('dp_ai_standard.statistics.A', 'dp_ai_standard', null, 'multiple_choice', 3,
   'Which measure is most affected by an extreme outlier?',
   'Mean', 'Median', 'Mode', 'Interquartile range', 'A',
   'The mean uses every value, so it is usually most affected by an extreme outlier.', true),

  ('dp_aa_higher.advanced_functions.A', 'dp_aa_higher', null, 'multiple_choice', 4,
   'If f has an inverse, what must be true about f on its domain?',
   'It must be one-to-one.', 'It must be quadratic.', 'It must pass through the origin.', 'It must have a maximum point.', 'A',
   'A function has an inverse function on a domain when it is one-to-one on that domain.', true),

  ('dp_aa_higher.advanced_calculus.A', 'dp_aa_higher', null, 'multiple_choice', 5,
   'Which statement best describes a point of inflection?',
   'A point where concavity changes sign.', 'A point where y = 0.', 'A point where the gradient must be zero.', 'A maximum or minimum point only.', 'A',
   'A point of inflection is associated with a change in concavity.', true),

  ('dp_ai_higher.advanced_modelling.A', 'dp_ai_higher', null, 'modelling_choice', 4,
   'In a modelling task, why should assumptions be stated clearly?',
   'They define the limits of the model and help judge whether conclusions are reasonable in context.',
   'They make the answer longer.',
   'They replace the need for calculations.',
   'They prove the model is always correct.',
   'A',
   'Assumptions are essential for interpreting and evaluating a model.', true),

  ('dp_ai_higher.advanced_statistics.A', 'dp_ai_higher', null, 'multiple_choice', 4,
   'What does a small p-value generally suggest?',
   'The observed result would be unlikely under the null hypothesis.', 'The null hypothesis is definitely true.', 'The sample size is too small.', 'The data has no variation.', 'A',
   'A small p-value indicates the result is unlikely if the null hypothesis is assumed true.', true)
on conflict do nothing;

create or replace function public.project_z_start_diagnostic(
  p_course_code text
)
returns public.project_z_diagnostic_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  course_row public.project_z_course_catalog;
  session_row public.project_z_diagnostic_sessions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if caller_role <> 'student' then
    raise exception 'Only student accounts can start their own diagnostic';
  end if;

  select * into course_row
  from public.project_z_course_catalog
  where course_code = p_course_code
    and is_selectable = true;

  if course_row.course_code is null then
    raise exception 'Invalid course selection';
  end if;

  insert into public.project_z_student_course_selection (
    user_id,
    course_code,
    selected_at,
    updated_at
  )
  values (
    auth.uid(),
    p_course_code,
    now(),
    now()
  )
  on conflict (user_id) do update
  set course_code = excluded.course_code,
      updated_at = now();

  select *
  into session_row
  from public.project_z_diagnostic_sessions
  where user_id = auth.uid()
    and course_code = p_course_code
    and status = 'active'
  order by created_at desc
  limit 1;

  if session_row.id is not null then
    return session_row;
  end if;

  insert into public.project_z_diagnostic_sessions (
    user_id,
    course_code,
    status,
    evidence_goal_per_skill,
    minimum_skills_to_sample,
    max_questions
  )
  values (
    auth.uid(),
    p_course_code,
    'active',
    4,
    8,
    45
  )
  returning * into session_row;

  return session_row;
end;
$$;

create or replace function public.project_z_diagnostic_next_question(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.project_z_diagnostic_sessions;
  total_evidence integer;
  eligible_under_goal integer;
  skill_row public.project_z_curriculum_skills;
  question_row public.project_z_diagnostic_question_bank;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into session_row
  from public.project_z_diagnostic_sessions
  where id = p_session_id
    and user_id = auth.uid();

  if session_row.id is null then
    raise exception 'Diagnostic session not found';
  end if;

  if session_row.status <> 'active' then
    return jsonb_build_object(
      'done', true,
      'status', session_row.status,
      'message', 'Diagnostic is not active.'
    );
  end if;

  select count(*)::integer
  into total_evidence
  from public.project_z_diagnostic_evidence
  where session_id = p_session_id;

  if total_evidence >= session_row.max_questions then
    update public.project_z_diagnostic_sessions
    set status = 'completed',
        completed_at = now(),
        conclusion_summary = 'Diagnostic completed because the maximum number of questions was reached.'
    where id = p_session_id;

    return jsonb_build_object(
      'done', true,
      'status', 'completed',
      'message', 'Diagnostic completed. Maximum question count reached.'
    );
  end if;

  select count(*)::integer
  into eligible_under_goal
  from (
    select sk.course_skill_code
    from public.project_z_curriculum_skills sk
    left join public.project_z_diagnostic_evidence ev
      on ev.course_skill_code = sk.course_skill_code
     and ev.session_id = p_session_id
    where sk.course_code = session_row.course_code
      and sk.diagnostic_enabled = true
    group by sk.course_skill_code
    having count(ev.id) < session_row.evidence_goal_per_skill
  ) pending;

  if eligible_under_goal = 0 and total_evidence >= session_row.minimum_skills_to_sample then
    update public.project_z_diagnostic_sessions
    set status = 'completed',
        completed_at = now(),
        conclusion_summary = 'Diagnostic completed because enough evidence was collected across the selected curriculum.'
    where id = p_session_id;

    return jsonb_build_object(
      'done', true,
      'status', 'completed',
      'message', 'Diagnostic completed. Enough evidence has been collected.'
    );
  end if;

  select sk.*
  into skill_row
  from public.project_z_curriculum_skills sk
  left join public.project_z_diagnostic_evidence ev
    on ev.course_skill_code = sk.course_skill_code
   and ev.session_id = p_session_id
  where sk.course_code = session_row.course_code
    and sk.diagnostic_enabled = true
  group by sk.course_skill_code
  having count(ev.id) < session_row.evidence_goal_per_skill
  order by count(ev.id) asc, sk.difficulty_band asc, random()
  limit 1;

  if skill_row.course_skill_code is null then
    return jsonb_build_object(
      'done', true,
      'status', 'completed',
      'message', 'No diagnostic skill is available.'
    );
  end if;

  select q.*
  into question_row
  from public.project_z_diagnostic_question_bank q
  where q.course_skill_code = skill_row.course_skill_code
    and q.verified = true
    and not exists (
      select 1
      from public.project_z_diagnostic_evidence ev
      where ev.session_id = p_session_id
        and ev.diagnostic_question_id = q.id
    )
  order by random()
  limit 1;

  if question_row.id is null then
    select q.*
    into question_row
    from public.project_z_diagnostic_question_bank q
    where q.course_skill_code = skill_row.course_skill_code
      and q.verified = true
    order by random()
    limit 1;
  end if;

  if question_row.id is null then
    return jsonb_build_object(
      'done', true,
      'status', 'blocked',
      'message', 'No verified question exists yet for this skill.'
    );
  end if;

  return jsonb_build_object(
    'done', false,
    'session_id', p_session_id,
    'question_id', question_row.id,
    'course_skill_code', question_row.course_skill_code,
    'skill_title', skill_row.title,
    'skill_description', skill_row.description,
    'assessment_criterion', question_row.assessment_criterion,
    'question_type', question_row.question_type,
    'difficulty_band', question_row.difficulty_band,
    'prompt', question_row.prompt,
    'options', jsonb_build_object(
      'A', question_row.option_a,
      'B', question_row.option_b,
      'C', question_row.option_c,
      'D', question_row.option_d
    ),
    'question_number', total_evidence + 1,
    'max_questions', session_row.max_questions
  );
end;
$$;

create or replace function public.project_z_submit_diagnostic_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_selected_option text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.project_z_diagnostic_sessions;
  question_row public.project_z_diagnostic_question_bank;
  correct boolean;
  skill_max numeric;
  total_evidence integer;
  total_correct integer;
  accuracy numeric;
  confidence numeric;
  mastery numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into session_row
  from public.project_z_diagnostic_sessions
  where id = p_session_id
    and user_id = auth.uid()
    and status = 'active';

  if session_row.id is null then
    raise exception 'Active diagnostic session not found';
  end if;

  select *
  into question_row
  from public.project_z_diagnostic_question_bank
  where id = p_question_id
    and verified = true;

  if question_row.id is null then
    raise exception 'Question not found';
  end if;

  if question_row.course_code <> session_row.course_code then
    raise exception 'Question does not belong to this diagnostic course';
  end if;

  correct := upper(trim(p_selected_option)) = question_row.correct_option;

  insert into public.project_z_diagnostic_evidence (
    session_id,
    user_id,
    course_skill_code,
    diagnostic_question_id,
    assessment_criterion,
    difficulty_band,
    is_correct,
    score,
    evidence_strength,
    response_summary,
    selected_option,
    correct_option,
    question_prompt
  )
  values (
    p_session_id,
    auth.uid(),
    question_row.course_skill_code,
    question_row.id,
    question_row.assessment_criterion,
    question_row.difficulty_band,
    correct,
    case when correct then 1 else 0 end,
    1,
    case when correct then 'Correct diagnostic response' else 'Incorrect diagnostic response' end,
    upper(trim(p_selected_option)),
    question_row.correct_option,
    question_row.prompt
  );

  select
    count(*)::integer,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer
  into total_evidence, total_correct
  from public.project_z_diagnostic_evidence
  where user_id = auth.uid()
    and course_skill_code = question_row.course_skill_code;

  select max_mastery_percent
  into skill_max
  from public.project_z_curriculum_skills
  where course_skill_code = question_row.course_skill_code;

  accuracy := case when total_evidence = 0 then 0 else total_correct::numeric / total_evidence::numeric end;
  confidence := least(100, round((total_evidence::numeric / 8.0) * 100, 2));
  mastery := least(
    coalesce(skill_max, 96),
    round((accuracy * 100) * (0.35 + 0.65 * least(1, total_evidence::numeric / 8.0)), 2)
  );

  insert into public.project_z_curriculum_mastery (
    user_id,
    course_skill_code,
    evidence_count,
    correct_count,
    mastery_percent,
    confidence_percent,
    last_practised_at,
    next_review_at,
    updated_at
  )
  values (
    auth.uid(),
    question_row.course_skill_code,
    total_evidence,
    total_correct,
    mastery,
    confidence,
    now(),
    now() + interval '2 days',
    now()
  )
  on conflict (user_id, course_skill_code) do update
  set evidence_count = excluded.evidence_count,
      correct_count = excluded.correct_count,
      mastery_percent = excluded.mastery_percent,
      confidence_percent = excluded.confidence_percent,
      last_practised_at = excluded.last_practised_at,
      next_review_at = excluded.next_review_at,
      updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'correct', correct,
    'selected_option', upper(trim(p_selected_option)),
    'correct_option', question_row.correct_option,
    'explanation', question_row.explanation,
    'course_skill_code', question_row.course_skill_code,
    'mastery_percent', mastery,
    'confidence_percent', confidence,
    'evidence_count', total_evidence,
    'correct_count', total_correct
  );
end;
$$;

create or replace function public.project_z_my_diagnostic_summary()
returns table (
  course_skill_code text,
  title text,
  assessment_criterion text,
  evidence_count integer,
  correct_count integer,
  mastery_percent numeric,
  confidence_percent numeric,
  strength_band text,
  next_step text
)
language sql
security definer
set search_path = public
as $$
  select
    sk.course_skill_code,
    sk.title,
    sk.assessment_criterion,
    coalesce(m.evidence_count, 0) as evidence_count,
    coalesce(m.correct_count, 0) as correct_count,
    coalesce(m.mastery_percent, 0) as mastery_percent,
    coalesce(m.confidence_percent, 0) as confidence_percent,
    case
      when coalesce(m.evidence_count, 0) < 3 then 'Not enough evidence'
      when coalesce(m.mastery_percent, 0) >= 75 then 'Strong'
      when coalesce(m.mastery_percent, 0) >= 45 then 'Developing'
      else 'Weak'
    end as strength_band,
    case
      when coalesce(m.evidence_count, 0) < 3 then 'Answer more diagnostic questions for a stronger conclusion.'
      when coalesce(m.mastery_percent, 0) >= 75 then 'Maintain with spaced review and mixed questions.'
      when coalesce(m.mastery_percent, 0) >= 45 then 'Practise targeted questions and review mistakes.'
      else 'Start recommended practice on this skill and revisit prerequisites.'
    end as next_step
  from public.project_z_curriculum_skills sk
  join public.project_z_student_course_selection sel
    on sel.course_code = sk.course_code
   and sel.user_id = auth.uid()
  left join public.project_z_curriculum_mastery m
    on m.course_skill_code = sk.course_skill_code
   and m.user_id = auth.uid()
  where sk.diagnostic_enabled = true
  order by
    coalesce(m.mastery_percent, 0) asc,
    coalesce(m.evidence_count, 0) asc,
    sk.sort_order;
$$;

grant execute on function public.project_z_start_diagnostic(text) to authenticated;
grant execute on function public.project_z_diagnostic_next_question(uuid) to authenticated;
grant execute on function public.project_z_submit_diagnostic_answer(uuid, uuid, text) to authenticated;
grant execute on function public.project_z_my_diagnostic_summary() to authenticated;

select
  'Project Z Phase 12 adaptive diagnostic engine schema applied successfully' as status,
  now() as applied_at;

