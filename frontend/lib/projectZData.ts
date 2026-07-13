import { supabase } from './supabaseClient';

export type ProjectZAttemptInput = {
  skillId: string;
  questionText: string;
  givenAnswer: string;
  correct: boolean;
  source?: string;
  difficulty?: number;
};

export type ProjectZRoleRequest = {
  request_id: string;
  requested_role: 'teacher' | 'parent';
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectZOperatorRoleRequest = {
  request_id: string;
  user_id: string;
  email: string;
  requested_role: 'teacher' | 'parent';
  reason: string | null;
  status: 'pending';
  created_at: string;
  updated_at: string;
};

export type ProjectZAccountDeletionRequest = {
  request_id: string;
  status: 'pending' | 'cancelled' | 'processing' | 'completed';
  requested_at: string;
  grace_ends_at: string;
  cancelled_at: string | null;
  processed_at: string | null;
};

export type ProjectZOperatorDeletionRequest = {
  request_id: string;
  user_id: string;
  email: string;
  role: 'student' | 'teacher' | 'parent';
  status: 'pending';
  requested_at: string;
  grace_ends_at: string;
  eligible: boolean;
};

export async function getCurrentUserEmail() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.email || null;
}

export async function upsertCurrentProfile(role: 'student' | 'teacher' | 'parent', displayName?: string) {
  if (!supabase) {
    return { ok: false, reason: 'Supabase client unavailable' };
  }

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { ok: false, reason: 'Not signed in' };
  }

  const { error } = await supabase.rpc('project_z_upsert_profile', {
    p_role: role,
    p_display_name: displayName || null
  });

  if (error) {
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}

export async function requestRoleAccess(requestedRole: 'teacher' | 'parent', reason?: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' } as const;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' } as const;

  const { data, error } = await supabase.rpc('project_z_request_role', {
    p_requested_role: requestedRole,
    p_reason: reason || null
  });
  if (error) return { ok: false, reason: error.message } as const;
  return { ok: true, data } as const;
}

export async function fetchMyRoleRequests() {
  if (!supabase) return [] as ProjectZRoleRequest[];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as ProjectZRoleRequest[];

  const { data, error } = await supabase.rpc('project_z_my_role_requests');
  if (error) return [] as ProjectZRoleRequest[];
  return (data || []) as ProjectZRoleRequest[];
}

export async function isProjectZOperator() {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('project_z_is_operator');
  return error ? false : data === true;
}

export async function fetchOperatorRoleRequestQueue() {
  if (!supabase) return [] as ProjectZOperatorRoleRequest[];
  const { data, error } = await supabase.rpc('project_z_operator_role_request_queue');
  return error ? [] as ProjectZOperatorRoleRequest[] : (data || []) as ProjectZOperatorRoleRequest[];
}

export async function reviewProjectZRoleRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  reviewNote?: string
) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' } as const;
  const { data, error } = await supabase.rpc('project_z_review_role_request', {
    p_request_id: requestId,
    p_decision: decision,
    p_review_note: reviewNote || null
  });
  return error ? { ok: false, reason: error.message } as const : { ok: true, data } as const;
}

export async function exportMyProjectZData() {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' } as const;
  const { data, error } = await supabase.rpc('project_z_export_my_data');
  return error ? { ok: false, reason: error.message } as const : { ok: true, data } as const;
}

export async function fetchMyAccountDeletionRequest() {
  if (!supabase) return null as ProjectZAccountDeletionRequest | null;
  const { data, error } = await supabase.rpc('project_z_my_account_deletion_request');
  if (error) return null;
  return ((data || [])[0] || null) as ProjectZAccountDeletionRequest | null;
}

export async function requestProjectZAccountDeletion(confirmation: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' } as const;
  const { data, error } = await supabase.rpc('project_z_request_account_deletion', {
    p_confirmation: confirmation
  });
  return error ? { ok: false, reason: error.message } as const : { ok: true, data } as const;
}

export async function cancelProjectZAccountDeletion() {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' } as const;
  const { data, error } = await supabase.rpc('project_z_cancel_account_deletion');
  return error ? { ok: false, reason: error.message } as const : { ok: true, data } as const;
}

export async function fetchOperatorDeletionQueue() {
  if (!supabase) return [] as ProjectZOperatorDeletionRequest[];
  const { data, error } = await supabase.rpc('project_z_operator_deletion_queue');
  return error ? [] as ProjectZOperatorDeletionRequest[] : (data || []) as ProjectZOperatorDeletionRequest[];
}

export async function processProjectZAccountDeletion(requestId: string, confirmation: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' } as const;
  const { data, error } = await supabase.rpc('project_z_operator_process_account_deletion', {
    p_request_id: requestId,
    p_confirmation: confirmation
  });
  return error ? { ok: false, reason: error.message } as const : { ok: true, data } as const;
}

export async function recordPracticeAttempt(input: ProjectZAttemptInput) {
  if (!supabase) {
    return { ok: false, synced: false, reason: 'Supabase client unavailable' };
  }

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { ok: false, synced: false, reason: 'Not signed in' };
  }

  const { data, error } = await supabase.rpc('project_z_record_attempt', {
    p_skill_id: input.skillId,
    p_question_text: input.questionText,
    p_given_answer: input.givenAnswer,
    p_correct: input.correct,
    p_source: input.source || 'unknown',
    p_difficulty: input.difficulty || 2
  });

  if (error) {
    return { ok: false, synced: false, reason: error.message };
  }

  return { ok: true, synced: true, data };
}

export async function fetchMyMastery() {
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('project_z_skill_mastery')
    .select('skill_id, attempts, correct, mastery_score, last_attempt_at')
    .order('updated_at', { ascending: false });

  if (error) return [];

  return data || [];
}

export async function fetchMyRecentAttempts(limit = 10) {
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('project_z_practice_attempts')
    .select('id, skill_id, question_text, given_answer, correct, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];

  return data || [];
}
