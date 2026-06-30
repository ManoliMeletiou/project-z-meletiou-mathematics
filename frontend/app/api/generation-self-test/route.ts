type SelfTestResult = {
  ok: boolean;
  configured: boolean;
  provider: string;
  model: string | null;
  mode: 'real_ai' | 'not_configured' | 'ai_error';
  checks: Record<string, boolean>;
  score: number;
  message: string;
  sample?: Record<string, string>;
  error?: string;
};

const REQUIRED_FIELDS = ['prompt', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation'];

function env() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    endpoint: process.env.AI_GENERATOR_ENDPOINT || '',
    apiKey: process.env.AI_GENERATOR_API_KEY || '',
    model: process.env.AI_GENERATOR_MODEL || '',
    provider: process.env.AI_GENERATOR_PROVIDER || 'OpenAI-compatible'
  };
}

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

async function verifyTeacher(request: Request) {
  const { supabaseUrl, supabaseAnonKey } = env();
  const token = getBearerToken(request);

  if (!token) return { ok: false, token: '', status: 401, message: 'Missing teacher sign-in token.' };

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` }
  });

  if (!userResponse.ok) return { ok: false, token: '', status: 401, message: 'Invalid teacher sign-in token.' };

  const user = await userResponse.json();

  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/project_z_profiles?id=eq.${user.id}&select=role`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });

  const profiles = profileResponse.ok ? await profileResponse.json() : [];
  if (profiles?.[0]?.role !== 'teacher') {
    return { ok: false, token: '', status: 403, message: 'Only teachers can run AI self-tests.' };
  }

  return { ok: true, token, status: 200, message: 'Teacher verified.' };
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

  if (!response.ok) throw new Error(`Supabase RPC ${name} failed: ${response.status}`);
  return response.json();
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not contain JSON.');
  return JSON.parse(match[0]);
}

function scoreChecks(checks: Record<string, boolean>) {
  const values = Object.values(checks);
  const passed = values.filter(Boolean).length;
  return Math.round((passed / values.length) * 100);
}

function validateCandidate(candidate: any, base: Record<string, boolean>) {
  const options = [
    String(candidate?.option_a || '').trim(),
    String(candidate?.option_b || '').trim(),
    String(candidate?.option_c || '').trim(),
    String(candidate?.option_d || '').trim()
  ];

  return {
    ...base,
    validJson: true,
    requiredFieldsPresent: REQUIRED_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(candidate || {}, field)),
    correctOptionValid: ['A', 'B', 'C', 'D'].includes(String(candidate?.correct_option || '').trim().toUpperCase()),
    nonEmptyOptions: options.every((option) => option.length > 0),
    distinctOptions: new Set(options.map((option) => option.toLowerCase())).size === 4,
    explanationPresent: String(candidate?.explanation || '').trim().length >= 25,
    promptPresent: String(candidate?.prompt || '').trim().length >= 25
  };
}

export async function GET(request: Request) {
  const verification = await verifyTeacher(request);

  if (!verification.ok) {
    return Response.json({ error: verification.message }, { status: verification.status });
  }

  const { endpoint, apiKey, model, provider } = env();

  const baseChecks = {
    endpointConfigured: Boolean(endpoint),
    apiKeyConfigured: Boolean(apiKey),
    modelConfigured: Boolean(model),
    modelReachable: false,
    validJson: false,
    requiredFieldsPresent: false,
    correctOptionValid: false,
    nonEmptyOptions: false,
    distinctOptions: false,
    explanationPresent: false,
    promptPresent: false
  };

  try {
    const allowance = await callSupabaseRpc(verification.token, 'project_z_ai_generation_allowance', {});

    if (!allowance?.allowed) {
      await callSupabaseRpc(verification.token, 'project_z_log_ai_generation', {
        p_action: 'self_test',
        p_status: 'blocked_by_rate_limit',
        p_generation_mode: null,
        p_model: model || null,
        p_course_code: null,
        p_course_skill_code: null,
        p_quality_score: null,
        p_input_summary: 'AI self-test blocked before model call.',
        p_error_message: allowance?.reason || 'AI generation limit reached.'
      });

      return Response.json({ error: allowance?.reason || 'AI generation limit reached.', allowance }, { status: 429 });
    }

    if (!endpoint || !apiKey || !model) {
      return Response.json({
        ok: false,
        configured: false,
        provider,
        model: model || null,
        mode: 'not_configured',
        checks: baseChecks,
        score: scoreChecks(baseChecks),
        message: 'AI generator is not fully configured. Fallback templates remain available.'
      } satisfies SelfTestResult);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Return ONLY valid JSON with keys: prompt, option_a, option_b, option_c, option_d, correct_option, explanation.'
          },
          {
            role: 'user',
            content: 'Generate one short MYP mathematics multiple-choice question for simplifying an algebraic expression. correct_option must be A, B, C, or D.'
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI response did not include message content.');

    const candidate = extractJson(content);
    const checks = validateCandidate(candidate, { ...baseChecks, modelReachable: true });
    const score = scoreChecks(checks);
    const ok = score >= 90;

    await callSupabaseRpc(verification.token, 'project_z_log_ai_generation', {
      p_action: 'self_test',
      p_status: ok ? 'success' : 'quality_warning',
      p_generation_mode: 'real_ai',
      p_model: model,
      p_course_code: null,
      p_course_skill_code: null,
      p_quality_score: score,
      p_input_summary: String(candidate?.prompt || '').slice(0, 1000),
      p_error_message: ok ? null : 'AI self-test returned output that needs attention.'
    });

    return Response.json({
      ok,
      configured: true,
      provider,
      model,
      mode: 'real_ai',
      checks,
      score,
      message: ok ? 'AI generator self-test passed.' : 'AI generator responded, but at least one output quality check failed.',
      sample: {
        prompt: String(candidate.prompt || ''),
        option_a: String(candidate.option_a || ''),
        option_b: String(candidate.option_b || ''),
        option_c: String(candidate.option_c || ''),
        option_d: String(candidate.option_d || ''),
        correct_option: String(candidate.correct_option || ''),
        explanation: String(candidate.explanation || '')
      }
    } satisfies SelfTestResult);
  } catch (error) {
    try {
      await callSupabaseRpc(verification.token, 'project_z_log_ai_generation', {
        p_action: 'self_test',
        p_status: 'server_error',
        p_generation_mode: 'real_ai',
        p_model: model || null,
        p_course_code: null,
        p_course_skill_code: null,
        p_quality_score: null,
        p_input_summary: null,
        p_error_message: error instanceof Error ? error.message : 'Unknown AI self-test error'
      });
    } catch {}

    const checks = { ...baseChecks, modelReachable: true };
    return Response.json({
      ok: false,
      configured: true,
      provider,
      model: model || null,
      mode: 'ai_error',
      checks,
      score: scoreChecks(checks),
      message: 'AI generator responded incorrectly or could not be parsed safely.',
      error: error instanceof Error ? error.message : 'Unknown AI generation error'
    } satisfies SelfTestResult);
  }
}
