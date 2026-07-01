import { supabase } from './supabaseClient';

export type ParentEngagementChild = {
  student_id?: string;
  id?: string;
  student_email?: string;
  email?: string;
  display_name?: string;
};

export type ParentEngagementOverview = {
  ok: boolean;
  reason?: string;
  has_child?: boolean;
  message?: string;
  children?: ParentEngagementChild[];
  student?: {
    student_id: string;
    student_email: string;
  };
  quest?: {
    total_xp: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    last_checkin_date: string | null;
    checked_in_today: boolean;
    companion_stage: number;
    selected_companion: string;
    achievements_unlocked: number;
  };
  learning_habits?: {
    status: string;
    assignments_to_do: number;
    submitted_responses: number;
    total_questions: number;
    completion_percent: number;
    corrections_needed: number;
    corrections_submitted: number;
    corrections_accepted: number;
    correction_effort_percent: number;
  };
  parent_guidance?: {
    next_step: string;
    what_to_ask: string;
    what_to_avoid: string;
    boundary: string;
  };
};

export async function fetchParentEngagementOverview(studentId?: string | null) {
  if (!supabase) {
    return {
      ok: false,
      reason: 'Supabase is not configured.'
    } as ParentEngagementOverview;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      ok: false,
      reason: 'Sign in required.'
    } as ParentEngagementOverview;
  }

  const { data, error } = await supabase.rpc('project_z_parent_engagement_overview', {
    p_student_id: studentId || null
  });

  if (error || !data) {
    return {
      ok: false,
      reason: error?.message || 'Could not load parent engagement overview.'
    } as ParentEngagementOverview;
  }

  return data as ParentEngagementOverview;
}

export function childId(child: ParentEngagementChild) {
  return child.student_id || child.id || '';
}

export function childLabel(child: ParentEngagementChild) {
  return child.display_name || child.student_email || child.email || childId(child) || 'Student';
}

export function companionIcon(stage: number) {
  if (stage >= 5) return '🌌';
  if (stage >= 4) return '☄️';
  if (stage >= 3) return '🪐';
  if (stage >= 2) return '🌟';
  return '✨';
}

export function parentFriendlyStatus(status?: string) {
  if (!status) return 'No learning habit status yet.';
  if (status === 'Getting started') return 'Your child may need help starting with one small task.';
  if (status === 'Feedback to use') return 'Your child has feedback or corrections that can help them improve.';
  if (status === 'Building momentum') return 'Your child is building consistent learning momentum.';
  if (status === 'Active learner') return 'Your child is active and using the platform.';
  return 'Keep checking in gently and positively.';
}
