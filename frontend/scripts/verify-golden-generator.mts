import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  generateProjectZPlaceValueQuestion,
  PROJECT_Z_PLACE_VALUE_FAMILIES,
  PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION,
  PROJECT_Z_PLACE_VALUE_SKILL,
  verifyProjectZPlaceValueQuestion
} from '../lib/generators/projectZPlaceValueGenerator.ts';

const sampleSizePerFamily = 500;
const keys: string[] = [];

for (const familyCode of PROJECT_Z_PLACE_VALUE_FAMILIES) {
  const familyKeys = new Set<string>();
  for (let seed = 0; seed < sampleSizePerFamily; seed += 1) {
    const question = generateProjectZPlaceValueQuestion(familyCode, seed);
    const verification = verifyProjectZPlaceValueQuestion(question);
    assert.equal(verification.ok, true, `${familyCode}:${seed} ${verification.errors.join(', ')}`);
    assert.equal(question.canonicalAnswer, verification.expectedAnswer, `${familyCode}:${seed}`);
    familyKeys.add(verification.normalizedKey);
    keys.push(verification.normalizedKey);
  }
  assert.equal(familyKeys.size, sampleSizePerFamily, `${familyCode} contains a duplicate sample`);
}

keys.sort();
assert.equal(new Set(keys).size, PROJECT_Z_PLACE_VALUE_FAMILIES.length * sampleSizePerFamily);
const digest = createHash('sha256').update(keys.join('\n')).digest('hex');

process.stdout.write(JSON.stringify({
  ok: true,
  canonicalSkillId: PROJECT_Z_PLACE_VALUE_SKILL,
  generatorVersion: PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION,
  families: PROJECT_Z_PLACE_VALUE_FAMILIES.length,
  sampleSizePerFamily,
  testedVariants: keys.length,
  distinctVariants: new Set(keys).size,
  duplicateVariants: 0,
  independentAnswerChecks: keys.length,
  digest
}, null, 2) + '\n');
