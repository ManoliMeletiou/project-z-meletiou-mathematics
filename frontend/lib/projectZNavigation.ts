export type ProjectZNavRole = 'guest' | 'student' | 'teacher' | 'parent' | 'admin';

export type ProjectZNavItem = {
  title: string;
  description: string;
  href: string;
  icon: string;
  priority: 'primary' | 'secondary' | 'support';
  group: 'start' | 'learn' | 'review' | 'insight' | 'manage' | 'support';
};

export type ProjectZRoleNavigation = {
  role: ProjectZNavRole;
  label: string;
  headline: string;
  subheading: string;
  primaryAction: ProjectZNavItem;
  items: ProjectZNavItem[];
  guidance: string[];
};

export type ProjectZNavigationSummary = {
  continueAction: ProjectZNavItem;
  recommendedActions: ProjectZNavItem[];
  moreActions: ProjectZNavItem[];
};

const guestItems: ProjectZNavItem[] = [
  {
    title: 'Sign in',
    description: 'Open your student, teacher, or parent account.',
    href: '/auth',
    icon: '🔐',
    priority: 'primary',
    group: 'start'
  },
  {
    title: 'Help',
    description: 'Understand where to go in Project Z.',
    href: '/help',
    icon: '❓',
    priority: 'secondary',
    group: 'support'
  },
  {
    title: 'Mobile preview',
    description: 'Check the phone-friendly app experience.',
    href: '/mobile-preview',
    icon: '📱',
    priority: 'support',
    group: 'support'
  }
];

const studentItems: ProjectZNavItem[] = [
  {
    title: 'Student Dashboard',
    description: 'Your main home: next task, Quest, XP, streak, mastery, and quick links.',
    href: '/student-dashboard',
    icon: '🏠',
    priority: 'primary',
    group: 'start'
  },
  {
    title: 'Student Quest',
    description: 'Build XP, streaks, levels, achievements, and your Math Companion.',
    href: '/student-quest',
    icon: '🎮',
    priority: 'primary',
    group: 'learn'
  },
  {
    title: 'Quest Studio',
    description: 'Customize your companion, title, aura, badge, and theme.',
    href: '/quest-studio',
    icon: '✨',
    priority: 'secondary',
    group: 'learn'
  },
  {
    title: 'Assignments',
    description: 'Complete teacher-published generated assignments.',
    href: '/student-generated-assignments',
    icon: '📝',
    priority: 'primary',
    group: 'learn'
  },
  {
    title: 'Memorandum',
    description: 'Review released solutions, feedback, and explanations.',
    href: '/student-memorandum',
    icon: '📘',
    priority: 'secondary',
    group: 'review'
  },
  {
    title: 'Corrections',
    description: 'Submit corrections and reflections after feedback.',
    href: '/student-corrections',
    icon: '🔁',
    priority: 'secondary',
    group: 'review'
  },
  {
    title: 'AI Tutor',
    description: 'Ask for help, hints, and step-by-step support.',
    href: '/tutor',
    icon: '💬',
    priority: 'secondary',
    group: 'support'
  },
  {
    title: 'Student Portal',
    description: 'General student entry point.',
    href: '/student',
    icon: '📚',
    priority: 'support',
    group: 'support'
  }
];

