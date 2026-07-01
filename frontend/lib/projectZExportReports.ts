import { supabase } from './supabaseClient';

export type ExportChild = {
  student_id: string;
  student_email: string;
  student_name: string;
  link_status?: string;
  linked_at?: string;
};

export type ExportTeacherStudent = {
  student_id: string;
  student_email: string;
  student_name: string;
  class_id: string;
  class_label: string;
  evidence_count: number;
  average_mastery: number;
  latest_activity_at: string | null;
};

export async function fetchExportParentChildren() {
  if (!supabase) return [] as ExportChild[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as ExportChild[];

  const { data, error } = await supabase.rpc('project_z_parent_learning_children');

  if (error) return [] as ExportChild[];
  return (data || []) as ExportChild[];
}

export async function fetchExportParentReport(studentId: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_parent_learning_report', {
    p_student_id: studentId
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchExportTeacherStudents() {
  if (!supabase) return [] as ExportTeacherStudent[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as ExportTeacherStudent[];

  const { data, error } = await supabase.rpc('project_z_teacher_export_students');

  if (error) return [] as ExportTeacherStudent[];
  return (data || []) as ExportTeacherStudent[];
}

export async function fetchExportTeacherReport(studentId: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_teacher_export_student_report', {
    p_student_id: studentId
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}
