import { supabase } from './supabaseClient';

export type QualityAuditRow = {
  course_code: string;
  total_questions: number;
  correct_a: number;
  correct_b: number;
  correct_c: number;
  correct_d: number;
  average_quality_score: number;
  needs_review_count: number;
  duplicate_option_count: number;
  length_outlier_count: number;
};

export type QualityItem = {
  question_id: string;
  course_code: string;
  course_skill_code: string;
  assessment_criterion: string | null;
  question_type: string;
  difficulty_band: number;
  prompt: string;
  correct_option: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  distinct_option_count: number;
  empty_option_count: number;
  correct_length: number;
  average_wrong_length: number;
  quality_score: number;
  flags: Record<string, boolean | string>;
  review_status: string;
  review_notes: string | null;
};

export async function fetchQuestionQualityAudit() {
  if (!supabase) return [] as QualityAuditRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as QualityAuditRow[];

  const { data, error } = await supabase.rpc('project_z_question_quality_audit');

  if (error) return [] as QualityAuditRow[];
  return (data || []) as QualityAuditRow[];
}

export async function fetchQuestionQualityItems(courseCode?: string) {
  if (!supabase) return [] as QualityItem[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as QualityItem[];

  const { data, error } = await supabase.rpc('project_z_question_quality_items', {
    p_course_code: courseCode || null
  });

  if (error) return [] as QualityItem[];
  return (data || []) as QualityItem[];
}

export async function shuffleStoredQuestionOptions(courseCode?: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_shuffle_question_bank_options', {
    p_course_code: courseCode || null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function reviewQuestionQuality(questionId: string, status: string, notes?: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_review_question_quality', {
    p_question_id: questionId,
    p_status: status,
    p_notes: notes || null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}
