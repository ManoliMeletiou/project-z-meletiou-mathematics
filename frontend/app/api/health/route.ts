export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-11-curriculum-criteria-skill-graph',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      questionFallbackEnabled: true,
      mypStandardAndExtended: true,
      mypCriteriaAToD: true,
      mypCriteriaBCDStructuredAutoMarking: true,
      dpStandardHigherThenAAAI: true,
      adaptiveDiagnosticFoundation: true,
      masteryPercentFoundation: true,
      gamePathFoundation: true
    },
    routes: ['/', '/student', '/teacher', '/parent', '/curriculum', '/auth', '/account', '/dashboard', '/classes', '/assignments', '/api/question', '/api/tutor', '/api/health']
  });
}
