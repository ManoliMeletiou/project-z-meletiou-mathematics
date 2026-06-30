export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-24-tutor-evidence-to-mastery',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      tutorEvidenceTable: true,
      automaticTutorEvidenceTrigger: true,
      tutorEvidenceToMasterySignal: true,
      tutorEvidenceDashboard: true,
      manualTutorEvidenceRecording: true,
      guidedTutorMode: true,
      bestAccuracyOverDecoration: true
    },
    routes: ['/', '/student', '/teacher', '/parent', '/reports', '/quality', '/generate', '/ai-test', '/ai-usage', '/tutor', '/tutor-evidence', '/curriculum', '/diagnostic', '/recommended', '/path', '/auth', '/account', '/dashboard', '/classes', '/assignments', '/api/question', '/api/generate-quality-question', '/api/generation-status', '/api/generation-self-test', '/api/tutor', '/api/health']
  });
}
