import { PROJECT_Z_PATHWAY_CODES, type ProjectZPathwayCode } from './projectZCurriculumFoundation';
import { supabase } from './supabaseClient';

export type ProjectZCurriculumReviewerRole = 'curriculum_mapper' | 'mathematics_educator';

export type ProjectZCurriculumReviewAccess = {
  is_operator: boolean;
  reviewer_roles: ProjectZCurriculumReviewerRole[];
  authorized_source_count: number;
  active_reviewer_count: number;
};

export type ProjectZCurriculumReviewer = {
  user_id: string;
  email: string | null;
  database_role: string;
  reviewer_kind: ProjectZCurriculumReviewerRole;
  active: boolean;
  credential_note: string;
  verified_at: string;
};

export type ProjectZAuthorizedCurriculumSource = {
  source_code: string;
  title: string;
  publisher: string;
  framework_version: string;
  notes: string;
};

export type ProjectZCurriculumReviewItem = {
  atlas_skill_code: string;
  course_code: ProjectZPathwayCode;
  title: string;
  learning_objective: string;
  strand_code: string;
  course_sequence: number;
  review_status: 'candidate' | 'needs_revision' | 'educator_review' | 'approved' | 'retired';
  source_alignment_status: 'unreviewed' | 'aligned' | 'needs_revision';
  source_code: string | null;
  source_title: string | null;
  source_kind: string | null;
  source_locator: string | null;
  source_aligned_at: string | null;
  educator_review_status: 'unreviewed' | 'approved' | 'needs_revision';
  educator_reviewed_at: string | null;
  strict_verified_variant_count: number;
  required_min_variants: number;
  readiness_blockers: string[];
};

const pathwayNames: Record<ProjectZPathwayCode, string> = {
  myp_1_standard: 'MYP Year 1 · Standard',
  myp_1_extended: 'MYP Year 1 · Extended',
  myp_2_standard: 'MYP Year 2 · Standard',
  myp_2_extended: 'MYP Year 2 · Extended',
  myp_3_standard: 'MYP Year 3 · Standard',
  myp_3_extended: 'MYP Year 3 · Extended',
  myp_4_standard: 'MYP Year 4 · Standard',
  myp_4_extended: 'MYP Year 4 · Extended',
  myp_5_standard: 'MYP Year 5 · Standard',
  myp_5_extended: 'MYP Year 5 · Extended',
  dp_aa_standard: 'DP Analysis and Approaches · SL',
  dp_aa_higher: 'DP Analysis and Approaches · HL',
  dp_ai_standard: 'DP Applications and Interpretation · SL',
  dp_ai_higher: 'DP Applications and Interpretation · HL'
};

export const projectZReviewPathwayOptions = PROJECT_Z_PATHWAY_CODES.map((courseCode) => ({
  courseCode,
  displayName: pathwayNames[courseCode]
}));

function unavailable<T>(fallback: T) {
  return { ok: false as const, reason: 'Supabase client unavailable', data: fallback };
}

export async function fetchProjectZCurriculumReviewAccess() {
  if (!supabase) return unavailable<ProjectZCurriculumReviewAccess | null>(null);
  const { data, error } = await supabase.rpc('project_z_curriculum_review_access');
  if (error) return { ok: false as const, reason: error.message, data: null };
  const row = (Array.isArray(data) ? data[0] : data) as ProjectZCurriculumReviewAccess | null;
  return { ok: true as const, data: row };
}

export async function fetchProjectZCurriculumReviewQueue(courseCode: ProjectZPathwayCode | null) {
  if (!supabase) return unavailable<ProjectZCurriculumReviewItem[]>([]);
  const { data, error } = await supabase.rpc('project_z_operator_curriculum_review_queue', {
    p_course_code: courseCode,
    p_limit: 100,
    p_offset: 0
  });
  return error
    ? { ok: false as const, reason: error.message, data: [] as ProjectZCurriculumReviewItem[] }
    : { ok: true as const, data: (data || []) as ProjectZCurriculumReviewItem[] };
}

export async function fetchProjectZCurriculumReviewerRoster() {
  if (!supabase) return unavailable<ProjectZCurriculumReviewer[]>([]);
  const { data, error } = await supabase.rpc('project_z_operator_curriculum_reviewer_roster');
  return error
    ? { ok: false as const, reason: error.message, data: [] as ProjectZCurriculumReviewer[] }
    : { ok: true as const, data: (data || []) as ProjectZCurriculumReviewer[] };
}

export async function fetchProjectZAuthorizedCurriculumSources() {
  if (!supabase) return unavailable<ProjectZAuthorizedCurriculumSource[]>([]);
  const { data, error } = await supabase
    .from('project_z_curriculum_sources')
    .select('source_code, title, publisher, framework_version, notes')
    .eq('source_kind', 'authorized_subject_guide')
    .eq('allowed_use_status', 'licensed_internal_reference')
    .order('title');
  return error
    ? { ok: false as const, reason: error.message, data: [] as ProjectZAuthorizedCurriculumSource[] }
    : { ok: true as const, data: (data || []) as ProjectZAuthorizedCurriculumSource[] };
}

export async function registerProjectZCurriculumReviewer(
  userId: string,
  reviewerKind: ProjectZCurriculumReviewerRole,
  credentialNote: string
) {
  if (!supabase) return unavailable(null);
  const { data, error } = await supabase.rpc('project_z_operator_register_curriculum_reviewer', {
    p_user_id: userId,
    p_reviewer_kind: reviewerKind,
    p_credential_note: credentialNote
  });
  return error ? { ok: false as const, reason: error.message, data: null } : { ok: true as const, data };
}

export async function registerProjectZAuthorizedCurriculumSource(input: {
  sourceCode: string;
  title: string;
  publisher: string;
  frameworkVersion: string;
  notes: string;
}) {
  if (!supabase) return unavailable(null);
  const { data, error } = await supabase.rpc('project_z_operator_register_authorized_curriculum_source', {
    p_source_code: input.sourceCode,
    p_title: input.title,
    p_publisher: input.publisher,
    p_framework_version: input.frameworkVersion,
    p_notes: input.notes
  });
  return error ? { ok: false as const, reason: error.message, data: null } : { ok: true as const, data };
}

export async function reviewProjectZCurriculumSourceAlignment(input: {
  atlasSkillCode: string;
  sourceCode: string | null;
  sourceLocator: string | null;
  decision: 'aligned' | 'needs_revision';
  notes: string;
}) {
  if (!supabase) return unavailable(null);
  const { data, error } = await supabase.rpc('project_z_review_curriculum_source_alignment', {
    p_atlas_skill_code: input.atlasSkillCode,
    p_source_code: input.sourceCode,
    p_source_locator: input.sourceLocator,
    p_decision: input.decision,
    p_notes: input.notes
  });
  return error ? { ok: false as const, reason: error.message, data: null } : { ok: true as const, data };
}

export async function reviewProjectZCurriculumEducatorSignoff(input: {
  atlasSkillCode: string;
  decision: 'approved' | 'needs_revision';
  notes: string;
  attestation: string;
}) {
  if (!supabase) return unavailable(null);
  const { data, error } = await supabase.rpc('project_z_review_curriculum_educator_signoff', {
    p_atlas_skill_code: input.atlasSkillCode,
    p_decision: input.decision,
    p_notes: input.notes,
    p_attestation: input.attestation
  });
  return error ? { ok: false as const, reason: error.message, data: null } : { ok: true as const, data };
}
