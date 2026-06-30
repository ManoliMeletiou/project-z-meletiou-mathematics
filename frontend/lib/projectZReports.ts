import { supabase } from './supabaseClient';

export type StudentReportOverview = {
  student_id: string;
  student_name: string;
  student_email: string;
  course_code: string | null;
  course_display_name: string | null;
  total_diagnostic_attempts: number;
  total_practice_attempts: number;
  average_mastery: number;
  average_confidence: number;
  weak_skill_count: number;
  developing_skill_count: number;
  strong_skill_count: number;
  mastered_review_count: number;
  locked_skill_count: number;
  ready_skill_count: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  urgent_next_step: string;
  report_generated_at: string;
};

export type StudentReportSkill = {
  student_id: string;
  course_skill_code: string;
  course_code: string;
  strand_title: string;
  assessment_criterion: string | null;
  title: string;
  description: string;
  mastery_percent: number;
  confidence_percent: number;
  evidence_count: number;
  correct_count: number;
  skill_band: string;
  next_step: string;
  priority_rank: number;
};

export type TeacherReportStudent = {
  student_id: string;
  student_name: string;
  student_email: string;
  class_id: string;
  class_name: string;
  course_code: string | null;
  course_display_name: string | null;
  average_mastery: number;
  average_confidence: number;
  weak_skill_count: number;
  developing_skill_count: number;
  strong_skill_count: number;
  total_diagnostic_attempts: number;
  total_practice_attempts: number;
  urgent_next_step: string;
};

export type ParentReportChild = {
  student_id: string;
  student_name: string;
  student_email: string;
  course_code: string | null;
  course_display_name: string | null;
  average_mastery: number;
  average_confidence: number;
  weak_skill_count: number;
  developing_skill_count: number;
  strong_skill_count: number;
  total_diagnostic_attempts: number;
  total_practice_attempts: number;
  total_xp: number;
  current_streak: number;
  urgent_next_step: string;
};

export async function fetchOwnReportOverview() {
  if (!supabase) return null as StudentReportOverview | null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null as StudentReportOverview | null;

  const { data, error } = await supabase.rpc('project_z_student_report_overview', {
    p_student_id: null
  });

  if (error || !data || data.length === 0) return null as StudentReportOverview | null;
  return data[0] as StudentReportOverview;
}

export async function fetchStudentReportOverview(studentId: string) {
  if (!supabase) return null as StudentReportOverview | null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null as StudentReportOverview | null;

  const { data, error } = await supabase.rpc('project_z_student_report_overview', {
    p_student_id: studentId
  });

  if (error || !data || data.length === 0) return null as StudentReportOverview | null;
  return data[0] as StudentReportOverview;
}

export async function fetchStudentReportSkills(studentId?: string) {
  if (!supabase) return [] as StudentReportSkill[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as StudentReportSkill[];

  const { data, error } = await supabase.rpc('project_z_student_report_skills', {
    p_student_id: studentId || null
  });

  if (error) return [] as StudentReportSkill[];
  return (data || []) as StudentReportSkill[];
}

export async function fetchTeacherReportStudents() {
  if (!supabase) return [] as TeacherReportStudent[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TeacherReportStudent[];

  const { data, error } = await supabase.rpc('project_z_teacher_report_students');

  if (error) return [] as TeacherReportStudent[];
  return (data || []) as TeacherReportStudent[];
}

export async function fetchParentReportChildren() {
  if (!supabase) return [] as ParentReportChild[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as ParentReportChild[];

  const { data, error } = await supabase.rpc('project_z_parent_report_children');

  if (error) return [] as ParentReportChild[];
  return (data || []) as ParentReportChild[];
}
