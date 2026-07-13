import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260713150000_phase_58_curriculum_review_workbench.sql',
  import.meta.url
);
const pageUrl = new URL('../app/curriculum-review/page.tsx', import.meta.url);

test('curriculum review requires verified roles and two different people', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /private\.project_z_curriculum_reviewers/i);
  assert.match(sql, /private\.project_z_curriculum_review_events/i);
  assert.match(sql, /user_id <> verified_by/i);
  assert.match(sql, /source_aligned_by <> educator_reviewed_by/i);
  assert.match(sql, /The source mapper cannot sign off the same skill/i);
  assert.match(sql, /reviewer_kind = 'curriculum_mapper'/i);
  assert.match(sql, /reviewer_kind = 'mathematics_educator'/i);
  assert.match(sql, /I CONFIRM THIS SKILL ALIGNMENT/);
});

test('only registered authorized-guide metadata can support alignment', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /source_kind = 'authorized_subject_guide'/i);
  assert.match(sql, /allowed_use_status = 'licensed_internal_reference'/i);
  assert.match(sql, /Aligned skills require a registered authorized subject guide/i);
  assert.match(sql, /source_url[\s\S]*null/i);
  assert.match(sql, /private guide locators and[\s\S]*deliberately excluded/i);
  assert.match(sql, /revoke select on table public\.project_z_skill_atlas_candidates from authenticated/i);
  assert.match(sql, /revoke all on function public\.project_z_review_curriculum_educator_signoff[\s\S]*from public, anon, authenticated/i);
});

test('the workbench keeps protected guide text out of the review flow', async () => {
  const page = await readFile(pageUrl, 'utf8');
  assert.match(page, /Do not paste guide text or a private Drive link/i);
  assert.match(page, /Review evidence — paraphrase only/i);
  assert.match(page, /one curriculum skill at a time/i);
  assert.doesNotMatch(page, /service_role/i);
});
