export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-20-test-harden-real-ai-generation',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      realAiGeneratorEndpointConfigured: Boolean(process.env.AI_GENERATOR_ENDPOINT),
      realAiGeneratorKeyConfigured: Boolean(process.env.AI_GENERATOR_API_KEY),
      realAiGeneratorModelConfigured: Boolean(process.env.AI_GENERATOR_MODEL),
      aiGenerationSelfTestEndpoint: true,
      aiGenerationTeacherTestPage: true,
      strictJsonSelfTest: true,
      requiredFieldValidation: true,
      duplicateOptionValidation: true,
      fallbackTemplatesEnabled: true,
      qualityGatedGeneration: true,
      bestAccuracyOverDecoration: true
    },
    routes: ['/', '/student', '/teacher', '/parent', '/reports', '/quality', '/generate', '/ai-test', '/curriculum', '/diagnostic', '/recommended', '/path', '/auth', '/account', '/dashboard', '/classes', '/assignments', '/api/question', '/api/generate-quality-question', '/api/generation-status', '/api/generation-self-test', '/api/tutor', '/api/health']
  });
}
