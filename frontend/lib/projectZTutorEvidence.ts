import { supabase } from './supabaseClient';

export type TutorLearningEvidence = {
  id: string;
  tutor_interaction_id: string | null;
  course_code: string | null;
  course_skill_code: string | null;
  skill_title: string | null;
  evidence_type: string;
  evidence_strength: number;
  mastery_delta: number;
  confidence_delta: number;
  notes: string | null;
  created_at: string;
};

export type TutorEvidenceSummary = {
  course_skill_code: string | null;
  skill_title: string | null;
  evidence_count: number;
  average_evidence_strength: number;
  total_mastery_delta: number;
  total_confidence_delta: number;
  misconception_count: number;
  hint_needed_count: number;
  independent_step_count: number;
  last_evidence_at: string;
};

export async function fetchTutorLearningEvidence() {
  if (!supabase) return [] as TutorLearningEvidence[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TutorLearningEvidence[];

  const { data, error } = await supabase.rpc('project_z_my_tutor_learning_evidence');

  if (error) return [] as TutorLearningEvidence[];
  return (data || []) as TutorLearningEvidence[];
}

export async function fetchTutorEvidenceSummary() {
  if (!supabase) return [] as TutorEvidenceSummary[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TutorEvidenceSummary[];

  const { data, error } = await supabase.rpc('project_z_my_tutor_evidence_summary');

  if (error) return [] as TutorEvidenceSummary[];
  return (data || []) as TutorEvidenceSummary[];
}

export async function recordTutorEvidence(payload: {
  course_code?: string;
  course_skill_code?: string;
  skill_title?: string;
  evidence_type: string;
  notes?: string;
}) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_record_tutor_evidence', {
    p_tutor_interaction_id: null,
    p_course_code: payload.course_code || null,
    p_course_skill_code: payload.course_skill_code || null,
    p_skill_title: payload.skill_title || null,
    p_evidence_type: payload.evidence_type,
    p_notes: payload.notes || null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}
