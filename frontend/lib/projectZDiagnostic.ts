import { supabase } from './supabaseClient';

export type DiagnosticSession = {
  id: string;
  user_id: string;
  course_code: string;
  status: 'active' | 'completed' | 'paused';
  evidence_goal_per_skill: number;
  minimum_skills_to_sample: number;
  max_questions: number;
  conclusion_summary: string | null;
  engine_version: string;
  completion_outcome: 'pending' | 'sufficient' | 'inconclusive';
  required_confidence_percent: number;
  first_mission_skill_code: string | null;
  pause_reason: string | null;
  paused_at: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type DiagnosticQuestion = {
  done: boolean;
  status?: string;
  message?: string;
  session_id?: string;
  delivery_id?: string;
  question_id?: string;
  course_skill_code?: string;
  skill_title?: string;
  skill_description?: string;
  assessment_criterion?: string | null;
  question_type?: string;
  difficulty_band?: number;
  prompt?: string;
  options?: Record<'A' | 'B' | 'C' | 'D', string>;
  question_number?: number;
  max_questions?: number;
};

export type DiagnosticAnswerResult = {
  ok: boolean;
  recorded: boolean;
  session_id: string;
  delivery_id: string;
  question_number: number;
  next_action: 'continue_diagnostic';
};

export type DiagnosticGameEntryState = {
  state:
    | 'student_role_required'
    | 'pathway_required'
    | 'setup_required'
    | 'tool_orientation_required'
    | 'awaiting_reviewed_release'
    | 'diagnostic_ready'
    | 'diagnostic_active'
    | 'diagnostic_paused'
    | 'diagnostic_inconclusive'
    | 'first_mission_ready'
    | 'diagnostic_required';
  course_code?: string;
  course_display_name?: string;
  cohort_specification?: string;
  language_code?: string;
  tool_orientation_completed?: boolean;
  pathway_release_ready?: boolean;
  diagnostic_calibration_status?: 'draft' | 'approved' | 'quarantined';
  diagnostic_release_ready?: boolean;
  diagnostic_required: true;
  session_id?: string;
  session_status?: 'active' | 'completed' | 'paused';
  completion_outcome?: 'pending' | 'sufficient' | 'inconclusive';
  first_mission_skill_code?: string;
  first_mission_title?: string;
  main_game_unlocked: boolean;
  blockers?: string[];
};

export type DiagnosticPrologueSetup = {
  courseCode: string;
  cohortSpecification: 'myp_current_framework' | 'first_assessment_2021' | 'first_assessment_2029';
  languageCode: string;
  extraTimeMultiplier: 1 | 1.25 | 1.5 | 2;
  screenReader: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  inputMode: 'keyboard' | 'touch' | 'mixed';
  toolOrientationCompleted: boolean;
};

export type DiagnosticSummaryRow = {
  course_skill_code: string;
  title: string;
  assessment_criterion: string | null;
  evidence_count: number;
  correct_count: number;
  mastery_percent: number;
  confidence_percent: number;
  strength_band: string;
  next_step: string;
};

export async function startDiagnostic(courseCode: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_start_diagnostic', {
    p_course_code: courseCode
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: data as DiagnosticSession };
}

export async function fetchDiagnosticGameEntryState() {
  if (!supabase) return null as DiagnosticGameEntryState | null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null as DiagnosticGameEntryState | null;

  const { data, error } = await supabase.rpc('project_z_my_game_entry_state');
  if (error || !data) return null as DiagnosticGameEntryState | null;
  return data as DiagnosticGameEntryState;
}

export async function prepareDiagnosticPrologue(setup: DiagnosticPrologueSetup) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_prepare_diagnostic_prologue', {
    p_course_code: setup.courseCode,
    p_cohort_specification: setup.cohortSpecification,
    p_language_code: setup.languageCode,
    p_extra_time_multiplier: setup.extraTimeMultiplier,
    p_screen_reader: setup.screenReader,
    p_reduced_motion: setup.reducedMotion,
    p_large_text: setup.largeText,
    p_input_mode: setup.inputMode,
    p_tool_orientation_completed: setup.toolOrientationCompleted
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: data as DiagnosticGameEntryState };
}

export async function setDiagnosticSessionState(sessionId: string, requestedState: 'active' | 'paused') {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data, error } = await supabase.rpc('project_z_set_diagnostic_session_state', {
    p_session_id: sessionId,
    p_requested_state: requestedState
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: data as DiagnosticSession };
}

export async function fetchNextDiagnosticQuestion(sessionId: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data, error } = await supabase.rpc('project_z_diagnostic_next_question', {
    p_session_id: sessionId
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: data as DiagnosticQuestion };
}

export async function submitDiagnosticAnswer(sessionId: string, questionId: string, selectedOption: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data, error } = await supabase.rpc('project_z_submit_diagnostic_answer', {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_selected_option: selectedOption
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: data as DiagnosticAnswerResult };
}

export async function fetchDiagnosticSummary() {
  if (!supabase) return [] as DiagnosticSummaryRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as DiagnosticSummaryRow[];

  const { data, error } = await supabase.rpc('project_z_my_diagnostic_summary');

  if (error) return [] as DiagnosticSummaryRow[];
  return (data || []) as DiagnosticSummaryRow[];
}
