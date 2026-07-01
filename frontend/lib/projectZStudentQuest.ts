import { supabase } from './supabaseClient';

export type StudentQuestProfile = {
  student_id: string;
  total_xp: number;
  level: number;
  coins: number;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  selected_companion: string;
  companion_stage: number;
  current_level_xp: number;
  next_level_xp: number;
  level_progress_percent: number;
  checked_in_today: boolean;
};

export type StudentQuestAchievement = {
  achievement_key: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  display_order: number;
  unlocked: boolean;
  unlocked_at: string | null;
};

const emptyProfile: StudentQuestProfile = {
  student_id: '',
  total_xp: 0,
  level: 1,
  coins: 0,
  current_streak: 0,
  longest_streak: 0,
  last_checkin_date: null,
  selected_companion: 'nova',
  companion_stage: 1,
  current_level_xp: 0,
  next_level_xp: 80,
  level_progress_percent: 0,
  checked_in_today: false
};

export async function fetchStudentQuestProfile() {
  if (!supabase) return emptyProfile;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return emptyProfile;

  const { data, error } = await supabase.rpc('project_z_student_quest_profile');

  if (error || !data || data.length === 0) return emptyProfile;
  return data[0] as StudentQuestProfile;
}

export async function runDailyStreakCheckin() {
  if (!supabase) return emptyProfile;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return emptyProfile;

  const { data, error } = await supabase.rpc('project_z_student_daily_streak_checkin');

  if (error || !data || data.length === 0) return emptyProfile;
  return data[0] as StudentQuestProfile;
}

export async function fetchStudentQuestAchievements() {
  if (!supabase) return [] as StudentQuestAchievement[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as StudentQuestAchievement[];

  const { data, error } = await supabase.rpc('project_z_student_quest_achievements');

  if (error) return [] as StudentQuestAchievement[];
  return (data || []) as StudentQuestAchievement[];
}

export function companionName(stage: number) {
  if (stage >= 5) return 'Constellation';
  if (stage >= 4) return 'Quasar';
  if (stage >= 3) return 'Orbit';
  if (stage >= 2) return 'Pulse';
  return 'Nova';
}

export function companionIcon(stage: number) {
  if (stage >= 5) return '🌌';
  if (stage >= 4) return '☄️';
  if (stage >= 3) return '🪐';
  if (stage >= 2) return '🌟';
  return '✨';
}

export function companionMessage(stage: number) {
  if (stage >= 5) return 'Your companion has become a full constellation of learning evidence.';
  if (stage >= 4) return 'Your companion is glowing with strong habits and persistence.';
  if (stage >= 3) return 'Your companion is growing because you keep practising and correcting.';
  if (stage >= 2) return 'Your companion is warming up. Keep building your streak and XP.';
  return 'Your companion starts small, then grows as you learn.';
}
