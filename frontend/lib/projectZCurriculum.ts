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

export async function fetchCurriculumCourses() {
  if (!supabase) return [] as CourseCatalogRow[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as CourseCatalogRow[];

  const { data, error } = await supabase.rpc('project_z_curriculum_courses');

  if (error) return [] as CourseCatalogRow[];
  return (data || []) as CourseCatalogRow[];
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
