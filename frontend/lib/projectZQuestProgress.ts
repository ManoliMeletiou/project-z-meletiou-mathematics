import { getMasterySummary } from './projectZMasteryEvents';

/**
 * Quest & Companion Progression tied to Mastery Events
 * This is the foundation for gamification that actually serves learning.
 */

export type QuestProgress = {
  currentLevel: number;
  totalMasteryEvents: number;
  teachingChecks: number;
  correctionsCompleted: number;
  checkpointsPassed: number;
  masteryAchieved: boolean;
  nextMilestone: string;
  companionStage: 'seed' | 'sprout' | 'bloom' | 'master';
};

export async function getQuestProgress(): Promise<QuestProgress> {
  const summary = await getMasterySummary();

  const level = Math.floor((summary.totalEvents || 0) / 5) + 1;
  let companionStage: QuestProgress['companionStage'] = 'seed';

  if (summary.masteryAchieved) companionStage = 'bloom';
  else if ((summary.checkpoints || 0) >= 3) companionStage = 'sprout';

  return {
    currentLevel: level,
    totalMasteryEvents: summary.totalEvents || 0,
    teachingChecks: summary.teachingChecks || 0,
    correctionsCompleted: summary.corrections || 0,
    checkpointsPassed: summary.checkpoints || 0,
    masteryAchieved: summary.masteryAchieved || false,
    nextMilestone: summary.masteryAchieved 
      ? 'Start next pathway' 
      : 'Complete next checkpoint for companion growth',
    companionStage
  };
}

export function getCompanionDisplay(stage: QuestProgress['companionStage']) {
  const stages = {
    seed: { emoji: '🌱', label: 'Seed Companion', description: 'Just beginning the journey' },
    sprout: { emoji: '🌿', label: 'Sprout Companion', description: 'Growing stronger with each checkpoint' },
    bloom: { emoji: '🌸', label: 'Bloom Companion', description: 'Thriving through mastery' },
    master: { emoji: '🌟', label: 'Master Companion', description: 'Ready for advanced challenges' }
  };
  return stages[stage];
}
