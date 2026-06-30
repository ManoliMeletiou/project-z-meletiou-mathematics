import { supabase } from './supabaseClient';

export type TeacherAssignment = {
  id: string;
  class_id: string;
  class_name: string;
  title: string;
  instructions: string;
  skill_id: string;
  difficulty: number;
  created_at: string;
  submission_count: number;
};

export type StudentAssignment = {
  id: string;
  class_id: string;
  class_name: string;
  title: string;
  instructions: string;
  skill_id: string;
  difficulty: number;
  created_at: string;
  submitted: boolean;
  submitted_answer: string | null;
  submitted_at: string | null;
};

export type AssignmentSubmission = {
  submission_id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  answer: string;
  status: string;
  submitted_at: string;
};

export async function createAssignment(
  classId: string,
  title: string,
  instructions: string,
  skillId: string,
  difficulty: number
) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_create_assignment', {
    p_class_id: classId,
    p_title: title,
    p_instructions: instructions,
    p_skill_id: skillId,
    p_difficulty: difficulty
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchTeacherAssignments() {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase.rpc('project_z_my_teacher_assignments');
  if (error) return [];
  return data || [];
}

export async function fetchStudentAssignments() {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase.rpc('project_z_my_student_assignments');
  if (error) return [];
  return data || [];
}

export async function submitAssignment(assignmentId: string, answer: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_submit_assignment', {
    p_assignment_id: assignmentId,
    p_answer: answer
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchAssignmentSubmissions(assignmentId: string) {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase.rpc('project_z_teacher_assignment_submissions', {
    p_assignment_id: assignmentId
  });

  if (error) return [];
  return data || [];
}
