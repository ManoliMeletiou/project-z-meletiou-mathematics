import { supabase } from './supabaseClient';

export type ParentDashboardOverview = {
  student_id: string;
  child_email: string;
  child_name: string;
  active_assignments: number;
  assignments_to_do: number;
  questions_left: number;
  memorandums_released: number;
  corrections_needed: number;
  corrections_submitted: number;
  corrections_accepted: number;
  corrections_needing_more_work: number;
  average_mastery: number;
  average_confidence: number;
  strong_skills: number;
  weak_skills: number;
  status_label: string;
  parent_friendly_next_step: string;
  support_tip: string;
  updated_at: string;
};

export type ParentDashboardActivity = {
  assignment_id: string;
  assignment_title: string;
  skill_title: string;
  course_skill_code: string;
  question_count: number;
  submitted_count: number;
  reviewed_count: number;
  memorandums_released: boolean;
  corrections_needed: number;
  corrections_submitted: number;
  corrections_accepted: number;
  progress_percent: number;
  parent_message: string;
  updated_at: string;
};

export type ParentDashboardSkill = {
  course_skill_code: string;
  skill_title: string;
  mastery_percent: number;
  confidence_percent: number;
  status_label: string;
  parent_tip: string;
  updated_at: string;
};

export async function fetchParentDashboardOverview(studentId?: string) {
  if (!supabase) return [] as ParentDashboardOverview[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as ParentDashboardOverview[];

  const { data, error } = await supabase.rpc('project_z_parent_dashboard_overview', {
    p_student_id: studentId || null
  });

  if (error) return [] as ParentDashboardOverview[];
  return (data || []) as ParentDashboardOverview[];
}

export async function fetchParentDashboardActivity(studentId: string) {
  if (!supabase || !studentId) return [] as ParentDashboardActivity[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as ParentDashboardActivity[];

  const { data, error } = await supabase.rpc('project_z_parent_dashboard_activity', {
    p_student_id: studentId
  });

  if (error) return [] as ParentDashboardActivity[];
  return (data || []) as ParentDashboardActivity[];
}

export async function fetchParentDashboardSkills(studentId: string) {
  if (!supabase || !studentId) return [] as ParentDashboardSkill[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as ParentDashboardSkill[];

  const { data, error } = await supabase.rpc('project_z_parent_dashboard_skills', {
    p_student_id: studentId
  });

  if (error) return [] as ParentDashboardSkill[];
  return (data || []) as ParentDashboardSkill[];
}
