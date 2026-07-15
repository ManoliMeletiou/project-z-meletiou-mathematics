'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { ProjectZCompanion3D } from '../../components/ProjectZCompanion3D';
import { ProjectZCompanionUpgradePanel } from '../../components/ProjectZCompanionUpgradePanel';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import { DiagnosticGameEntryState, fetchDiagnosticGameEntryState } from '../../lib/projectZDiagnostic';
import {
  fetchStudentDashboardActions,
  fetchStudentDashboardSkills,
  fetchStudentDashboardSummary,
  StudentDashboardAction,
  StudentDashboardSkill,
  StudentDashboardSummary
} from '../../lib/projectZStudentDashboard';
import {
  companionIcon,
  companionMessage,
  companionName,
  fetchStudentQuestAchievements,
  fetchStudentQuestProfile,
  runDailyStreakCheckin,
  StudentQuestAchievement,
  StudentQuestProfile
} from '../../lib/projectZStudentQuest';
import {
  fetchQuestIdentity,
  QuestIdentity
} from '../../lib/projectZQuestStudio';
import {
  CompanionEvolutionMilestone,
  CompanionUpgradeSummary,
  fetchCompanionEvolutionPath,
  fetchCompanionUpgradeSummary
} from '../../lib/projectZCompanionProgression';

function firstName(email: string | null | undefined) {
  if (!email) return 'Explorer';
  return email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 1)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Explorer';
}

function actionIcon(type: string) {
  if (type === 'assignment') return '📝';
  if (type === 'corrections') return '🔁';
  if (type === 'memorandum') return '📘';
  if (type === 'tutor') return '💬';
  if (type === 'quest') return '🎮';
  return '✨';
}

function cardStyle(index: number): CSSProperties {
  const gradients = [
    'linear-gradient(135deg, rgba(168,85,247,.18), rgba(255,255,255,.055))',
    'linear-gradient(135deg, rgba(34,211,238,.16), rgba(255,255,255,.055))',
    'linear-gradient(135deg, rgba(249,115,22,.13), rgba(255,255,255,.055))',
    'linear-gradient(135deg, rgba(52,211,153,.13), rgba(255,255,255,.055))'
  ];

  return {
    background: gradients[index % gradients.length],
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: 24
  };
}

function priorityStyle(label: string): CSSProperties {
  if (label === 'Urgent') return { background: 'rgba(251,113,133,.16)', color: '#fecdd3', border: '1px solid rgba(251,113,133,.28)' };
  if (label === 'Important') return { background: 'rgba(249,115,22,.16)', color: '#fed7aa', border: '1px solid rgba(249,115,22,.28)' };
  if (label === 'Quest') return { background: 'rgba(168,85,247,.18)', color: '#e9d5ff', border: '1px solid rgba(168,85,247,.30)' };
  return { background: 'rgba(34,211,238,.15)', color: '#cffafe', border: '1px solid rgba(34,211,238,.26)' };
}

function xpToNext(profile: StudentQuestProfile) {
  return Math.max(0, profile.next_level_xp - profile.total_xp);
}

function questNextAction(profile: StudentQuestProfile | null, achievements: StudentQuestAchievement[]) {
  if (!profile) {
    return {
      title: 'Begin your Quest',
      description: 'Start your XP, level, streak, achievements, and companion journey.',
      button: 'Open Quest',
      path: '/student-quest'
    };
  }

  if (!profile.checked_in_today) {
    return {
      title: 'Activate today’s streak',
      description: 'Check in today to keep your learning streak alive and earn XP.',
      button: 'Start streak',
      path: '/student-quest'
    };
  }

  const locked = achievements.find((achievement) => !achievement.unlocked);
  if (locked) {
    return {
      title: `Next badge: ${locked.title}`,
      description: locked.description,
      button: 'View badges',
      path: '/student-quest'
    };
  }

  return {
    title: 'Upgrade your identity',
    description: 'Open Quest Studio to equip a title, aura, badge, theme, or companion skin.',
    button: 'Open Studio',
    path: '/quest-studio'
  };
}

function progressText(summary: StudentDashboardSummary, profile: StudentQuestProfile | null) {
  if (summary.assignments_to_do > 0) return `You have ${summary.assignments_to_do} active assignment${summary.assignments_to_do === 1 ? '' : 's'} waiting.`;
  if (summary.corrections_needing_more_work > 0) return 'Some corrections need another attempt. That is how mastery grows.';
  if (summary.corrections_needed > summary.corrections_submitted) return 'You have correction work waiting after feedback.';
  if (profile && !profile.checked_in_today) return 'You are up to date. Start today’s streak or practise to keep momentum.';
  return 'You are up to date. Keep exploring, practising, and asking for help when needed.';
}

