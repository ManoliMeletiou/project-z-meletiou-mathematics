'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { ProjectZCompanion3D } from '../../components/ProjectZCompanion3D';
import { ProjectZCompanionUpgradePanel } from '../../components/ProjectZCompanionUpgradePanel';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
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
import { fetchQuestIdentity, QuestIdentity } from '../../lib/projectZQuestStudio';
import {
  CompanionEvolutionMilestone,
  CompanionUpgradeSummary,
  fetchCompanionEvolutionPath,
  fetchCompanionUpgradeSummary
} from '../../lib/projectZCompanionProgression';

function cardStyle(index: number): CSSProperties {
  const backgrounds = [
    'linear-gradient(135deg, rgba(168,85,247,.18), rgba(255,255,255,.055))',
    'linear-gradient(135deg, rgba(34,211,238,.16), rgba(255,255,255,.055))',
    'linear-gradient(135deg, rgba(52,211,153,.14), rgba(255,255,255,.055))',
    'linear-gradient(135deg, rgba(249,115,22,.14), rgba(255,255,255,.055))'
  ];

  return {
    background: backgrounds[index % backgrounds.length],
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: 24
  };
}

function xpToNext(profile: StudentQuestProfile) {
  return Math.max(0, profile.next_level_xp - profile.total_xp);
}

function questNodes(level: number) {
  return [
    { icon: '🚀', label: 'Launch', detail: 'Start your quest', active: level >= 1 },
    { icon: '🔭', label: 'Explore', detail: 'Build habits', active: level >= 2 },
    { icon: '🪐', label: 'Orbit', detail: 'Correct mistakes', active: level >= 3 },
    { icon: '☄️', label: 'Extend', detail: 'Push further', active: level >= 4 },
    { icon: '🌌', label: 'Constellation', detail: 'Long-term mastery', active: level >= 5 }
  ];
}

