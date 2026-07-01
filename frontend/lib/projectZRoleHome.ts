export type ProjectZHomeRole = 'guest' | 'student' | 'teacher' | 'parent' | 'admin';

export function dashboardPathForRole(role: ProjectZHomeRole | string) {
  if (role === 'student') return '/student-dashboard';
  if (role === 'teacher') return '/assignment-lifecycle';
  if (role === 'parent') return '/parent-dashboard';
  if (role === 'admin') return '/dashboard';
  return '/auth';
}

export function roleLabel(role: ProjectZHomeRole | string) {
  if (role === 'student') return 'Student';
  if (role === 'teacher') return 'Teacher';
  if (role === 'parent') return 'Parent';
  if (role === 'admin') return 'Admin';
  return 'Guest';
}

export function roleHomeMessage(role: ProjectZHomeRole | string) {
  if (role === 'student') {
    return 'Go straight to your next assignment, memo, corrections, tutor help, and progress.';
  }

  if (role === 'teacher') {
    return 'See which assignments need generating, auditing, publishing, reviewing, memorandums, or corrections.';
  }

  if (role === 'parent') {
    return 'See a calm parent-safe overview of your child’s learning, progress, and support steps.';
  }

  if (role === 'admin') {
    return 'Open the platform dashboard and system tools.';
  }

  return 'Sign in so Project Z can take you to the correct dashboard.';
}
