import { supabase } from './supabaseClient';

export type MasteryEvent = {
  id: string;
  user_id: string;
  course_code: string | null;
  course_skill_code: string | null;
  skill_title: string | null;
  event_type: 'teaching_check' | 'guided_attempt' | 'independent_attempt' | 'correction' | 'checkpoint_success' | 'mastery_achieved' | 'reflection';
  outcome: string | null;
  accuracy: number | null;
  reflection: string | null;
  created_at: string;
};

/**
 * Record a mastery-related event (append-only)
 * This should eventually call a secure Supabase RPC
 */
export async function recordMasteryEvent(event: {
  course_code?: string;
  course_skill_code?: string;
  skill_title?: string;
  event_type: MasteryEvent['event_type'];
  outcome?: string;
  accuracy?: number;
  reflection?: string;
}) {
  if (!supabase) return { ok: false, reason: 'Supabase unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in required' };

  const { error } = await supabase
    .from('project_z_mastery_events')
    .insert({
      user_id: userData.user.id,
      course_code: event.course_code || null,
      course_skill_code: event.course_skill_code || null,
      skill_title: event.skill_title || null,
      event_type: event.event_type,
      outcome: event.outcome || null,
      accuracy: event.accuracy || null,
      reflection: event.reflection || null
    });

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function fetchMyMasteryEvents(skillCode?: string) {
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  let query = supabase
    .from('project_z_mastery_events')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });

  if (skillCode) {
    query = query.eq('course_skill_code', skillCode);
  }

  const { data, error } = await query.limit(50);
  if (error) return [];
  return (data || []) as MasteryEvent[];
}

export async function getMasterySummary(skillCode?: string) {
  const events = await fetchMyMasteryEvents(skillCode);

  const teachingChecks = events.filter(e => e.event_type === 'teaching_check').length;
  const corrections = events.filter(e => e.event_type === 'correction').length;
  const checkpoints = events.filter(e => e.event_type === 'checkpoint_success').length;
  const masteryAchieved = events.some(e => e.event_type === 'mastery_achieved');

  return {
    totalEvents: events.length,
    teachingChecks,
    corrections,
    checkpoints,
    masteryAchieved,
    lastEventAt: events[0]?.created_at || null
  };
}
