-- Project Z Phase 11 Curriculum, Criteria, Skill Graph, and Course Selection
-- Safe to run more than once after Phase 10.

create extension if not exists pgcrypto;

create table if not exists public.project_z_course_catalog (
  course_code text primary key,
  program text not null check (program in ('MYP', 'DP')),
  level_name text not null,
  track_name text,
  display_name text not null,
  parent_course_code text references public.project_z_course_catalog(course_code) on delete set null,
  is_gateway boolean not null default false,
  is_selectable boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_z_curriculum_strands (
  strand_code text primary key,
  course_code text not null references public.project_z_course_catalog(course_code) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_z_curriculum_skills (
  course_skill_code text primary key,
  course_code text not null references public.project_z_course_catalog(course_code) on delete cascade,
  strand_code text not null references public.project_z_curriculum_strands(strand_code) on delete cascade,
  assessment_criterion text,
  title text not null,
  description text not null,
  prerequisite_skill_codes text[] not null default '{}',
  diagnostic_enabled boolean not null default true,
  practice_enabled boolean not null default true,
  game_path_enabled boolean not null default true,
  difficulty_band integer not null default 1 check (difficulty_band between 1 and 5),
  target_mastery_percent numeric not null default 85,
  max_mastery_percent numeric not null default 96,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_z_question_blueprints (
  id uuid primary key default gen_random_uuid(),
  course_skill_code text not null references public.project_z_curriculum_skills(course_skill_code) on delete cascade,
  course_code text not null references public.project_z_course_catalog(course_code) on delete cascade,
  assessment_criterion text,
  question_type text not null,
  auto_mark_strategy text not null,
  difficulty_band integer not null default 1 check (difficulty_band between 1 and 5),
  prompt_purpose text not null,
  correct_option_requirements text not null,
  distractor_requirements text not null,
  verification_notes text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.project_z_student_course_selection (
  user_id uuid primary key references public.project_z_profiles(id) on delete cascade,
  course_code text not null references public.project_z_course_catalog(course_code) on delete restrict,
  selected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_z_curriculum_mastery (
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  course_skill_code text not null references public.project_z_curriculum_skills(course_skill_code) on delete cascade,
  evidence_count integer not null default 0,
  correct_count integer not null default 0,
  mastery_percent numeric not null default 0,
  confidence_percent numeric not null default 0,
  last_practised_at timestamptz,
  next_review_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_skill_code)
);

create table if not exists public.project_z_diagnostic_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  course_code text not null references public.project_z_course_catalog(course_code) on delete restrict,
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  evidence_goal_per_skill integer not null default 4,
  minimum_skills_to_sample integer not null default 8,
  max_questions integer not null default 45,
  conclusion_summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.project_z_diagnostic_evidence (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.project_z_diagnostic_sessions(id) on delete cascade,
  user_id uuid not null references public.project_z_profiles(id) on delete cascade,
  course_skill_code text not null references public.project_z_curriculum_skills(course_skill_code) on delete cascade,
  question_blueprint_id uuid references public.project_z_question_blueprints(id) on delete set null,
  assessment_criterion text,
  difficulty_band integer not null default 1,
  is_correct boolean,
  score numeric,
  evidence_strength numeric not null default 1,
  response_summary text,
  created_at timestamptz not null default now()
);

alter table public.project_z_course_catalog enable row level security;
alter table public.project_z_curriculum_strands enable row level security;
alter table public.project_z_curriculum_skills enable row level security;
alter table public.project_z_question_blueprints enable row level security;
alter table public.project_z_student_course_selection enable row level security;
alter table public.project_z_curriculum_mastery enable row level security;
alter table public.project_z_diagnostic_sessions enable row level security;
alter table public.project_z_diagnostic_evidence enable row level security;

drop policy if exists "course_catalog_select_authenticated" on public.project_z_course_catalog;
create policy "course_catalog_select_authenticated"
on public.project_z_course_catalog
for select
to authenticated
using (true);

drop policy if exists "curriculum_strands_select_authenticated" on public.project_z_curriculum_strands;
create policy "curriculum_strands_select_authenticated"
on public.project_z_curriculum_strands
for select
to authenticated
using (true);

drop policy if exists "curriculum_skills_select_authenticated" on public.project_z_curriculum_skills;
create policy "curriculum_skills_select_authenticated"
on public.project_z_curriculum_skills
for select
to authenticated
using (true);

drop policy if exists "question_blueprints_select_authenticated" on public.project_z_question_blueprints;
create policy "question_blueprints_select_authenticated"
on public.project_z_question_blueprints
for select
to authenticated
using (true);

drop policy if exists "student_course_selection_select_own" on public.project_z_student_course_selection;
create policy "student_course_selection_select_own"
on public.project_z_student_course_selection
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "curriculum_mastery_select_own" on public.project_z_curriculum_mastery;
create policy "curriculum_mastery_select_own"
on public.project_z_curriculum_mastery
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_z_class_members cm
    join public.project_z_classes c on c.id = cm.class_id
    where cm.student_id = project_z_curriculum_mastery.user_id
      and c.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_z_parent_student_links l
    where l.parent_id = auth.uid()
      and l.student_id = project_z_curriculum_mastery.user_id
      and l.status = 'active'
  )
);

drop policy if exists "diagnostic_sessions_select_own_or_teacher_parent" on public.project_z_diagnostic_sessions;
create policy "diagnostic_sessions_select_own_or_teacher_parent"
on public.project_z_diagnostic_sessions
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_z_class_members cm
    join public.project_z_classes c on c.id = cm.class_id
    where cm.student_id = project_z_diagnostic_sessions.user_id
      and c.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_z_parent_student_links l
    where l.parent_id = auth.uid()
      and l.student_id = project_z_diagnostic_sessions.user_id
      and l.status = 'active'
  )
);

