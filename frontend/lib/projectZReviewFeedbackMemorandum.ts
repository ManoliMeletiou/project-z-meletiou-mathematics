import { supabase } from './supabaseClient';

export type ReviewAssignment = {
  assignment_id: string;
  class_id: string;
  class_label: string;
  assignment_title: string;
  course_code: string | null;
  course_skill_code: string;
  skill_title: string;
  question_count: number;
  status: string;
  memorandum_released: boolean;
  student_count: number;
  answered_responses: number;
  submitted_responses: number;
  reviewed_responses: number;
  needs_revision_responses: number;
  average_score: number | null;
  latest_activity_at: string | null;
};

export type TeacherSubmissionRow = {
  response_id: string;
  assignment_id: string;
  question_id: string;
  question_number: number;
  student_id: string;
  student_email: string;
  student_name: string;
  prompt: string;
  options: Record<string, string> | null;
  criterion: string;
  difficulty_band: string;
  question_type: string;
  student_answer_text: string | null;
  student_selected_option: string | null;
  is_submitted: boolean;
  auto_is_correct: boolean | null;
  correct_answer: string;
  correct_option: string | null;
  explanation: string;
  teacher_feedback: string | null;
  teacher_score: number | null;
  teacher_review_status: string;
  teacher_reviewed_at: string | null;
  updated_at: string;
};

export type MemorandumRow = {
  assignment_id: string;
  assignment_title: string;
  memorandum_notes: string | null;
  memorandum_released_at: string | null;
  question_number: number;
  question_id: string;
  prompt: string;
  options: Record<string, string> | null;
  criterion: string;
  difficulty_band: string;
  question_type: string;
  correct_answer: string;
  correct_option: string | null;
  explanation: string;
  student_answer_text?: string | null;
  student_selected_option?: string | null;
  student_is_correct?: boolean | null;
  teacher_feedback?: string | null;
  teacher_score?: number | null;
  teacher_review_status?: string | null;
};

export async function fetchReviewAssignments() {
  if (!supabase) return [] as ReviewAssignment[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as ReviewAssignment[];

  const { data, error } = await supabase.rpc('project_z_teacher_generated_assignments_for_review');

  if (error) return [] as ReviewAssignment[];
  return (data || []) as ReviewAssignment[];
}

export async function fetchTeacherSubmissions(assignmentId: string) {
  if (!supabase) return [] as TeacherSubmissionRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TeacherSubmissionRow[];

  const { data, error } = await supabase.rpc('project_z_teacher_generated_assignment_submissions', {
    p_assignment_id: assignmentId
  });

  if (error) return [] as TeacherSubmissionRow[];
  return (data || []) as TeacherSubmissionRow[];
}

export async function reviewGeneratedResponse(payload: {
  response_id: string;
  teacher_score?: number | null;
  is_correct?: boolean | null;
  feedback?: string | null;
  review_status?: 'reviewed' | 'needs_revision';
}) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_teacher_review_generated_response', {
    p_response_id: payload.response_id,
    p_teacher_score: payload.teacher_score ?? null,
    p_is_correct: payload.is_correct ?? null,
    p_feedback: payload.feedback || null,
    p_review_status: payload.review_status || 'reviewed'
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function releaseMemorandum(assignmentId: string, notes?: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_release_generated_assignment_memorandum', {
    p_assignment_id: assignmentId,
    p_memorandum_notes: notes || null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchStudentMemorandum(assignmentId: string) {
  if (!supabase) return [] as MemorandumRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as MemorandumRow[];

  const { data, error } = await supabase.rpc('project_z_student_generated_assignment_memorandum', {
    p_assignment_id: assignmentId
  });

  if (error) return [] as MemorandumRow[];
  return (data || []) as MemorandumRow[];
}

export async function fetchTeacherMemorandum(assignmentId: string) {
  if (!supabase) return [] as MemorandumRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as MemorandumRow[];

  const { data, error } = await supabase.rpc('project_z_teacher_generated_assignment_memorandum', {
    p_assignment_id: assignmentId
  });

  if (error) return [] as MemorandumRow[];
  return (data || []) as MemorandumRow[];
}
