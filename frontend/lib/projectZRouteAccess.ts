export type ProjectZDatabaseRole = 'student' | 'teacher' | 'parent';

export type ProjectZRouteRule = {
  route: string;
  roles: readonly ProjectZDatabaseRole[];
};

const teacherOnly = [
  '/teacher',
  '/teacher-engagement-insights',
  '/assignment-factory',
  '/assignment-recommendations',
  '/generated-assignments',
  '/assignment-audit',
  '/assignment-lifecycle',
  '/teacher-submission-review',
  '/teacher-corrections-review',
  '/teacher-tutor-evidence',
  '/quality',
  '/generate',
  '/classes',
  '/ai-usage',
  '/design-preview',
  '/mobile-preview',
  '/ai-test'
] as const;

const studentOnly = [
  '/dashboard',
  '/student-dashboard',
  '/student-quest',
  '/quest-studio',
  '/diagnostic',
  '/recommended',
  '/path',
  '/student-generated-assignments',
  '/student-memorandum',
  '/student-corrections'
] as const;

const parentOnly = [
  '/parent-dashboard',
  '/parent-engagement-view',
  '/parent-learning-report'
] as const;

const sharedRules: ProjectZRouteRule[] = [
  { route: '/student', roles: ['student', 'teacher', 'parent'] },
  { route: '/parent', roles: ['parent', 'teacher'] },
  { route: '/assignments', roles: ['student', 'teacher', 'parent'] },
  { route: '/reports', roles: ['student', 'teacher', 'parent'] },
  { route: '/curriculum', roles: ['student', 'teacher', 'parent'] },
  { route: '/tutor', roles: ['student', 'teacher'] },
  { route: '/tutor-evidence', roles: ['student', 'teacher'] },
  { route: '/export-reports', roles: ['teacher', 'parent'] }
];

export const projectZProtectedRouteRules: ProjectZRouteRule[] = [
  ...teacherOnly.map((route) => ({ route, roles: ['teacher'] as const })),
  ...studentOnly.map((route) => ({ route, roles: ['student'] as const })),
  ...parentOnly.map((route) => ({ route, roles: ['parent'] as const })),
  ...sharedRules
].sort((a, b) => b.route.length - a.route.length);

function routeMatches(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function projectZRouteRuleForPath(pathname: string) {
  return projectZProtectedRouteRules.find((rule) => routeMatches(pathname, rule.route)) || null;
}

export function projectZRouteDecision(
  pathname: string,
  authenticated: boolean,
  role: ProjectZDatabaseRole | null
) {
  const rule = projectZRouteRuleForPath(pathname);
  if (!rule) return { allowed: true, redirectTo: null, reason: 'public' as const };

  if (!authenticated) {
    const next = encodeURIComponent(pathname);
    return {
      allowed: false,
      redirectTo: `/auth?reason=session-required&next=${next}`,
      reason: 'sign-in' as const
    };
  }

  if (!role) {
    return {
      allowed: false,
      redirectTo: '/account?reason=profile-required',
      reason: 'profile' as const
    };
  }

  if (!rule.roles.includes(role)) {
    return {
      allowed: false,
      redirectTo: '/home?access=denied',
      reason: 'role' as const
    };
  }

  return { allowed: true, redirectTo: null, reason: 'allowed' as const };
}