drop policy if exists "diagnostic_evidence_select_own_or_teacher_parent" on public.project_z_diagnostic_evidence;
create policy "diagnostic_evidence_select_own_or_teacher_parent"
on public.project_z_diagnostic_evidence
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_z_class_members cm
    join public.project_z_classes c on c.id = cm.class_id
    where cm.student_id = project_z_diagnostic_evidence.user_id
      and c.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_z_parent_student_links l
    where l.parent_id = auth.uid()
      and l.student_id = project_z_diagnostic_evidence.user_id
      and l.status = 'active'
  )
);

insert into public.project_z_course_catalog (
  course_code, program, level_name, track_name, display_name, parent_course_code, is_gateway, is_selectable, sort_order
)
values
  ('myp_standard', 'MYP', 'Standard', null, 'IB MYP Standard', null, false, true, 10),
  ('myp_extended', 'MYP', 'Extended', null, 'IB MYP Extended', null, false, true, 20),
  ('dp_standard', 'DP', 'Standard', null, 'IB DP Standard', null, true, false, 30),
  ('dp_aa_standard', 'DP', 'Standard', 'AA', 'IB DP AA Standard', 'dp_standard', false, true, 31),
  ('dp_ai_standard', 'DP', 'Standard', 'AI', 'IB DP AI Standard', 'dp_standard', false, true, 32),
  ('dp_higher', 'DP', 'Higher', null, 'IB DP Higher', null, true, false, 40),
  ('dp_aa_higher', 'DP', 'Higher', 'AA', 'IB DP AA Higher', 'dp_higher', false, true, 41),
  ('dp_ai_higher', 'DP', 'Higher', 'AI', 'IB DP AI Higher', 'dp_higher', false, true, 42)
on conflict (course_code) do update
set program = excluded.program,
    level_name = excluded.level_name,
    track_name = excluded.track_name,
    display_name = excluded.display_name,
    parent_course_code = excluded.parent_course_code,
    is_gateway = excluded.is_gateway,
    is_selectable = excluded.is_selectable,
    sort_order = excluded.sort_order;

