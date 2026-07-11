import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL('../../supabase/migrations/20260711095500_phase_54_assignment_release_gate.sql', import.meta.url);
const boundaryUrl = new URL('../../docs/PROJECT_Z_REFERENCE_BOUNDARY.md', import.meta.url);
const generatorUrl = new URL('../app/api/create-assignment-from-recommendation/route.ts', import.meta.url);
const identityMigrationUrl = new URL('../../supabase/migrations/20260711103500_phase_56_identity_role_hardening.sql', import.meta.url);

test('database release migration preserves every critical boundary', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /drop policy if exists "generated_assignments_teacher_update"/i);
  assert.match(sql, /a\.teacher_id = auth\.uid\(\)/i);
  assert.match(sql, /Use the controlled publish action to assign work/i);
  assert.match(sql, /project_z_guard_assigned_transition/i);
  assert.match(sql, /Use project_z_run_assignment_release_audit for automatic checks/i);
  assert.match(sql, /rights_status_confirmed/i);
  assert.match(sql, /revoke all on function public\.project_z_run_assignment_release_audit\(uuid\) from public, anon/i);
  assert.doesNotMatch(sql, /status in \('assigned', 'reviewed'\)/i);
});

test('Project Z is the only writable product boundary', async () => {
  const boundary = await readFile(boundaryUrl, 'utf8');
  assert.match(boundary, /ManoliMeletiou\/project-z-meletiou-mathematics/);
  assert.match(boundary, /jlesueqjdvmxkqaqmnke/);
  assert.match(boundary, /## Read-only systems/i);
  assert.match(boundary, /ManoliMeletiou\/meletiou-mathematics-platform/);
});

test('partial assignment creation performs compensating cleanup', async () => {
  const route = await readFile(generatorUrl, 'utf8');
  assert.match(route, /project_z_generated_assignments\?id=eq\.\$\{assignmentId\}/);
  assert.match(route, /method: 'DELETE'/);
  assert.match(route, /rights_status: 'teacher_review_required'/);
});

test('identity migration prevents self-assigned privileged roles', async () => {
  const sql = await readFile(identityMigrationUrl, 'utf8');
  assert.match(sql, /new\.email,[\s\S]*'student'/i);
  assert.match(sql, /drop policy if exists "profiles_update_own"/i);
  assert.match(sql, /revoke insert, update on public\.project_z_profiles from authenticated/i);
  assert.match(sql, /requested_role in \('teacher', 'parent'\)/i);
  assert.match(sql, /status text not null default 'pending'/i);
  assert.match(sql, /revoke all on function public\.project_z_request_role\(text, text\) from public, anon/i);
});
