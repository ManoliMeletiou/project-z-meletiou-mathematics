import { supabase } from './supabaseClient';

export type GeneratedAssignment = {
  assignment_id: string;
  class_id: string;
  class_label: string;
  course_code: string | null;
  course_skill_code: string;
  skill_title: string;
  assignment_title: string;
  assignment_instructions: string;
  assignment_level: string;
  recommendation_type: string | null;
  question_count: number;
  status: string;
  ai_model: string | null;
  quality_rules: Record<string, unknown>;
  created_at: string;
};

export type GeneratedAssignmentQuestion = {
  question_id: string;
  question_number: number;
  course_skill_code: string;
  skill_title: string;
  criterion: string;
  difficulty_band: string;
  question_type: string;
  prompt: string;
  options: Record<string, string> | null;
  correct_answer: string;
  correct_option: string | null;
  explanation: string;
  quality_notes: Record<string, unknown>;
  created_at: string;
};

export async function createGeneratedAssignmentFromRecommendation(recommendation: Record<string, unknown>) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) return { ok: false, reason: 'Sign in first' };

  const response = await fetch('/api/create-assignment-from-recommendation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ recommendation })
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, reason: text || 'Assignment creation failed' };
  }

  const data = await response.json();
  return { ok: true, data };
}

export async function fetchGeneratedAssignments() {
  if (!supabase) return [] as GeneratedAssignment[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as GeneratedAssignment[];

  const { data, error } = await supabase.rpc('project_z_my_generated_assignments');

  if (error) return [] as GeneratedAssignment[];
  return (data || []) as GeneratedAssignment[];
}

export async function fetchGeneratedAssignmentQuestions(assignmentId: string) {
  if (!supabase) return [] as GeneratedAssignmentQuestion[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as GeneratedAssignmentQuestion[];

  const { data, error } = await supabase.rpc('project_z_generated_assignment_questions', {
    p_assignment_id: assignmentId
  });

  if (error) return [] as GeneratedAssignmentQuestion[];
  return (data || []) as GeneratedAssignmentQuestion[];
}

export async function markGeneratedAssignmentStatus(assignmentId: string, status: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_mark_generated_assignment_status', {
    p_assignment_id: assignmentId,
    p_status: status
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}
