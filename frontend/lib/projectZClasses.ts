import { supabase } from './supabaseClient';

export type ProjectZClass = {
  id: string;
  name: string;
  join_code: string;
  course: string;
  year_group: string;
  created_at: string;
  member_count?: number;
};

export async function createTeacherClass(name: string, course: string, yearGroup: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };
  const { data, error } = await supabase.rpc('project_z_create_class', {
    p_name: name,
    p_course: course,
    p_year_group: yearGroup
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchTeacherClasses() {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase.rpc('project_z_my_teacher_classes');
  if (error) return [];
  return data || [];
}

export async function joinClass(joinCode: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };
  const { data, error } = await supabase.rpc('project_z_join_class', {
    p_join_code: joinCode
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchStudentClasses() {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase.rpc('project_z_my_student_classes');
  if (error) return [];
  return data || [];
}
