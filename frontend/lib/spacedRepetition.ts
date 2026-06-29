export interface MasteryState {
  attempts: number;
  correct: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: string;
}

export function initializeMastery(): MasteryState {
  return {
    attempts: 0,
    correct: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReviewDate: new Date().toISOString()
  };
}

export function updateMastery(state: MasteryState, isCorrect: boolean): MasteryState {
  let { attempts, correct, easeFactor, interval } = state;
  attempts++;
  if (isCorrect) correct++;

  const quality = isCorrect ? 5 : 2;
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  if (quality < 3) {
    interval = 1;
  } else {
    if (attempts === 1) interval = 1;
    else if (attempts === 2) interval = 3;
    else interval = Math.round(interval * easeFactor);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  return {
    attempts,
    correct,
    easeFactor,
    interval,
    nextReviewDate: nextDate.toISOString()
  };
}