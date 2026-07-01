'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
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

function cardStyle(index: number): CSSProperties {
  const gradients = [
    'linear-gradient(135deg, #eef2ff 0%, #f8fafc 52%, #ecfeff 100%)',
    'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 52%, #eef2ff 100%)',
    'linear-gradient(135deg, #fff7ed 0%, #f8fafc 52%, #fdf2f8 100%)',
    'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 52%, #f0fdf4 100%)'
  ];

  return {
    background: gradients[index % gradients.length],
    border: '1px solid rgba(15,23,42,.08)',
    boxShadow: '0 18px 45px rgba(15,23,42,.08)',
    borderRadius: 24
  };
}

function achievementStyle(unlocked: boolean): CSSProperties {
  return {
    opacity: unlocked ? 1 : 0.55,
    filter: unlocked ? 'none' : 'grayscale(.4)'
  };
}

function xpToNext(profile: StudentQuestProfile) {
  return Math.max(0, profile.next_level_xp - profile.total_xp);
}

export default function StudentQuestPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentQuestProfile | null>(null);
  const [achievements, setAchievements] = useState<StudentQuestAchievement[]>([]);
  const [status, setStatus] = useState('Student Quest loads your streaks, XP, levels, and companion.');
  const [loadingCheckin, setLoadingCheckin] = useState(false);

  async function loadPage() {
    const current = await getCurrentProfile();
    setRole(current.role);
    setEmail(current.email);

    if (current.role !== 'student') {
      setStatus(current.role === 'guest' ? 'Sign in as a student to open Student Quest.' : 'Student Quest is for student accounts.');
      return;
    }

    const [nextProfile, nextAchievements] = await Promise.all([
      fetchStudentQuestProfile(),
      fetchStudentQuestAchievements()
    ]);

    setProfile(nextProfile);
    setAchievements(nextAchievements);
    setStatus('Student Quest is ready.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function handleCheckin() {
    setLoadingCheckin(true);
    const nextProfile = await runDailyStreakCheckin();
    const nextAchievements = await fetchStudentQuestAchievements();
    setProfile(nextProfile);
    setAchievements(nextAchievements);
    setStatus(nextProfile.checked_in_today ? 'Today’s streak is active.' : 'Quest updated.');
    setLoadingCheckin(false);
  }

  const unlockedCount = useMemo(
    () => achievements.filter((achievement) => achievement.unlocked).length,
    [achievements]
  );

  return (
    <main
      className="page"
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(99,102,241,.18), transparent 31%), radial-gradient(circle at top right, rgba(20,184,166,.16), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)'
      }}
    >
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Student Quest</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/student-dashboard">Dashboard</a>
            <a className="btn secondary" href="/student-generated-assignments">Assignments</a>
            <a className="btn secondary" href="/student-corrections">Corrections</a>
            <a className="btn secondary" href="/tutor">Tutor</a>
            <a className="btn secondary" href="/mobile-preview">Mobile</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to use streaks, XP, achievements, and the Math Companion.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Student-only quest</h2>
            <p className="muted">This page is designed for students aged 12–19.</p>
          </section>
        )}

        {role === 'student' && profile && (
          <>
            <section
              className="card"
              style={{
                ...cardStyle(0),
                padding: 34,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: -80,
                  top: -80,
                  width: 250,
                  height: 250,
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,.13)'
                }}
              />

              <p
                style={{
                  display: 'inline-flex',
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,.82)',
                  border: '1px solid rgba(15,23,42,.08)',
                  marginBottom: 14
                }}
              >
                🎮 Motivation layer, not marks
              </p>

              <h1 style={{ fontSize: 42, lineHeight: 1.05, margin: '4px 0 12px', maxWidth: 820 }}>
                Build your streak. Grow your Math Companion.
              </h1>

              <p style={{ fontSize: 18, maxWidth: 780, color: '#475569' }}>
                Student Quest rewards learning habits: practising, submitting answers, correcting mistakes,
                completing assignments, and returning consistently.
              </p>

              <section
                style={{
                  marginTop: 22,
                  padding: 20,
                  borderRadius: 26,
                  background: 'rgba(255,255,255,.78)',
                  border: '1px solid rgba(15,23,42,.08)'
                }}
              >
                <div className="grid grid2">
                  <div>
                    <p style={{ fontSize: 72, margin: 0 }}>{companionIcon(profile.companion_stage)}</p>
                    <h2>{companionName(profile.companion_stage)} Companion</h2>
                    <p className="muted">{companionMessage(profile.companion_stage)}</p>
                  </div>

                  <div>
                    <h2>Level {profile.level}</h2>
                    <progress value={profile.level_progress_percent} max={100} style={{ width: '100%' }} />
                    <p className="muted">
                      {profile.total_xp} XP total<br />
                      {xpToNext(profile)} XP to next level
                    </p>
                    <button
                      className="btn blue"
                      onClick={handleCheckin}
                      disabled={loadingCheckin || profile.checked_in_today}
                    >
                      {profile.checked_in_today ? 'Today’s streak is active' : loadingCheckin ? 'Checking in...' : 'Start today’s streak'}
                    </button>
                  </div>
                </div>
              </section>
            </section>

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card" style={cardStyle(1)}>
                <h2>🔥 Current streak</h2>
                <p className="stat">{profile.current_streak}</p>
                <p className="muted">Longest streak: {profile.longest_streak}</p>
              </div>

              <div className="card" style={cardStyle(2)}>
                <h2>⚡ XP</h2>
                <p className="stat">{profile.total_xp}</p>
                <p className="muted">Level {profile.level}</p>
              </div>

              <div className="card" style={cardStyle(3)}>
                <h2>🏅 Achievements</h2>
                <p className="stat">{unlockedCount}/{achievements.length}</p>
                <p className="muted">Unlocked so far</p>
              </div>
            </section>

            <section className="card" style={{ ...cardStyle(1), marginTop: 18 }}>
              <h2>How to earn XP</h2>
              <div className="grid grid3">
                <div>
                  <strong>Submit answers</strong>
                  <p className="muted">Every submitted answer gives XP for effort.</p>
                </div>
                <div>
                  <strong>Get answers correct</strong>
                  <p className="muted">Accuracy gives extra XP.</p>
                </div>
                <div>
                  <strong>Fix mistakes</strong>
                  <p className="muted">Accepted corrections give strong XP because they show learning.</p>
                </div>
                <div>
                  <strong>Finish assignments</strong>
                  <p className="muted">Completing a full assignment gives a bonus.</p>
                </div>
                <div>
                  <strong>Check in daily</strong>
                  <p className="muted">Use daily streaks to build consistency.</p>
                </div>
                <div>
                  <strong>Keep it healthy</strong>
                  <p className="muted">XP is for motivation. Your real learning still matters most.</p>
                </div>
              </div>
            </section>

            <section className="card" style={{ ...cardStyle(2), marginTop: 18 }}>
              <h2>Achievements</h2>
              {achievements.length === 0 ? (
                <p className="muted">Achievements will appear as you use Project Z.</p>
              ) : (
                <div className="grid grid3">
                  {achievements.map((achievement, index) => (
                    <div
                      key={achievement.achievement_key}
                      className="card"
                      style={{
                        ...cardStyle(index),
                        ...achievementStyle(achievement.unlocked)
                      }}
                    >
                      <p style={{ fontSize: 34, margin: '0 0 8px' }}>{achievement.icon}</p>
                      <h3>{achievement.title}</h3>
                      <p className="muted">{achievement.description}</p>
                      <p>
                        <strong>{achievement.unlocked ? 'Unlocked' : 'Locked'}</strong><br />
                        <span className="muted">Reward: {achievement.xp_reward} XP</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid grid2" style={{ marginTop: 18 }}>
              <div className="card" style={cardStyle(3)}>
                <h2>Quest links</h2>
                <div className="grid">
                  <a className="btn blue" href="/student-generated-assignments">Do assignments</a>
                  <a className="btn secondary" href="/student-corrections">Submit corrections</a>
                  <a className="btn secondary" href="/student-dashboard">Open dashboard</a>
                  <a className="btn secondary" href="/tutor">Ask the tutor</a>
                </div>
              </div>

              <div className="card" style={cardStyle(0)}>
                <h2>Important rule</h2>
                <p>
                  XP, streaks, levels, and the companion are here to make learning feel more motivating.
                  They do not replace your teacher’s feedback, formal assessment, or real mathematical understanding.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