const teacherItems: ProjectZNavItem[] = [
  {
    title: 'Assignment Lifecycle',
    description: 'See what each assignment needs next: audit, publish, review, memo, or corrections.',
    href: '/assignment-lifecycle',
    icon: '🧭',
    priority: 'primary',
    group: 'start'
  },
  {
    title: 'Engagement Insights',
    description: 'See support signals: completion, corrections, XP, streaks, and next teacher actions.',
    href: '/teacher-engagement-insights',
    icon: '📊',
    priority: 'primary',
    group: 'insight'
  },
  {
    title: 'Smart Recommendations',
    description: 'Find suggested assignments based on student needs.',
    href: '/assignment-recommendations',
    icon: '🧠',
    priority: 'primary',
    group: 'manage'
  },
  {
    title: 'Generated Assignments',
    description: 'Manage generated 30-question assignments and publish them.',
    href: '/generated-assignments',
    icon: '🧾',
    priority: 'secondary',
    group: 'manage'
  },
  {
    title: 'Assignment Audit',
    description: 'Audit question quality and regenerate weak items.',
    href: '/assignment-audit',
    icon: '🔍',
    priority: 'secondary',
    group: 'manage'
  },
  {
    title: 'Submission Review',
    description: 'Review student submissions, feedback, and memorandum release.',
    href: '/teacher-submission-review',
    icon: '✅',
    priority: 'secondary',
    group: 'review'
  },
  {
    title: 'Corrections Review',
    description: 'Review student corrections and reflection work.',
    href: '/teacher-corrections-review',
    icon: '🔁',
    priority: 'secondary',
    group: 'review'
  },
  {
    title: 'Tutor Evidence',
    description: 'Review tutor-generated learning evidence.',
    href: '/teacher-tutor-evidence',
    icon: '💬',
    priority: 'support',
    group: 'insight'
  },
  {
    title: 'Export Reports',
    description: 'Create printable or PDF-ready reports.',
    href: '/export-reports',
    icon: '📄',
    priority: 'support',
    group: 'support'
  }
];

const parentItems: ProjectZNavItem[] = [
  {
    title: 'Parent Dashboard',
    description: 'A calm overview of your child’s learning and next support steps.',
    href: '/parent-dashboard',
    icon: '🏠',
    priority: 'primary',
    group: 'start'
  },
  {
    title: 'Engagement View',
    description: 'See learning habits, streak, corrections, and parent-friendly guidance.',
    href: '/parent-engagement-view',
    icon: '🌱',
    priority: 'primary',
    group: 'insight'
  },
  {
    title: 'Learning Report',
    description: 'View a parent-safe learning report without private chats or teacher notes.',
    href: '/parent-learning-report',
    icon: '📘',
    priority: 'secondary',
    group: 'review'
  },
  {
    title: 'Export Reports',
    description: 'Open printable report tools.',
    href: '/export-reports',
    icon: '📄',
    priority: 'support',
    group: 'support'
  },
  {
    title: 'Help',
    description: 'Understand how to use Project Z as a parent.',
    href: '/help',
    icon: '❓',
    priority: 'support',
    group: 'support'
  }
];

const adminItems: ProjectZNavItem[] = [
  {
    title: 'Smart Home',
    description: 'Use role-aware navigation to open the right area.',
    href: '/home',
    icon: '🏠',
    priority: 'primary',
    group: 'start'
  },
  {
    title: 'AI Usage',
    description: 'Check AI usage, limits, and generation status.',
    href: '/ai-usage',
    icon: '⚙️',
    priority: 'secondary',
    group: 'manage'
  },
  {
    title: 'Quality',
    description: 'Check quality, generation, and review tools.',
    href: '/quality',
    icon: '🔍',
    priority: 'secondary',
    group: 'manage'
  },
  {
    title: 'Curriculum',
    description: 'Review curriculum and skill pathways.',
    href: '/curriculum',
    icon: '🧩',
    priority: 'support',
    group: 'support'
  }
];

function normalizedRole(role: string | null | undefined): ProjectZNavRole {
  if (role === 'student' || role === 'teacher' || role === 'parent' || role === 'admin') return role;
  return 'guest';
}

function roleItems(role: ProjectZNavRole) {
  if (role === 'student') return studentItems;
  if (role === 'teacher') return teacherItems;
  if (role === 'parent') return parentItems;
  if (role === 'admin') return adminItems;
  return guestItems;
}

