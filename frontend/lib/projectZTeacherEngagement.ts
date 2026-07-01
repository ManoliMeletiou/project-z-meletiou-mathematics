import { supabase } from './supabaseClient';

export type TeacherEngagementClass = {
  class_id: string;
  class_label: string;
  assignment_count: number;
  student_count: number;
  latest_assignment_at: string | null;
};

export type TeacherEngagementSummary = {
  ok: boolean;
  student_count: number;
  no_engagement_count: number;
  correction_support_count: number;
  low_assignment_engagement_count: number;
  active_count: number;
  building_momentum_count: number;
  average_completion_percent: number;
  average_correction_effort_percent: number;
  average_level: number;
  total_xp: number;
  generated_at: string;
};

export type TeacherEngagementRow = {
  student_id: string;
  student_email: string;
  class_id: string;
  class_label: string;
  active_assignments: number;
  submitted_responses: number;
  correct_responses: number;
  reviewed_responses: number;
  completion_percent: number;
  accuracy_percent: number;
  corrections_needed: number;
  corrections_submitted: number;
  corrections_accepted: number;
  correction_effort_percent: number;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  checked_in_today: boolean;
  achievements_unlocked: number;
  engagement_status: string;
  teacher_next_action: string;
  caution_note: string;
  updated_at: string | null;
};

export async function fetchTeacherEngagementClasses() {
  if (!supabase) return [] as TeacherEngagementClass[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TeacherEngagementClass[];

  const { data, error } = await supabase.rpc('project_z_teacher_engagement_classes');

  if (error) return [] as TeacherEngagementClass[];
  return (data || []) as TeacherEngagementClass[];
}

export async function fetchTeacherEngagementSummary(classId?: string | null) {
  if (!supabase) {
    return {
      ok: false,
      student_count: 0,
      no_engagement_count: 0,
      correction_support_count: 0,
      low_assignment_engagement_count: 0,
      active_count: 0,
      building_momentum_count: 0,
      average_completion_percent: 0,
      average_correction_effort_percent: 0,
      average_level: 0,
      total_xp: 0,
      generated_at: ''
    } as TeacherEngagementSummary;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      ok: false,
      student_count: 0,
      no_engagement_count: 0,
      correction_support_count: 0,
      low_assignment_engagement_count: 0,
      active_count: 0,
      building_momentum_count: 0,
      average_completion_percent: 0,
      average_correction_effort_percent: 0,
      average_level: 0,
      total_xp: 0,
      generated_at: ''
    } as TeacherEngagementSummary;
  }

  const { data, error } = await supabase.rpc('project_z_teacher_engagement_summary', {
    p_class_id: classId || null
  });

  if (error || !data) {
    return {
      ok: false,
      student_count: 0,
      no_engagement_count: 0,
      correction_support_count: 0,
      low_assignment_engagement_count: 0,
      active_count: 0,
      building_momentum_count: 0,
      average_completion_percent: 0,
      average_correction_effort_percent: 0,
      average_level: 0,
      total_xp: 0,
      generated_at: ''
    } as TeacherEngagementSummary;
  }

  return data as TeacherEngagementSummary;
}

export async function fetchTeacherEngagementInsights(classId?: string | null) {
  if (!supabase) return [] as TeacherEngagementRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TeacherEngagementRow[];

  const { data, error } = await supabase.rpc('project_z_teacher_engagement_insights', {
    p_class_id: classId || null
  });

  if (error) return [] as TeacherEngagementRow[];
  return (data || []) as TeacherEngagementRow[];
}
