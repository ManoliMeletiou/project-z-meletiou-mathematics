import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluatePrologueGate } from '../lib/projectZPrologue.ts';
import type { PrologueGateInput } from '../lib/projectZPrologue.ts';

const releaseReady: PrologueGateInput = {
  studentRole: true,
  pathwaySelected: true,
  setupComplete: true,
  toolOrientationComplete: true,
  pathwayReleaseReady: true,
  calibrationApproved: true,
  diagnosticOutcome: 'sufficient',
  firstMissionAssigned: true
};

test('the main game stays locked when any required prologue gate is absent', () => {
  for (const key of [
    'studentRole',
    'pathwaySelected',
    'setupComplete',
    'toolOrientationComplete',
    'pathwayReleaseReady',
    'calibrationApproved',
    'firstMissionAssigned'
  ] as const) {
    const result = evaluatePrologueGate({ ...releaseReady, [key]: false });
    assert.equal(result.mainGameUnlocked, false, `${key} must fail closed`);
  }

  assert.equal(evaluatePrologueGate({ ...releaseReady, diagnosticOutcome: 'pending' }).mainGameUnlocked, false);
  assert.equal(evaluatePrologueGate({ ...releaseReady, diagnosticOutcome: 'inconclusive' }).mainGameUnlocked, false);
});

test('only sufficient diagnostic evidence plus a first mission unlocks the game', () => {
  assert.deepEqual(evaluatePrologueGate(releaseReady), {
    state: 'first_mission_ready',
    mainGameUnlocked: true
  });
});

test('Phase 58d migration enforces server-issued, independently reviewed diagnostic evidence', async () => {
  const migration = await readFile('../supabase/migrations/20260715105711_phase_58d_diagnostic_prologue_gate.sql', 'utf8');

  assert.match(migration, /project_z_diagnostic_release_ready/);
  assert.match(migration, /calibration_status = 'approved'/);
  assert.match(migration, /project_z_one_served_diagnostic_item_per_session/);
  assert.match(migration, /delivery_id uuid/);
  assert.match(migration, /status = 'served'/);
  assert.match(migration, /for update/);
  assert.match(migration, /answer_verification_status = 'passed'/);
  assert.match(migration, /misconception_review_status = 'approved'/);
  assert.match(migration, /accessibility_review_status = 'approved'/);
  assert.match(migration, /human_mathematics_review_status = 'approved'/);
  assert.match(migration, /project_z_student_main_game_unlocked/);
  assert.match(migration, /completion_outcome = 'sufficient'/);
});

test('Phase 58d removes direct answer and client-controlled reward access', async () => {
  const migration = await readFile('../supabase/migrations/20260715105711_phase_58d_diagnostic_prologue_gate.sql', 'utf8');

  assert.match(migration, /revoke all on table public\.project_z_diagnostic_question_bank\s+from public, anon, authenticated/);
  assert.match(migration, /revoke all on function public\.project_z_award_xp/);
  assert.match(migration, /revoke all on function public\.project_z_submit_practice_answer/);
  assert.match(migration, /correct option, explanation, and interim mastery are not\s+-- returned during the adaptive prologue/i);
  assert.match(migration, /'next_action', 'continue_diagnostic'/);
});
