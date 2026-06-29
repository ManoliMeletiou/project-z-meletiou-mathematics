import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type ProjectZRole = 'student' | 'teacher' | 'parent';

export function getStoredRole(): ProjectZRole {
  if (typeof window === 'undefined') return 'student';
  const role = window.localStorage.getItem('project-z-role');
  if (role === 'teacher' || role === 'parent' || role === 'student') return role;
  return 'student';
}

export function storeRole(role: ProjectZRole) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('project-z-role', role);
}
