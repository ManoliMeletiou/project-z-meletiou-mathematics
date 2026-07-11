type Recommendation = {
  recommendation_id?: string;
  class_id: string;
  class_label?: string;
  course_code?: string | null;
  course_skill_code: string;
  skill_title: string;
  recommendation_type?: string;
  suggested_assignment_title?: string;
  suggested_assignment_instructions?: string;
  average_mastery?: number;
  average_confidence?: number;
  weak_students?: number;
  low_confidence_students?: number;
  misconception_count?: number;
  hint_needed_count?: number;
  action_needed_count?: number;
  priority_label?: string;
  priority_score?: number;
};

type GeneratedQuestion = {
  question_number?: number;
  criterion?: string;
  difficulty_band?: string;
  question_type?: string;
  prompt?: string;
  options?: Record<string, string> | null;
  correct_answer?: string;
  correct_option?: string | null;
  explanation?: string;
  quality_notes?: Record<string, unknown>;
};

function env() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    aiEndpoint: process.env.AI_GENERATOR_ENDPOINT || '',
    aiApiKey: process.env.AI_GENERATOR_API_KEY || '',
    aiModel: process.env.AI_GENERATOR_MODEL || 'gpt-4.1-mini'
  };
}

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

function assignmentLevel(recommendation: Recommendation) {
  const mastery = Number(recommendation.average_mastery || 0);
  const course = String(recommendation.course_code || '').toLowerCase();
  const type = String(recommendation.recommendation_type || '').toLowerCase();

  if (type.includes('foundation') || mastery < 45) return 'foundation_rebuild';
  if (course.includes('extended') || course.includes('higher')) return 'extended';
  if (mastery >= 80) return 'challenge_consolidation';
  return 'standard';
}

function targetDifficultyMix(level: string) {
  if (level === 'foundation_rebuild') {
    return {
      foundation: 10,
      core: 10,
      standard: 6,
      extended: 2,
      challenge: 0,
      reflection: 2
    };
  }

  if (level === 'extended') {
    return {
      foundation: 3,
      core: 6,
      standard: 10,
      extended: 7,
      challenge: 2,
      reflection: 2
    };
  }

  if (level === 'challenge_consolidation') {
    return {
      foundation: 2,
      core: 5,
      standard: 9,
      extended: 8,
      challenge: 4,
      reflection: 2
    };
  }

  return {
    foundation: 5,
    core: 8,
    standard: 11,
    extended: 4,
    challenge: 0,
    reflection: 2
  };
}

