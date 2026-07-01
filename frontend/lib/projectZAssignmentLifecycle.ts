import { supabase } from './supabaseClient';

export type AssignmentLifecycleRow = {
  assignment_id: string;
  class_id: string;
  class_label: string;
  assignment_title: string;
  course_code: string | null;
  course_skill_code: string;
  skill_title: string;
  assignment_level: string;
  question_count: number;
  actual_question_count: number;
  status: string;
  memorandum_released: boolean;
  created_at: string;
  updated_at: string;
  student_count: number;
  audit_count: number;
  unresolved_flag_count: number;
  answered_responses: number;
  submitted_responses: number;
  reviewed_responses: number;
  needs_revision_responses: number;
  corrections_submitted: number;
  corrections_reviewed: number;
  corrections_accepted: number;
  corrections_needing_more_work: number;
  lifecycle_stage: string;
  urgency_label: string;
  user_friendly_next_action: string;
  next_page_path: string;
  completion_percent: number;
};

export type AssignmentLifecycleSummary = {
  ok: boolean;
  total_assignments: number;
  urgent_count: number;
  high_count: number;
  ready_to_publish: number;
  needs_submission_review: number;
  needs_correction_review: number;
  complete_count: number;
  average_completion_percent: number | null;
};

export async function fetchAssignmentLifecycleDashboard() {
  if (!supabase) return [] as AssignmentLifecycleRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as AssignmentLifecycleRow[];

  const { data, error } = await supabase.rpc('project_z_teacher_assignment_lifecycle_dashboard');

  if (error) return [] as AssignmentLifecycleRow[];
  return (data || []) as AssignmentLifecycleRow[];
}

export async function fetchAssignmentLifecycleSummary() {
  if (!supabase) {
    return {
      ok: false,
      total_assignments: 0,
      urgent_count: 0,
      high_count: 0,
      ready_to_publish: 0,
      needs_submission_review: 0,
      needs_correction_review: 0,
      complete_count: 0,
      average_completion_percent: 0
    } as AssignmentLifecycleSummary;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      ok: false,
      total_assignments: 0,
      urgent_count: 0,
      high_count: 0,
      ready_to_publish: 0,
      needs_submission_review: 0,
      needs_correction_review: 0,
      complete_count: 0,
      average_completion_percent: 0
    } as AssignmentLifecycleSummary;
  }

  const { data, error } = await supabase.rpc('project_z_teacher_assignment_lifecycle_summary');

  if (error || !data) {
    return {
      ok: false,
      total_assignments: 0,
      urgent_count: 0,
      high_count: 0,
      ready_to_publish: 0,
      needs_submission_review: 0,
      needs_correction_review: 0,
      complete_count: 0,
      average_completion_percent: 0
    } as AssignmentLifecycleSummary;
  }

  return data as AssignmentLifecycleSummary;
}
