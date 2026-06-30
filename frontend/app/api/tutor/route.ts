type TutorPayload = {
  message: string;
  course_code?: string;
  course_skill_code?: string;
  skill_title?: string;
  tutor_mode?: string;
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

async function verifyTutorUser(request: Request) {
  const { supabaseUrl, supabaseAnonKey } = env();
  const token = getBearerToken(request);

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, token: '', role: 'unknown', message: 'Supabase environment is not configured.' };
  }

  if (!token) {
    return { ok: false, status: 401, token: '', role: 'guest', message: 'Missing sign-in token.' };
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!userResponse.ok) {
    return { ok: false, status: 401, token: '', role: 'guest', message: 'Invalid or expired sign-in token.' };
  }

  const user = await userResponse.json();

  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/project_z_profiles?id=eq.${user.id}&select=role,email`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  const profiles = profileResponse.ok ? await profileResponse.json() : [];
  const role = profiles?.[0]?.role || 'unknown';

  if (!['student', 'teacher'].includes(role)) {
    return { ok: false, status: 403, token: '', role, message: 'Only students and teachers can use the tutor.' };
  }

  return { ok: true, status: 200, token, role, message: 'Tutor user verified.' };
}

function containsAnswerGrab(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('just give me the answer') ||
    lower.includes('give me the answer') ||
    lower.includes('what is the answer') ||
    lower.includes('answer only') ||
    lower.includes('do it for me')
  );
}

function fallbackTutorReply(payload: TutorPayload) {
  const skill = payload.skill_title || 'this skill';
  const message = payload.message || '';

  if (containsAnswerGrab(message)) {
    return {
      reply: `I can help, but I will not just give the final answer immediately. For ${skill}, tell me what first step you think we should take. I will check it and guide you from there.`,
      safety_level: 'answer_withheld',
      learning_action: 'Asked student for first step instead of giving final answer.'
    };
  }

  return {
    reply: `Let's work on ${skill} step by step. First, identify what the question is asking. Then tell me the operation or rule you think applies. I will help you check the next step.`,
    safety_level: 'guided',
    learning_action: 'Guided student to identify the first mathematical step.'
  };
}

async function callAiTutor(payload: TutorPayload) {
  const { aiEndpoint, aiApiKey, aiModel } = env();

  if (!aiEndpoint || !aiApiKey || !aiModel) {
    return fallbackTutorReply(payload);
  }

  const skill = payload.skill_title || 'the selected mathematics skill';
  const message = payload.message || '';

  const systemPrompt = [
    'You are the Project Z student maths tutor.',
    'You must teach like an expert mathematics teacher.',
    'Do not give away the final answer too quickly.',
    'Use guided questions, hints, and step-by-step scaffolding.',
    'If the student asks for just the answer, withhold the final answer and ask for the first step.',
    'If the student shows work, diagnose the mistake and give the next small hint.',
    'Use age-appropriate, encouraging language.',
    'Keep responses concise.',
    'Return ONLY valid JSON with keys: reply, safety_level, learning_action.',
    'safety_level must be one of: guided, answer_withheld, misconception_detected, encouragement, review.',
    'learning_action should briefly describe what the tutor did pedagogically.'
  ].join('\n');

  const userPrompt = JSON.stringify({
    skill,
    course_code: payload.course_code || null,
    course_skill_code: payload.course_skill_code || null,
    tutor_mode: payload.tutor_mode || 'guided_learning',
    student_message: message
  });

  try {
    const response = await fetch(aiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: aiModel,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      return fallbackTutorReply(payload);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) return fallbackTutorReply(payload);

    const parsed = JSON.parse(content);

    return {
      reply: String(parsed.reply || '').trim() || fallbackTutorReply(payload).reply,
      safety_level: String(parsed.safety_level || 'guided').trim(),
      learning_action: String(parsed.learning_action || 'Guided student step by step.').trim()
    };
  } catch {
    return fallbackTutorReply(payload);
  }
}

export async function POST(request: Request) {
  const verification = await verifyTutorUser(request);

  if (!verification.ok) {
    return Response.json({ error: verification.message }, { status: verification.status });
  }

  try {
    const safetyStatus = await callSupabaseRpc(verification.token, 'project_z_tutor_safety_status', {});

    if (!safetyStatus?.allowed) {
      return Response.json(
        {
          error: safetyStatus?.reason || 'Tutor limit reached.',
          safetyStatus
        },
        { status: 429 }
      );
    }

    const payload = (await request.json()) as TutorPayload;

    if (!payload.message || payload.message.trim().length < 2) {
      return Response.json({ error: 'Type a question for the tutor.' }, { status: 400 });
    }

    const tutor = await callAiTutor(payload);

    try {
      await callSupabaseRpc(verification.token, 'project_z_log_tutor_interaction', {
        p_course_code: payload.course_code || null,
        p_course_skill_code: payload.course_skill_code || null,
        p_skill_title: payload.skill_title || null,
        p_student_message: payload.message,
        p_tutor_reply: tutor.reply,
        p_tutor_mode: payload.tutor_mode || 'guided_learning',
        p_safety_level: tutor.safety_level,
        p_learning_action: tutor.learning_action
      });
    } catch {}

    return Response.json({
      ok: true,
      reply: tutor.reply,
      safety_level: tutor.safety_level,
      learning_action: tutor.learning_action
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Tutor failed.' },
      { status: 500 }
    );
  }
}
