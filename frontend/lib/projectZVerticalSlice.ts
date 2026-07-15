export type ReviewedSliceRelease = {
  studentRole: boolean;
  diagnosticPrologueComplete: boolean;
  firstMissionAssigned: boolean;
  pathwayReleased: boolean;
  diagnosticCalibrationApproved: boolean;
  authorizedSourceMapped: boolean;
  distinctPlacementReviewers: boolean;
  generatorFamiliesReviewed: boolean;
  teachingAssetsReviewed: boolean;
  verifiedVariantCount: number;
  operatorSliceReleased: boolean;
};

export type FirstMissionEvidence = {
  teachingStepsCompleted: number;
  guidedAttempts: number;
  independentAttempts: number;
  checkpointAttempts: number;
  scoredAttempts: number;
  scoredCorrect: number;
  familyCount: number;
  checkpointCorrect: number;
  unresolvedCorrections: number;
};

export type FirstMissionStage =
  | 'student_role_required'
  | 'diagnostic_required'
  | 'first_mission_required'
  | 'awaiting_reviewed_slice'
  | 'teaching'
  | 'guided'
  | 'independent'
  | 'correction'
  | 'checkpoint'
  | 'remediation'
  | 'mastered';

export type FirstMissionDecision = {
  stage: FirstMissionStage;
  masteryPercent: number;
  confidencePercent: number;
  gameStageUnlocked: boolean;
  rewardEligible: boolean;
  releaseBlockers: string[];
};

const REQUIRED_TEACHING_STEPS = 5;
const REQUIRED_GUIDED_ATTEMPTS = 2;
const REQUIRED_INDEPENDENT_ATTEMPTS = 8;
const REQUIRED_CHECKPOINT_ATTEMPTS = 2;
const REQUIRED_FAMILY_COUNT = 5;
const REQUIRED_ACCURACY_PERCENT = 90;

export function reviewedSliceBlockers(release: ReviewedSliceRelease) {
  const blockers: string[] = [];
  if (!release.pathwayReleased) blockers.push('pathway_release_required');
  if (!release.diagnosticCalibrationApproved) blockers.push('diagnostic_calibration_required');
  if (!release.authorizedSourceMapped) blockers.push('authorized_source_mapping_required');
  if (!release.distinctPlacementReviewers) blockers.push('two_person_placement_review_required');
  if (!release.generatorFamiliesReviewed) blockers.push('generator_family_review_required');
  if (!release.teachingAssetsReviewed) blockers.push('teaching_asset_review_required');
  if (release.verifiedVariantCount < 2_000) blockers.push('two_thousand_verified_variants_required');
  if (!release.operatorSliceReleased) blockers.push('operator_slice_release_required');
  return blockers;
}

export function evaluateFirstMissionSlice(
  release: ReviewedSliceRelease,
  evidence: FirstMissionEvidence
): FirstMissionDecision {
  const masteryPercent = evidence.scoredAttempts === 0
    ? 0
    : Math.round((evidence.scoredCorrect * 10_000) / evidence.scoredAttempts) / 100;
  const confidencePercent = Math.min(
    100,
    Math.round((evidence.scoredAttempts * 10_000) /
      (REQUIRED_INDEPENDENT_ATTEMPTS + REQUIRED_CHECKPOINT_ATTEMPTS)) / 100
  );
  const base = {
    masteryPercent,
    confidencePercent,
    gameStageUnlocked: false,
    rewardEligible: false,
    releaseBlockers: reviewedSliceBlockers(release)
  };

  if (!release.studentRole) return { ...base, stage: 'student_role_required' };
  if (!release.diagnosticPrologueComplete) return { ...base, stage: 'diagnostic_required' };
  if (!release.firstMissionAssigned) return { ...base, stage: 'first_mission_required' };
  if (base.releaseBlockers.length > 0) return { ...base, stage: 'awaiting_reviewed_slice' };
  if (evidence.teachingStepsCompleted < REQUIRED_TEACHING_STEPS) {
    return { ...base, stage: 'teaching' };
  }
  if (evidence.guidedAttempts < REQUIRED_GUIDED_ATTEMPTS) {
    return { ...base, stage: 'guided' };
  }
  if (evidence.unresolvedCorrections > 0) {
    return { ...base, stage: 'correction' };
  }
  if (evidence.independentAttempts < REQUIRED_INDEPENDENT_ATTEMPTS) {
    return { ...base, stage: 'independent' };
  }
  if (evidence.checkpointAttempts < REQUIRED_CHECKPOINT_ATTEMPTS
    || evidence.checkpointCorrect < REQUIRED_CHECKPOINT_ATTEMPTS) {
    return { ...base, stage: 'checkpoint' };
  }

  const mastered = evidence.familyCount >= REQUIRED_FAMILY_COUNT
    && evidence.checkpointCorrect >= REQUIRED_CHECKPOINT_ATTEMPTS
    && evidence.unresolvedCorrections === 0
    && masteryPercent >= REQUIRED_ACCURACY_PERCENT;
  if (!mastered) return { ...base, stage: 'remediation' };

  return {
    ...base,
    stage: 'mastered',
    gameStageUnlocked: true,
    rewardEligible: true
  };
}

export function deriveIdempotentMotivationReward(
  masteryVerified: boolean,
  existingRewardCodes: readonly string[]
) {
  const rewardCode = 'first-mission-mastery';
  if (!masteryVerified || existingRewardCodes.includes(rewardCode)) return [];
  return [{ rewardCode, xp: 100, coins: 25, motivationOnly: true as const }];
}