insert into public.project_z_curriculum_strands (
  strand_code, course_code, title, description, sort_order
)
values
  ('myp_standard_number', 'myp_standard', 'Number', 'MYP Standard number skills.', 10),
  ('myp_standard_algebra', 'myp_standard', 'Algebra', 'MYP Standard algebra skills.', 20),
  ('myp_standard_geometry', 'myp_standard', 'Geometry and measure', 'MYP Standard geometry and measurement skills.', 30),
  ('myp_standard_statistics', 'myp_standard', 'Statistics and probability', 'MYP Standard statistics and probability skills.', 40),
  ('myp_standard_criterion_bcd', 'myp_standard', 'MYP Criteria B, C, and D reasoning', 'Structured auto-markable MYP reasoning, communication, and application skills.', 50),

  ('myp_extended_number', 'myp_extended', 'Number', 'MYP Extended number skills.', 10),
  ('myp_extended_algebra', 'myp_extended', 'Algebra', 'MYP Extended algebra skills.', 20),
  ('myp_extended_geometry', 'myp_extended', 'Geometry and measure', 'MYP Extended geometry and measurement skills.', 30),
  ('myp_extended_statistics', 'myp_extended', 'Statistics and probability', 'MYP Extended statistics and probability skills.', 40),
  ('myp_extended_criterion_bcd', 'myp_extended', 'MYP Criteria B, C, and D reasoning', 'Extended auto-markable MYP reasoning, communication, and application skills.', 50),

  ('dp_aa_standard_functions', 'dp_aa_standard', 'Functions and algebra', 'AA Standard functions and algebra.', 10),
  ('dp_aa_standard_calculus', 'dp_aa_standard', 'Calculus', 'AA Standard calculus foundations.', 20),
  ('dp_aa_standard_statistics', 'dp_aa_standard', 'Statistics and probability', 'AA Standard statistics and probability.', 30),

  ('dp_ai_standard_modelling', 'dp_ai_standard', 'Modelling and technology', 'AI Standard modelling and technology-focused mathematics.', 10),
  ('dp_ai_standard_statistics', 'dp_ai_standard', 'Statistics and probability', 'AI Standard statistics and probability.', 20),
  ('dp_ai_standard_calculus', 'dp_ai_standard', 'Calculus and change', 'AI Standard calculus and rates of change.', 30),

  ('dp_aa_higher_functions', 'dp_aa_higher', 'Advanced functions and algebra', 'AA Higher functions, proof, and algebra.', 10),
  ('dp_aa_higher_calculus', 'dp_aa_higher', 'Advanced calculus', 'AA Higher calculus and analysis.', 20),
  ('dp_aa_higher_statistics', 'dp_aa_higher', 'Statistics and probability', 'AA Higher statistics and probability.', 30),

  ('dp_ai_higher_modelling', 'dp_ai_higher', 'Advanced modelling and technology', 'AI Higher modelling, optimisation, and technology-focused mathematics.', 10),
  ('dp_ai_higher_statistics', 'dp_ai_higher', 'Advanced statistics and probability', 'AI Higher statistics and probability.', 20),
  ('dp_ai_higher_calculus', 'dp_ai_higher', 'Calculus and change', 'AI Higher calculus and rates of change.', 30)
