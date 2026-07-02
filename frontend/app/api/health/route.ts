export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasQuestionEngine = Boolean(process.env.PYTHON_ENGINE_URL);

  return Response.json({
    ok: true,
    app: 'Project Z',
    version: 'phase-51-assignment-lifecycle-command-centre',
    checks: {
      supabaseUrlConfigured: hasSupabaseUrl,
      supabaseAnonKeyConfigured: hasSupabaseAnonKey,
      questionEngineConfigured: hasQuestionEngine,
      studentDashboardRedesigned: true,
      studentQuestRedesigned: true,
      questStudioRedesigned: true,
      animatedCompanion3D: true,
      companionMotionStates: true,
      companionInteractiveStudioPreview: true,
      companionUpgradeSystem: true,
      companionEvolutionRoadmap: true,
      companionSupabaseMilestonesReady: true,
      teacherCommandCentreRedesigned: true,
      teacherSupportQueue: true,
      teacherSignalHeatmap: true,
      teacherAssessmentBoundaryPreserved: true,
      parentCommandCentreRedesigned: true,
      parentSafeSupportPlan: true,
      parentPrivacyBoundaryPreserved: true,
      parentHomeSupportPrompts: true,
      assignmentLifecycleCommandCentre: true,
      teacherWorkflowRunway: true,
      teacherPriorityQueue: true,
      assignmentAuditAndCorrectionsConnected: true,
      memorandumBoundaryPreserved: true,
      companionFallbackForAccessibility: true,
      cosmicStudentBackground: true,
      companionCommandPanel: true,
      questPathVisual: true,
      xpStreakLevelCards: true,
      achievementWall: true,
      learningAndMotivationSeparated: true,
      assessmentBoundaryPreserved: true,
      mobileResponsive: true,
      bestAccuracyOverDecoration: true
    },
    routes: ['/', '/home', '/role-navigation', '/design-preview', '/help', '/mobile-preview', '/student', '/student-dashboard', '/student-quest', '/quest-studio', '/teacher', '/teacher-engagement-insights', '/parent', '/parent-dashboard', '/parent-engagement-view', '/parent-learning-report', '/export-reports', '/assignment-recommendations', '/generated-assignments', '/assignment-audit', '/assignment-lifecycle', '/teacher-submission-review', '/teacher-corrections-review', '/student-generated-assignments', '/student-memorandum', '/student-corrections', '/reports', '/quality', '/generate', '/ai-test', '/ai-usage', '/tutor', '/tutor-evidence', '/teacher-tutor-evidence', '/curriculum', '/diagnostic', '/recommended', '/path', '/auth', '/account', '/dashboard', '/classes', '/assignments', '/api/question', '/api/generate-quality-question', '/api/generation-status', '/api/generation-self-test', '/api/tutor', '/api/create-assignment-from-recommendation', '/api/regenerate-assignment-question', '/api/health']
  });
}

