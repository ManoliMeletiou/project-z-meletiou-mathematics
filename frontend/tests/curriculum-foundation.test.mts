import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  isProjectZPathwayCode,
  mypPathwayCode,
  PROJECT_Z_DP_PATHWAY_CODES,
  PROJECT_Z_MINIMUM_VERIFIED_VARIANTS_PER_SKILL,
  PROJECT_Z_MYP_YEARS,
  PROJECT_Z_PATHWAY_CODES
} from '../lib/projectZCurriculumFoundation.ts';

test('the product contract exposes exactly fourteen unique IB pathways', () => {
  assert.equal(PROJECT_Z_PATHWAY_CODES.length, 14);
  assert.equal(new Set(PROJECT_Z_PATHWAY_CODES).size, 14);
  assert.equal(PROJECT_Z_DP_PATHWAY_CODES.length, 4);
  assert.equal(PROJECT_Z_PATHWAY_CODES.filter((code) => code.startsWith('myp_')).length, 10);
});

test('every MYP year has Standard and Extended pathways', () => {
  for (const year of PROJECT_Z_MYP_YEARS) {
    assert.ok(isProjectZPathwayCode(mypPathwayCode(year, 'Standard')));
    assert.ok(isProjectZPathwayCode(mypPathwayCode(year, 'Extended')));
  }
});

test('practice depth cannot be lowered below the Project Z contract', () => {
  assert.equal(PROJECT_Z_MINIMUM_VERIFIED_VARIANTS_PER_SKILL, 2000);
});

test('the Phase 57 database gate is fail-closed and source-aware', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260713143000_phase_57_ib_curriculum_evidence_foundation.sql', import.meta.url),
    'utf8'
  );

  for (const code of PROJECT_Z_PATHWAY_CODES) {
    assert.match(migration, new RegExp(`'${code}'`));
  }

  assert.match(migration, /required_min_variants_per_skill integer not null default 2000/);
  assert.match(migration, /advertised_complete boolean not null default false/);
  assert.match(migration, /release_state = 'released'/);
  assert.match(migration, /curriculum_review_status = 'approved'/);
  assert.match(migration, /source_reviewed = true/);
  assert.match(migration, /q\.status = 'approved'/);
  assert.match(migration, /q\.quality_status = 'reviewed'/);
  assert.match(migration, /q\.verifier_status in \('passed', 'human_verified'\)/);
  assert.match(migration, /count\(distinct q\.normalized_hash\)/);
  assert.match(migration, /update public\.project_z_curriculum_skills[\s\S]*diagnostic_enabled = false/);
  assert.match(migration, /update public\.project_z_diagnostic_question_bank set verified = false/);

  const hardening = await readFile(
    new URL('../../supabase/migrations/20260713145500_phase_57_read_only_rpc_invoker_hardening.sql', import.meta.url),
    'utf8'
  );
  assert.match(hardening, /project_z_curriculum_pathways\(\) security invoker/);
  assert.match(hardening, /project_z_atlas_skill_coverage\(text\) security invoker/);
  assert.match(hardening, /project_z_course_release_ready\(text\) security invoker/);
});
