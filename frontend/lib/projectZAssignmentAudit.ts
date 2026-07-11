import { supabase } from './supabaseClient';
import { GeneratedAssignmentQuestion } from './projectZGeneratedAssignments';

export type AssignmentQualityIssue = {
  code: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
};

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

export function auditGeneratedQuestion(question: GeneratedAssignmentQuestion): AssignmentQualityIssue[] {
  const issues: AssignmentQualityIssue[] = [];
  const prompt = question.prompt || '';
  const explanation = question.explanation || '';
  const correctAnswer = question.correct_answer || '';

  if (prompt.trim().length < 18) {
    issues.push({
      code: 'PROMPT_TOO_SHORT',
      severity: 'high',
      message: 'Prompt is too short or too vague.'
    });
  }

  if (explanation.trim().length < 20) {
    issues.push({
      code: 'EXPLANATION_TOO_SHORT',
      severity: 'medium',
      message: 'Explanation is too short to support learning.'
    });
  }

  if (!correctAnswer.trim()) {
    issues.push({
      code: 'MISSING_ANSWER',
      severity: 'high',
      message: 'Correct answer is missing.'
    });
  }

  if (question.question_type === 'multiple_choice') {
    const options = question.options;
    const values = options ? [options.A, options.B, options.C, options.D].map((value) => String(value || '').trim()) : [];

    if (!options || values.some((value) => !value)) {
      issues.push({
        code: 'MCQ_MISSING_OPTIONS',
        severity: 'high',
        message: 'Multiple-choice question must have A, B, C, and D options.'
      });
    }

    if (values.length === 4 && new Set(values).size < 4) {
      issues.push({
        code: 'MCQ_REPEATED_OPTIONS',
        severity: 'high',
        message: 'Multiple-choice options should not repeat.'
      });
    }

    if (!question.correct_option || !['A', 'B', 'C', 'D'].includes(question.correct_option)) {
      issues.push({
        code: 'MCQ_MISSING_CORRECT_OPTION',
        severity: 'high',
        message: 'Multiple-choice question needs a correct option A-D.'
      });
    }

    const lengths = values.map((value) => value.length).filter(Boolean);
    if (lengths.length === 4 && Math.max(...lengths) - Math.min(...lengths) > 60) {
      issues.push({
        code: 'MCQ_OPTIONS_UNBALANCED',
        severity: 'medium',
        message: 'Answer options may be too obviously different in length.'
      });
    }
  }

  if (!question.course_skill_code || !question.skill_title) {
    issues.push({
      code: 'SKILL_LOCK_MISSING',
      severity: 'high',
      message: 'Question is missing skill-lock information.'
    });
  }

  if (!['A', 'B', 'C', 'D'].includes(question.criterion)) {
    issues.push({
      code: 'INVALID_CRITERION',
      severity: 'high',
      message: 'Criterion must be A, B, C, or D.'
    });
  }

  if (!['foundation', 'core', 'standard', 'extended', 'challenge', 'reflection'].includes(question.difficulty_band)) {
    issues.push({
      code: 'INVALID_DIFFICULTY',
      severity: 'high',
      message: 'Difficulty band is invalid.'
    });
  }

  return issues;
}

export function auditGeneratedAssignment(questions: GeneratedAssignmentQuestion[]) {
  const byQuestion = questions.map((question) => ({
    question,
    issues: auditGeneratedQuestion(question)
  }));

  const allIssues = byQuestion.flatMap((item) => item.issues);
  const highIssues = allIssues.filter((issue) => issue.severity === 'high');
  const mediumIssues = allIssues.filter((issue) => issue.severity === 'medium');

  const optionDistribution = questions.reduce<Record<string, number>>((acc, question) => {
    if (question.correct_option) acc[question.correct_option] = (acc[question.correct_option] || 0) + 1;
    return acc;
  }, { A: 0, B: 0, C: 0, D: 0 });

  const criterionDistribution = questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.criterion] = (acc[question.criterion] || 0) + 1;
    return acc;
  }, { A: 0, B: 0, C: 0, D: 0 });

  const difficultyDistribution = questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.difficulty_band] = (acc[question.difficulty_band] || 0) + 1;
    return acc;
  }, {});

  return {
    byQuestion,
    allIssues,
    highIssues,
    mediumIssues,
    optionDistribution,
    criterionDistribution,
    difficultyDistribution,
    questionCountOk: questions.length >= 30,
    flaggedQuestions: byQuestion.filter((item) => item.issues.length > 0)
  };
}

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
