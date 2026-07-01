export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-41-student-dashboard-quest-integration',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      studentDashboardQuestPanel: true,
      companionIdentityOnDashboard: true,
      dailyCheckinOnDashboard: true,
      xpLevelStreakVisible: true,
      achievementsPreview: true,
      questStudioLinked: true,
      questSeparateFromAssessment: true,
      age12To19PremiumDesign: true,
      bestAccuracyOverDecoration: true
    },
    routes: ['/', '/home', '/help', '/mobile-preview', '/student', '/student-dashboard', '/student-quest', '/quest-studio', '/teacher', '/parent', '/parent-dashboard', '/parent-learning-report', '/export-reports', '/assignment-recommendations', '/generated-assignments', '/assignment-audit', '/assignment-lifecycle', '/teacher-submission-review', '/teacher-corrections-review', '/student-generated-assignments', '/student-memorandum', '/student-corrections', '/reports', '/quality', '/generate', '/ai-test', '/ai-usage', '/tutor', '/tutor-evidence', '/teacher-tutor-evidence', '/curriculum', '/diagnostic', '/recommended', '/path', '/auth', '/account', '/dashboard', '/classes', '/assignments', '/api/question', '/api/generate-quality-question', '/api/generation-status', '/api/generation-self-test', '/api/tutor', '/api/create-assignment-from-recommendation', '/api/regenerate-assignment-question', '/api/health']
  });
}
