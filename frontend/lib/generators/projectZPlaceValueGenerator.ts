export const PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION = 'place-value-v1.0.0';
export const PROJECT_Z_PLACE_VALUE_SKILL = 'number.place-value.round-order';

export const PROJECT_Z_PLACE_VALUE_FAMILIES = [
  'place-value-digit',
  'integer-rounding',
  'decimal-rounding',
  'order-decimals',
  'compare-signed-decimals'
] as const;

export type ProjectZPlaceValueFamily = (typeof PROJECT_Z_PLACE_VALUE_FAMILIES)[number];

type GeneratorParameters = Record<string, string | number | number[]>;

export type ProjectZGeneratedMathQuestion = {
  canonicalSkillId: typeof PROJECT_Z_PLACE_VALUE_SKILL;
  familyCode: ProjectZPlaceValueFamily;
  generatorVersion: typeof PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION;
  seed: number;
  prompt: string;
  answerKind: 'integer' | 'decimal' | 'ordered-sequence' | 'comparison';
  canonicalAnswer: string;
  workedSolution: string;
  hints: [string, string];
  difficulty: 1 | 2 | 3;
  calculatorAllowed: false;
  misconceptionTags: string[];
  parameters: GeneratorParameters;
};

export type ProjectZGeneratorVerification = {
  ok: boolean;
  expectedAnswer: string;
  normalizedKey: string;
  errors: string[];
};

const placeNames: Record<number, string> = {
  1: 'ones',
  10: 'tens',
  100: 'hundreds',
  1000: 'thousands'
};

function assertSeed(seed: number) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 999_999) {
    throw new Error('Project Z generator seed must be a safe integer from 0 to 999999.');
  }
}

function formatInteger(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: true });
}

function formatScaled(value: number, scale: number, fixedDigits: number) {
  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);
  const integer = Math.floor(magnitude / scale);
  const fraction = String(magnitude % scale).padStart(String(scale).length - 1, '0');
  return `${sign}${integer}.${fraction.slice(0, fixedDigits)}`;
}

function roundPositiveToUnit(value: number, unit: number) {
  return Math.floor((value + unit / 2) / unit) * unit;
}

function normalizedText(value: string) {
  return value.trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
}

export function generateProjectZPlaceValueQuestion(
  familyCode: ProjectZPlaceValueFamily,
  seed: number
): ProjectZGeneratedMathQuestion {
  assertSeed(seed);

  if (familyCode === 'place-value-digit') {
    const place = [1, 10, 100, 1000][seed % 4];
    const digit = 1 + (Math.floor(seed / 4) % 9);
    const highBlock = seed + 11;
    const lower = (seed * 37 + 19) % place;
    const value = highBlock * 10_000 + digit * place + lower;
    const answer = digit * place;
    return {
      canonicalSkillId: PROJECT_Z_PLACE_VALUE_SKILL,
      familyCode,
      generatorVersion: PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION,
      seed,
      prompt: `What is the value of the digit in the ${placeNames[place]} place in ${formatInteger(value)}?`,
      answerKind: 'integer',
      canonicalAnswer: String(answer),
      workedSolution: `The ${placeNames[place]} place has value ${formatInteger(place)}. Its digit is ${digit}, so ${digit} × ${formatInteger(place)} = ${formatInteger(answer)}.`,
      hints: [`Locate the ${placeNames[place]} column.`, 'Multiply that digit by its place value.'],
      difficulty: place >= 100 ? 2 : 1,
      calculatorAllowed: false,
      misconceptionTags: ['digit-versus-value', 'place-value-column'],
      parameters: { value, place, digit }
    };
  }

  if (familyCode === 'integer-rounding') {
    const unit = [10, 100, 1000][seed % 3];
    let remainder = (seed * 137 + 31) % unit;
    if (remainder === unit / 2) remainder += 1;
    const value = (seed + 17) * unit * 10 + remainder;
    const answer = roundPositiveToUnit(value, unit);
    return {
      canonicalSkillId: PROJECT_Z_PLACE_VALUE_SKILL,
      familyCode,
      generatorVersion: PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION,
      seed,
      prompt: `Round ${formatInteger(value)} to the nearest ${formatInteger(unit)}.`,
      answerKind: 'integer',
      canonicalAnswer: String(answer),
      workedSolution: `The rounding unit is ${formatInteger(unit)}. The part beyond that place is ${formatInteger(remainder)}, so ${formatInteger(value)} rounds to ${formatInteger(answer)}.`,
      hints: ['Find the digit immediately to the right of the rounding place.', 'Use 0–4 to round down and 5–9 to round up.'],
      difficulty: unit === 1000 ? 2 : 1,
      calculatorAllowed: false,
      misconceptionTags: ['rounding-place', 'rounding-direction'],
      parameters: { value, unit }
    };
  }

  if (familyCode === 'decimal-rounding') {
    const decimalPlaces = seed % 2 === 0 ? 1 : 2;
    const unit = decimalPlaces === 1 ? 100 : 10;
    let fractional = (seed * 137 + 41) % 1000;
    if (fractional % unit === unit / 2) fractional = (fractional + 1) % 1000;
    const scaledValue = (seed + 3) * 1000 + fractional;
    const roundedScaled = roundPositiveToUnit(scaledValue, unit);
    return {
      canonicalSkillId: PROJECT_Z_PLACE_VALUE_SKILL,
      familyCode,
      generatorVersion: PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION,
      seed,
      prompt: `Round ${formatScaled(scaledValue, 1000, 3)} to ${decimalPlaces} decimal ${decimalPlaces === 1 ? 'place' : 'places'}.`,
      answerKind: 'decimal',
      canonicalAnswer: formatScaled(roundedScaled, 1000, decimalPlaces),
      workedSolution: `Keep ${decimalPlaces} decimal ${decimalPlaces === 1 ? 'place' : 'places'} and inspect the next digit. This gives ${formatScaled(roundedScaled, 1000, decimalPlaces)}.`,
      hints: [`Underline the digit in the ${decimalPlaces === 1 ? 'tenths' : 'hundredths'} place.`, 'Use the next digit to decide whether the underlined digit changes.'],
      difficulty: decimalPlaces === 2 ? 2 : 1,
      calculatorAllowed: false,
      misconceptionTags: ['decimal-place-value', 'rounding-direction'],
      parameters: { scaledValue, decimalPlaces, unit }
    };
  }

  if (familyCode === 'order-decimals') {
    const base = (seed + 2) * 100;
    const scaledValues = [base + 71, base + 4, base + 39, base + 86];
    const rotation = seed % scaledValues.length;
    const presented = [...scaledValues.slice(rotation), ...scaledValues.slice(0, rotation)];
    const ordered = [...scaledValues].sort((a, b) => a - b);
    return {
      canonicalSkillId: PROJECT_Z_PLACE_VALUE_SKILL,
      familyCode,
      generatorVersion: PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION,
      seed,
      prompt: `Write these numbers in ascending order: ${presented.map((value) => formatScaled(value, 100, 2)).join(', ')}.`,
      answerKind: 'ordered-sequence',
      canonicalAnswer: ordered.map((value) => formatScaled(value, 100, 2)).join(' < '),
      workedSolution: `The whole-number parts match, so compare tenths and then hundredths. The ascending order is ${ordered.map((value) => formatScaled(value, 100, 2)).join(' < ')}.`,
      hints: ['Align the decimal points before comparing.', 'Compare tenths first; use hundredths only when needed.'],
      difficulty: 2,
      calculatorAllowed: false,
      misconceptionTags: ['decimal-length', 'ascending-descending'],
      parameters: { scaledValues, scale: 100 }
    };
  }

  const leftScaled = (seed - 250) * 3;
  const rightScaled = (250 - seed) * 2;
  const comparison = leftScaled < rightScaled ? '<' : leftScaled > rightScaled ? '>' : '=';
  return {
    canonicalSkillId: PROJECT_Z_PLACE_VALUE_SKILL,
    familyCode: 'compare-signed-decimals',
    generatorVersion: PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION,
    seed,
    prompt: `Choose <, > or = to make this statement true: ${formatScaled(leftScaled, 10, 1)} ___ ${formatScaled(rightScaled, 10, 1)}.`,
    answerKind: 'comparison',
    canonicalAnswer: comparison,
    workedSolution: `Compare positions on the number line. ${formatScaled(leftScaled, 10, 1)} is ${comparison === '<' ? 'to the left of' : comparison === '>' ? 'to the right of' : 'at the same point as'} ${formatScaled(rightScaled, 10, 1)}, so the correct symbol is ${comparison}.`,
    hints: ['Negative numbers farther left are smaller.', 'Compare the two positions on a number line.'],
    difficulty: 3,
    calculatorAllowed: false,
    misconceptionTags: ['negative-number-order', 'comparison-symbol-direction'],
    parameters: { leftScaled, rightScaled, scale: 10 }
  };
}

