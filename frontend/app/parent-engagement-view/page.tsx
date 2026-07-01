'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  childId,
  childLabel,
  companionIcon,
  fetchParentEngagementOverview,
  ParentEngagementOverview,
  parentFriendlyStatus
} from '../../lib/projectZParentEngagement';

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

function statusStyle(status?: string): CSSProperties {
  if (status === 'Feedback to use') {
    return { background: '#fffbeb', color: '#92400e', border: '1px solid rgba(180,83,9,.18)' };
  }

  if (status === 'Building momentum') {
    return { background: '#ecfdf5', color: '#166534', border: '1px solid rgba(22,101,52,.18)' };
  }

  if (status === 'Active learner') {
    return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid rgba(29,78,216,.18)' };
  }

  return { background: '#f8fafc', color: '#334155', border: '1px solid rgba(51,65,85,.15)' };
}

function studentFirstName(email?: string) {
  if (!email) return 'your child';
  const name = email.split('@')[0] || 'your child';
  return name
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 1)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'your child';
}

export default function ParentEngagementViewPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [overview, setOverview] = useState<ParentEngagementOverview | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [status, setStatus] = useState('Parent engagement view loads safe learning habit information.');
  const [showBoundary, setShowBoundary] = useState(true);

  async function loadPage(studentId = selectedStudentId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'parent') {
      setStatus(profile.role === 'guest' ? 'Sign in as a parent to view engagement information.' : 'This page is for parent accounts.');
      return;
    }

    const nextOverview = await fetchParentEngagementOverview(studentId || null);
    setOverview(nextOverview);

    if (!nextOverview.ok) {
      setStatus(nextOverview.reason || 'Could not load parent engagement information.');
      return;
    }

    if (!nextOverview.has_child) {
      setStatus(nextOverview.message || 'No linked child found.');
      return;
    }

    setStatus('Parent engagement view is ready.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeStudent(value: string) {
    setSelectedStudentId(value);
    await loadPage(value);
  }

  const children = overview?.children || [];
  const childName = useMemo(
    () => studentFirstName(overview?.student?.student_email),
    [overview?.student?.student_email]
  );

  return (
    <main
      className="page pz-theme pz-parent-theme"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(99,102,241,.14), transparent 30%), radial-gradient(circle at top right, rgba(20,184,166,.14), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)'
      }}
    >
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Parent Engagement View</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/role-navigation">Navigation</a>
            <a className="btn secondary" href="/parent-dashboard">Parent Dashboard</a>
            <a className="btn secondary" href="/parent-learning-report">Learning Report</a>
            <a className="btn secondary" href="/export-reports">Reports</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a parent to see a calm, safe summary of learning habits.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'parent' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Parent-only view</h2>
            <p className="muted">This page is designed for parent accounts.</p>
          </section>
        )}

        {role === 'parent' && overview?.ok && overview.has_child && (
          <>
            <section
              className="card"
              style={{
                ...cardStyle(0),
                padding: 30,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: -70,
                  top: -70,
                  width: 220,
                  height: 220,
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,.12)'
                }}
              />

              <p
                style={{
                  display: 'inline-flex',
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,.78)',
                  border: '1px solid rgba(15,23,42,.08)',
                  marginBottom: 12
                }}
              >
                🌱 Calm learning habits
              </p>

              <h1 style={{ fontSize: 38, lineHeight: 1.05, margin: '4px 0 12px', maxWidth: 820 }}>
                See how {childName} is engaging with learning.
              </h1>

              <p style={{ fontSize: 18, maxWidth: 780, color: '#475569' }}>
                This view explains motivation signals and learning habits in parent-friendly language.
                It does not show raw tutor chats, private teacher notes, or formal grading.
              </p>

              {children.length > 1 && (
                <label className="label" style={{ maxWidth: 460, marginTop: 20 }}>
                  Child
                  <select className="select" value={selectedStudentId} onChange={(event) => changeStudent(event.target.value)}>
                    <option value="">Default child</option>
                    {children.map((child) => (
                      <option key={childId(child)} value={childId(child)}>
                        {childLabel(child)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            {showBoundary && (
              <section className="card" style={{ ...cardStyle(1), marginTop: 18 }}>
                <h2>Important boundary</h2>
                <p>
                  XP, streaks, levels, and achievements are motivation signals. They are not marks, grades,
                  IB criteria scores, or replacements for teacher feedback.
                </p>
                <button className="btn secondary" onClick={() => setShowBoundary(false)}>Hide note</button>
              </section>
            )}

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card" style={cardStyle(1)}>
                <h2>Learning habit</h2>
                <p
                  style={{
                    ...statusStyle(overview.learning_habits?.status),
                    display: 'inline-flex',
                    padding: '8px 12px',
                    borderRadius: 999,
                    fontWeight: 700
                  }}
                >
                  {overview.learning_habits?.status || 'No status yet'}
                </p>
                <p className="muted">{parentFriendlyStatus(overview.learning_habits?.status)}</p>
              </div>

              <div className="card" style={cardStyle(2)}>
                <h2>Companion</h2>
                <p className="stat">{companionIcon(overview.quest?.companion_stage || 1)}</p>
                <p className="muted">Stage {overview.quest?.companion_stage || 1}</p>
              </div>

              <div className="card" style={cardStyle(3)}>
                <h2>Streak</h2>
                <p className="stat">{overview.quest?.current_streak || 0}</p>
                <p className="muted">Longest: {overview.quest?.longest_streak || 0}</p>
              </div>
            </section>

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card" style={cardStyle(0)}>
                <h2>Level</h2>
                <p className="stat">{overview.quest?.level || 1}</p>
                <p className="muted">{overview.quest?.total_xp || 0} XP as motivation only</p>
              </div>

              <div className="card" style={cardStyle(1)}>
                <h2>Assignments</h2>
                <p className="stat">{overview.learning_habits?.completion_percent || 0}%</p>
                <p className="muted">
                  {overview.learning_habits?.submitted_responses || 0}/{overview.learning_habits?.total_questions || 0} submitted
                </p>
              </div>

              <div className="card" style={cardStyle(2)}>
                <h2>Corrections</h2>
                <p className="stat">{overview.learning_habits?.correction_effort_percent || 0}%</p>
                <p className="muted">
                  {overview.learning_habits?.corrections_submitted || 0}/{overview.learning_habits?.corrections_needed || 0} submitted,
                  {' '}{overview.learning_habits?.corrections_accepted || 0} accepted
                </p>
              </div>
            </section>

            <section className="card" style={{ ...cardStyle(0), marginTop: 18 }}>
              <h2>How you can support at home</h2>
              <div className="grid grid3">
                <div>
                  <strong>Next step</strong>
                  <p className="muted">{overview.parent_guidance?.next_step}</p>
                </div>
                <div>
                  <strong>Helpful question</strong>
                  <p className="muted">{overview.parent_guidance?.what_to_ask}</p>
                </div>
                <div>
                  <strong>What to avoid</strong>
                  <p className="muted">{overview.parent_guidance?.what_to_avoid}</p>
                </div>
              </div>
            </section>

            <section className="card" style={{ ...cardStyle(1), marginTop: 18 }}>
              <h2>Privacy and safety</h2>
              <p>{overview.parent_guidance?.boundary}</p>
              <div className="grid grid3">
                <div>
                  <strong>Not shown</strong>
                  <p className="muted">Raw tutor conversations</p>
                </div>
                <div>
                  <strong>Not shown</strong>
                  <p className="muted">Private teacher notes</p>
                </div>
                <div>
                  <strong>Not used as</strong>
                  <p className="muted">Formal grading or IB criteria marks</p>
                </div>
              </div>
            </section>

            <section className="grid grid2" style={{ marginTop: 18 }}>
              <div className="card" style={cardStyle(2)}>
                <h2>Achievements</h2>
                <p className="stat">{overview.quest?.achievements_unlocked || 0}</p>
                <p className="muted">Unlocked through learning habits</p>
              </div>

              <div className="card" style={cardStyle(3)}>
                <h2>Parent links</h2>
                <div className="grid">
                  <a className="btn blue" href="/parent-dashboard">Open parent dashboard</a>
                  <a className="btn secondary" href="/parent-learning-report">Open learning report</a>
                  <a className="btn secondary" href="/export-reports">Export reports</a>
                </div>
              </div>
            </section>
          </>
        )}

        {role === 'parent' && overview?.ok && overview.has_child === false && (
          <section className="card" style={cardStyle(0)}>
            <h2>No linked child found</h2>
            <p className="muted">{overview.message || 'No linked child was found for this parent account.'}</p>
          </section>
        )}

        {role === 'parent' && overview && !overview.ok && (
          <section className="card" style={cardStyle(0)}>
            <h2>Could not load view</h2>
            <p className="muted">{overview.reason || 'The engagement view could not be loaded.'}</p>
          </section>
        )}
      </div>
    </main>
  );
}
