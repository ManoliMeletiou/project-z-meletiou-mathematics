'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchStudentDashboardActions,
  fetchStudentDashboardSkills,
  fetchStudentDashboardSummary,
  StudentDashboardAction,
  StudentDashboardSkill,
  StudentDashboardSummary
} from '../../lib/projectZStudentDashboard';

function firstName(email: string | null) {
  if (!email) return 'there';
  const name = email.split('@')[0] || 'there';
  return name
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'there';
}

function actionIcon(type: string) {
  if (type === 'assignment') return '📝';
  if (type === 'corrections') return '🔁';
  if (type === 'memorandum') return '📘';
  if (type === 'tutor') return '💬';
  return '✨';
}

function priorityStyle(label: string): React.CSSProperties {
  if (label === 'Urgent') {
    return {
      background: 'linear-gradient(135deg, #ffe4e6, #fff7ed)',
      border: '1px solid rgba(190,18,60,.25)',
      color: '#9f1239'
    };
  }

  if (label === 'Important') {
    return {
      background: 'linear-gradient(135deg, #fef3c7, #ecfeff)',
      border: '1px solid rgba(180,83,9,.25)',
      color: '#92400e'
    };
  }

  return {
    background: 'linear-gradient(135deg, #eef2ff, #ecfeff)',
    border: '1px solid rgba(79,70,229,.18)',
    color: '#3730a3'
  };
}

function cardStyle(index: number): React.CSSProperties {
  const gradients = [
    'linear-gradient(135deg, #eef2ff 0%, #f8fafc 52%, #ecfeff 100%)',
    'linear-gradient(135deg, #fff7ed 0%, #f8fafc 52%, #f0fdf4 100%)',
    'linear-gradient(135deg, #fdf2f8 0%, #f8fafc 52%, #eef2ff 100%)',
    'linear-gradient(135deg, #ecfeff 0%, #f8fafc 52%, #fff7ed 100%)'
  ];

  return {
    background: gradients[index % gradients.length],
    border: '1px solid rgba(15,23,42,.08)',
    boxShadow: '0 18px 45px rgba(15,23,42,.08)',
    borderRadius: 24
  };
}

function progressText(summary: StudentDashboardSummary) {
  if (summary.assignments_to_do > 0) {
    return `You have ${summary.assignments_to_do} assignment${summary.assignments_to_do === 1 ? '' : 's'} to work on.`;
  }

  if (summary.corrections_needing_more_work > 0) {
    return 'Some corrections need another try.';
  }

  if (summary.corrections_needed > summary.corrections_submitted) {
    return 'You have corrections to complete after reading the memorandum.';
  }

  return 'You are up to date. Keep practising and ask the tutor if you feel stuck.';
}