export function projectZNavigationForRole(roleInput: string | null | undefined): ProjectZRoleNavigation {
  const role = normalizedRole(roleInput);
  const items = roleItems(role);
  const primaryAction = items.find((item) => item.priority === 'primary') || items[0];

  if (role === 'student') {
    return {
      role,
      label: 'Student',
      headline: 'Your learning loop',
      subheading: 'Start with your dashboard, then complete work, review feedback, make corrections, and grow your Quest identity.',
      primaryAction,
      items,
      guidance: [
        'Start at Student Dashboard.',
        'Use Assignments for teacher-set work.',
        'Use Memorandum and Corrections after feedback.',
        'Use Quest and Studio for motivation and identity.',
        'Ask the Tutor when you are stuck.'
      ]
    };
  }

  if (role === 'teacher') {
    return {
      role,
      label: 'Teacher',
      headline: 'Your teaching workflow',
      subheading: 'Start with lifecycle, then move to engagement insights, assignment generation, audit, review, corrections, and reports.',
      primaryAction,
      items,
      guidance: [
        'Start at Assignment Lifecycle.',
        'Use Engagement Insights to identify who needs support.',
        'Use Smart Recommendations to create targeted work.',
        'Audit assignments before publishing.',
        'Review submissions and release memorandums.',
        'Review corrections and tutor evidence.'
      ]
    };
  }

  if (role === 'parent') {
    return {
      role,
      label: 'Parent',
      headline: 'Your parent view',
      subheading: 'See calm, safe learning summaries and practical ways to support your child at home.',
      primaryAction,
      items,
      guidance: [
        'Start at Parent Dashboard.',
        'Use Engagement View for learning habits and motivation signals.',
        'Use Learning Report for safe progress summaries.',
        'Do not treat XP, streaks, or levels as marks.',
        'Ask supportive questions about corrections and understanding.'
      ]
    };
  }

  if (role === 'admin') {
    return {
      role,
      label: 'Admin',
      headline: 'System navigation',
      subheading: 'Open system tools, quality checks, usage, and curriculum pages.',
      primaryAction,
      items,
      guidance: [
        'Use Smart Home to route by role.',
        'Use AI Usage to monitor generation limits.',
        'Use Quality and Curriculum tools to inspect the platform.'
      ]
    };
  }

  return {
    role,
    label: 'Guest',
    headline: 'Choose your starting point',
    subheading: 'Sign in to open the right Project Z experience for your role.',
    primaryAction,
    items,
    guidance: [
      'Sign in first.',
      'Project Z will route you to the correct dashboard.',
      'Students, teachers, and parents each get a different workflow.'
    ]
  };
}

export function projectZNavigationSummary(
  navigation: ProjectZRoleNavigation
): ProjectZNavigationSummary {
  const continueAction = navigation.primaryAction;
  const recommendedActions = navigation.items
    .filter((item) => item.href !== continueAction.href && item.priority === 'primary')
    .slice(0, 2);
  const recommendedHrefs = new Set([
    continueAction.href,
    ...recommendedActions.map((item) => item.href)
  ]);

  return {
    continueAction,
    recommendedActions,
    moreActions: navigation.items.filter((item) => !recommendedHrefs.has(item.href))
  };
}

export function projectZThemeForRole(roleInput: string | null | undefined): string {
  const role = normalizedRole(roleInput);
  if (role === 'student') return 'pz-student-theme';
  if (role === 'teacher' || role === 'admin') return 'pz-teacher-theme';
  if (role === 'parent') return 'pz-parent-theme';
  return 'pz-guest-theme';
}

export function priorityLabel(priority: string) {
  if (priority === 'primary') return 'Main';
  if (priority === 'secondary') return 'Next';
  return 'Support';
}

export function groupLabel(group: string) {
  if (group === 'start') return 'Start';
  if (group === 'learn') return 'Learn';
  if (group === 'review') return 'Review';
  if (group === 'insight') return 'Insights';
  if (group === 'manage') return 'Manage';
  return 'Support';
}
