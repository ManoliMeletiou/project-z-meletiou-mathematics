type SelfTestResult = {
  ok: boolean;
  configured: boolean;
  provider: string;
  model: string | null;
  mode: 'real_ai' | 'not_configured' | 'ai_error';
  checks: {
    endpointConfigured: boolean;
    apiKeyConfigured: boolean;
    modelConfigured: boolean;
    modelReachable: boolean;
    validJson: boolean;
    requiredFieldsPresent: boolean;
    correctOptionValid: boolean;
    nonEmptyOptions: boolean;
    distinctOptions: boolean;
    explanationPresent: boolean;
    promptPresent: boolean;
  };
  score: number;
  message: string;
  sample?: {
    prompt: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    explanation: string;
  };
  error?: string;
};

const REQUIRED_FIELDS = ['prompt', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation'];

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not contain JSON.');
  return JSON.parse(match[0]);
}

function scoreChecks(checks: SelfTestResult['checks']) {
  const values = Object.values(checks);
  const passed = values.filter(Boolean).length;
  return Math.round((passed / values.length) * 100);
}

function validateCandidate(candidate: any, baseChecks: Partial<SelfTestResult['checks']>) {
  const options = [
    String(candidate?.option_a || '').trim(),
    String(candidate?.option_b || '').trim(),
    String(candidate?.option_c || '').trim(),
    String(candidate?.option_d || '').trim()
  ];

  const checks: SelfTestResult['checks'] = {
    endpointConfigured: Boolean(baseChecks.endpointConfigured),
    apiKeyConfigured: Boolean(baseChecks.apiKeyConfigured),
    modelConfigured: Boolean(baseChecks.modelConfigured),
    modelReachable: Boolean(baseChecks.modelReachable),
    validJson: Boolean(baseChecks.validJson),
    requiredFieldsPresent: REQUIRED_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(candidate || {}, field)),
    correctOptionValid: ['A', 'B', 'C', 'D'].includes(String(candidate?.correct_option || '').trim().toUpperCase()),
    nonEmptyOptions: options.every((option) => option.length > 0),
    distinctOptions: new Set(options.map((option) => option.toLowerCase())).size === 4,
    explanationPresent: String(candidate?.explanation || '').trim().length >= 25,
    promptPresent: String(candidate?.prompt || '').trim().length >= 25
  };

  return checks;
}

export async function GET() {
  const endpoint = process.env.AI_GENERATOR_ENDPOINT || '';
  const apiKey = process.env.AI_GENERATOR_API_KEY || '';
  const model = process.env.AI_GENERATOR_MODEL || '';
  const provider = process.env.AI_GENERATOR_PROVIDER || 'OpenAI-compatible';

  const baseChecks = {
    endpointConfigured: Boolean(endpoint),
    apiKeyConfigured: Boolean(apiKey),
    modelConfigured: Boolean(model),
    modelReachable: false,
    validJson: false
  };

  if (!endpoint || !apiKey || !model) {
    const checks: SelfTestResult['checks'] = {
      ...baseChecks,
      requiredFieldsPresent: false,
      correctOptionValid: false,
      nonEmptyOptions: false,
      distinctOptions: false,
      explanationPresent: false,
      promptPresent: false
    };

    return Response.json({
      ok: false,
      configured: false,
      provider,
      model: model || null,
      mode: 'not_configured',
      checks,
      score: scoreChecks(checks),
      message: 'AI generator is not fully configured. Fallback templates remain available.'
    } satisfies SelfTestResult);
  }

  try {
    const systemPrompt = [
      'You are testing a mathematics question generator.',
      'Return ONLY valid JSON. No markdown.',
      'The JSON keys must be exactly: prompt, option_a, option_b, option_c, option_d, correct_option, explanation.',
      'correct_option must be A, B, C, or D.',
      'All options must be non-empty, distinct, plausible, and similar in style.',
      'The prompt and explanation must be clear mathematics assessment text.'
    ].join('\n');

    const userPrompt = JSON.stringify({
      task: 'Generate one short MYP mathematics multiple-choice question for simplifying an algebraic expression.',
      criterion: 'A',
      skill: 'Simplifying algebraic expressions',
      difficulty: 2
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const checks: SelfTestResult['checks'] = {
        ...baseChecks,
        requiredFieldsPresent: false,
        correctOptionValid: false,
        nonEmptyOptions: false,
        distinctOptions: false,
        explanationPresent: false,
        promptPresent: false
      };

      return Response.json({
        ok: false,
        configured: true,
        provider,
        model,
        mode: 'ai_error',
        checks,
        score: scoreChecks(checks),
        message: 'AI generator variables are configured, but the model request failed.',
        error: `${response.status} ${response.statusText}`
      } satisfies SelfTestResult);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI response did not include message content.');

    const candidate = extractJson(content);
    const checks = validateCandidate(candidate, { ...baseChecks, modelReachable: true, validJson: true });
    const score = scoreChecks(checks);
    const ok = score >= 90;

    return Response.json({
      ok,
      configured: true,
      provider,
      model,
      mode: 'real_ai',
      checks,
      score,
      message: ok
        ? 'AI generator self-test passed. Real AI generation is reachable and returning valid question JSON.'
        : 'AI generator responded, but at least one output quality check failed.',
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
    const checks: SelfTestResult['checks'] = {
      ...baseChecks,
      modelReachable: true,
      validJson: false,
      requiredFieldsPresent: false,
      correctOptionValid: false,
      nonEmptyOptions: false,
      distinctOptions: false,
      explanationPresent: false,
      promptPresent: false
    };

    return Response.json({
      ok: false,
      configured: true,
      provider,
      model,
      mode: 'ai_error',
      checks,
      score: scoreChecks(checks),
      message: 'AI generator responded incorrectly or could not be parsed safely.',
      error: error instanceof Error ? error.message : 'Unknown AI generation error'
    } satisfies SelfTestResult);
  }
}
