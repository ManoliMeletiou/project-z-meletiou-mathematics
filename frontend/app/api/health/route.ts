export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-12-adaptive-diagnostic-engine',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      questionFallbackEnabled: true,
      adaptiveDiagnosticEngine: true,
      enoughEvidenceBeforeConclusion: true,
      skillMasteryPercentages: true,
      shuffledSkillQuestions: true,
      mypCriteriaAToDStructuredAutoMarking: true,
      dpStandardHigherAAAI: true
    },
    routes: ['/', '/student', '/teacher', '/parent', '/curriculum', '/diagnostic', '/auth', '/account', '/dashboard', '/classes', '/assignments', '/api/question', '/api/tutor', '/api/health']
  });
}
