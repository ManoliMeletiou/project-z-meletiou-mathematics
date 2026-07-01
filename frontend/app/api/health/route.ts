export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-31-publish-generated-assignments',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      teacherPublishGeneratedAssignment: true,
      minimumThirtyQuestionsBeforePublishing: true,
      unresolvedFlaggedAuditBlocksPublishing: true,
      studentGeneratedAssignmentsPage: true,
      studentAnswerSaving: true,
      studentSubmissionTracking: true,
      teacherProgressTracking: true,
      classOnlyAccess: true,
      bestAccuracyOverDecoration: true
    },
    routes: ['/', '/student', '/teacher', '/parent', '/parent-learning-report', '/export-reports', '/assignment-recommendations', '/generated-assignments', '/assignment-audit', '/student-generated-assignments', '/reports', '/quality', '/generate', '/ai-test', '/ai-usage', '/tutor', '/tutor-evidence', '/teacher-tutor-evidence', '/curriculum', '/diagnostic', '/recommended', '/path', '/auth', '/account', '/dashboard', '/classes', '/assignments', '/api/question', '/api/generate-quality-question', '/api/generation-status', '/api/generation-self-test', '/api/tutor', '/api/create-assignment-from-recommendation', '/api/regenerate-assignment-question', '/api/health']
  });
}
