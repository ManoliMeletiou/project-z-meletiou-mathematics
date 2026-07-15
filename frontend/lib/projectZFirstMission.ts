import { supabase } from './supabaseClient';

export type FirstMissionSummary = {
  state:
    | 'diagnostic_required'
    | 'awaiting_reviewed_slice'
    | 'ready_to_start'
    | 'teaching'
    | 'guided'
    | 'independent'
    | 'correction'
    | 'checkpoint'
    | 'remediation'
    | 'mastered'
    | 'paused'
    | 'quarantined';
  mission_started: boolean;
  mission_id?: string;
  course_code?: string;
  course_skill_code?: string;
  canonical_skill_id?: string;
  teaching_steps_completed?: number;
  guided_attempts?: number;
  independent_attempts?: number;
  checkpoint_attempts?: number;
  corrections_completed?: number;
  mastery_decision?: 'not_yet' | 'mastered';
  mastery_percent?: number;
  confidence_percent?: number;
  game_stage_unlocked: boolean;
  reward_recorded?: boolean;
  reward_is_motivation_only?: true;
  release_blockers?: string[];
  message?: string;
};

export type TeachingStep = {
  done: boolean;
  state: string;
  mission_id?: string;
  asset_code?: string;
  step_order?: number;
  title?: string;
  explanation?: string;
  worked_example_prompt?: string;
  worked_example_solution?: string;
  check_prompt?: string;
  answer_kind?: string;
  message?: string;
};

export type PracticeDelivery = {
  done: boolean;
  state: string;
  mission_id?: string;
  delivery_id?: string;
  attempt_id?: string;
  phase?: 'guided' | 'independent' | 'checkpoint' | 'remediation';
  sequence_number?: number;
  family_code?: string;
  prompt?: string;
  answer_kind?: string;
  difficulty?: number;
  hints?: string[];
  scaffold_hint?: string;
  message?: string;
  game_stage_unlocked?: boolean;
};

type RpcResult<T> = { ok: true; data: T } | { ok: false; reason: string };

async function rpc<T>(name: string, parameters?: Record<string, unknown>): Promise<RpcResult<T>> {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };
  const { data, error } = await supabase.rpc(name, parameters);
  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: data as T };
}

export function fetchFirstMissionSummary() {
  return rpc<FirstMissionSummary>('project_z_my_first_learning_mission');
}

export function startFirstLearningMission() {
  return rpc<{ id: string }>('project_z_start_first_learning_mission');
}

export function fetchNextTeachingStep(missionId: string) {
  return rpc<TeachingStep>('project_z_next_first_mission_teaching_step', {
    p_mission_id: missionId
  });
}

export function submitTeachingCheck(
  missionId: string,
  assetCode: string,
  responseText: string,
  clientEventId: string
) {
  return rpc<{
    recorded: boolean;
    replayed: boolean;
    correct: boolean;
    completed_steps: number;
    worked_solution?: string;
    scaffold_hint?: string;
    next_action: string;
  }>('project_z_submit_first_mission_teaching_check', {
    p_mission_id: missionId,
    p_asset_code: assetCode,
    p_response_text: responseText,
    p_client_event_id: clientEventId
  });
}

export function fetchNextMissionPractice(missionId: string) {
  return rpc<PracticeDelivery>('project_z_next_first_mission_practice', {
    p_mission_id: missionId
  });
}

export function submitMissionPractice(
  missionId: string,
  deliveryId: string,
  submittedAnswer: string,
  clientEventId: string
) {
  return rpc<{
    recorded: boolean;
    replayed: boolean;
    attempt_id: string;
    correct: boolean;
    phase: string;
    worked_solution: string;
    correction_required: boolean;
    next_action: string;
    mastery: Record<string, unknown>;
    reward_is_motivation_only: true;
  }>('project_z_submit_first_mission_practice', {
    p_mission_id: missionId,
    p_delivery_id: deliveryId,
    p_submitted_answer: submittedAnswer,
    p_client_event_id: clientEventId
  });
}

export function submitMissionCorrection(
  missionId: string,
  attemptId: string,
  retryAnswer: string,
  reflectionText: string,
  clientEventId: string
) {
  return rpc<{
    recorded: boolean;
    replayed: boolean;
    answer_repaired: boolean;
    worked_solution: string;
    next_action: string;
    mastery: Record<string, unknown>;
    reward_is_motivation_only: true;
  }>('project_z_submit_first_mission_correction', {
    p_mission_id: missionId,
    p_attempt_id: attemptId,
    p_retry_answer: retryAnswer,
    p_reflection_text: reflectionText,
    p_client_event_id: clientEventId
  });
}
