import { supabase } from './supabaseClient';
export { auditGeneratedAssignment, auditGeneratedQuestion } from './projectZAssignmentQuality';
export type { AssignmentQualityIssue } from './projectZAssignmentQuality';

export type AssignmentQualityAuditLog = {
  audit_id: string;
  assignment_id: string;
  question_id: string | null;
  audit_type: string;
  audit_status: string;
  issue_codes: string[];
  notes: string | null;
  created_at: string;
};

export type GeneratedAssignmentReleaseReadiness = {
  ready: boolean;
  assignment_id: string;
  question_count_ok: boolean;
  actual_question_count: number;
  unresolved_flags: number;
  automatic_audit_current: boolean;
  teacher_approval_current: boolean;
  rights_status_confirmed: boolean;
  latest_content_change: string | null;
  latest_automatic_pass: string | null;
  latest_teacher_approval: string | null;
};

export type AssignmentReleaseAuditResult = {
  ok: boolean;
  audit_id: string;
  audit_status: 'passed' | 'flagged';
  issue_codes: string[];
  question_count: number;
};


export async function logAssignmentQualityAudit(payload: {
  assignment_id: string;
  question_id?: string | null;
  audit_type: string;
  audit_status: string;
  issue_codes: string[];
  notes?: string;
}) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_log_assignment_quality_audit', {
    p_assignment_id: payload.assignment_id,
    p_question_id: payload.question_id || null,
    p_audit_type: payload.audit_type,
    p_audit_status: payload.audit_status,
    p_issue_codes: payload.issue_codes,
    p_notes: payload.notes || null,
    p_before_question: null,
    p_after_question: null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchAssignmentQualityAuditLogs(assignmentId: string) {
  if (!supabase) return [] as AssignmentQualityAuditLog[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as AssignmentQualityAuditLog[];

  const { data, error } = await supabase.rpc('project_z_assignment_quality_audit_logs', {
    p_assignment_id: assignmentId
  });

  if (error) return [] as AssignmentQualityAuditLog[];
  return (data || []) as AssignmentQualityAuditLog[];
}

export async function runAssignmentReleaseAudit(assignmentId: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' } as const;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' } as const;

  const { data, error } = await supabase.rpc('project_z_run_assignment_release_audit', {
    p_assignment_id: assignmentId
  });

  if (error) return { ok: false, reason: error.message } as const;
  return { ok: true, data: data as AssignmentReleaseAuditResult } as const;
}

export async function fetchGeneratedAssignmentReleaseReadiness(assignmentId: string) {
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase.rpc('project_z_generated_assignment_release_readiness', {
    p_assignment_id: assignmentId
  });

  if (error) return null;
  return data as GeneratedAssignmentReleaseReadiness;
}

export async function approveGeneratedAssignmentRelease(assignmentId: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' } as const;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' } as const;

  const { data, error } = await supabase.rpc('project_z_approve_generated_assignment_release', {
    p_assignment_id: assignmentId,
    p_originality_and_rights_confirmed: true
  });

  if (error) return { ok: false, reason: error.message } as const;
  return { ok: true, data } as const;
}

export async function regenerateAssignmentQuestion(payload: {
  assignment_id: string;
  question_id: string;
  issue_codes: string[];
  notes?: string;
}) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) return { ok: false, reason: 'Sign in first' };

  const response = await fetch('/api/regenerate-assignment-question', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, reason: text || 'Regeneration failed' };
  }

  const data = await response.json();
  return { ok: true, data };
}
