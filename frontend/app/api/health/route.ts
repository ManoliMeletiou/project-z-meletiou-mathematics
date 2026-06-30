export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-13-recommended-practice-engine',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      questionFallbackEnabled: true,
      adaptiveDiagnosticEngine: true,
      recommendedPracticeEngine: true,
      recommendationsUseMasteryConfidenceEvidence: true,
      shuffledPracticeAnswerOptions: true,
      masteryUpdatesFromPractice: true,
      parentTeacherReportFoundation: true
    },
    routes: ['/', '/student', '/teacher', '/parent', '/curriculum', '/diagnostic', '/recommended', '/auth', '/account', '/dashboard', '/classes', '/assignments', '/api/question', '/api/tutor', '/api/health']
  });
}