export default function StudentDashboardPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [summary, setSummary] = useState<StudentDashboardSummary | null>(null);
  const [actions, setActions] = useState<StudentDashboardAction[]>([]);
  const [skills, setSkills] = useState<StudentDashboardSkill[]>([]);
  const [status, setStatus] = useState('Student dashboard loads your next steps.');
  const [showCoachTip, setShowCoachTip] = useState(true);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to see your dashboard.' : 'This dashboard is for students.');
      return;
    }

    const [nextSummary, nextActions, nextSkills] = await Promise.all([
      fetchStudentDashboardSummary(),
      fetchStudentDashboardActions(),
      fetchStudentDashboardSkills()
    ]);

    setSummary(nextSummary);
    setActions(nextActions);
    setSkills(nextSkills);
    setStatus('Your dashboard is ready.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  const topAction = actions[0];

  const visibleActions = useMemo(() => {
    if (actions.length === 0) return [];
    return actions.slice(0, 6);
  }, [actions]);

  return (
    <main
      className="page"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(99,102,241,.18), transparent 32%), radial-gradient(circle at top right, rgba(20,184,166,.16), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)'
      }}
    >
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Student Dashboard</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/student-quest">Quest</a>
            <a className="btn secondary" href="/quest-studio">Studio</a>
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/mobile-preview">Mobile</a>
            <a className="btn secondary" href="/student">Student Portal</a>
            <a className="btn secondary" href="/student-generated-assignments">Assignments</a>
            <a className="btn secondary" href="/student-memorandum">Memo</a>
            <a className="btn secondary" href="/student-corrections">Corrections</a>
            <a className="btn secondary" href="/tutor">Tutor</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        {role === 'guest' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to see your next steps.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Student-only dashboard</h2>
            <p className="muted">This page is designed for students.</p>
          </section>
        )}

        {role === 'student' && summary && (
          <>
            <section
              className="card"
              style={{
                ...cardStyle(0),
                padding: 30,
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: -60,
                  top: -60,
                  width: 190,
                  height: 190,
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,.13)'
                }}
              />
              <p
                style={{
                  display: 'inline-flex',
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,.75)',
                  border: '1px solid rgba(15,23,42,.08)',
                  marginBottom: 12
                }}
              >
                ✨ Welcome back
              </p>
              <h1 style={{ fontSize: 38, lineHeight: 1.05, margin: '4px 0 10px' }}>
                Hi {firstName(summary.student_email)}, here is what to do next.
              </h1>
              <p style={{ fontSize: 18, maxWidth: 720, color: '#475569' }}>
                {progressText(summary)}
              </p>

              {topAction ? (
                <section
                  style={{
                    marginTop: 22,
                    padding: 18,
                    borderRadius: 22,
                    background: 'rgba(255,255,255,.78)',
                    border: '1px solid rgba(15,23,42,.08)'
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 700 }}>
                    {actionIcon(topAction.action_type)} Best next step
                  </p>
                  <h2 style={{ marginBottom: 6 }}>{topAction.title}</h2>
                  <p className="muted">{topAction.description}</p>
                  <a className="btn blue" href={topAction.page_path}>
                    {topAction.button_label}
                  </a>
                </section>
              ) : (
                <section
                  style={{
                    marginTop: 22,
                    padding: 18,
                    borderRadius: 22,
                    background: 'rgba(255,255,255,.78)',
                    border: '1px solid rgba(15,23,42,.08)'
                  }}
                >
                  <h2>You are up to date</h2>
                  <p className="muted">No urgent tasks found. You can practise or ask the tutor for help.</p>
                  <a className="btn blue" href="/tutor">Open tutor</a>
                </section>
              )}
            </section>

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card" style={cardStyle(1)}>
                <h2>Assignments to do</h2>
                <p className="stat">{summary.assignments_to_do}</p>
                <p className="muted">{summary.questions_left} question(s) left</p>
              </div>

              <div className="card" style={cardStyle(2)}>
                <h2>Corrections</h2>
                <p className="stat">{summary.corrections_needed}</p>
                <p className="muted">{summary.corrections_accepted} accepted</p>
              </div>

              <div className="card" style={cardStyle(3)}>
                <h2>Mastery</h2>
                <p className="stat">{summary.average_mastery}%</p>
                <p className="muted">{summary.strong_skills} strong skill(s)</p>
              </div>
            </section>

            {showCoachTip && (
              <section className="card" style={{ ...cardStyle(2), marginTop: 18 }}>
                <h2>Learning coach tip</h2>
                <p>
                  Do not only check whether your answer is right. Check whether you can explain why it is right.
                  That is how you turn a correction into real understanding.
                </p>
                <button className="btn secondary" onClick={() => setShowCoachTip(false)}>Hide tip</button>
              </section>
            )}

            <section className="card" style={{ ...cardStyle(1), marginTop: 18 }}>
              <h2>Your next actions</h2>
              {visibleActions.length === 0 ? (
                <p className="muted">No actions yet. When your teacher publishes assignments or memorandums, they will appear here.</p>
              ) : (
                <div className="grid">
                  {visibleActions.map((action, index) => (
                    <div key={action.action_id} className="card" style={cardStyle(index)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                        <div>
                          <p style={{ fontSize: 28, margin: '0 0 6px' }}>{actionIcon(action.action_type)}</p>
                          <h3 style={{ marginBottom: 6 }}>{action.title}</h3>
                        </div>
                        <span
                          style={{
                            ...priorityStyle(action.priority_label),
                            padding: '6px 10px',
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {action.priority_label}
                        </span>
                      </div>

                      <p className="muted">{action.description}</p>

                      {action.assignment_title && (
                        <p>
                          <strong>{action.assignment_title}</strong><br />
                          <span className="muted">{action.skill_title}</span>
                        </p>
                      )}

                      {action.action_type !== 'tutor' && (
                        <>
                          <progress value={action.progress_percent} max={100} style={{ width: '100%' }} />
                          <p className="muted">{action.progress_percent}% progress</p>
                        </>
                      )}

                      <a className="btn blue" href={action.page_path}>
                        {action.button_label}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid grid2" style={{ marginTop: 18 }}>
              <div className="card" style={cardStyle(2)}>
                <h2>Progress snapshot</h2>
                <p>
                  <strong>Active assignments:</strong> {summary.active_assignments}<br />
                  <strong>Memorandums released:</strong> {summary.released_memorandums}<br />
                  <strong>Corrections submitted:</strong> {summary.corrections_submitted}<br />
                  <strong>Corrections needing more work:</strong> {summary.corrections_needing_more_work}<br />
                  <strong>Average confidence:</strong> {summary.average_confidence}%
                </p>
              </div>

              <div className="card" style={cardStyle(3)}>
                <h2>Quick links</h2>
                <div className="grid">
                  <a className="btn blue" href="/student-generated-assignments">Open assignments</a>
                  <a className="btn secondary" href="/student-memorandum">Open memorandum</a>
                  <a className="btn secondary" href="/student-corrections">Open corrections</a>
                  <a className="btn secondary" href="/tutor">Ask the tutor</a>
                </div>
              </div>
            </section>

            <section className="card" style={{ ...cardStyle(0), marginTop: 18 }}>
              <h2>Recent skills</h2>
              {skills.length === 0 ? (
                <p className="muted">Your skill progress will appear here as you complete work.</p>
              ) : (
                <div className="grid">
                  {skills.map((skill, index) => (
                    <div key={skill.course_skill_code} className="card" style={cardStyle(index)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <h3>{skill.skill_title}</h3>
                        <span
                          style={{
                            ...priorityStyle(skill.status_label === 'Needs practice' ? 'Important' : 'Review'),
                            padding: '6px 10px',
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {skill.status_label}
                        </span>
                      </div>
                      <p className="muted">{skill.course_skill_code}</p>
                      <progress value={skill.mastery_percent} max={100} style={{ width: '100%' }} />
                      <p>
                        <strong>Mastery:</strong> {skill.mastery_percent}%<br />
                        <strong>Confidence:</strong> {skill.confidence_percent}%<br />
                        <span className="muted">{skill.suggestion}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
