import { supabase } from './supabaseClient';

export type CompanionUpgradeSummary = {
  companion_stage: number;
  current_stage_xp: number;
  next_stage_xp: number;
  stage_progress_percent: number;
  next_upgrade_title: string;
  next_upgrade_description: string;
  next_required_level: number;
  next_required_streak: number;
  suggested_mood: 'idle' | 'celebrate' | 'thinking' | 'encourage' | 'studio';
  recent_event_count: number;
};

export type CompanionEvolutionMilestone = {
  stage: number;
  title: string;
  description: string;
  required_level: number;
  required_streak: number;
  visual_trait: string;
  learning_focus: string;
  active: boolean;
  current_stage: boolean;
  locked: boolean;
  display_order: number;
};

export const fallbackCompanionMilestones: CompanionEvolutionMilestone[] = [
  { stage: 1, title: 'Spark Form', description: 'Your companion begins as a small learning spark.', required_level: 1, required_streak: 0, visual_trait: 'small glowing core', learning_focus: 'start learning and complete first actions', active: true, current_stage: true, locked: false, display_order: 1 },
  { stage: 2, title: 'Nova Form', description: 'Your companion brightens when you build regular learning habits.', required_level: 2, required_streak: 1, visual_trait: 'brighter glow and extra orbit sparkle', learning_focus: 'consistency and assignment completion', active: false, current_stage: false, locked: true, display_order: 2 },
  { stage: 3, title: 'Orbit Form', description: 'Your companion grows when you correct mistakes and use feedback.', required_level: 3, required_streak: 2, visual_trait: 'orbit system and animated reactions', learning_focus: 'corrections and misconception repair', active: false, current_stage: false, locked: true, display_order: 3 },
  { stage: 4, title: 'Quasar Form', description: 'Your companion becomes powerful through persistence over time.', required_level: 4, required_streak: 4, visual_trait: 'multiple rings and stronger aura', learning_focus: 'persistence and challenging tasks', active: false, current_stage: false, locked: true, display_order: 4 },
  { stage: 5, title: 'Constellation Form', description: 'Your companion reaches legendary form through long-term mastery habits.', required_level: 5, required_streak: 7, visual_trait: 'legendary constellation shell', learning_focus: 'retrieval practice and independence', active: false, current_stage: false, locked: true, display_order: 5 }
];

export function fallbackUpgradeSummary(stage = 1): CompanionUpgradeSummary {
  const safeStage = Math.max(1, Math.min(5, Number(stage || 1)));
  const next = fallbackCompanionMilestones.find((item) => item.stage === Math.min(5, safeStage + 1));
  return {
    companion_stage: safeStage,
    current_stage_xp: 0,
    next_stage_xp: 100,
    stage_progress_percent: safeStage >= 5 ? 100 : safeStage * 18,
    next_upgrade_title: next?.title || 'Constellation maintenance',
    next_upgrade_description: next?.description || 'Keep practising, correcting, reflecting, and building long-term mathematical confidence.',
    next_required_level: next?.required_level || safeStage,
    next_required_streak: next?.required_streak || 0,
    suggested_mood: safeStage >= 5 ? 'celebrate' : 'idle',
    recent_event_count: 0
  };
}

export async function fetchCompanionUpgradeSummary(stageFallback = 1) {
  if (!supabase) return fallbackUpgradeSummary(stageFallback);
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fallbackUpgradeSummary(stageFallback);
  const { data, error } = await supabase.rpc('project_z_companion_upgrade_summary');
  if (error || !data || data.length === 0) return fallbackUpgradeSummary(stageFallback);
  return data[0] as CompanionUpgradeSummary;
}

export async function fetchCompanionEvolutionPath(stageFallback = 1) {
  if (!supabase) {
    return fallbackCompanionMilestones.map((item) => ({ ...item, active: item.stage <= stageFallback, current_stage: item.stage === stageFallback, locked: item.stage > stageFallback }));
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fallbackCompanionMilestones;
  const { data, error } = await supabase.rpc('project_z_companion_evolution_path');
  if (error || !data || data.length === 0) return fallbackCompanionMilestones;
  return data as CompanionEvolutionMilestone[];
}

export async function logCompanionUpgradeEvent(eventType: string, eventKey: string, mood = 'idle') {
  if (!supabase) return { ok: false };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false };
  const { data, error } = await supabase.rpc('project_z_log_companion_upgrade_event', {
    p_event_key: eventKey,
    p_event_type: eventType,
    p_xp_delta: 0,
    p_companion_xp_delta: 0,
    p_mood: mood,
    p_metadata: {}
  });
  if (error || !data) return { ok: false };
  return data as { ok: boolean; event_id?: string; reason?: string };
}
