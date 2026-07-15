import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  deriveIdempotentMotivationReward,
  evaluateFirstMissionSlice,
  type FirstMissionEvidence,
  type ReviewedSliceRelease
} from '../lib/projectZVerticalSlice.ts';

const reviewedRelease: ReviewedSliceRelease = {
  studentRole: true,
  diagnosticPrologueComplete: true,
  firstMissionAssigned: true,
  pathwayReleased: true,
  diagnosticCalibrationApproved: true,
  authorizedSourceMapped: true,
  distinctPlacementReviewers: true,
  generatorFamiliesReviewed: true,
  teachingAssetsReviewed: true,
  verifiedVariantCount: 2_500,
  operatorSliceReleased: true
};

const emptyEvidence: FirstMissionEvidence = {
  teachingStepsCompleted: 0,
  guidedAttempts: 0,
  independentAttempts: 0,
  checkpointAttempts: 0,
  scoredAttempts: 0,
  scoredCorrect: 0,
  familyCount: 0,
  checkpointCorrect: 0,
  unresolvedCorrections: 0
};

test('every independent release dependency fails closed', () => {
  for (const key of [
    'pathwayReleased',
    'diagnosticCalibrationApproved',
    'authorizedSourceMapped',
    'distinctPlacementReviewers',
    'generatorFamiliesReviewed',
    'teachingAssetsReviewed',
    'operatorSliceReleased'
  ] as const) {
    const decision = evaluateFirstMissionSlice({ ...reviewedRelease, [key]: false }, emptyEvidence);
    assert.equal(decision.stage, 'awaiting_reviewed_slice', `${key} must fail closed`);
    assert.equal(decision.gameStageUnlocked, false);
  }

  const depthBlocked = evaluateFirstMissionSlice(
    { ...reviewedRelease, verifiedVariantCount: 1_999 }, emptyEvidence
  );
  assert.equal(depthBlocked.stage, 'awaiting_reviewed_slice');
});

test('the slice advances in diagnostic, teaching, guided and independent dependency order', () => {
  assert.equal(evaluateFirstMissionSlice(
    { ...reviewedRelease, diagnosticPrologueComplete: false }, emptyEvidence
  ).stage, 'diagnostic_required');
  assert.equal(evaluateFirstMissionSlice(reviewedRelease, emptyEvidence).stage, 'teaching');
  assert.equal(evaluateFirstMissionSlice(reviewedRelease, {
    ...emptyEvidence, teachingStepsCompleted: 5
  }).stage, 'guided');
  assert.equal(evaluateFirstMissionSlice(reviewedRelease, {
    ...emptyEvidence, teachingStepsCompleted: 5, guidedAttempts: 2
  }).stage, 'independent');
});

test('an incorrect independent response requires correction before more practice', () => {
  const decision = evaluateFirstMissionSlice(reviewedRelease, {
    ...emptyEvidence,
    teachingStepsCompleted: 5,
    guidedAttempts: 2,
    independentAttempts: 4,
    scoredAttempts: 4,
    scoredCorrect: 3,
    familyCount: 4,
    unresolvedCorrections: 1
  });
  assert.equal(decision.stage, 'correction');
  assert.equal(decision.gameStageUnlocked, false);
});

test('the reviewed hypothetical slice reaches mastery only after correction and checkpoint evidence', () => {
  const beforeCorrection = evaluateFirstMissionSlice(reviewedRelease, {
    teachingStepsCompleted: 5,
    guidedAttempts: 2,
    independentAttempts: 8,
    checkpointAttempts: 2,
    scoredAttempts: 10,
    scoredCorrect: 9,
    familyCount: 5,
    checkpointCorrect: 2,
    unresolvedCorrections: 1
  });
  assert.equal(beforeCorrection.stage, 'correction');

  const afterCorrection = evaluateFirstMissionSlice(reviewedRelease, {
    teachingStepsCompleted: 5,
    guidedAttempts: 2,
    independentAttempts: 8,
    checkpointAttempts: 2,
    scoredAttempts: 10,
    scoredCorrect: 9,
    familyCount: 5,
    checkpointCorrect: 2,
    unresolvedCorrections: 0
  });
  assert.deepEqual(afterCorrection, {
    stage: 'mastered',
    masteryPercent: 90,
    confidencePercent: 100,
    gameStageUnlocked: true,
    rewardEligible: true,
    releaseBlockers: []
  });
});

test('one answer, family undercoverage or weak checkpoint evidence cannot create mastery', () => {
  assert.notEqual(evaluateFirstMissionSlice(reviewedRelease, {
    ...emptyEvidence,
    teachingStepsCompleted: 5,
    guidedAttempts: 2,
    independentAttempts: 8,
    checkpointAttempts: 2,
    scoredAttempts: 10,
    scoredCorrect: 10,
    familyCount: 4,
    checkpointCorrect: 2
  }).stage, 'mastered');
  assert.notEqual(evaluateFirstMissionSlice(reviewedRelease, {
    ...emptyEvidence,
    teachingStepsCompleted: 5,
    guidedAttempts: 2,
    independentAttempts: 8,
    checkpointAttempts: 2,
    scoredAttempts: 10,
    scoredCorrect: 9,
    familyCount: 5,
    checkpointCorrect: 1
  }).stage, 'mastered');
});

test('motivation rewards are separate and idempotent', () => {
  assert.deepEqual(deriveIdempotentMotivationReward(false, []), []);
  assert.deepEqual(deriveIdempotentMotivationReward(true, []), [{
    rewardCode: 'first-mission-mastery',
    xp: 100,
    coins: 25,
    motivationOnly: true
  }]);
  assert.deepEqual(deriveIdempotentMotivationReward(true, ['first-mission-mastery']), []);
});

test('Phase 58e SQL uses a new immutable ledger and preserves the collided legacy row model', async () => {
  const migration = await readFile(
    '../supabase/migrations/20260715143000_phase_58e_vertical_slice_event_model.sql',
    'utf8'
  );
  assert.match(migration, /project_z_first_mission_practice_deliveries/);
  assert.match(migration, /project_z_first_mission_attempt_events/);
  assert.match(migration, /project_z_first_mission_correction_events/);
  assert.match(migration, /project_z_first_mission_mastery_events/);
  assert.match(migration, /project_z_first_mission_game_unlock_events/);
  assert.match(migration, /project_z_first_mission_reward_events/);
  assert.match(migration, /Project Z learning evidence is append-only/);
  assert.match(migration, /Legacy practice collision was modified instead of quarantined/);
  assert.doesNotMatch(migration, /alter table public\.project_z_practice_attempts\s+add column/i);
});

test('Phase 58e SQL binds serving, correction, mastery and reward to reviewed evidence', async () => {
  const migration = await readFile(
    '../supabase/migrations/20260715143000_phase_58e_vertical_slice_event_model.sql',
    'utf8'
  );
  assert.match(migration, /provenance_state = 'authorized_guide_mapped'/);
  assert.match(migration, /source_aligned_by <> atlas\.educator_reviewed_by/);
  assert.match(migration, /human_mathematics_review_status = 'approved'/);
  assert.match(migration, /distinct_variant_count\), 0\) >= 2000/);
  assert.match(migration, /Only the outstanding server-issued item can be answered/);
  assert.match(migration, /reflection_text[\s\S]*20/);
  assert.match(migration, /checkpoint_correct >= config\.required_checkpoint_attempts/);
  assert.match(migration, /motivation_excluded_from_mastery/);
  assert.match(migration, /on conflict \(mission_id, reward_code\) do nothing/);
  assert.match(migration, /revoke all on function public\.project_z_submit_practice_answer/);
});