on conflict (strand_code) do update
set course_code = excluded.course_code,
    title = excluded.title,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.project_z_curriculum_skills (
  course_skill_code, course_code, strand_code, assessment_criterion, title, description,
  prerequisite_skill_codes, diagnostic_enabled, practice_enabled, game_path_enabled,
  difficulty_band, target_mastery_percent, max_mastery_percent, sort_order
)
values
  ('myp_standard.integer_operations.A', 'myp_standard', 'myp_standard_number', 'A', 'Integer operations', 'Calculate accurately with directed numbers using correct order of operations.', '{}', true, true, true, 1, 85, 96, 10),
  ('myp_standard.fractions_percentages.A', 'myp_standard', 'myp_standard_number', 'A', 'Fractions, decimals, and percentages', 'Convert, compare, and calculate with fractions, decimals, and percentages.', '{}', true, true, true, 1, 85, 96, 20),
  ('myp_standard.linear_equations.A', 'myp_standard', 'myp_standard_algebra', 'A', 'Linear equations', 'Solve one-step and two-step linear equations accurately.', '{"myp_standard.integer_operations.A"}', true, true, true, 2, 85, 96, 30),
  ('myp_standard.sequences_patterns.B', 'myp_standard', 'myp_standard_criterion_bcd', 'B', 'Investigating patterns', 'Select the strongest pattern investigation, generalisation, and justification.', '{"myp_standard.linear_equations.A"}', true, true, true, 2, 85, 94, 40),
  ('myp_standard.mathematical_communication.C', 'myp_standard', 'myp_standard_criterion_bcd', 'C', 'Mathematical communication', 'Choose explanations using correct terminology, notation, units, and structure.', '{}', true, true, true, 2, 85, 94, 50),
  ('myp_standard.real_life_interpretation.D', 'myp_standard', 'myp_standard_criterion_bcd', 'D', 'Applying mathematics in real contexts', 'Choose the strongest interpretation, justification, and reflection for a real-life context.', '{}', true, true, true, 2, 85, 94, 60),

  ('myp_extended.surds_indices.A', 'myp_extended', 'myp_extended_number', 'A', 'Surds and indices', 'Simplify surds, use index laws, and rationalise simple denominators.', '{}', true, true, true, 3, 85, 96, 10),
  ('myp_extended.quadratics.A', 'myp_extended', 'myp_extended_algebra', 'A', 'Quadratic expressions and equations', 'Expand, factorise, solve, and interpret quadratic expressions and equations.', '{"myp_standard.linear_equations.A"}', true, true, true, 3, 85, 96, 20),
  ('myp_extended.simultaneous_equations.A', 'myp_extended', 'myp_extended_algebra', 'A', 'Simultaneous equations', 'Solve and interpret simultaneous linear equations algebraically and graphically.', '{"myp_standard.linear_equations.A"}', true, true, true, 3, 85, 96, 30),
  ('myp_extended.pattern_proof.B', 'myp_extended', 'myp_extended_criterion_bcd', 'B', 'Extended pattern proof', 'Select the strongest investigation and proof-style justification of a pattern.', '{"myp_extended.quadratics.A"}', true, true, true, 4, 85, 94, 40),
  ('myp_extended.precise_communication.C', 'myp_extended', 'myp_extended_criterion_bcd', 'C', 'Precise extended communication', 'Choose the strongest extended explanation using precise notation and terminology.', '{}', true, true, true, 4, 85, 94, 50),
  ('myp_extended.modelling_reflection.D', 'myp_extended', 'myp_extended_criterion_bcd', 'D', 'Extended modelling and reflection', 'Choose the strongest modelling decision, interpretation, limitation, and improvement.', '{}', true, true, true, 4, 85, 94, 60),

  ('dp_aa_standard.functions.A', 'dp_aa_standard', 'dp_aa_standard_functions', null, 'Functions and transformations', 'Understand function notation, domain, range, transformations, and graphs.', '{}', true, true, true, 3, 85, 96, 10),
  ('dp_aa_standard.differentiation.A', 'dp_aa_standard', 'dp_aa_standard_calculus', null, 'Differentiation foundations', 'Differentiate standard functions and interpret gradients and rates of change.', '{"dp_aa_standard.functions.A"}', true, true, true, 3, 85, 96, 20),
  ('dp_aa_standard.probability.A', 'dp_aa_standard', 'dp_aa_standard_statistics', null, 'Probability foundations', 'Use probability rules, tree diagrams, and conditional reasoning.', '{}', true, true, true, 3, 85, 96, 30),

  ('dp_ai_standard.modelling.A', 'dp_ai_standard', 'dp_ai_standard_modelling', null, 'Mathematical modelling', 'Build, interpret, and evaluate mathematical models in practical contexts.', '{}', true, true, true, 3, 85, 96, 10),
  ('dp_ai_standard.statistics.A', 'dp_ai_standard', 'dp_ai_standard_statistics', null, 'Statistical analysis', 'Analyse data, interpret summaries, and evaluate conclusions.', '{}', true, true, true, 3, 85, 96, 20),
  ('dp_ai_standard.rates_change.A', 'dp_ai_standard', 'dp_ai_standard_calculus', null, 'Rates of change', 'Use calculus ideas to model and interpret rates of change.', '{"dp_ai_standard.modelling.A"}', true, true, true, 3, 85, 96, 30),

  ('dp_aa_higher.advanced_functions.A', 'dp_aa_higher', 'dp_aa_higher_functions', null, 'Advanced functions', 'Work with advanced functions, transformations, inverse functions, and proof-style reasoning.', '{}', true, true, true, 4, 85, 96, 10),
  ('dp_aa_higher.advanced_calculus.A', 'dp_aa_higher', 'dp_aa_higher_calculus', null, 'Advanced calculus', 'Use advanced differentiation and integration techniques with interpretation.', '{"dp_aa_higher.advanced_functions.A"}', true, true, true, 5, 85, 96, 20),
  ('dp_aa_higher.distributions.A', 'dp_aa_higher', 'dp_aa_higher_statistics', null, 'Distributions and probability', 'Use distributions, probability models, and advanced statistical reasoning.', '{}', true, true, true, 4, 85, 96, 30),

  ('dp_ai_higher.advanced_modelling.A', 'dp_ai_higher', 'dp_ai_higher_modelling', null, 'Advanced modelling', 'Use advanced modelling, optimisation, and technology-based mathematical reasoning.', '{}', true, true, true, 4, 85, 96, 10),
  ('dp_ai_higher.advanced_statistics.A', 'dp_ai_higher', 'dp_ai_higher_statistics', null, 'Advanced statistics', 'Use advanced statistical methods and interpret evidence critically.', '{}', true, true, true, 4, 85, 96, 20),
  ('dp_ai_higher.calculus_models.A', 'dp_ai_higher', 'dp_ai_higher_calculus', null, 'Calculus for models', 'Apply calculus to model and interpret change in complex contexts.', '{"dp_ai_higher.advanced_modelling.A"}', true, true, true, 4, 85, 96, 30)
