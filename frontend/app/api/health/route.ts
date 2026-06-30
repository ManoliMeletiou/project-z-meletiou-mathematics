export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-7-assignment-documents-returns',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      questionFallbackEnabled: true,
      phase7DatabaseMigrationRequired: 'Run supabase/project_z_phase7_assignment_files.sql once in Supabase SQL Editor'
    },
    routes: ['/', '/auth', '/account', '/dashboard', '/teacher', '/classes', '/assignments', '/parent', '/api/question', '/api/tutor', '/api/health']
  });
}