function independentlyRecomputeAnswer(question: ProjectZGeneratedMathQuestion) {
  const p = question.parameters;
  switch (question.familyCode) {
    case 'place-value-digit':
      return String(Number(p.digit) * Number(p.place));
    case 'integer-rounding': {
      const value = Number(p.value);
      const unit = Number(p.unit);
      return String(Math.floor(value / unit + 0.5) * unit);
    }
    case 'decimal-rounding': {
      const value = Number(p.scaledValue);
      const unit = Number(p.unit);
      const decimalPlaces = Number(p.decimalPlaces);
      return formatScaled(Math.floor(value / unit + 0.5) * unit, 1000, decimalPlaces);
    }
    case 'order-decimals': {
      const values = [...(p.scaledValues as number[])].sort((a, b) => a - b);
      return values.map((value) => formatScaled(value, Number(p.scale), 2)).join(' < ');
    }
    case 'compare-signed-decimals': {
      const left = Number(p.leftScaled);
      const right = Number(p.rightScaled);
      return left < right ? '<' : left > right ? '>' : '=';
    }
  }
}

export function verifyProjectZPlaceValueQuestion(
  question: ProjectZGeneratedMathQuestion
): ProjectZGeneratorVerification {
  const errors: string[] = [];
  const expectedAnswer = independentlyRecomputeAnswer(question);
  if (question.canonicalSkillId !== PROJECT_Z_PLACE_VALUE_SKILL) errors.push('wrong canonical skill');
  if (question.generatorVersion !== PROJECT_Z_PLACE_VALUE_GENERATOR_VERSION) errors.push('wrong generator version');
  if (expectedAnswer !== question.canonicalAnswer) errors.push('answer failed independent recalculation');
  if (question.prompt.trim().length < 25) errors.push('prompt is too short');
  if (question.workedSolution.trim().length < 45) errors.push('worked solution is too short');
  if (question.hints.some((hint) => hint.trim().length < 12)) errors.push('hint is too short');
  if (question.calculatorAllowed !== false) errors.push('calculator boundary changed');
  if (question.misconceptionTags.length < 2) errors.push('misconception evidence missing');

  return {
    ok: errors.length === 0,
    expectedAnswer,
    normalizedKey: `${question.familyCode}|${normalizedText(question.prompt)}|${normalizedText(question.canonicalAnswer)}`,
    errors
  };
}
