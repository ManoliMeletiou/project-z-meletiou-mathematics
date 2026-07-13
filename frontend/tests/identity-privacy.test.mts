import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { safeProjectZNextPath } from '../lib/projectZAuthRedirect.ts';
import {
  projectZProtectedRouteRules,
  projectZRouteDecision,
  projectZRouteRuleForPath
} from '../lib/projectZRouteAccess.ts';

const migrationUrl = new URL('../../supabase/migrations/20260713105818_phase_56b_identity_privacy_completion.sql', import.meta.url);
const proxyUrl = new URL('../lib/supabase/proxy.ts', import.meta.url);
const browserClientUrl = new URL('../lib/supabaseClient.ts', import.meta.url);

test('every private Project Z entry point is protected by a database role rule', () => {
  const expected = [
    '/assignment-factory', '/teacher', '/student-dashboard', '/diagnostic',
    '/parent-dashboard', '/reports', '/tutor', '/export-reports'
  ];
  for (const path of expected) assert.ok(projectZRouteRuleForPath(path), `${path} must be protected`);
  assert.ok(projectZProtectedRouteRules.length >= 30);
});

test('route decisions deny signed-out and wrong-role access', () => {
  assert.match(projectZRouteDecision('/assignment-factory', false, null).redirectTo || '', /^\/auth/);
  assert.equal(projectZRouteDecision('/assignment-factory', true, 'student').reason, 'role');
  assert.equal(projectZRouteDecision('/assignment-factory', true, 'teacher').allowed, true);
  assert.equal(projectZRouteDecision('/diagnostic', true, 'teacher').allowed, false);
  assert.equal(projectZRouteDecision('/diagnostic', true, 'student').allowed, true);
  assert.equal(projectZRouteDecision('/home', false, null).allowed, true);
});

test('auth callbacks reject external and protocol-relative redirects', () => {
  assert.equal(safeProjectZNextPath('https://attacker.example/path'), '/home');
  assert.equal(safeProjectZNextPath('//attacker.example/path'), '/home');
  assert.equal(safeProjectZNextPath('/student-dashboard?from=auth'), '/student-dashboard?from=auth');
});

test('server route boundary verifies claims and reads the protected profile role', async () => {
  const source = await readFile(proxyUrl, 'utf8');
  assert.match(source, /auth\.getClaims\(\)/);
  assert.match(source, /from\('project_z_profiles'\)/);
  assert.match(source, /select\('role'\)/);
  assert.doesNotMatch(source, /auth\.getSession\(\)/);
});

test('browser auth uses cookie-compatible Supabase SSR client', async () => {
  const source = await readFile(browserClientUrl, 'utf8');
  assert.match(source, /createBrowserClient/);
  assert.doesNotMatch(source, /localStorage/);
});

test('identity privacy migration enforces operator separation and controlled deletion', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /create table if not exists private\.project_z_operators/i);
  assert.match(sql, /Operators cannot approve their own role request/i);
  assert.match(sql, /DELETE PROJECT Z ACCOUNT/);
  assert.match(sql, /interval '7 days'/i);
  assert.match(sql, /project_z_cancel_account_deletion/i);
  assert.match(sql, /Operators cannot process their own deletion/i);
  assert.match(sql, /delete from auth\.sessions/i);
  assert.match(sql, /delete from auth\.users/i);
  assert.match(sql, /project_z_export_my_data/i);
  assert.match(sql, /revoke all on schema private from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.project_z_operator_process_account_deletion\(uuid, text\) from public, anon/i);
});
