export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-4-teacher-class-management',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      questionFallbackEnabled: true,
      phase4DatabaseMigrationRequired: 'Run supabase/project_z_phase4_teacher_classes.sql once in Supabase SQL Editor'
    },
    routes: ['/', '/auth', '/account', '/dashboard', '/teacher', '/classes', '/parent', '/api/question', '/api/tutor', '/api/health']
  });
}
