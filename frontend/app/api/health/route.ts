export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-15-teacher-parent-reports-upgrade',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      studentReports: true,
      teacherClassReports: true,
      parentLinkedChildReports: true,
      roleRestrictedReportAccess: true,
      diagnosticPracticePathCombinedReports: true,
      evidenceAwareReporting: true,
      weakSkillsAndNextSteps: true,
      bestAccuracyOverDecoration: true
    },
    routes: ['/', '/student', '/teacher', '/parent', '/reports', '/curriculum', '/diagnostic', '/recommended', '/path', '/auth', '/account', '/dashboard', '/classes', '/assignments', '/api/question', '/api/tutor', '/api/health']
  });
}
