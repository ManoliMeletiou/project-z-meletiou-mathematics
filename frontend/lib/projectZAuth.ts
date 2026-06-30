import { supabase } from './supabaseClient';

export type ProjectZRole = 'student' | 'teacher' | 'parent' | 'guest';

export type ProjectZProfile = {
  id: string;
  email: string;
  role: ProjectZRole;
  display_name: string | null;
};

export async function getCurrentProfile() {
  if (!supabase) {
    return {
      user: null,
      profile: null,
      role: 'guest' as ProjectZRole,
      email: null
    };
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return {
      user: null,
      profile: null,
      role: 'guest' as ProjectZRole,
      email: null
    };
  }

  const { data: profile } = await supabase
    .from('project_z_profiles')
    .select('id,email,role,display_name')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    profile: profile as ProjectZProfile | null,
    role: ((profile?.role as ProjectZRole) || 'student') as ProjectZRole,
    email: user.email || profile?.email || null
  };
}
