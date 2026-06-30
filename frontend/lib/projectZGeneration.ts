import { supabase } from './supabaseClient';

export type GenerationSkill = {
  course_skill_code: string;
  course_code: string;
  strand_title: string;
  assessment_criterion: string | null;
  title: string;
  description: string;
  difficulty_band: number;
};

export type GeneratedQuestionCandidate = {
  course_code: string;
  course_skill_code: string;
  assessment_criterion: string | null;
  question_type: string;
  difficulty_band: number;
  prompt: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  source: string;
  generation_mode?: string;
};

export type StagedCandidate = GeneratedQuestionCandidate & {
  id: string;
  quality_score: number;
  flags: Record<string, boolean | string>;
  gate_status: 'passed' | 'needs_review' | 'blocked' | 'promoted';
  teacher_notes: string | null;
  promoted_question_id: string | null;
  created_at: string;
};

export type GenerationStatus = {
  ok: boolean;
  configured: boolean;
  endpointConfigured: boolean;
  apiKeyConfigured: boolean;
  modelConfigured: boolean;
  model: string | null;
  provider: string;
  fallbackEnabled: boolean;
};

export async function fetchGenerationStatus() {
  const response = await fetch('/api/generation-status');
  if (!response.ok) return null as GenerationStatus | null;
  return (await response.json()) as GenerationStatus;
}


export async function fetchGenerationCourses() {
  if (!supabase) return [] as any[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as any[];

  const { data, error } = await supabase.rpc('project_z_curriculum_courses');

  if (error) return [] as any[];
  return (data || []) as any[];
}

export async function fetchGenerationSkills(courseCode: string) {
  if (!supabase) return [] as GenerationSkill[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as GenerationSkill[];

  const { data, error } = await supabase.rpc('project_z_curriculum_skill_map', {
    p_course_code: courseCode
  });

  if (error) return [] as GenerationSkill[];

  return (data || []).map((row: any) => ({
    course_skill_code: row.course_skill_code,
    course_code: row.course_code,
    strand_title: row.strand_title,
    assessment_criterion: row.assessment_criterion,
    title: row.title,
    description: row.description,
    difficulty_band: row.difficulty_band
  })) as GenerationSkill[];
}

export async function generateQualityCandidate(payload: {
  course_code: string;
  course_skill_code: string;
  skill_title: string;
  skill_description: string;
  assessment_criterion: string | null;
  difficulty_band: number;
  desired_question_type?: string;
}) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) return { ok: false, reason: 'Sign in first' };

  const response = await fetch('/api/generate-quality-question', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, reason: text || 'Generation request failed' };
  }

  const data = await response.json();
  return { ok: true, data: data as GeneratedQuestionCandidate };
}

export async function stageGeneratedQuestion(candidate: GeneratedQuestionCandidate) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_stage_generated_question', {
    p_course_code: candidate.course_code,
    p_course_skill_code: candidate.course_skill_code,
    p_assessment_criterion: candidate.assessment_criterion,
    p_question_type: candidate.question_type,
    p_difficulty_band: candidate.difficulty_band,
    p_prompt: candidate.prompt,
    p_option_a: candidate.option_a,
    p_option_b: candidate.option_b,
    p_option_c: candidate.option_c,
    p_option_d: candidate.option_d,
    p_correct_option: candidate.correct_option,
    p_explanation: candidate.explanation,
    p_source: candidate.source
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchGenerationCandidates(courseCode?: string) {
  if (!supabase) return [] as StagedCandidate[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as StagedCandidate[];

  const { data, error } = await supabase.rpc('project_z_generation_candidates', {
    p_course_code: courseCode || null
  });

  if (error) return [] as StagedCandidate[];
  return (data || []) as StagedCandidate[];
}

export async function promoteGeneratedQuestion(candidateId: string, notes?: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_promote_generated_question', {
    p_candidate_id: candidateId,
    p_teacher_notes: notes || null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function rejectGeneratedQuestion(candidateId: string, notes?: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_reject_generated_question', {
    p_candidate_id: candidateId,
    p_teacher_notes: notes || null
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}
