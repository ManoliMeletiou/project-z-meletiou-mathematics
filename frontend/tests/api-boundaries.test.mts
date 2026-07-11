import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as createAssignment } from '../app/api/create-assignment-from-recommendation/route.ts';
import { POST as regenerateQuestion } from '../app/api/regenerate-assignment-question/route.ts';

function jsonRequest(url: string, body: unknown, token?: string) {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
}

test('assignment generation rejects incomplete recommendation input', async () => {
  const response = await createAssignment(jsonRequest('http://project-z.test/api/create', { recommendation: {} }));
  assert.equal(response.status, 400);
  assert.match(await response.text(), /Missing recommendation class, skill code, or skill title/);
});

test('assignment generation fails closed when server configuration is unavailable', async () => {
  const response = await createAssignment(jsonRequest('http://project-z.test/api/create', {
    recommendation: {
      class_id: 'class-1',
      course_skill_code: 'MYP5-ALG-01',
      skill_title: 'Solve linear equations'
    }
  }, 'untrusted-token'));
  assert.equal(response.status, 500);
  assert.match(await response.text(), /Supabase environment is not configured/);
});

test('question regeneration rejects incomplete identifiers before external calls', async () => {
  const response = await regenerateQuestion(jsonRequest('http://project-z.test/api/regenerate', {
    assignment_id: 'assignment-1'
  }));
  assert.equal(response.status, 400);
  assert.match(await response.text(), /Missing assignment_id or question_id/);
});

test('question regeneration fails closed when server configuration is unavailable', async () => {
  const response = await regenerateQuestion(jsonRequest('http://project-z.test/api/regenerate', {
    assignment_id: 'assignment-1',
    question_id: 'question-1'
  }, 'untrusted-token'));
  assert.equal(response.status, 500);
  assert.match(await response.text(), /Supabase environment is not configured/);
});

