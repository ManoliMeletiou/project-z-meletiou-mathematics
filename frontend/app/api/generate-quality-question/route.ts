type GeneratePayload = {
  course_code: string;
  course_skill_code: string;
  skill_title: string;
  skill_description: string;
  assessment_criterion?: string | null;
  difficulty_band?: number;
  desired_question_type?: string;
};

type Candidate = {
  course_code: string;
  course_skill_code: string;
  assessment_criterion: string | null;
  question_type: string;
  difficulty_band: number;
  prompt: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  source: string;
  generation_mode?: string;
};

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildOptions(correctText: string, wrongTexts: string[]) {
  const shuffled = shuffle([
    { text: correctText, correct: true },
    ...wrongTexts.slice(0, 3).map((text) => ({ text, correct: false }))
  ]);

  const correctIndex = shuffled.findIndex((item) => item.correct);

  return {
    option_a: shuffled[0].text,
    option_b: shuffled[1].text,
    option_c: shuffled[2].text,
    option_d: shuffled[3].text,
    correct_option: OPTION_KEYS[correctIndex]
  };
}

function fallbackCandidate(payload: GeneratePayload): Candidate {
  const criterion = payload.assessment_criterion || 'A';
  const difficulty = Math.max(1, Math.min(payload.difficulty_band || 1, 5));
  const skill = payload.skill_title || 'the selected skill';

  if (criterion === 'B') {
    const options = buildOptions(
      'It identifies the pattern, states a general rule, and checks the rule against at least one term, so the reasoning is justified.',
      [
        'It gives an answer that matches one example, but it does not justify why the rule works generally.',
        'It describes that the numbers change, but it does not state a clear mathematical rule or test it.',
        'It gives a rule without connecting it to the pattern, so the investigation is incomplete.'
      ]
    );

    return {
      course_code: payload.course_code,
      course_skill_code: payload.course_skill_code,
      assessment_criterion: 'B',
      question_type: 'explanation_choice',
      difficulty_band: difficulty,
      prompt: `For ${skill}, which response best demonstrates Criterion B investigation and pattern reasoning?`,
      ...options,
      explanation: 'The strongest Criterion B response identifies a pattern, gives a general rule, and justifies or tests that rule.',
      source: 'phase18_fallback_template',
      generation_mode: 'fallback_template'
    };
  }

  if (criterion === 'C') {
    const options = buildOptions(
      'It uses correct mathematical terminology, clear notation, logical steps, and a final conclusion linked to the question.',
      [
        'It gives the answer and some working, but the notation is inconsistent and the conclusion is unclear.',
        'It explains the idea informally, but key mathematical terms and units are missing.',
        'It includes correct vocabulary, but the steps are not organised clearly enough for another person to follow.'
      ]
    );

    return {
      course_code: payload.course_code,
      course_skill_code: payload.course_skill_code,
      assessment_criterion: 'C',
      question_type: 'rubric_choice',
      difficulty_band: difficulty,
      prompt: `For ${skill}, which response would receive the strongest Criterion C communication mark?`,
      ...options,
      explanation: 'The best Criterion C response communicates using precise terminology, notation, structure, and a clear conclusion.',
      source: 'phase18_fallback_template',
      generation_mode: 'fallback_template'
    };
  }

  if (criterion === 'D') {
    const options = buildOptions(
      'It interprets the result in context, checks whether the answer is reasonable, and mentions a limitation of the model.',
      [
        'It calculates a value correctly, but it does not explain what the value means in the situation.',
        'It gives a contextual sentence, but it does not check reasonableness or limitations.',
        'It states that the model is useful, but it does not connect the claim to the data or assumptions.'
      ]
    );

    return {
      course_code: payload.course_code,
      course_skill_code: payload.course_skill_code,
      assessment_criterion: 'D',
      question_type: 'modelling_choice',
      difficulty_band: difficulty,
      prompt: `For ${skill}, which response best satisfies Criterion D real-life application and reflection?`,
      ...options,
      explanation: 'A strong Criterion D response interprets mathematics in context, evaluates reasonableness, and recognises model limitations.',
      source: 'phase18_fallback_template',
      generation_mode: 'fallback_template'
    };
  }

  const a = 3 + difficulty;
  const b = 4 + difficulty;
  const c = 2 * difficulty;
  const correctValue = a * b - c;
  const options = buildOptions(`${correctValue}`, [`${a * b + c}`, `${a + b - c}`, `${a * (b - c)}`]);

  return {
    course_code: payload.course_code,
    course_skill_code: payload.course_skill_code,
    assessment_criterion: criterion,
    question_type: 'multiple_choice',
    difficulty_band: difficulty,
    prompt: `For ${skill}, calculate the value of ${a} × ${b} - ${c}.`,
    ...options,
    explanation: `Multiply first: ${a} × ${b} = ${a * b}. Then subtract ${c}, giving ${correctValue}.`,
    source: 'phase18_fallback_template',
    generation_mode: 'fallback_template'
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not contain JSON.');
  return JSON.parse(match[0]);
}

function normaliseAiCandidate(payload: GeneratePayload, raw: any): Candidate {
  const correct = String(raw.correct_option || '').trim().toUpperCase();
  const correctOption = OPTION_KEYS.includes(correct as any) ? (correct as 'A' | 'B' | 'C' | 'D') : 'A';

  return {
    course_code: payload.course_code,
    course_skill_code: payload.course_skill_code,
    assessment_criterion: raw.assessment_criterion ?? payload.assessment_criterion ?? 'A',
    question_type: raw.question_type || 'multiple_choice',
    difficulty_band: Math.max(1, Math.min(Number(raw.difficulty_band || payload.difficulty_band || 1), 5)),
    prompt: String(raw.prompt || '').trim(),
    option_a: String(raw.option_a || '').trim(),
    option_b: String(raw.option_b || '').trim(),
    option_c: String(raw.option_c || '').trim(),
    option_d: String(raw.option_d || '').trim(),
    correct_option: correctOption,
    explanation: String(raw.explanation || '').trim(),
    source: 'phase18_real_ai_gateway',
    generation_mode: 'real_ai'
  };
}

async function callAiGenerator(payload: GeneratePayload): Promise<Candidate | null> {
  const endpoint = process.env.AI_GENERATOR_ENDPOINT;
  const apiKey = process.env.AI_GENERATOR_API_KEY;
  const model = process.env.AI_GENERATOR_MODEL;

  if (!endpoint || !apiKey || !model) return null;

  const systemPrompt = [
    'You generate high-quality mathematics assessment questions for Project Z / Meletiou Mathematics.',
    'Return only valid JSON with these keys: assessment_criterion, question_type, difficulty_band, prompt, option_a, option_b, option_c, option_d, correct_option, explanation.',
    'correct_option must be exactly A, B, C, or D.',
    'All answer options must be plausible and similar in style and length.',
    'Wrong answers must represent realistic misconceptions or weaker reasoning.',
    'For MYP Criterion B, test investigation, pattern reasoning, justification, and generalisation.',
    'For MYP Criterion C, test mathematical communication, terminology, notation, units, structure, and clarity.',
    'For MYP Criterion D, test context interpretation, assumptions, limitations, reasonableness, and reflection.',
    'Do not make the correct answer obvious.'
  ].join('\n');

  const userPrompt = JSON.stringify({
    course_code: payload.course_code,
    course_skill_code: payload.course_skill_code,
    skill_title: payload.skill_title,
    skill_description: payload.skill_description,
    assessment_criterion: payload.assessment_criterion || 'A',
    difficulty_band: payload.difficulty_band || 1
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI generator request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI response did not include message content.');

  return normaliseAiCandidate(payload, extractJson(content));
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as GeneratePayload;

    if (!payload.course_code || !payload.course_skill_code) {
      return Response.json({ error: 'Missing course or skill code' }, { status: 400 });
    }

    try {
      const aiCandidate = await callAiGenerator(payload);
      if (aiCandidate) return Response.json(aiCandidate);
    } catch (error) {
      const fallback = fallbackCandidate(payload);
      return Response.json({
        ...fallback,
        generation_mode: 'fallback_after_ai_error',
        explanation: `${fallback.explanation} AI generation failed, so the safe fallback generator was used.`
      });
    }

    return Response.json(fallbackCandidate(payload));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
