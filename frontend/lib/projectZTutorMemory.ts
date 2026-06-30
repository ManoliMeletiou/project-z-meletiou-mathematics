import { supabase } from './supabaseClient';

export type TutorMemoryItem = {
  id: string;
  course_code: string | null;
  course_skill_code: string | null;
  skill_title: string | null;
  student_message: string;
  tutor_reply: string;
  tutor_mode: string;
  safety_level: string;
  learning_action: string | null;
  created_at: string;
};

export type TutorSafetyStatus = {
  allowed: boolean;
  reason: string;
  role: string;
  hourly_limit?: number;
  hourly_count?: number;
  remaining_hourly?: number;
};

export async function fetchTutorMemory() {
  if (!supabase) return [] as TutorMemoryItem[];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [] as TutorMemoryItem[];

  const { data, error } = await supabase.rpc('project_z_my_tutor_memory');

  if (error) return [] as TutorMemoryItem[];
  return (data || []) as TutorMemoryItem[];
}

export async function fetchTutorSafetyStatus() {
  if (!supabase) return null as TutorSafetyStatus | null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null as TutorSafetyStatus | null;

  const { data, error } = await supabase.rpc('project_z_tutor_safety_status');

  if (error) return null as TutorSafetyStatus | null;
  return data as TutorSafetyStatus;
}

export async function sendTutorMessage(payload: {
  message: string;
  course_code?: string;
  course_skill_code?: string;
  skill_title?: string;
  tutor_mode?: string;
}) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) return { ok: false, reason: 'Sign in first' };

  const response = await fetch('/api/tutor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, reason: text || 'Tutor request failed' };
  }

  const data = await response.json();
  return { ok: true, data };
}
