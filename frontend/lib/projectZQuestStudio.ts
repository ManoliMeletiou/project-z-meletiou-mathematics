import { supabase } from './supabaseClient';

export type QuestCosmetic = {
  cosmetic_key: string;
  cosmetic_type: 'companion_skin' | 'aura' | 'badge' | 'title' | 'theme';
  display_name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  min_level: number;
  min_streak: number;
  required_achievement_key: string | null;
  display_order: number;
  unlocked: boolean;
  unlock_reason: string;
  selected: boolean;
};

export type QuestIdentity = {
  ok: boolean;
  student_id: string;
  level: number;
  total_xp: number;
  current_streak: number;
  companion_stage: number;
  skin: { key: string; name: string; icon: string; rarity: string };
  aura: { key: string; name: string; icon: string; rarity: string };
  badge: { key: string; name: string; icon: string; rarity: string };
  title: { key: string; name: string; icon: string; rarity: string };
  theme: { key: string; name: string; icon: string; rarity: string };
};

export async function fetchQuestCosmetics() {
  if (!supabase) return [] as QuestCosmetic[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as QuestCosmetic[];

  const { data, error } = await supabase.rpc('project_z_student_quest_cosmetics');

  if (error) return [] as QuestCosmetic[];
  return (data || []) as QuestCosmetic[];
}

export async function fetchQuestIdentity() {
  if (!supabase) return null as QuestIdentity | null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase.rpc('project_z_student_quest_identity');

  if (error || !data) return null;
  return data as QuestIdentity;
}

export async function updateQuestIdentity(cosmeticKey: string) {
  if (!supabase) return null as QuestIdentity | null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase.rpc('project_z_update_student_quest_identity', {
    p_cosmetic_key: cosmeticKey
  });

  if (error || !data) return null;
  return data as QuestIdentity;
}

export function cosmeticTypeLabel(type: string) {
  if (type === 'companion_skin') return 'Companion';
  if (type === 'aura') return 'Aura';
  if (type === 'badge') return 'Badge';
  if (type === 'title') return 'Title';
  if (type === 'theme') return 'Theme';
  return type;
}

export function rarityLabel(rarity: string) {
  if (rarity === 'legendary') return 'Legendary';
  if (rarity === 'epic') return 'Epic';
  if (rarity === 'rare') return 'Rare';
  return 'Common';
}