async function fetchJson(url: string, token: string, init?: RequestInit) {
  const { supabaseAnonKey } = env();

  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text}`);
  }

  return response.json();
}

async function verifyTeacherAndClass(request: Request, classId: string) {
  const { supabaseUrl, supabaseAnonKey } = env();
  const token = getBearerToken(request);

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, token: '', userId: '', message: 'Supabase environment is not configured.' };
  }

  if (!token) {
    return { ok: false, status: 401, token: '', userId: '', message: 'Missing sign-in token.' };
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!userResponse.ok) {
    return { ok: false, status: 401, token: '', userId: '', message: 'Invalid or expired sign-in token.' };
  }

  const user = await userResponse.json();

  const profile = await fetchJson(
    `${supabaseUrl}/rest/v1/project_z_profiles?id=eq.${user.id}&select=role`,
    token,
    { method: 'GET' }
  );

  if (profile?.[0]?.role !== 'teacher') {
    return { ok: false, status: 403, token: '', userId: '', message: 'Only teachers can create generated assignments.' };
  }

  const classes = await fetchJson(
    `${supabaseUrl}/rest/v1/project_z_classes?id=eq.${classId}&teacher_id=eq.${user.id}&select=id`,
    token,
    { method: 'GET' }
  );

  if (!Array.isArray(classes) || classes.length === 0) {
    return { ok: false, status: 403, token: '', userId: '', message: 'You can only create assignments for your own classes.' };
  }

  return { ok: true, status: 200, token, userId: user.id, message: 'Verified.' };
}

function normalizeCriterion(value: unknown) {
  const raw = String(value || 'A').toUpperCase().trim();
  return ['A', 'B', 'C', 'D'].includes(raw) ? raw : 'A';
}

function normalizeDifficulty(value: unknown) {
  const raw = String(value || 'standard').toLowerCase().trim();
  const allowed = ['foundation', 'core', 'standard', 'extended', 'challenge', 'reflection'];
  return allowed.includes(raw) ? raw : 'standard';
}

function normalizeType(value: unknown) {
  const raw = String(value || 'short_answer').toLowerCase().trim();
  const allowed = ['short_answer', 'multiple_choice', 'worked_reasoning', 'error_analysis', 'reflection'];
  return allowed.includes(raw) ? raw : 'short_answer';
}

function validateAndNormalizeQuestions(questions: GeneratedQuestion[], recommendation: Recommendation) {
  if (!Array.isArray(questions) || questions.length < 30) {
    throw new Error('The AI did not produce the required minimum of 30 questions. No assignment was created.');
  }

  return questions.slice(0, 30).map((question, index) => {
    const questionType = normalizeType(question.question_type);
    const criterion = normalizeCriterion(question.criterion);
    const difficulty = normalizeDifficulty(question.difficulty_band);
    const options = question.options && typeof question.options === 'object' ? question.options : null;
    const correctOption = question.correct_option ? String(question.correct_option).toUpperCase().trim() : null;

    if (!question.prompt || String(question.prompt).trim().length < 8) {
      throw new Error(`Question ${index + 1} has an invalid prompt.`);
    }

    if (!question.correct_answer || String(question.correct_answer).trim().length < 1) {
      throw new Error(`Question ${index + 1} is missing a correct answer.`);
    }

    if (!question.explanation || String(question.explanation).trim().length < 8) {
      throw new Error(`Question ${index + 1} is missing a useful explanation.`);
    }

    if (questionType === 'multiple_choice') {
      if (!options || !options.A || !options.B || !options.C || !options.D) {
        throw new Error(`Question ${index + 1} is multiple-choice but does not have A, B, C, and D options.`);
      }

      const optionValues = [options.A, options.B, options.C, options.D].map((option) => String(option).trim());
      if (new Set(optionValues).size < 4) {
        throw new Error(`Question ${index + 1} has repeated answer options.`);
      }

      if (!correctOption || !['A', 'B', 'C', 'D'].includes(correctOption)) {
        throw new Error(`Question ${index + 1} is missing a valid correct option A-D.`);
      }
    }

    return {
      question_number: index + 1,
      course_skill_code: recommendation.course_skill_code,
      skill_title: recommendation.skill_title,
      criterion,
      difficulty_band: difficulty,
      question_type: questionType,
      prompt: String(question.prompt).trim(),
      options,
      correct_answer: String(question.correct_answer).trim(),
      correct_option: correctOption,
      explanation: String(question.explanation).trim(),
      quality_notes: {
        ...(question.quality_notes || {}),
        skill_locked: true,
        minimum_question_assignment: true,
        generated_for_skill: recommendation.course_skill_code
      }
    };
  });
}

async function generateQuestions(recommendation: Recommendation, level: string) {
  const { aiEndpoint, aiApiKey, aiModel } = env();

  if (!aiEndpoint || !aiApiKey) {
    throw new Error('Real AI generation is not configured. No assignment was created.');
  }

  const mix = targetDifficultyMix(level);

  const systemPrompt = [
    'You are Project Z, an expert IB mathematics assignment generator.',
    'Generate a high-quality maths assignment. Accuracy is more important than decoration.',
    'The assignment must contain exactly 30 questions.',
    'Every question must target the given course_skill_code and skill_title. Do not drift to unrelated skills.',
    'Choose the difficulty level from the provided assignment_level and evidence.',
    'Questions must be suitable for the correct school/course level.',
    'Use a good mix: fluency, reasoning, misconception repair, application, and reflection.',
    'For MYP Criterion A use mathematical knowledge/application questions.',
    'For MYP Criteria B/C/D use structured auto-markable questions, error analysis, explanation, terminology, interpretation, or reflection.',
    'For multiple-choice questions: options A-D must be plausible, similar in style/length, and not obviously different.',
    'Correct options must be distributed across A, B, C, and D. Do not make every answer A.',
    'Return ONLY valid JSON. No markdown.',
    'JSON shape: {"assignment_title": string, "assignment_instructions": string, "questions": Question[]}.',
    'Each Question must have: criterion, difficulty_band, question_type, prompt, options, correct_answer, correct_option, explanation, quality_notes.',
    'question_type must be one of short_answer, multiple_choice, worked_reasoning, error_analysis, reflection.',
    'difficulty_band must be one of foundation, core, standard, extended, challenge, reflection.',
    'criterion must be A, B, C, or D.',
    'For non-multiple-choice questions, options may be null and correct_option may be null.'
  ].join('\n');

  const userPrompt = JSON.stringify({
    minimum_questions: 30,
    exact_questions_required: 30,
    course_code: recommendation.course_code || null,
    course_skill_code: recommendation.course_skill_code,
    skill_title: recommendation.skill_title,
    assignment_level: level,
    recommendation_type: recommendation.recommendation_type || null,
    average_mastery: recommendation.average_mastery || null,
    average_confidence: recommendation.average_confidence || null,
    weak_students: recommendation.weak_students || 0,
    low_confidence_students: recommendation.low_confidence_students || 0,
    misconception_count: recommendation.misconception_count || 0,
    hint_needed_count: recommendation.hint_needed_count || 0,
    action_needed_count: recommendation.action_needed_count || 0,
    required_difficulty_mix: mix,
    required_criterion_mix: {
      A_math_knowledge: 20,
      B_pattern_reasoning: 3,
      C_communication_terminology: 4,
      D_real_life_reflection: 3
    },
    quality_rules: [
      'No off-skill questions.',
      'No repeated questions.',
      'No obviously silly distractors.',
      'Use mathematical terminology correctly.',
      'Include answers and explanations.',
      'Do not make students reach mastery from one assignment alone.'
    ]
  });

  const response = await fetch(aiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: aiModel,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI generation failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI generation returned no content.');
  }

  const parsed = JSON.parse(content);

  return {
    assignmentTitle: String(parsed.assignment_title || recommendation.suggested_assignment_title || `30-question assignment: ${recommendation.skill_title}`),
    assignmentInstructions: String(parsed.assignment_instructions || recommendation.suggested_assignment_instructions || `Complete all 30 questions on ${recommendation.skill_title}. Show working where needed.`),
    questions: validateAndNormalizeQuestions(parsed.questions, recommendation),
    model: env().aiModel,
    mix
  };
}

async function insertAssignment(token: string, teacherId: string, recommendation: Recommendation, generated: Awaited<ReturnType<typeof generateQuestions>>, level: string) {
  const { supabaseUrl } = env();

  const assignmentRows = await fetchJson(
    `${supabaseUrl}/rest/v1/project_z_generated_assignments`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        teacher_id: teacherId,
        class_id: recommendation.class_id,
        source_recommendation_id: recommendation.recommendation_id || null,
        course_code: recommendation.course_code || null,
        course_skill_code: recommendation.course_skill_code,
        skill_title: recommendation.skill_title,
        assignment_title: generated.assignmentTitle,
        assignment_instructions: generated.assignmentInstructions,
        assignment_level: level,
        recommendation_type: recommendation.recommendation_type || null,
        question_count: generated.questions.length,
        status: 'draft',
        ai_model: generated.model,
        quality_rules: {
          minimum_questions: 30,
          actual_questions: generated.questions.length,
          skill_locked: true,
          course_code: recommendation.course_code || null,
          assignment_level: level,
          difficulty_mix: generated.mix,
          requires_teacher_review_before_assigning: true,
          content_origin: 'ai_generated_draft',
          rights_status: 'teacher_review_required',
          deterministic_release_audit_required: true
        }
      })
    }
  );

  const assignmentId = assignmentRows?.[0]?.id;
  if (!assignmentId) {
    throw new Error('Assignment was not created.');
  }

  try {
    await fetchJson(
      `${supabaseUrl}/rest/v1/project_z_generated_assignment_questions`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(
          generated.questions.map((question) => ({
            assignment_id: assignmentId,
            ...question
          }))
        )
      }
    );
  } catch (error) {
    await fetchJson(
      `${supabaseUrl}/rest/v1/project_z_generated_assignments?id=eq.${assignmentId}`,
      token,
      { method: 'DELETE' }
    ).catch(() => undefined);
    throw error;
  }

  return assignmentId;
}

async function logRecommendationAction(token: string, recommendation: Recommendation) {
  const { supabaseUrl, supabaseAnonKey } = env();

  try {
    await fetch(`${supabaseUrl}/rest/v1/rpc/project_z_log_assignment_recommendation_action`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_class_id: recommendation.class_id,
        p_course_skill_code: recommendation.course_skill_code,
        p_skill_title: recommendation.skill_title,
        p_recommendation_type: recommendation.recommendation_type || 'Generated assignment',
        p_action: 'planned',
        p_teacher_notes: 'Created a minimum-30-question generated assignment from this recommendation.'
      })
    });
  } catch {}
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recommendation = body.recommendation as Recommendation;

    if (!recommendation?.class_id || !recommendation.course_skill_code || !recommendation.skill_title) {
      return Response.json({ error: 'Missing recommendation class, skill code, or skill title.' }, { status: 400 });
    }

    const verification = await verifyTeacherAndClass(request, recommendation.class_id);

    if (!verification.ok) {
      return Response.json({ error: verification.message }, { status: verification.status });
    }

    const level = assignmentLevel(recommendation);
    const generated = await generateQuestions(recommendation, level);

    if (generated.questions.length < 30) {
      return Response.json({ error: 'Assignment must contain at least 30 questions. No assignment was created.' }, { status: 500 });
    }

    const assignmentId = await insertAssignment(verification.token, verification.userId, recommendation, generated, level);
    await logRecommendationAction(verification.token, recommendation);

    return Response.json({
      ok: true,
      assignment_id: assignmentId,
      question_count: generated.questions.length,
      assignment_level: level,
      skill_locked: recommendation.course_skill_code,
      message: 'Created a 30-question skill-locked assignment draft.'
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create generated assignment.' },
      { status: 500 }
    );
  }
}
