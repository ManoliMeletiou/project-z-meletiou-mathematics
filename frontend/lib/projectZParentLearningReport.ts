import { supabase } from './supabaseClient';

export type ParentLearningChild = {
  student_id: string;
  student_email: string;
  student_name: string;
  link_status: string;
  linked_at: string;
};

export type ParentLearningReport = {
  child: { student_id: string; student_email: string; student_name: string };
  overview: {
    average_mastery: number;
    average_confidence: number;
    skills_tracked: number;
    total_evidence: number;
    skills_above_70: number;
    skills_below_50: number;
    safe_note: string;
  };
  strengths: any[];
  needs_practice: any[];
  tutor_summary: {
    approved_evidence: number;
    action_needed: number;
    misconceptions: number;
    hints_needed: number;
    independent_steps: number;
    recent_tutor_evidence: number;
    safe_note: string;
  };
  parent_message: string;
  privacy: {
    raw_tutor_chats_hidden: boolean;
    teacher_private_notes_hidden: boolean;
    teacher_only_review_details_hidden: boolean;
    report_type: string;
  };
  generated_at: string;
};

export async function fetchParentLearningChildren() {
  if (!supabase) return [] as ParentLearningChild[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as ParentLearningChild[];

  const { data, error } = await supabase.rpc('project_z_parent_learning_children');

  if (error) return [] as ParentLearningChild[];
  return (data || []) as ParentLearningChild[];
}

export async function fetchParentLearningReport(studentId: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_parent_learning_report', {
    p_student_id: studentId
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: data as ParentLearningReport };
}
