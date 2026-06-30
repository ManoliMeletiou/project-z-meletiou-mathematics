import { supabase } from './supabaseClient';

export type AiGenerationAllowance = {
  allowed: boolean;
  reason: string;
  role: string;
  hourly_limit: number;
  daily_limit: number;
  hourly_count: number;
  daily_count: number;
  remaining_hourly: number;
  remaining_daily: number;
  reset_hint?: string;
};

export type AiGenerationLog = {
  id: string;
  action: string;
  status: string;
  generation_mode: string | null;
  model: string | null;
  course_code: string | null;
  course_skill_code: string | null;
  quality_score: number | null;
  input_summary: string | null;
  error_message: string | null;
  created_at: string;
};

export async function fetchAiGenerationAllowance() {
  if (!supabase) return null as AiGenerationAllowance | null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null as AiGenerationAllowance | null;

  const { data, error } = await supabase.rpc('project_z_ai_generation_allowance');

  if (error) return null as AiGenerationAllowance | null;
  return data as AiGenerationAllowance;
}

export async function fetchMyAiGenerationLogs() {
  if (!supabase) return [] as AiGenerationLog[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as AiGenerationLog[];

  const { data, error } = await supabase.rpc('project_z_my_ai_generation_logs');

  if (error) return [] as AiGenerationLog[];
  return (data || []) as AiGenerationLog[];
}