on conflict (course_skill_code) do update
set course_code = excluded.course_code,
    strand_code = excluded.strand_code,
    assessment_criterion = excluded.assessment_criterion,
    title = excluded.title,
    description = excluded.description,
    prerequisite_skill_codes = excluded.prerequisite_skill_codes,
    diagnostic_enabled = excluded.diagnostic_enabled,
    practice_enabled = excluded.practice_enabled,
    game_path_enabled = excluded.game_path_enabled,
    difficulty_band = excluded.difficulty_band,
    target_mastery_percent = excluded.target_mastery_percent,
    max_mastery_percent = excluded.max_mastery_percent,
    sort_order = excluded.sort_order;

insert into public.project_z_question_blueprints (
  course_skill_code, course_code, assessment_criterion, question_type, auto_mark_strategy,
  difficulty_band, prompt_purpose, correct_option_requirements, distractor_requirements,
  verification_notes, verified
)
values
  ('myp_standard.integer_operations.A', 'myp_standard', 'A', 'numeric_input', 'exact_or_equivalent_math_answer', 1,
   'Assess accurate calculation with directed numbers.',
   'Correct numerical answer with equivalent forms accepted where appropriate.',
   'Distractors should include common sign errors, order-of-operation errors, and arithmetic slips.',
   'Criterion A can use deterministic verification for numeric and algebraic answers.', true),

  ('myp_standard.sequences_patterns.B', 'myp_standard', 'B', 'explanation_choice', 'best_option_multiple_choice', 2,
   'Assess pattern recognition, generalisation, and justification.',
   'The correct option must identify the pattern, generalise it accurately, and justify the rule using mathematical reasoning.',
   'Distractors must be plausible student-like answers: partially correct pattern, correct rule without justification, incorrect generalisation, or weak evidence.',
   'All options should look realistic. The correct answer must not be obviously longer or more formal only because of formatting.', true),

  ('myp_standard.mathematical_communication.C', 'myp_standard', 'C', 'rubric_choice', 'best_option_multiple_choice', 2,
   'Assess mathematical communication.',
   'The correct option must use correct terminology, notation, units, structure, and explanation.',
   'Distractors must be plausible but weaker: vague terminology, missing units, unclear notation, poor structure, or incomplete reasoning.',
   'Criterion C questions should test communication quality, not just whether a final answer is correct.', true),

  ('myp_standard.real_life_interpretation.D', 'myp_standard', 'D', 'error_analysis', 'best_option_multiple_choice', 2,
   'Assess applying mathematics in a real-life context.',
   'The correct option must interpret the result in context, justify reasonableness, and include limitations or next steps where appropriate.',
   'Distractors must be plausible but weaker: answer without context, unrealistic conclusion, missing limitation, or unsupported claim.',
   'Criterion D questions should reward interpretation, reflection, and contextual judgement.', true),

  ('myp_extended.pattern_proof.B', 'myp_extended', 'B', 'ranking', 'best_option_multiple_choice', 4,
   'Assess stronger extended investigation and proof-style reasoning.',
   'The correct option must show a valid generalisation and a convincing mathematical justification.',
   'Distractors should include empirical-only pattern spotting, overgeneralisation, notation mistakes, and incomplete proof.',
   'Auto-marked through carefully designed option selection.', true),

  ('myp_extended.precise_communication.C', 'myp_extended', 'C', 'explanation_choice', 'best_option_multiple_choice', 4,
   'Assess precise extended mathematical communication.',
   'Correct option must use precise terminology, notation, layout, and logically sequenced explanation.',
   'Distractors should be plausible but contain imprecise notation, skipped steps, ambiguous definitions, or missing units.',
   'Options must be similarly realistic and not obviously different.', true),

  ('myp_extended.modelling_reflection.D', 'myp_extended', 'D', 'rubric_choice', 'best_option_multiple_choice', 4,
   'Assess extended application, modelling, limitations, and reflection.',
   'Correct option must choose a suitable model, interpret in context, evaluate limitations, and suggest improvement.',
   'Distractors should include reasonable but incomplete modelling decisions, weak interpretations, or superficial reflection.',
   'Auto-marking supports structured MYP D reasoning.', true),

  ('dp_aa_standard.functions.A', 'dp_aa_standard', null, 'algebraic_input', 'equivalent_algebraic_answer', 3,
   'Assess DP AA Standard function understanding.',
   'Correct answer must be algebraically equivalent and respect domain/range where relevant.',
   'Distractors should reflect common transformation and notation errors.',
   'DP questions use mathematical verification and later exam-style markschemes.', true),

  ('dp_ai_standard.modelling.A', 'dp_ai_standard', null, 'modelling_choice', 'best_option_multiple_choice', 3,
   'Assess DP AI Standard modelling choices.',
   'Correct option must select and justify an appropriate model for the context.',
   'Distractors should be plausible model choices with weaker fit, poor assumptions, or unsupported interpretation.',
   'Supports technology-focused modelling reasoning.', true)
