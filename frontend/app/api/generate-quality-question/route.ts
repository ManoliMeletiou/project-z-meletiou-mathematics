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

function env() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    aiEndpoint: process.env.AI_GENERATOR_ENDPOINT || '',
    aiApiKey: process.env.AI_GENERATOR_API_KEY || '',
    aiModel: process.env.AI_GENERATOR_MODEL || ''
  };
}

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

async function callSupabaseRpc(token: string, name: string, body: Record<string, unknown>) {
  const { supabaseUrl, supabaseAnonKey } = env();

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase RPC ${name} failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function verifyTeacher(request: Request) {
  const { supabaseUrl, supabaseAnonKey } = env();
  const token = getBearerToken(request);

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, token: '', message: 'Supabase environment is not configured.' };
  }

  if (!token) {
    return { ok: false, status: 401, token: '', message: 'Missing teacher sign-in token.' };
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!userResponse.ok) {
    return { ok: false, status: 401, token: '', message: 'Invalid or expired sign-in token.' };
  }

  const user = await userResponse.json();

  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/project_z_profiles?id=eq.${user.id}&select=role,email`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!profileResponse.ok) {
    return { ok: false, status: 403, token: '', message: 'Could not verify teacher profile.' };
  }

  const profiles = await profileResponse.json();
  const profile = profiles?.[0];

  if (profile?.role !== 'teacher') {
    return { ok: false, status: 403, token: '', message: 'Only teachers can use AI question generation.' };
  }

  return { ok: true, status: 200, token, message: 'Teacher verified.' };
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
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
      source: 'phase21_fallback_template',
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
      source: 'phase21_fallback_template',
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
      source: 'phase21_fallback_template',
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
    source: 'phase21_fallback_template',
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
    source: 'phase21_real_ai_gateway',
    generation_mode: 'real_ai'
  };
}

async function callAiGenerator(payload: GeneratePayload): Promise<Candidate | null> {
  const { aiEndpoint, aiApiKey, aiModel } = env();

  if (!aiEndpoint || !aiApiKey || !aiModel) return null;

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

  const response = await fetch(aiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: aiModel,
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
  const verification = await verifyTeacher(request);

  if (!verification.ok) {
    return Response.json({ error: verification.message }, { status: verification.status });
  }

  try {
    const allowance = await callSupabaseRpc(verification.token, 'project_z_ai_generation_allowance', {});

    if (!allowance?.allowed) {
      await callSupabaseRpc(verification.token, 'project_z_log_ai_generation', {
        p_action: 'generate_question',
        p_status: 'blocked_by_rate_limit',
        p_generation_mode: null,
        p_model: env().aiModel || null,
        p_course_code: null,
        p_course_skill_code: null,
        p_quality_score: null,
        p_input_summary: 'AI generation blocked before model call.',
        p_error_message: allowance?.reason || 'AI generation limit reached.'
      });

      return Response.json(
        {
          error: allowance?.reason || 'AI generation limit reached.',
          allowance
        },
        { status: 429 }
      );
    }

    const payload = (await request.json()) as GeneratePayload;

    if (!payload.course_code || !payload.course_skill_code) {
      return Response.json({ error: 'Missing course or skill code' }, { status: 400 });
    }

    let candidate: Candidate;

    try {
      const aiCandidate = await callAiGenerator(payload);
      candidate = aiCandidate || fallbackCandidate(payload);
    } catch (error) {
      candidate = {
        ...fallbackCandidate(payload),
        generation_mode: 'fallback_after_ai_error',
        explanation: `${fallbackCandidate(payload).explanation} AI generation failed, so the safe fallback generator was used.`
      };
    }

    await callSupabaseRpc(verification.token, 'project_z_log_ai_generation', {
      p_action: 'generate_question',
      p_status: 'success',
      p_generation_mode: candidate.generation_mode || null,
      p_model: env().aiModel || 'fallback-template',
      p_course_code: candidate.course_code,
      p_course_skill_code: candidate.course_skill_code,
      p_quality_score: null,
      p_input_summary: `${candidate.assessment_criterion || 'A'} | ${candidate.question_type} | ${candidate.prompt}`.slice(0, 1000),
      p_error_message: null
    });

    return Response.json(candidate);
  } catch (error) {
    try {
      await callSupabaseRpc(verification.token, 'project_z_log_ai_generation', {
        p_action: 'generate_question',
        p_status: 'server_error',
        p_generation_mode: null,
        p_model: env().aiModel || null,
        p_course_code: null,
        p_course_skill_code: null,
        p_quality_score: null,
        p_input_summary: null,
        p_error_message: error instanceof Error ? error.message : 'Unknown generation error'
      });
    } catch {}

    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
