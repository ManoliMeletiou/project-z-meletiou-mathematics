import { supabase } from './supabaseClient';

export type RecommendedSkill = {
  course_skill_code: string;
  course_code: string;
  course_display_name: string;
  strand_title: string;
  assessment_criterion: string | null;
  title: string;
  description: string;
  mastery_percent: number;
  confidence_percent: number;
  evidence_count: number;
  correct_count: number;
  priority_score: number;
  recommendation_reason: string;
  next_action: string;
};

export type PracticeSession = {
  id: string;
  user_id: string;
  course_code: string;
  course_skill_code: string;
  status: 'active' | 'completed' | 'paused';
  target_questions: number;
  created_at: string;
  completed_at: string | null;
};

export type PracticeQuestion = {
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
  target_questions?: number;
};

export type PracticeAnswerResult = {
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
  practice_attempts_for_skill: number;
};

export type LearningReport = {
  student_id: string;
  course_code: string | null;
  course_display_name: string | null;
  total_practice_attempts: number;
  total_diagnostic_attempts: number;
  average_mastery: number;
  average_confidence: number;
  weak_skill_count: number;
  developing_skill_count: number;
  strong_skill_count: number;
  next_steps: string;
};

export async function fetchRecommendedPractice() {
  if (!supabase) return [] as RecommendedSkill[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as RecommendedSkill[];

  const { data, error } = await supabase.rpc('project_z_recommended_practice');

  if (error) return [] as RecommendedSkill[];
  return (data || []) as RecommendedSkill[];
}

export async function startPracticeSkill(courseSkillCode: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_start_practice_skill', {
    p_course_skill_code: courseSkillCode
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: data as PracticeSession };
}

export async function fetchNextPracticeQuestion(sessionId: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data, error } = await supabase.rpc('project_z_practice_next_question', {
    p_session_id: sessionId
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: data as PracticeQuestion };
}

export async function submitPracticeAnswer(sessionId: string, questionId: string, selectedOption: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data, error } = await supabase.rpc('project_z_submit_practice_answer', {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_selected_option: selectedOption
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: data as PracticeAnswerResult };
}

export async function fetchLearningReport(studentId?: string) {
  if (!supabase) return null as LearningReport | null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null as LearningReport | null;

  const { data, error } = await supabase.rpc('project_z_student_learning_report', {
    p_student_id: studentId || null
  });

  if (error || !data || data.length === 0) return null as LearningReport | null;
  return data[0] as LearningReport;
}