on conflict do nothing;

create or replace function public.project_z_curriculum_courses()
returns table (
  course_code text,
  program text,
  level_name text,
  track_name text,
  display_name text,
  parent_course_code text,
  is_gateway boolean,
  is_selectable boolean,
  sort_order integer
)
language sql
security definer
set search_path = public
as $$
  select
    c.course_code,
    c.program,
    c.level_name,
    c.track_name,
    c.display_name,
    c.parent_course_code,
    c.is_gateway,
    c.is_selectable,
    c.sort_order
  from public.project_z_course_catalog c
  order by c.sort_order, c.display_name;
$$;

create or replace function public.project_z_select_student_course(
  p_course_code text
)
returns public.project_z_student_course_selection
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  course_row public.project_z_course_catalog;
  selected_row public.project_z_student_course_selection;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role
  from public.project_z_profiles
  where id = auth.uid();

  if caller_role <> 'student' then
    raise exception 'Only student accounts can select their own course';
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
set search_path = public
as $$
  select
    c.course_code,
    c.display_name,
    c.program,
    c.level_name,
    c.track_name,
    s.selected_at
  from public.project_z_student_course_selection s
  join public.project_z_course_catalog c on c.course_code = s.course_code
  where s.user_id = auth.uid();
$$;

create or replace function public.project_z_curriculum_skill_map(
  p_course_code text default null
)
returns table (
  course_skill_code text,
  course_code text,
  course_display_name text,
  strand_code text,
  strand_title text,
  assessment_criterion text,
  title text,
  description text,
  prerequisite_skill_codes text[],
  diagnostic_enabled boolean,
  practice_enabled boolean,
  game_path_enabled boolean,
  difficulty_band integer,
  target_mastery_percent numeric,
  max_mastery_percent numeric,
  mastery_percent numeric,
  confidence_percent numeric,
  evidence_count integer,
  correct_count integer,
  sort_order integer
)
language sql
security definer
set search_path = public
as $$
  with selected_course as (
    select coalesce(
      p_course_code,
      (select s.course_code from public.project_z_student_course_selection s where s.user_id = auth.uid()),
      'myp_standard'
    ) as course_code
  )
  select
    sk.course_skill_code,
    sk.course_code,
    c.display_name as course_display_name,
    st.strand_code,
    st.title as strand_title,
    sk.assessment_criterion,
    sk.title,
    sk.description,
    sk.prerequisite_skill_codes,
    sk.diagnostic_enabled,
    sk.practice_enabled,
    sk.game_path_enabled,
    sk.difficulty_band,
    sk.target_mastery_percent,
    sk.max_mastery_percent,
    coalesce(m.mastery_percent, 0) as mastery_percent,
    coalesce(m.confidence_percent, 0) as confidence_percent,
    coalesce(m.evidence_count, 0) as evidence_count,
    coalesce(m.correct_count, 0) as correct_count,
    sk.sort_order
  from selected_course sc
  join public.project_z_curriculum_skills sk on sk.course_code = sc.course_code
  join public.project_z_course_catalog c on c.course_code = sk.course_code
  join public.project_z_curriculum_strands st on st.strand_code = sk.strand_code
  left join public.project_z_curriculum_mastery m
    on m.course_skill_code = sk.course_skill_code
   and m.user_id = auth.uid()
  order by st.sort_order, sk.sort_order, sk.title;
$$;

grant execute on function public.project_z_curriculum_courses() to authenticated;
grant execute on function public.project_z_select_student_course(text) to authenticated;
grant execute on function public.project_z_my_selected_course() to authenticated;
grant execute on function public.project_z_curriculum_skill_map(text) to authenticated;

select
  'Project Z Phase 11 curriculum, criteria, skill graph, and course selection schema applied successfully' as status,
  now() as applied_at;

