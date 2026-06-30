import { supabase } from './supabaseClient';

export type TeacherTutorEvidence = {
  evidence_id: string;
  student_id: string;
  student_email: string;
  student_name: string;
  class_id: string;
  class_label: string;
  course_code: string | null;
  course_skill_code: string | null;
  skill_title: string | null;
  evidence_type: string;
  evidence_strength: number;
  mastery_delta: number;
  confidence_delta: number;
  notes: string | null;
  teacher_review_status: string;
  teacher_review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type TeacherTutorEvidenceSummary = {
  student_id: string;
  student_email: string;
  student_name: string;
  total_evidence: number;
  pending_count: number;
  approved_count: number;
  ignored_count: number;
  action_needed_count: number;
  misconception_count: number;
  hint_needed_count: number;
  independent_step_count: number;
  average_evidence_strength: number;
  latest_evidence_at: string;
};

export async function fetchTeacherTutorEvidence(studentId?: string) {
  if (!supabase) return [] as TeacherTutorEvidence[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TeacherTutorEvidence[];

  const { data, error } = await supabase.rpc('project_z_teacher_tutor_evidence', {
    p_student_id: studentId || null
  });

  if (error) return [] as TeacherTutorEvidence[];
  return (data || []) as TeacherTutorEvidence[];
}

export async function fetchTeacherTutorEvidenceSummary() {
  if (!supabase) return [] as TeacherTutorEvidenceSummary[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TeacherTutorEvidenceSummary[];

  const { data, error } = await supabase.rpc('project_z_teacher_tutor_evidence_summary');

  if (error) return [] as TeacherTutorEvidenceSummary[];
  return (data || []) as TeacherTutorEvidenceSummary[];
}

export async function reviewTutorEvidence(evidenceId: string, status: string, notes?: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_review_tutor_evidence', {
    p_evidence_id: evidenceId,
    p_status: status,
    p_notes: notes || null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}
