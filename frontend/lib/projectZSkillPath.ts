import { supabase } from './supabaseClient';

export type SkillPathNode = {
  course_skill_code: string;
  course_code: string;
  course_display_name: string;
  strand_title: string;
  assessment_criterion: string | null;
  title: string;
  description: string;
  prerequisite_skill_codes: string[];
  difficulty_band: number;
  sort_order: number;
  mastery_percent: number;
  confidence_percent: number;
  evidence_count: number;
  correct_count: number;
  path_status: 'locked' | 'ready' | 'weak' | 'developing' | 'strong_needs_evidence' | 'mastered_review';
  lock_reason: string;
  next_action: string;
  path_position: number;
};

export type SkillPathSummary = {
  course_code: string | null;
  course_display_name: string | null;
  total_nodes: number;
  locked_nodes: number;
  ready_nodes: number;
  weak_nodes: number;
  developing_nodes: number;
  strong_nodes: number;
  mastered_review_nodes: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  next_recommended_action: string;
};

export async function fetchSkillPath() {
  if (!supabase) return [] as SkillPathNode[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as SkillPathNode[];

  const { data, error } = await supabase.rpc('project_z_my_skill_path');

  if (error) return [] as SkillPathNode[];
  return (data || []) as SkillPathNode[];
}

export async function fetchSkillPathSummary() {
  if (!supabase) return null as SkillPathSummary | null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null as SkillPathSummary | null;

  const { data, error } = await supabase.rpc('project_z_my_path_summary');

  if (error || !data || data.length === 0) return null as SkillPathSummary | null;
  return data[0] as SkillPathSummary;
}

export async function touchLearningDay() {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_touch_learning_day', {
    p_student_id: null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function awardXp(courseSkillCode: string | null, sourceType: string, xpAmount: number, reason: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_award_xp', {
    p_course_skill_code: courseSkillCode,
    p_source_type: sourceType,
    p_xp_amount: xpAmount,
    p_reason: reason
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}
