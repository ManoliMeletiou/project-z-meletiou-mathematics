type GeneratePayload = {
  course_code: string;
  course_skill_code: string;
  skill_title: string;
  skill_description: string;
  assessment_criterion?: string | null;
  difficulty_band?: number;
};

const KEYS = ['A', 'B', 'C', 'D'] as const;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function options(correctText: string, wrongTexts: string[]) {
  const shuffled = shuffle([{ text: correctText, correct: true }, ...wrongTexts.slice(0, 3).map((text) => ({ text, correct: false }))]);
  const correct_option = KEYS[shuffled.findIndex((item) => item.correct)];
  return { option_a: shuffled[0].text, option_b: shuffled[1].text, option_c: shuffled[2].text, option_d: shuffled[3].text, correct_option };
}

function build(payload: GeneratePayload) {
  const criterion = payload.assessment_criterion || 'A';
  const skill = payload.skill_title || 'the selected skill';
  const difficulty = Math.max(1, Math.min(payload.difficulty_band || 2, 5));

  if (criterion === 'B') {
    return {
      course_code: payload.course_code, course_skill_code: payload.course_skill_code, assessment_criterion: 'B', question_type: 'explanation_choice', difficulty_band: difficulty,
      prompt: `For ${skill}, which response best demonstrates Criterion B investigation and pattern reasoning?`,
      ...options('It identifies the pattern, states a general rule, and checks the rule against at least one term, so the reasoning is justified.', ['It gives an answer matching one example, but it does not justify why the rule works generally.', 'It describes that the numbers change, but it does not state a clear mathematical rule or test it.', 'It gives a rule without connecting it to the pattern, so the investigation is incomplete.']),
      explanation: 'The strongest Criterion B response identifies a pattern, gives a general rule, and justifies or tests that rule.', source: 'phase17_generation_lab_fallback'
    };
  }

  if (criterion === 'C') {
    return {
      course_code: payload.course_code, course_skill_code: payload.course_skill_code, assessment_criterion: 'C', question_type: 'rubric_choice', difficulty_band: difficulty,
      prompt: `For ${skill}, which response would receive the strongest Criterion C communication mark?`,
      ...options('It uses correct mathematical terminology, clear notation, logical steps, and a final conclusion linked to the question.', ['It gives the answer and some working, but the notation is inconsistent and the conclusion is unclear.', 'It explains the idea informally, but key mathematical terms and units are missing.', 'It includes correct vocabulary, but the steps are not organised clearly enough for another person to follow.']),
      explanation: 'The best Criterion C response communicates with precise terminology, notation, structure, and conclusion.', source: 'phase17_generation_lab_fallback'
    };
  }

  if (criterion === 'D') {
    return {
      course_code: payload.course_code, course_skill_code: payload.course_skill_code, assessment_criterion: 'D', question_type: 'modelling_choice', difficulty_band: difficulty,
      prompt: `For ${skill}, which response best satisfies Criterion D real-life application and reflection?`,
      ...options('It interprets the result in context, checks whether the answer is reasonable, and mentions a limitation of the model.', ['It calculates a value correctly, but it does not explain what the value means in the situation.', 'It gives a contextual sentence, but it does not check reasonableness or limitations.', 'It states that the model is useful, but it does not connect the claim to the data or assumptions.']),
      explanation: 'A strong Criterion D response interprets mathematics in context, evaluates reasonableness, and recognises model limitations.', source: 'phase17_generation_lab_fallback'
    };
  }

  const a = 3 + difficulty;
  const b = 4 + difficulty;
  const c = 2 * difficulty;
  const answer = a * b - c;
  return {
    course_code: payload.course_code, course_skill_code: payload.course_skill_code, assessment_criterion: 'A', question_type: 'multiple_choice', difficulty_band: difficulty,
    prompt: `For ${skill}, calculate the value of ${a} × ${b} - ${c}.`,
    ...options(`${answer}`, [`${a * b + c}`, `${a + b - c}`, `${a * (b - c)}`]),
    explanation: `Multiply first: ${a} × ${b} = ${a * b}. Then subtract ${c}, giving ${answer}.`, source: 'phase17_generation_lab_fallback'
  };
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as GeneratePayload;
    if (!payload.course_code || !payload.course_skill_code) return Response.json({ error: 'Missing course or skill code' }, { status: 400 });
    return Response.json(build(payload));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Generation failed' }, { status: 500 });
  }
}
