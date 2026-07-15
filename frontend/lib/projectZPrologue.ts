export type PrologueGateInput = {
  studentRole: boolean;
  pathwaySelected: boolean;
  setupComplete: boolean;
  toolOrientationComplete: boolean;
  pathwayReleaseReady: boolean;
  calibrationApproved: boolean;
  diagnosticOutcome: 'not_started' | 'pending' | 'inconclusive' | 'sufficient';
  firstMissionAssigned: boolean;
};

export type PrologueGateState = {
  state:
    | 'student_role_required'
    | 'pathway_required'
    | 'setup_required'
    | 'tool_orientation_required'
    | 'awaiting_reviewed_release'
    | 'diagnostic_required'
    | 'diagnostic_inconclusive'
    | 'first_mission_required'
    | 'first_mission_ready';
  mainGameUnlocked: boolean;
};

/**
 * Pure mirror of the database release boundary. The database remains authoritative;
 * this helper exists so UI state and fail-closed behavior can be unit tested.
 */
export function evaluatePrologueGate(input: PrologueGateInput): PrologueGateState {
  if (!input.studentRole) return { state: 'student_role_required', mainGameUnlocked: false };
  if (!input.pathwaySelected) return { state: 'pathway_required', mainGameUnlocked: false };
  if (!input.setupComplete) return { state: 'setup_required', mainGameUnlocked: false };
  if (!input.toolOrientationComplete) return { state: 'tool_orientation_required', mainGameUnlocked: false };
  if (!input.pathwayReleaseReady || !input.calibrationApproved) {
    return { state: 'awaiting_reviewed_release', mainGameUnlocked: false };
  }
  if (input.diagnosticOutcome === 'inconclusive') {
    return { state: 'diagnostic_inconclusive', mainGameUnlocked: false };
  }
  if (input.diagnosticOutcome !== 'sufficient') {
    return { state: 'diagnostic_required', mainGameUnlocked: false };
  }
  if (!input.firstMissionAssigned) {
    return { state: 'first_mission_required', mainGameUnlocked: false };
  }
  return { state: 'first_mission_ready', mainGameUnlocked: true };
}
