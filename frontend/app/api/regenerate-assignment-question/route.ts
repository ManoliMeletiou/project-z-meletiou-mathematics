type ExistingQuestion = {
  id: string;
  assignment_id: string;
  question_number: number;
  course_skill_code: string;
  skill_title: string;
  criterion: string;
  difficulty_band: string;
  question_type: string;
  prompt: string;
  options: Record<string, string> | null;
  correct_answer: string;
  correct_option: string | null;
  explanation: string;
  quality_notes: Record<string, unknown>;
};

type ExistingAssignment = {
  id: string;
  teacher_id: string;
  class_id: string;
  course_code: string | null;
  course_skill_code: string;
  skill_title: string;
  assignment_title: string;
  assignment_level: string;
  question_count: number;
  status: string;
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

async function fetchSupabaseJson(url: string, token: string, init?: RequestInit) {
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

async function verifyTeacher(request: Request) {
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

  const profiles = await fetchSupabaseJson(
    `${supabaseUrl}/rest/v1/project_z_profiles?id=eq.${user.id}&select=role`,
    token,
    { method: 'GET' }
  );

  if (profiles?.[0]?.role !== 'teacher') {
    return { ok: false, status: 403, token: '', userId: '', message: 'Only teachers can regenerate assignment questions.' };
  }

  return { ok: true, status: 200, token, userId: user.id, message: 'Verified.' };
}

function normalizeCriterion(value: unknown) {
  const raw = String(value || 'A').toUpperCase().trim();
  return ['A', 'B', 'C', 'D'].includes(raw) ? raw : 'A';
}

function normalizeDifficulty(value: unknown, fallback: string) {
  const raw = String(value || fallback || 'standard').toLowerCase().trim();
  const allowed = ['foundation', 'core', 'standard', 'extended', 'challenge', 'reflection'];
  return allowed.includes(raw) ? raw : fallback || 'standard';
}

function normalizeType(value: unknown, fallback: string) {
  const raw = String(value || fallback || 'short_answer').toLowerCase().trim();
  const allowed = ['short_answer', 'multiple_choice', 'worked_reasoning', 'error_analysis', 'reflection'];
  return allowed.includes(raw) ? raw : fallback || 'short_answer';
}

function validateReplacement(raw: any, existing: ExistingQuestion) {
  const questionType = normalizeType(raw.question_type, existing.question_type);
  const criterion = normalizeCriterion(raw.criterion || existing.criterion);
  const difficulty = normalizeDifficulty(raw.difficulty_band, existing.difficulty_band);
  const options = raw.options && typeof raw.options === 'object' ? raw.options : null;
  const correctOption = raw.correct_option ? String(raw.correct_option).toUpperCase().trim() : null;

  if (!raw.prompt || String(raw.prompt).trim().length < 12) {
    throw new Error('Replacement question prompt is too weak.');
  }

  if (!raw.correct_answer || String(raw.correct_answer).trim().length < 1) {
    throw new Error('Replacement question is missing a correct answer.');
  }

  if (!raw.explanation || String(raw.explanation).trim().length < 15) {
    throw new Error('Replacement question explanation is too weak.');
  }

  if (questionType === 'multiple_choice') {
    if (!options || !options.A || !options.B || !options.C || !options.D) {
      throw new Error('Replacement MCQ does not have A, B, C, and D options.');
    }

    const values = [options.A, options.B, options.C, options.D].map((option) => String(option).trim());
    if (new Set(values).size < 4) {
      throw new Error('Replacement MCQ has repeated answer options.');
    }

    if (!correctOption || !['A', 'B', 'C', 'D'].includes(correctOption)) {
      throw new Error('Replacement MCQ is missing a valid correct option A-D.');
    }
  }

  return {
    course_skill_code: existing.course_skill_code,
    skill_title: existing.skill_title,
    criterion,
    difficulty_band: difficulty,
    question_type: questionType,
    prompt: String(raw.prompt).trim(),
    options,
    correct_answer: String(raw.correct_answer).trim(),
    correct_option: questionType === 'multiple_choice' ? correctOption : null,
    explanation: String(raw.explanation).trim(),
    quality_notes: {
      ...(raw.quality_notes || {}),
      regenerated: true,
      same_skill_preserved: true,
      same_criterion_requested: existing.criterion,
      same_difficulty_requested: existing.difficulty_band,
      regenerated_at: new Date().toISOString()
    }
  };
}

async function generateReplacement(assignment: ExistingAssignment, existing: ExistingQuestion, issueCodes: string[], notes?: string) {
  const { aiEndpoint, aiApiKey, aiModel } = env();

  if (!aiEndpoint || !aiApiKey) {
    throw new Error('Real AI generation is not configured. Question was not regenerated.');
  }

  const systemPrompt = [
    'You are Project Z, an expert IB mathematics question quality fixer.',
    'Regenerate exactly ONE question.',
    'The replacement must preserve the same course_skill_code, skill_title, criterion, difficulty_band, and question_type unless question_type is invalid.',
    'Do not drift off-skill.',
    'Make the question suitable for the course level and assignment level.',
    'If multiple-choice, A-D options must be plausible, similar in style/length, and not obviously different.',
    'Use correct mathematical terminology.',
    'Return ONLY valid JSON. No markdown.',
    'JSON shape: {"question": {"criterion": string, "difficulty_band": string, "question_type": string, "prompt": string, "options": object|null, "correct_answer": string, "correct_option": string|null, "explanation": string, "quality_notes": object}}.'
  ].join('\n');

  const userPrompt = JSON.stringify({
    assignment: {
      course_code: assignment.course_code,
      assignment_level: assignment.assignment_level,
      assignment_title: assignment.assignment_title,
      question_count: assignment.question_count
    },
    locked_skill: {
      course_skill_code: existing.course_skill_code,
      skill_title: existing.skill_title
    },
    preserve: {
      criterion: existing.criterion,
      difficulty_band: existing.difficulty_band,
      question_type: existing.question_type
    },
    old_question: {
      prompt: existing.prompt,
      options: existing.options,
      correct_answer: existing.correct_answer,
      correct_option: existing.correct_option,
      explanation: existing.explanation
    },
    issues_to_fix: issueCodes,
    teacher_notes: notes || null,
    quality_rules: [
      'Same skill only.',
      'Same criterion and difficulty unless absolutely invalid.',
      'Clear prompt.',
      'Correct answer and explanation required.',
      'Plausible distractors for MCQ.',
      'No obvious wrong options.',
      'No repeated answer options.'
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
    throw new Error(`AI regeneration failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI regeneration returned no content.');
  }

  const parsed = JSON.parse(content);
  return validateReplacement(parsed.question || parsed, existing);
}

async function logAudit(token: string, payload: Record<string, unknown>) {
  const { supabaseUrl, supabaseAnonKey } = env();

  await fetch(`${supabaseUrl}/rest/v1/rpc/project_z_log_assignment_quality_audit`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const assignmentId = String(body.assignment_id || '');
    const questionId = String(body.question_id || '');
    const issueCodes = Array.isArray(body.issue_codes) ? body.issue_codes.map(String) : [];
    const notes = body.notes ? String(body.notes) : '';

    if (!assignmentId || !questionId) {
      return Response.json({ error: 'Missing assignment_id or question_id.' }, { status: 400 });
    }

    const verification = await verifyTeacher(request);

    if (!verification.ok) {
      return Response.json({ error: verification.message }, { status: verification.status });
    }

    const { supabaseUrl } = env();

    const assignments = await fetchSupabaseJson(
      `${supabaseUrl}/rest/v1/project_z_generated_assignments?id=eq.${assignmentId}&teacher_id=eq.${verification.userId}&select=*`,
      verification.token,
      { method: 'GET' }
    );

    const assignment = assignments?.[0] as ExistingAssignment | undefined;

    if (!assignment) {
      return Response.json({ error: 'Assignment not found or not yours.' }, { status: 404 });
    }

    if (assignment.question_count < 30) {
      return Response.json({ error: 'Assignment has fewer than 30 questions. Fix the assignment before regenerating individual questions.' }, { status: 400 });
    }

    const questions = await fetchSupabaseJson(
      `${supabaseUrl}/rest/v1/project_z_generated_assignment_questions?id=eq.${questionId}&assignment_id=eq.${assignmentId}&select=*`,
      verification.token,
      { method: 'GET' }
    );

    const existing = questions?.[0] as ExistingQuestion | undefined;

    if (!existing) {
      return Response.json({ error: 'Question not found for this assignment.' }, { status: 404 });
    }

    const replacement = await generateReplacement(assignment, existing, issueCodes, notes);

    const updatedRows = await fetchSupabaseJson(
      `${supabaseUrl}/rest/v1/project_z_generated_assignment_questions?id=eq.${questionId}`,
      verification.token,
      {
        method: 'PATCH',
        body: JSON.stringify(replacement)
      }
    );

    await logAudit(verification.token, {
      p_assignment_id: assignmentId,
      p_question_id: questionId,
      p_audit_type: 'regeneration',
      p_audit_status: 'regenerated',
      p_issue_codes: issueCodes,
      p_notes: notes || 'Regenerated question while preserving skill, criterion, and difficulty.',
      p_before_question: existing,
      p_after_question: updatedRows?.[0] || replacement
    });

    return Response.json({
      ok: true,
      assignment_id: assignmentId,
      question_id: questionId,
      message: 'Question regenerated on the same skill, criterion, and difficulty band.',
      replacement: updatedRows?.[0] || replacement
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate assignment question.' },
      { status: 500 }
    );
  }
}
