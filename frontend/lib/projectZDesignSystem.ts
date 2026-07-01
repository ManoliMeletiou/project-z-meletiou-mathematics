export type ProjectZVisualRole = 'student' | 'teacher' | 'parent' | 'guest' | 'admin';

export type ProjectZVisualTheme = {
  role: ProjectZVisualRole;
  label: string;
  themeClass: string;
  mood: string;
  background: string;
  layoutLanguage: string;
  primaryExperience: string[];
};

export const projectZVisualThemes: ProjectZVisualTheme[] = [
  {
    role: 'student',
    label: 'Student Portal',
    themeClass: 'pz-theme pz-student-theme',
    mood: 'Cosmic, adventurous, motivating, game-like, but still academically focused.',
    background: 'Deep purple-blue space with glowing paths, companion energy, XP and quest atmosphere.',
    layoutLanguage: 'Quest-first dashboard, companion card, streak cards, progress paths, achievement panels.',
    primaryExperience: [
      'Dashboard feels like the student command centre.',
      'Quest and Studio feel exciting and personal.',
      'Assignments, memorandum, and corrections remain clear learning tasks.',
      'Tutor feels like supportive help, not a shortcut.'
    ]
  },
  {
    role: 'teacher',
    label: 'Teacher Portal',
    themeClass: 'pz-theme pz-teacher-theme',
    mood: 'Professional, analytical, calm, powerful, command-centre style.',
    background: 'Dark navy and teal with subtle grid, data lines, and glass analytics panels.',
    layoutLanguage: 'Lifecycle cards, insight heatmaps, review queues, action panels, report widgets.',
    primaryExperience: [
      'Teacher sees what needs attention first.',
      'Engagement insights are support signals, not grading.',
      'Assignment generation and audit feel like professional tools.',
      'Review flows stay calm and efficient.'
    ]
  },
  {
    role: 'parent',
    label: 'Parent Portal',
    themeClass: 'pz-theme pz-parent-theme',
    mood: 'Warm, calm, safe, encouraging, trustworthy.',
    background: 'Soft sunrise, gentle green/orange gradients, plant-growth feeling, lighter cards.',
    layoutLanguage: 'Simple summaries, home-support guidance, progress cards, privacy boundaries.',
    primaryExperience: [
      'Parents understand what is happening without feeling overwhelmed.',
      'XP and streaks are explained as motivation only.',
      'Corrections and habits are translated into home support.',
      'No raw chats, teacher notes, or private analytics.'
    ]
  },
  {
    role: 'guest',
    label: 'Guest / Landing',
    themeClass: 'pz-theme pz-guest-theme',
    mood: 'Premium, futuristic, clear, trustworthy.',
    background: 'Dark cosmic brand world with role-choice panels and clean sign-in flow.',
    layoutLanguage: 'Hero page, role cards, sign-in entry, help, mobile preview.',
    primaryExperience: [
      'Visitors immediately understand the three-role platform.',
      'Sign-in path is obvious.',
      'Brand feels premium and credible.',
      'Navigation is simple before authentication.'
    ]
  }
];

export function themeForRole(role: string | null | undefined) {
  if (role === 'student') return projectZVisualThemes[0];
  if (role === 'teacher' || role === 'admin') return projectZVisualThemes[1];
  if (role === 'parent') return projectZVisualThemes[2];
  return projectZVisualThemes[3];
}

export function projectZThemeClass(role: string | null | undefined) {
  return themeForRole(role).themeClass;
}

export function projectZDesignPrinciples() {
  return [
    'Backgrounds should create atmosphere without harming readability.',
    'Student pages should feel motivating and game-like, not childish.',
    'Teacher pages should feel like an analytics command centre.',
    'Parent pages should feel calm, warm, and supportive.',
    'Motivation visuals must stay separate from assessment and formal grades.',
    'Navigation improves usability, but security remains in RLS and RPC permissions.',
    'Mobile layouts must collapse into clean single-column cards.'
  ];
}
