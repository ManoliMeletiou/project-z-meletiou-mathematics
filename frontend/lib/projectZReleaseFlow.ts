export type ReleaseFlowState = {
  assignmentSelected: boolean;
  alreadyAssigned: boolean;
  automaticAuditCurrent: boolean;
  unresolvedFlags: number;
  teacherApprovalCurrent: boolean;
  rightsConfirmed: boolean;
  ready: boolean;
};

export type ReleaseFlowAction = 'select' | 'audit' | 'repair' | 'approve' | 'publish' | 'published';

export function nextReleaseFlowAction(state: ReleaseFlowState): ReleaseFlowAction {
  if (!state.assignmentSelected) return 'select';
  if (state.alreadyAssigned) return 'published';
  if (!state.automaticAuditCurrent) return 'audit';
  if (state.unresolvedFlags > 0) return 'repair';
  if (!state.teacherApprovalCurrent || !state.rightsConfirmed) return 'approve';
  if (state.ready) return 'publish';
  return 'audit';
}

