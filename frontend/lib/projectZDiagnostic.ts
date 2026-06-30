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
  created_at: string;
  completed_at: string | null;
};

export type DiagnosticQuestion = {
  done: boolean;
  status?: string;
  message?: string;
  session_id?: string;
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
  correct: boolean;
  selected_option: string;
  correct_option: string;
  explanation: string;
  course_skill_code: string;
  mastery_percent: number;
  confidence_percent: number;
  evidence_count: number;
  correct_count: number;
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