function pathNodes(level: number) {
  return [
    { icon: '1', label: 'Start', active: level >= 1 },
    { icon: '2', label: 'Build', active: level >= 2 },
    { icon: '3', label: 'Master', active: level >= 3 },
    { icon: '4', label: 'Extend', active: level >= 4 },
    { icon: '🏆', label: 'Legend', active: level >= 5 }
  ];
}

export default function StudentDashboardPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [gameEntry, setGameEntry] = useState<DiagnosticGameEntryState | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [summary, setSummary] = useState<StudentDashboardSummary | null>(null);
  const [actions, setActions] = useState<StudentDashboardAction[]>([]);
  const [skills, setSkills] = useState<StudentDashboardSkill[]>([]);
  const [questProfile, setQuestProfile] = useState<StudentQuestProfile | null>(null);
  const [questIdentity, setQuestIdentity] = useState<QuestIdentity | null>(null);
  const [achievements, setAchievements] = useState<StudentQuestAchievement[]>([]);
  const [companionSummary, setCompanionSummary] = useState<CompanionUpgradeSummary | null>(null);
  const [companionMilestones, setCompanionMilestones] = useState<CompanionEvolutionMilestone[]>([]);
  const [status, setStatus] = useState('Loading your cosmic learning dashboard.');
  const [checkingIn, setCheckingIn] = useState(false);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to enter your dashboard.' : 'This cosmic dashboard is for student accounts.');
      return;
    }

    const entry = await fetchDiagnosticGameEntryState();
    setGameEntry(entry);
    if (!entry?.main_game_unlocked) {
      setStatus('Complete the diagnostic prologue before the game dashboard unlocks.');
      return;
    }

    const [
      nextSummary,
      nextActions,
      nextSkills,
      nextQuestProfile,
      nextQuestIdentity,
      nextAchievements,
      nextCompanionSummary,
      nextCompanionMilestones
    ] = await Promise.all([
      fetchStudentDashboardSummary(),
      fetchStudentDashboardActions(),
      fetchStudentDashboardSkills(),
      fetchStudentQuestProfile(),
      fetchQuestIdentity(),
      fetchStudentQuestAchievements(),
      fetchCompanionUpgradeSummary(),
      fetchCompanionEvolutionPath()
    ]);

    setSummary(nextSummary);
    setActions(nextActions);
    setSkills(nextSkills);
    setQuestProfile(nextQuestProfile);
    setQuestIdentity(nextQuestIdentity);
    setAchievements(nextAchievements);
    setCompanionSummary(nextCompanionSummary);
    setCompanionMilestones(nextCompanionMilestones);
    setStatus('Your dashboard is ready.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function handleDashboardCheckin() {
    setCheckingIn(true);
    const nextQuestProfile = await runDailyStreakCheckin();
    const [nextIdentity, nextAchievements, nextCompanionSummary, nextCompanionMilestones] = await Promise.all([
      fetchQuestIdentity(),
      fetchStudentQuestAchievements(),
      fetchCompanionUpgradeSummary(nextQuestProfile.companion_stage),
      fetchCompanionEvolutionPath(nextQuestProfile.companion_stage)
    ]);

    setQuestProfile(nextQuestProfile);
    setQuestIdentity(nextIdentity);
    setAchievements(nextAchievements);
    setCompanionSummary(nextCompanionSummary);
    setCompanionMilestones(nextCompanionMilestones);
    setStatus('Streak activated. Nice consistency.');
    setCheckingIn(false);
  }

  const topAction = actions[0];
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const questAction = questNextAction(questProfile, achievements);

  const visibleActions = useMemo(() => {
    const questActionCard: StudentDashboardAction = {
      action_id: 'student-cosmic-quest-action',
      priority_label: 'Quest',
      action_type: 'quest',
      title: questAction.title,
      description: questAction.description,
      button_label: questAction.button,
      page_path: questAction.path,
      assignment_id: null,
      assignment_title: null,
      course_skill_code: null,
      skill_title: 'XP, streaks, level, and companion',
      progress_percent: questProfile?.level_progress_percent || 0,
      sort_order: 12
    };

    return [questActionCard, ...actions].slice(0, 6);
  }, [actions, questAction, questProfile?.level_progress_percent]);

  return (
    <main className="page pz-theme pz-student-theme">
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Project Z Student</strong>
            <span>{email || 'Sign in'} - cosmic learning dashboard</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/home">Home</a>
            <a className="btn secondary" href="/role-navigation">Navigation</a>
            <a className="btn secondary" href="/student-quest">Quest</a>
            <a className="btn secondary" href="/quest-studio">Studio</a>
            <a className="btn secondary" href="/student-generated-assignments">Assignments</a>
            <a className="btn secondary" href="/student-corrections">Corrections</a>
            <a className="btn secondary" href="/tutor">Tutor</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to enter your learning dashboard.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card">
            <h2>Student-only dashboard</h2>
            <p className="muted">This cosmic dashboard is designed for student accounts.</p>
          </section>
        )}

        {role === 'student' && gameEntry && !gameEntry.main_game_unlocked && (
          <section className="card">
            <h2>Your starting map comes first</h2>
            <p className="muted">Project Z will not open the game or assign a first mission from unreviewed evidence.</p>
            <a className="btn blue" href="/diagnostic">Continue prologue</a>
          </section>
        )}

        {role === 'student' && gameEntry?.main_game_unlocked && summary && (
          <>
            <section className="pz-student-dashboard-shell">
              <div className="pz-cosmic-hero">
                <div className="pz-role-badge">🚀 Student command centre</div>
                <h1 style={{ fontSize: 48, lineHeight: 1.02, maxWidth: 720, margin: '16px 0 10px' }}>
                  Keep exploring, {firstName(summary.student_email)}.
                </h1>
                <p style={{ fontSize: 18, maxWidth: 660 }} className="muted">
                  {progressText(summary, questProfile)}
                </p>

                <section className="pz-student-top-stats">
                  <div className="pz-student-stat-chip">
                    <span>🔥 Streak</span>
                    <strong>{questProfile?.current_streak || 0}</strong>
                    <small className="muted">Longest {questProfile?.longest_streak || 0}</small>
                  </div>
                  <div className="pz-student-stat-chip">
                    <span>⭐ XP</span>
                    <strong>{questProfile?.total_xp || 0}</strong>
                    <small className="muted">{questProfile ? `${xpToNext(questProfile)} XP to next level` : 'Start your quest'}</small>
                  </div>
                  <div className="pz-student-stat-chip">
                    <span>💎 Level</span>
                    <strong>{questProfile?.level || 1}</strong>
                    <small className="muted">{questProfile?.level_progress_percent || 0}% progress</small>
                  </div>
                </section>

                <section className="card" style={{ marginTop: 22, background: 'rgba(255,255,255,.08)' }}>
                  <h2>Quest Path</h2>
                  <div className="pz-cosmic-path">
                    {pathNodes(questProfile?.level || 1).map((node) => (
                      <div key={node.label} className="pz-path-node" style={{ opacity: node.active ? 1 : .48 }}>
                        <span>{node.icon}</span>
                        <span>{node.label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {questProfile && (
                <aside className="card pz-companion-stage">
                  <div>
                    <div className="pz-role-badge">AI Companion</div>
                    <ProjectZCompanion3D
                      stage={questProfile.companion_stage}
                      skinKey={questIdentity?.skin.key}
                      auraKey={questIdentity?.aura.key}
                      mode={questProfile.checked_in_today ? 'idle' : 'encourage'}
                      interactive={false}
                    />
                    <h2 style={{ textAlign: 'center' }}>
                      {questIdentity?.skin.name || companionName(questProfile.companion_stage)}
                    </h2>
                    <p className="muted" style={{ textAlign: 'center' }}>
                      {questIdentity ? (
                        <>
                          {questIdentity.title.icon} {questIdentity.title.name}<br />
                          {questIdentity.aura.icon} {questIdentity.aura.name} aura<br />
                          {questIdentity.badge.icon} {questIdentity.badge.name}
                        </>
                      ) : companionMessage(questProfile.companion_stage)}
                    </p>
                  </div>

                  <div>
                    <progress value={questProfile.level_progress_percent} max={100} style={{ width: '100%' }} />
                    <p className="muted">
                      {questProfile.level_progress_percent}% to next level<br />
                      Achievements: {unlockedCount}/{achievements.length}
                    </p>
                    <div className="pz-floating-action-bar">
                      {!questProfile.checked_in_today ? (
                        <button className="btn blue" onClick={handleDashboardCheckin} disabled={checkingIn}>
                          {checkingIn ? 'Activating...' : 'Start streak'}
                        </button>
                      ) : (
                        <a className="btn blue" href="/student-quest">Open Quest</a>
                      )}
                      <a className="btn secondary" href="/quest-studio">Customize</a>
                    </div>
                  </div>
                </aside>
              )}
            </section>

            {questProfile && (
              <ProjectZCompanionUpgradePanel
                stage={questProfile.companion_stage}
                skinKey={questIdentity?.skin.key}
                auraKey={questIdentity?.aura.key}
                companionName={questIdentity?.skin.name || companionName(questProfile.companion_stage)}
                titleName={questIdentity?.title.name}
                auraName={questIdentity?.aura.name}
                badgeName={questIdentity?.badge.name}
                summary={companionSummary}
                milestones={companionMilestones}
                defaultMode={questProfile.checked_in_today ? 'idle' : 'encourage'}
                compact={true}
              >
                {!questProfile.checked_in_today ? (
                  <button className="btn blue" onClick={handleDashboardCheckin} disabled={checkingIn}>
                    {checkingIn ? 'Activating...' : 'Start streak'}
                  </button>
                ) : (
                  <a className="btn blue" href="/student-quest">Open Quest</a>
                )}
                <a className="btn secondary" href="/quest-studio">Upgrade identity</a>
              </ProjectZCompanionUpgradePanel>
            )}

            <section className="grid grid2" style={{ marginTop: 18 }}>
              <div className="card">
                <div className="pz-role-badge">🎯 Best learning move</div>
                {topAction ? (
                  <>
                    <h2>{actionIcon(topAction.action_type)} {topAction.title}</h2>
                    <p className="muted">{topAction.description}</p>
                    <a className="btn blue" href={topAction.page_path}>{topAction.button_label}</a>
                  </>
                ) : (
                  <>
                    <h2>✅ You are up to date</h2>
                    <p className="muted">Practise, open Quest, or ask the tutor when you want help.</p>
                    <a className="btn blue" href="/tutor">Ask the tutor</a>
                  </>
                )}
              </div>

              <div className="card">
                <div className="pz-role-badge">🎮 Best quest move</div>
                <h2>{questAction.title}</h2>
                <p className="muted">{questAction.description}</p>
                {!questProfile?.checked_in_today && questProfile ? (
                  <button className="btn blue" onClick={handleDashboardCheckin} disabled={checkingIn}>
                    {checkingIn ? 'Checking in...' : 'Start today’s streak'}
                  </button>
                ) : (
                  <a className="btn blue" href={questAction.path}>{questAction.button}</a>
                )}
              </div>
            </section>

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Assignments</h2>
                <p className="stat">{summary.assignments_to_do}</p>
                <p className="muted">{summary.questions_left} question(s) left</p>
              </div>
              <div className="card">
                <h2>Corrections</h2>
                <p className="stat">{summary.corrections_needed}</p>
                <p className="muted">{summary.corrections_accepted} accepted</p>
              </div>
              <div className="card">
                <h2>Mastery</h2>
                <p className="stat">{summary.average_mastery}%</p>
                <p className="muted">{summary.strong_skills} strong skill(s)</p>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Mission board</h2>
              <div className="grid grid3">
                {visibleActions.map((action, index) => (
                  <div key={action.action_id} className="card" style={cardStyle(index)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <p style={{ fontSize: 30, margin: 0 }}>{actionIcon(action.action_type)}</p>
                      <span style={{ ...priorityStyle(action.priority_label), padding: '6px 10px', borderRadius: 999, fontSize: 13, fontWeight: 800 }}>
                        {action.priority_label}
                      </span>
                    </div>
                    <h3>{action.title}</h3>
                    <p className="muted">{action.description}</p>
                    {action.action_type !== 'tutor' && (
                      <>
                        <progress value={action.progress_percent} max={100} style={{ width: '100%' }} />
                        <p className="muted">{action.progress_percent}% progress</p>
                      </>
                    )}
                    <a className="btn blue" href={action.page_path}>{action.button_label}</a>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid2" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Recent skills</h2>
                {skills.length === 0 ? (
                  <p className="muted">Skill progress appears here as you complete work.</p>
                ) : (
                  <div className="grid">
                    {skills.slice(0, 4).map((skill, index) => (
                      <div key={skill.course_skill_code} className="notice">
                        <strong>{skill.skill_title}</strong><br />
                        <span className="muted">{skill.course_skill_code}</span>
                        <progress value={skill.mastery_percent} max={100} style={{ width: '100%', marginTop: 8 }} />
                        <span className="muted">Mastery {skill.mastery_percent}% | Confidence {skill.confidence_percent}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h2>Achievement wall</h2>
                <div className="pz-achievement-wall">
                  {achievements.slice(0, 8).map((achievement) => (
                    <div key={achievement.achievement_key || achievement.title} className={`pz-achievement-tile ${achievement.unlocked ? '' : 'locked'}`}>
                      <strong>{achievement.unlocked ? '🏆' : '🔒'} {achievement.title}</strong>
                      <p className="muted">{achievement.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="notice" style={{ marginTop: 18 }}>
              <strong>Assessment boundary:</strong> XP, streaks, levels, and achievements are motivation signals. Formal assessment still depends on learning evidence, teacher feedback, and the relevant criteria.
            </section>
          </>
        )}
      </div>
    </main>
  );
}
