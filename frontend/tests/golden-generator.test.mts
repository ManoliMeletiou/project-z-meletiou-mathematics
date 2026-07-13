import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  generateProjectZPlaceValueQuestion,
  PROJECT_Z_PLACE_VALUE_FAMILIES,
  PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION,
  PROJECT_Z_PLACE_VALUE_SKILL,
  verifyProjectZPlaceValueQuestion
} from '../lib/generators/projectZPlaceValueGenerator.ts';

const sampleSizePerFamily = 500;

function verifiedSample() {
  const records = PROJECT_Z_PLACE_VALUE_FAMILIES.flatMap((familyCode) =>
    Array.from({ length: sampleSizePerFamily }, (_, seed) => {
      const question = generateProjectZPlaceValueQuestion(familyCode, seed);
      return { question, verification: verifyProjectZPlaceValueQuestion(question) };
    })
  );
  const keys = records.map(({ verification }) => verification.normalizedKey).sort();
  const digest = createHash('sha256').update(keys.join('\n')).digest('hex');
  return { records, keys, digest };
}

test('golden place-value generator proves 2,500 deterministic verified variants', () => {
  const { records, keys } = verifiedSample();
  assert.equal(records.length, 2_500);
  assert.equal(new Set(keys).size, 2_500);
  assert.ok(records.every(({ verification }) => verification.ok));
  assert.ok(records.every(({ question, verification }) => question.canonicalAnswer === verification.expectedAnswer));
});

test('every blueprint family contributes the required 500 distinct samples', () => {
  for (const familyCode of PROJECT_Z_PLACE_VALUE_FAMILIES) {
    const keys = Array.from({ length: sampleSizePerFamily }, (_, seed) => {
      const question = generateProjectZPlaceValueQuestion(familyCode, seed);
      return verifyProjectZPlaceValueQuestion(question).normalizedKey;
    });
    assert.equal(new Set(keys).size, sampleSizePerFamily, familyCode);
  }
});

test('golden generator is reproducible and bound to the intended skill/version', () => {
  for (const familyCode of PROJECT_Z_PLACE_VALUE_FAMILIES) {
    const first = generateProjectZPlaceValueQuestion(familyCode, 417);
    const second = generateProjectZPlaceValueQuestion(familyCode, 417);
    assert.deepEqual(first, second);
    assert.equal(first.canonicalSkillId, PROJECT_Z_PLACE_VALUE_SKILL);
    assert.equal(first.generatorVersion, PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION);
  }
});

test('golden generator regression digest remains stable', () => {
  const { digest } = verifiedSample();
  assert.equal(digest, 'cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f');
});

test('invalid seeds fail before generation', () => {
  assert.throws(() => generateProjectZPlaceValueQuestion('integer-rounding', -1));
  assert.throws(() => generateProjectZPlaceValueQuestion('integer-rounding', 1.5));
  assert.throws(() => generateProjectZPlaceValueQuestion('integer-rounding', 1_000_000));
});

test('database evidence remains private and cannot bypass human review', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260713160000_phase_58b_golden_generator_foundation.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /required_sample_size integer not null default 500 check \(required_sample_size >= 500\)/);
  assert.match(migration, /project_z_generator_family_release_requires_human_review/);
  assert.match(migration, /human_mathematics_review_status = 'approved'/);
  assert.match(migration, /duplicate_variant_count = 0/);
  assert.match(migration, /release_state, evidence_digest[\s\S]*'blocked'/);
  assert.match(migration, /revoke all on table private\.project_z_generator_families from public, anon, authenticated/);
  assert.doesNotMatch(migration, /insert into public\.question_bank/i);
  assert.doesNotMatch(migration, /update public\.project_z_skill_atlas_candidates[\s\S]*review_status\s*=\s*'approved'/i);
});
