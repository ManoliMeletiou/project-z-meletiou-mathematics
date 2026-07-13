import { supabase } from './supabaseClient';

export type CourseCatalogRow = {
  course_code: string;
  program: 'MYP' | 'DP';
  level_name: string;
  track_name: string | null;
  display_name: string;
  parent_course_code: string | null;
  is_gateway: boolean;
  is_selectable: boolean;
  sort_order: number;
  year_number?: number | null;
  atlas_skill_count?: number;
  reviewed_skill_count?: number;
  variant_ready_skill_count?: number;
  strict_verified_variant_count?: number;
  release_state?: 'blocked' | 'pilot' | 'released' | 'retired';
  advertised_complete?: boolean;
  required_min_variants_per_skill?: number;
  source_reviewed?: boolean;
  release_block_reason?: string;
};

export type SelectedCourseRow = {
  course_code: string;
  display_name: string;
  program: 'MYP' | 'DP';
  level_name: string;
  track_name: string | null;
  selected_at: string;
};

export type CurriculumSkillRow = {
  course_skill_code: string;
  course_code: string;
  course_display_name: string;
  strand_code: string;
  strand_title: string;
  assessment_criterion: string | null;
  title: string;
  description: string;
  prerequisite_skill_codes: string[];
  diagnostic_enabled: boolean;
  practice_enabled: boolean;
  game_path_enabled: boolean;
  difficulty_band: number;
  target_mastery_percent: number;
  max_mastery_percent: number;
  mastery_percent: number;
  confidence_percent: number;
  evidence_count: number;
  correct_count: number;
  sort_order: number;
};

export type AtlasSkillCoverageRow = {
  atlas_skill_code: string;
  canonical_skill_id: string;
  title: string;
  learning_objective: string;
  strand_code: string;
  subtopic_code: string | null;
  placement_stages: string[];
  course_sequence: number;
  difficulty_band: number;
  prerequisite_count: number;
  review_status: 'candidate' | 'needs_revision' | 'educator_review' | 'approved' | 'retired';
  candidate_verified_variant_count: number;
  strict_verified_variant_count: number;
  required_min_variants: number;
  release_ready: boolean;
};

export async function fetchCurriculumCourses() {
  if (!supabase) return [] as CourseCatalogRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as CourseCatalogRow[];

  const { data, error } = await supabase.rpc('project_z_curriculum_pathways');

  if (error) return [] as CourseCatalogRow[];
  return ((data || []) as Omit<CourseCatalogRow, 'parent_course_code' | 'is_gateway' | 'is_selectable'>[])
    .map((course) => ({
      ...course,
      parent_course_code: null,
      is_gateway: false,
      is_selectable: true
    }));
}

export async function fetchAtlasSkillCoverage(courseCode: string) {
  if (!supabase) return [] as AtlasSkillCoverageRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as AtlasSkillCoverageRow[];

  const { data, error } = await supabase.rpc('project_z_atlas_skill_coverage', {
    p_course_code: courseCode
  });

  if (error) return [] as AtlasSkillCoverageRow[];
  return (data || []) as AtlasSkillCoverageRow[];
}

export async function selectStudentCourse(courseCode: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const { data, error } = await supabase.rpc('project_z_select_student_course', {
    p_course_code: courseCode
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function fetchMySelectedCourse() {
  if (!supabase) return null as SelectedCourseRow | null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null as SelectedCourseRow | null;

  const { data, error } = await supabase.rpc('project_z_my_selected_course');

  if (error || !data || data.length === 0) return null as SelectedCourseRow | null;
  return data[0] as SelectedCourseRow;
}

export async function fetchCurriculumSkillMap(courseCode?: string) {
  if (!supabase) return [] as CurriculumSkillRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as CurriculumSkillRow[];

  const { data, error } = await supabase.rpc('project_z_curriculum_skill_map', {
    p_course_code: courseCode || null
  });

  if (error) return [] as CurriculumSkillRow[];
  return (data || []) as CurriculumSkillRow[];
}
