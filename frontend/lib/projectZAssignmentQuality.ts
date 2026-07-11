import type { GeneratedAssignmentQuestion } from './projectZGeneratedAssignments';

export type AssignmentQualityIssue = {
  code: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
};

export function auditGeneratedQuestion(question: GeneratedAssignmentQuestion): AssignmentQualityIssue[] {
  const issues: AssignmentQualityIssue[] = [];
  const prompt = question.prompt || '';
  const explanation = question.explanation || '';
  const correctAnswer = question.correct_answer || '';

  if (prompt.trim().length < 18) {
    issues.push({ code: 'PROMPT_TOO_SHORT', severity: 'high', message: 'Prompt is too short or too vague.' });
  }

  if (explanation.trim().length < 20) {
    issues.push({ code: 'EXPLANATION_TOO_SHORT', severity: 'medium', message: 'Explanation is too short to support learning.' });
  }

  if (!correctAnswer.trim()) {
    issues.push({ code: 'MISSING_ANSWER', severity: 'high', message: 'Correct answer is missing.' });
  }

  if (question.question_type === 'multiple_choice') {
    const options = question.options;
    const values = options ? [options.A, options.B, options.C, options.D].map((value) => String(value || '').trim()) : [];

    if (!options || values.some((value) => !value)) {
      issues.push({ code: 'MCQ_MISSING_OPTIONS', severity: 'high', message: 'Multiple-choice question must have A, B, C, and D options.' });
    }

    if (values.length === 4 && new Set(values).size < 4) {
      issues.push({ code: 'MCQ_REPEATED_OPTIONS', severity: 'high', message: 'Multiple-choice options should not repeat.' });
    }

    if (!question.correct_option || !['A', 'B', 'C', 'D'].includes(question.correct_option)) {
      issues.push({ code: 'MCQ_MISSING_CORRECT_OPTION', severity: 'high', message: 'Multiple-choice question needs a correct option A-D.' });
    }

    const lengths = values.map((value) => value.length).filter(Boolean);
    if (lengths.length === 4 && Math.max(...lengths) - Math.min(...lengths) > 60) {
      issues.push({ code: 'MCQ_OPTIONS_UNBALANCED', severity: 'medium', message: 'Answer options may be too obviously different in length.' });
    }
  }

  if (!question.course_skill_code || !question.skill_title) {
    issues.push({ code: 'SKILL_LOCK_MISSING', severity: 'high', message: 'Question is missing skill-lock information.' });
  }

  if (!['A', 'B', 'C', 'D'].includes(question.criterion)) {
    issues.push({ code: 'INVALID_CRITERION', severity: 'high', message: 'Criterion must be A, B, C, or D.' });
  }

  if (!['foundation', 'core', 'standard', 'extended', 'challenge', 'reflection'].includes(question.difficulty_band)) {
    issues.push({ code: 'INVALID_DIFFICULTY', severity: 'high', message: 'Difficulty band is invalid.' });
  }

  return issues;
}

export function auditGeneratedAssignment(questions: GeneratedAssignmentQuestion[]) {
  const byQuestion = questions.map((question) => ({ question, issues: auditGeneratedQuestion(question) }));
  const allIssues = byQuestion.flatMap((item) => item.issues);

  const optionDistribution = questions.reduce<Record<string, number>>((distribution, question) => {
    if (question.correct_option) distribution[question.correct_option] = (distribution[question.correct_option] || 0) + 1;
    return distribution;
  }, { A: 0, B: 0, C: 0, D: 0 });

  const criterionDistribution = questions.reduce<Record<string, number>>((distribution, question) => {
    distribution[question.criterion] = (distribution[question.criterion] || 0) + 1;
    return distribution;
  }, { A: 0, B: 0, C: 0, D: 0 });

  const difficultyDistribution = questions.reduce<Record<string, number>>((distribution, question) => {
    distribution[question.difficulty_band] = (distribution[question.difficulty_band] || 0) + 1;
    return distribution;
  }, {});

  return {
    byQuestion,
    allIssues,
    highIssues: allIssues.filter((issue) => issue.severity === 'high'),
    mediumIssues: allIssues.filter((issue) => issue.severity === 'medium'),
    optionDistribution,
    criterionDistribution,
    difficultyDistribution,
    questionCountOk: questions.length >= 30,
    flaggedQuestions: byQuestion.filter((item) => item.issues.length > 0)
  };
}

