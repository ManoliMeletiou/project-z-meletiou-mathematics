import { supabase } from './supabaseClient';

export type StudentDashboardSummary = {
  ok: boolean;
  student_email: string | null;
  active_assignments: number;
  assignments_to_do: number;
  questions_left: number;
  released_memorandums: number;
  corrections_needed: number;
  corrections_submitted: number;
  corrections_accepted: number;
  corrections_needing_more_work: number;
  average_mastery: number;
  average_confidence: number;
  skill_count: number;
  strong_skills: number;
  weak_skills: number;
  generated_at: string;
};

export type StudentDashboardAction = {
  action_id: string;
  priority_label: string;
  action_type: string;
  title: string;
  description: string;
  button_label: string;
  page_path: string;
  assignment_id: string | null;
  assignment_title: string | null;
  course_skill_code: string | null;
  skill_title: string | null;
  progress_percent: number;
  sort_order: number;
};

export type StudentDashboardSkill = {
  course_skill_code: string;
  skill_title: string;
  mastery_percent: number;
  confidence_percent: number;
  evidence_count: number;
  status_label: string;
  suggestion: string;
  updated_at: string;
};

const emptySummary: StudentDashboardSummary = {
  ok: false,
  student_email: null,
  active_assignments: 0,
  assignments_to_do: 0,
  questions_left: 0,
  released_memorandums: 0,
  corrections_needed: 0,
  corrections_submitted: 0,
  corrections_accepted: 0,
  corrections_needing_more_work: 0,
  average_mastery: 0,
  average_confidence: 0,
  skill_count: 0,
  strong_skills: 0,
  weak_skills: 0,
  generated_at: ''
};

export async function fetchStudentDashboardSummary() {
  if (!supabase) return emptySummary;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return emptySummary;

  const { data, error } = await supabase.rpc('project_z_student_dashboard_summary');

  if (error || !data) return emptySummary;
  return data as StudentDashboardSummary;
}

export async function fetchStudentDashboardActions() {
  if (!supabase) return [] as StudentDashboardAction[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as StudentDashboardAction[];

  const { data, error } = await supabase.rpc('project_z_student_dashboard_next_actions');

  if (error) return [] as StudentDashboardAction[];
  return (data || []) as StudentDashboardAction[];
}

export async function fetchStudentDashboardSkills() {
  if (!supabase) return [] as StudentDashboardSkill[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as StudentDashboardSkill[];

  const { data, error } = await supabase.rpc('project_z_student_dashboard_recent_skills');

  if (error) return [] as StudentDashboardSkill[];
  return (data || []) as StudentDashboardSkill[];
}
