import assert from 'node:assert/strict';
import test from 'node:test';
import { auditGeneratedAssignment, auditGeneratedQuestion } from '../lib/projectZAssignmentQuality.ts';

function question(overrides: Record<string, unknown> = {}) {
  return {
    question_id: crypto.randomUUID(),
    question_number: 1,
    course_skill_code: 'MYP5-ALG-01',
    skill_title: 'Solve linear equations',
    criterion: 'A',
    difficulty_band: 'standard',
    question_type: 'short_answer',
    prompt: 'Solve the equation 3x + 5 = 20 and show your reasoning.',
    options: null,
    correct_answer: 'x = 5',
    correct_option: null,
    explanation: 'Subtract 5 from both sides, then divide both sides by 3.',
    quality_notes: {},
    created_at: new Date(0).toISOString(),
    ...overrides
  } as any;
}

test('a structurally valid question passes the client audit', () => {
  assert.deepEqual(auditGeneratedQuestion(question()), []);
});

test('unsafe multiple-choice structure is rejected', () => {
  const issues = auditGeneratedQuestion(question({
    question_type: 'multiple_choice',
    options: { A: '5', B: '5', C: '', D: '8' },
    correct_option: null
  }));
  const codes = new Set(issues.map((issue) => issue.code));
  assert.ok(codes.has('MCQ_MISSING_OPTIONS'));
  assert.ok(codes.has('MCQ_REPEATED_OPTIONS'));
  assert.ok(codes.has('MCQ_MISSING_CORRECT_OPTION'));
});

test('missing teaching explanation and skill lock are release issues', () => {
  const codes = auditGeneratedQuestion(question({
    course_skill_code: '',
    skill_title: '',
    explanation: 'Because.'
  })).map((issue) => issue.code);
  assert.ok(codes.includes('SKILL_LOCK_MISSING'));
  assert.ok(codes.includes('EXPLANATION_TOO_SHORT'));
});

test('assignment count and distributions are reproducible', () => {
  const questions = Array.from({ length: 30 }, (_, index) => question({
    question_id: `q-${index + 1}`,
    question_number: index + 1,
    criterion: ['A', 'B', 'C', 'D'][index % 4],
    difficulty_band: index < 15 ? 'standard' : 'extended'
  }));
  const audit = auditGeneratedAssignment(questions);
  assert.equal(audit.questionCountOk, true);
  assert.equal(audit.flaggedQuestions.length, 0);
  assert.equal(Object.values(audit.criterionDistribution).reduce((sum, value) => sum + value, 0), 30);
  assert.deepEqual(audit.difficultyDistribution, { standard: 15, extended: 15 });
});

test('29 questions never satisfy the release count', () => {
  const audit = auditGeneratedAssignment(Array.from({ length: 29 }, (_, index) => question({ question_id: `q-${index}` })));
  assert.equal(audit.questionCountOk, false);
});

