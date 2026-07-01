import { supabase } from './supabaseClient';

export type StudentCorrectionAssignment = {
  assignment_id: string;
  class_id: string;
  class_label: string;
  assignment_title: string;
  course_code: string | null;
  course_skill_code: string;
  skill_title: string;
  assignment_level: string;
  question_count: number;
  memorandum_released_at: string | null;
  responses_needing_correction: number;
  corrections_started: number;
  corrections_submitted: number;
  corrections_accepted: number;
  corrections_needing_more_work: number;
  correction_progress_percent: number;
};

export type StudentCorrectionQuestion = {
  assignment_id: string;
  question_id: string;
  response_id: string | null;
  question_number: number;
  prompt: string;
  options: Record<string, string> | null;
  criterion: string;
  difficulty_band: string;
  question_type: string;
  correct_answer: string;
  correct_option: string | null;
  explanation: string;
  student_answer_text: string | null;
  student_selected_option: string | null;
  student_is_correct: boolean | null;
  teacher_feedback: string | null;
  teacher_review_status: string | null;
  correction_id: string | null;
  correction_text: string | null;
  reflection_text: string | null;
  confidence_after_correction: number | null;
  correction_status: string | null;
  correction_teacher_feedback: string | null;
  correction_teacher_score: number | null;
};

export type TeacherCorrectionRow = {
  correction_id: string;
  assignment_id: string;
  assignment_title: string;
  class_id: string;
  class_label: string;
  question_id: string;
  question_number: number;
  student_id: string;
  student_email: string;
  student_name: string;
  prompt: string;
  correct_answer: string;
  correct_option: string | null;
  explanation: string;
  student_answer_text: string | null;
  student_selected_option: string | null;
  original_is_correct: boolean | null;
  original_teacher_feedback: string | null;
  correction_text: string;
  reflection_text: string | null;
  confidence_after_correction: number | null;
  correction_status: string;
  teacher_feedback: string | null;
  teacher_score: number | null;
  submitted_at: string | null;
  updated_at: string;
};

export async function fetchStudentCorrectionAssignments() {
  if (!supabase) return [] as StudentCorrectionAssignment[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as StudentCorrectionAssignment[];

  const { data, error } = await supabase.rpc('project_z_student_correction_assignments');

  if (error) return [] as StudentCorrectionAssignment[];
  return (data || []) as StudentCorrectionAssignment[];
}

export async function fetchStudentCorrectionQuestions(assignmentId: string) {
  if (!supabase) return [] as StudentCorrectionQuestion[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as StudentCorrectionQuestion[];

  const { data, error } = await supabase.rpc('project_z_student_correction_questions', {
    p_assignment_id: assignmentId
  });

  if (error) return [] as StudentCorrectionQuestion[];
  return (data || []) as StudentCorrectionQuestion[];
}

export async function saveStudentCorrection(payload: {
  assignment_id: string;
  question_id: string;
  correction_text: string;
  reflection_text?: string;
  confidence_after_correction?: number | null;
  submit?: boolean;
}) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_save_student_correction', {
    p_assignment_id: payload.assignment_id,
    p_question_id: payload.question_id,
    p_correction_text: payload.correction_text,
    p_reflection_text: payload.reflection_text || null,
    p_confidence_after_correction: payload.confidence_after_correction || null,
    p_submit: payload.submit || false
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchTeacherCorrectionsForReview(assignmentId?: string) {
  if (!supabase) return [] as TeacherCorrectionRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TeacherCorrectionRow[];

  const { data, error } = await supabase.rpc('project_z_teacher_corrections_for_review', {
    p_assignment_id: assignmentId || null
  });

  if (error) return [] as TeacherCorrectionRow[];
  return (data || []) as TeacherCorrectionRow[];
}

export async function reviewStudentCorrection(payload: {
  correction_id: string;
  status: 'reviewed' | 'accepted' | 'needs_more_work';
  teacher_feedback?: string;
  teacher_score?: number | null;
}) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_teacher_review_student_correction', {
    p_correction_id: payload.correction_id,
    p_status: payload.status,
    p_teacher_feedback: payload.teacher_feedback || null,
    p_teacher_score: payload.teacher_score ?? null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}
