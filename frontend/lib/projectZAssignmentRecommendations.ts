import { supabase } from './supabaseClient';

export type AssignmentRecommendationClass = {
  class_id: string;
  class_label: string;
  student_count: number;
};

export type SmartAssignmentRecommendation = {
  recommendation_id: string;
  class_id: string;
  class_label: string;
  course_code: string | null;
  course_skill_code: string;
  skill_title: string;
  affected_students: number;
  weak_students: number;
  low_confidence_students: number;
  misconception_count: number;
  hint_needed_count: number;
  action_needed_count: number;
  average_mastery: number;
  average_confidence: number;
  priority_score: number;
  priority_label: string;
  recommendation_type: string;
  suggested_assignment_title: string;
  suggested_assignment_instructions: string;
  suggested_duration_minutes: number;
  suggested_question_count: number;
  teacher_action: string;
};

export async function fetchAssignmentRecommendationClasses() {
  if (!supabase) return [] as AssignmentRecommendationClass[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as AssignmentRecommendationClass[];

  const { data, error } = await supabase.rpc('project_z_teacher_assignment_classes');

  if (error) return [] as AssignmentRecommendationClass[];
  return (data || []) as AssignmentRecommendationClass[];
}

export async function fetchSmartAssignmentRecommendations(classId?: string) {
  if (!supabase) return [] as SmartAssignmentRecommendation[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as SmartAssignmentRecommendation[];

  const { data, error } = await supabase.rpc('project_z_teacher_smart_assignment_recommendations', {
    p_class_id: classId || null
  });

  if (error) return [] as SmartAssignmentRecommendation[];
  return (data || []) as SmartAssignmentRecommendation[];
}

export async function logAssignmentRecommendationAction(payload: {
  class_id: string;
  course_skill_code: string;
  skill_title: string;
  recommendation_type: string;
  action: string;
  teacher_notes?: string;
}) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_log_assignment_recommendation_action', {
    p_class_id: payload.class_id,
    p_course_skill_code: payload.course_skill_code,
    p_skill_title: payload.skill_title,
    p_recommendation_type: payload.recommendation_type,
    p_action: payload.action,
    p_teacher_notes: payload.teacher_notes || null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}
