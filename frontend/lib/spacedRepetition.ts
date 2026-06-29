export type ReviewState = {
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReview: string;
};

export function scheduleReview(quality: number, previous?: Partial<ReviewState>): ReviewState {
  const safeQuality = Math.max(0, Math.min(5, quality));
  let repetition = previous?.repetition ?? 0;
  let interval = previous?.interval ?? 1;
  let easeFactor = previous?.easeFactor ?? 2.5;

  if (safeQuality < 3) {
    repetition = 0;
    interval = 1;
  } else {
    repetition += 1;
    if (repetition === 1) interval = 1;
    else if (repetition === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);

    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - safeQuality) * (0.08 + (5 - safeQuality) * 0.02))
    );
  }

  const next = new Date();
  next.setDate(next.getDate() + interval);

  return {
    interval,
    repetition,
    easeFactor,
    nextReview: next.toISOString()
  };
}