export default function StudentQuestPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentQuestProfile | null>(null);
  const [identity, setIdentity] = useState<QuestIdentity | null>(null);
  const [achievements, setAchievements] = useState<StudentQuestAchievement[]>([]);
  const [companionSummary, setCompanionSummary] = useState<CompanionUpgradeSummary | null>(null);
  const [companionMilestones, setCompanionMilestones] = useState<CompanionEvolutionMilestone[]>([]);
  const [status, setStatus] = useState('Loading Student Quest.');
  const [checkingIn, setCheckingIn] = useState(false);

  async function loadPage() {
    const currentProfile = await getCurrentProfile();
    setRole(currentProfile.role);
    setEmail(currentProfile.email);

    if (currentProfile.role !== 'student') {
      setStatus(currentProfile.role === 'guest' ? 'Sign in as a student to open Student Quest.' : 'Student Quest is for student accounts.');
      return;
    }

    const [nextProfile, nextIdentity, nextAchievements, nextCompanionSummary, nextCompanionMilestones] = await Promise.all([
      fetchStudentQuestProfile(),
      fetchQuestIdentity(),
      fetchStudentQuestAchievements(),
      fetchCompanionUpgradeSummary(),
      fetchCompanionEvolutionPath()
    ]);

    setProfile(nextProfile);
    setIdentity(nextIdentity);
    setAchievements(nextAchievements);
    setCompanionSummary(nextCompanionSummary);
    setCompanionMilestones(nextCompanionMilestones);
    setStatus('Student Quest is ready.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function checkIn() {
    setCheckingIn(true);
    const nextProfile = await runDailyStreakCheckin();
    const [nextIdentity, nextAchievements, nextCompanionSummary, nextCompanionMilestones] = await Promise.all([
      fetchQuestIdentity(),
      fetchStudentQuestAchievements(),
      fetchCompanionUpgradeSummary(nextProfile.companion_stage),
      fetchCompanionEvolutionPath(nextProfile.companion_stage)
    ]);

    setProfile(nextProfile);
    setIdentity(nextIdentity);
    setAchievements(nextAchievements);
    setCompanionSummary(nextCompanionSummary);
    setCompanionMilestones(nextCompanionMilestones);
    setStatus('Daily streak activated. Keep going.');
    setCheckingIn(false);
  }

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const nextLocked = achievements.find((achievement) => !achievement.unlocked);
  const nodes = useMemo(() => questNodes(profile?.level || 1), [profile?.level]);

  return (
    <main className="page pz-theme pz-student-theme">
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Student Quest</strong>
            <span>{email || 'Sign in'} - XP, streaks, achievements, companion</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/student-dashboard">Dashboard</a>
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
            <p className="muted">Sign in as a student to open your Quest.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card">
            <h2>Student-only Quest</h2>
            <p className="muted">This page is designed for students.</p>
          </section>
        )}

        {role === 'student' && profile && (
          <>
            <section className="pz-student-dashboard-shell">
              <div className="pz-cosmic-hero">
                <div className="pz-role-badge">🎮 Quest mode</div>
                <h1 style={{ fontSize: 52, lineHeight: 1.0, maxWidth: 760, margin: '16px 0 10px' }}>
                  Level {profile.level}: keep building mastery.
                </h1>
                <p className="muted" style={{ fontSize: 18, maxWidth: 720 }}>
                  Every meaningful action builds momentum: practice, corrections, reflection, and consistency.
                </p>

                <section className="pz-student-top-stats">
                  <div className="pz-student-stat-chip">
                    <span>⭐ Total XP</span>
                    <strong>{profile.total_xp}</strong>
                    <small className="muted">{xpToNext(profile)} XP to next level</small>
                  </div>
                  <div className="pz-student-stat-chip">
                    <span>🔥 Current streak</span>
                    <strong>{profile.current_streak}</strong>
                    <small className="muted">Longest {profile.longest_streak}</small>
                  </div>
                  <div className="pz-student-stat-chip">
                    <span>🏆 Achievements</span>
                    <strong>{unlockedCount}/{achievements.length}</strong>
                    <small className="muted">Unlocked badges</small>
                  </div>
                </section>

                <section className="card" style={{ marginTop: 22 }}>
                  <h2>Adventure path</h2>
                  <div className="pz-cosmic-path">
                    {nodes.map((node) => (
                      <div key={node.label} className="pz-path-node" style={{ opacity: node.active ? 1 : .48 }}>
                        <span>{node.icon}</span>
                        <span>
                          <strong>{node.label}</strong><br />
                          <small className="muted">{node.detail}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="card pz-companion-stage">
                <div>
                  <div className="pz-role-badge">Companion</div>
                  <ProjectZCompanion3D
                    stage={profile.companion_stage}
                    skinKey={identity?.skin.key}
                    auraKey={identity?.aura.key}
                    mode={profile.checked_in_today ? 'celebrate' : 'encourage'}
                    interactive={false}
                  />
                  <h2 style={{ textAlign: 'center' }}>
                    {identity?.skin.name || companionName(profile.companion_stage)}
                  </h2>
                  <p className="muted" style={{ textAlign: 'center' }}>
                    {identity ? (
                      <>
                        {identity.title.icon} {identity.title.name}<br />
                        {identity.aura.icon} {identity.aura.name} aura<br />
                        {identity.theme.icon} {identity.theme.name}
                      </>
                    ) : companionMessage(profile.companion_stage)}
                  </p>
                </div>

                <div>
                  <progress value={profile.level_progress_percent} max={100} style={{ width: '100%' }} />
                  <p className="muted">{profile.level_progress_percent}% to Level {profile.level + 1}</p>
                  {!profile.checked_in_today ? (
                    <button className="btn blue" onClick={checkIn} disabled={checkingIn}>
                      {checkingIn ? 'Activating...' : 'Start today’s streak'}
                    </button>
                  ) : (
                    <a className="btn blue" href="/quest-studio">Customize identity</a>
                  )}
                </div>
              </aside>
            </section>

            <ProjectZCompanionUpgradePanel
              stage={profile.companion_stage}
              skinKey={identity?.skin.key}
              auraKey={identity?.aura.key}
              companionName={identity?.skin.name || companionName(profile.companion_stage)}
              titleName={identity?.title.name}
              auraName={identity?.aura.name}
              badgeName={identity?.badge.name}
              summary={companionSummary}
              milestones={companionMilestones}
              defaultMode={profile.checked_in_today ? 'celebrate' : 'encourage'}
            >
              {!profile.checked_in_today ? (
                <button className="btn blue" onClick={checkIn} disabled={checkingIn}>
                  {checkingIn ? 'Activating...' : 'Start today’s streak'}
                </button>
              ) : (
                <a className="btn blue" href="/quest-studio">Open Quest Studio</a>
              )}
              <a className="btn secondary" href="/student-generated-assignments">Earn XP</a>
              <a className="btn secondary" href="/student-corrections">Grow through corrections</a>
            </ProjectZCompanionUpgradePanel>

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Earn XP by practising</h2>
                <p className="muted">Complete assignment questions carefully and keep improving.</p>
                <a className="btn blue" href="/student-generated-assignments">Open assignments</a>
              </div>
              <div className="card">
                <h2>Grow by correcting</h2>
                <p className="muted">Corrections turn mistakes into learning evidence.</p>
                <a className="btn secondary" href="/student-corrections">Open corrections</a>
              </div>
              <div className="card">
                <h2>Ask for hints</h2>
                <p className="muted">Use the tutor when you need a nudge, not just an answer.</p>
                <a className="btn secondary" href="/tutor">Open tutor</a>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Achievement wall</h2>
              <div className="pz-achievement-wall">
                {achievements.map((achievement) => (
                  <div key={achievement.achievement_key || achievement.title} className={`pz-achievement-tile ${achievement.unlocked ? '' : 'locked'}`}>
                    <strong>{achievement.unlocked ? '🏆' : '🔒'} {achievement.title}</strong>
                    <p className="muted">{achievement.description}</p>
                    <small className="muted">{achievement.unlocked ? 'Unlocked' : 'Locked'}</small>
                  </div>
                ))}
              </div>
            </section>

            {nextLocked && (
              <section className="notice" style={{ marginTop: 18 }}>
                <strong>Next achievement:</strong> {nextLocked.title} — {nextLocked.description}
              </section>
            )}

            <section className="notice" style={{ marginTop: 18 }}>
              <strong>Important:</strong> XP, streaks, levels, and achievements are motivation signals. They are not grades or IB criteria scores.
            </section>
          </>
        )}
      </div>
    </main>
  );
}
