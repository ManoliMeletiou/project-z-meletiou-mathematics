import { supabase } from './supabaseClient';

export type ParentChild = {
  student_id: string;
  student_email: string;
  student_name: string;
  joined_at: string;
  total_attempts: number;
  total_correct: number;
  average_mastery: number;
};

export type ChildMastery = {
  skill_id: string;
  attempts: number;
  correct: number;
  mastery_score: number;
  updated_at: string;
};

export async function linkChildByEmail(studentEmail: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_link_parent_to_student_by_email', {
    p_student_email: studentEmail
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchMyChildren() {
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase.rpc('project_z_my_children');

  if (error) return [];
  return data || [];
}

export async function fetchChildMastery(studentId: string) {
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase.rpc('project_z_child_mastery_for_parent', {
    p_student_id: studentId
  });

  if (error) return [];
  return data || [];
}
