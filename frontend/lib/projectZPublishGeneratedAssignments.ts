import { supabase } from './supabaseClient';

export type StudentGeneratedAssignment = {
  assignment_id: string;
  class_id: string;
  class_label: string;
  course_code: string | null;
  course_skill_code: string;
  skill_title: string;
  assignment_title: string;
  assignment_instructions: string;
  assignment_level: string;
  question_count: number;
  status: string;
  answered_count: number;
  submitted_count: number;
  correct_count: number;
  progress_percent: number;
  created_at: string;
  updated_at: string;
};

export type StudentGeneratedAssignmentQuestion = {
  question_id: string;
  question_number: number;
  course_skill_code: string;
  skill_title: string;
  criterion: string;
  difficulty_band: string;
  question_type: string;
  prompt: string;
  options: Record<string, string> | null;
  student_answer_text: string | null;
  student_selected_option: string | null;
  is_submitted: boolean;
  is_correct: boolean | null;
};

export type TeacherGeneratedAssignmentProgress = {
  student_id: string;
  student_email: string;
  student_name: string;
  answered_count: number;
  submitted_count: number;
  correct_count: number;
  question_count: number;
  progress_percent: number;
  accuracy_percent: number;
  latest_activity_at: string | null;
};

export async function publishGeneratedAssignment(assignmentId: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_publish_generated_assignment', {
    p_assignment_id: assignmentId
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchStudentGeneratedAssignments() {
  if (!supabase) return [] as StudentGeneratedAssignment[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as StudentGeneratedAssignment[];

  const { data, error } = await supabase.rpc('project_z_student_generated_assignments');

  if (error) return [] as StudentGeneratedAssignment[];
  return (data || []) as StudentGeneratedAssignment[];
}

export async function fetchStudentGeneratedAssignmentQuestions(assignmentId: string) {
  if (!supabase) return [] as StudentGeneratedAssignmentQuestion[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as StudentGeneratedAssignmentQuestion[];

  const { data, error } = await supabase.rpc('project_z_student_generated_assignment_questions', {
    p_assignment_id: assignmentId
  });

  if (error) return [] as StudentGeneratedAssignmentQuestion[];
  return (data || []) as StudentGeneratedAssignmentQuestion[];
}

export async function saveGeneratedAssignmentAnswer(payload: {
  assignment_id: string;
  question_id: string;
  answer_text?: string;
  selected_option?: string;
  submit?: boolean;
}) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_save_generated_assignment_answer', {
    p_assignment_id: payload.assignment_id,
    p_question_id: payload.question_id,
    p_answer_text: payload.answer_text || null,
    p_selected_option: payload.selected_option || null,
    p_submit: payload.submit || false
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchTeacherGeneratedAssignmentProgress(assignmentId: string) {
  if (!supabase) return [] as TeacherGeneratedAssignmentProgress[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TeacherGeneratedAssignmentProgress[];

  const { data, error } = await supabase.rpc('project_z_teacher_generated_assignment_progress', {
    p_assignment_id: assignmentId
  });

  if (error) return [] as TeacherGeneratedAssignmentProgress[];
  return (data || []) as TeacherGeneratedAssignmentProgress[];
}
