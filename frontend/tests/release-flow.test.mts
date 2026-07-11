import assert from 'node:assert/strict';
import test from 'node:test';
import { nextReleaseFlowAction, type ReleaseFlowState } from '../lib/projectZReleaseFlow.ts';

const ready: ReleaseFlowState = {
  assignmentSelected: true,
  alreadyAssigned: false,
  automaticAuditCurrent: true,
  unresolvedFlags: 0,
  teacherApprovalCurrent: true,
  rightsConfirmed: true,
  ready: true
};

test('release flow cannot skip selection, audit, repair, approval, or rights', () => {
  assert.equal(nextReleaseFlowAction({ ...ready, assignmentSelected: false }), 'select');
  assert.equal(nextReleaseFlowAction({ ...ready, automaticAuditCurrent: false }), 'audit');
  assert.equal(nextReleaseFlowAction({ ...ready, unresolvedFlags: 1 }), 'repair');
  assert.equal(nextReleaseFlowAction({ ...ready, teacherApprovalCurrent: false }), 'approve');
  assert.equal(nextReleaseFlowAction({ ...ready, rightsConfirmed: false }), 'approve');
});

test('only a fully ready current version can publish', () => {
  assert.equal(nextReleaseFlowAction(ready), 'publish');
  assert.equal(nextReleaseFlowAction({ ...ready, alreadyAssigned: true }), 'published');
});

test('inconsistent readiness falls back to a new audit', () => {
  assert.equal(nextReleaseFlowAction({ ...ready, ready: false }), 'audit');
});

