'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchParentDashboardActivity,
  fetchParentDashboardOverview,
  fetchParentDashboardSkills,
  ParentDashboardActivity,
  ParentDashboardOverview,
  ParentDashboardSkill
} from '../../lib/projectZParentDashboard';

function friendlyName(value: string) {
  return (value || 'Student')
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Student';
}

function cardStyle(index: number): CSSProperties {
  const gradients = [
    'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 52%, #eef2ff 100%)',
    'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 52%, #ecfeff 100%)',
    'linear-gradient(135deg, #fff7ed 0%, #f8fafc 52%, #fdf2f8 100%)',
    'linear-gradient(135deg, #eef2ff 0%, #f8fafc 52%, #f0fdf4 100%)'
  ];

  return {
    background: gradients[index % gradients.length],
    border: '1px solid rgba(15,23,42,.08)',
    boxShadow: '0 18px 45px rgba(15,23,42,.08)',
    borderRadius: 24
  };
}

function labelStyle(label: string): CSSProperties {
  if (label === 'Needs support' || label === 'Needs practice') {
    return {
      background: '#fff1f2',
      color: '#9f1239',
      border: '1px solid rgba(190,18,60,.18)',
      padding: '6px 10px',
      borderRadius: 999,
      fontWeight: 700
    };
  }

  if (label === 'Work to complete' || label === 'Corrections to do' || label === 'Developing') {
    return {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid rgba(180,83,9,.18)',
      padding: '6px 10px',
      borderRadius: 999,
      fontWeight: 700
    };
  }

  return {
    background: '#ecfdf5',
    color: '#166534',
    border: '1px solid rgba(22,101,52,.18)',
    padding: '6px 10px',
    borderRadius: 999,
    fontWeight: 700
  };
}

function parentHeadline(child: ParentDashboardOverview | null) {
  if (!child) return 'A calm overview of your child’s learning.';
  if (child.corrections_needing_more_work > 0) return `${friendlyName(child.child_name)} needs a little support with corrections.`;
  if (child.assignments_to_do > 0) return `${friendlyName(child.child_name)} has work to complete.`;
  if (child.corrections_needed > child.corrections_submitted) return `${friendlyName(child.child_name)} should use the memorandum for corrections.`;
  if (child.average_mastery >= 75) return `${friendlyName(child.child_name)} is making strong progress.`;
  return `${friendlyName(child.child_name)} is building understanding step by step.`;
}

export default function ParentDashboardPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [children, setChildren] = useState<ParentDashboardOverview[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [activity, setActivity] = useState<ParentDashboardActivity[]>([]);
  const [skills, setSkills] = useState<ParentDashboardSkill[]>([]);
  const [status, setStatus] = useState('Parent dashboard gives a simple progress overview.');
  const [showPrivacyNote, setShowPrivacyNote] = useState(true);

  async function loadPage(studentId = selectedStudentId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'parent') {
      setStatus(profile.role === 'guest' ? 'Sign in as a parent to view the dashboard.' : 'This dashboard is for parents.');
      return;
    }

    const nextChildren = await fetchParentDashboardOverview();
    setChildren(nextChildren);

    if (nextChildren.length === 0) {
      setStatus('No linked student found yet.');
      return;
    }

    const nextStudentId = studentId || nextChildren[0].student_id;
    setSelectedStudentId(nextStudentId);

    const [nextActivity, nextSkills] = await Promise.all([
      fetchParentDashboardActivity(nextStudentId),
      fetchParentDashboardSkills(nextStudentId)
    ]);

    setActivity(nextActivity);
    setSkills(nextSkills);
    setStatus('Parent dashboard is ready.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeChild(studentId: string) {
    setSelectedStudentId(studentId);
    await loadPage(studentId);
  }

  const selectedChild = useMemo(
    () => children.find((child) => child.student_id === selectedStudentId) || children[0] || null,
    [children, selectedStudentId]
  );

  return (
    <main
      className="page"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(14,165,233,.16), transparent 30%), radial-gradient(circle at top right, rgba(168,85,247,.13), transparent 31%), linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)'
      }}
    >
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Parent Dashboard</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/mobile-preview">Mobile</a>
            <a className="btn secondary" href="/parent">Parent Portal</a>
            <a className="btn secondary" href="/parent-learning-report">Learning Report</a>
            <a className="btn secondary" href="/export-reports">Export Reports</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        {role === 'guest' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a parent to view your child’s learning overview.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'parent' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Parent-only dashboard</h2>
            <p className="muted">This page is designed for linked parent accounts.</p>
          </section>
        )}

        {role === 'parent' && (
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
                  right: -70,
                  top: -70,
                  width: 220,
                  height: 220,
                  borderRadius: '50%',
                  background: 'rgba(14,165,233,.13)'
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
                👋 Parent overview
              </p>
              <h1 style={{ fontSize: 38, lineHeight: 1.05, margin: '4px 0 10px' }}>
                {parentHeadline(selectedChild)}
              </h1>
              <p style={{ fontSize: 18, maxWidth: 760, color: '#475569' }}>
                This page gives you the important picture without overwhelming you: progress, open work,
                memorandums, corrections, and how to support at home.
              </p>

              {children.length > 1 && (
                <label className="label" style={{ maxWidth: 420, marginTop: 20 }}>
                  Choose child
                  <select className="select" value={selectedStudentId} onChange={(event) => changeChild(event.target.value)}>
                    {children.map((child) => (
                      <option key={child.student_id} value={child.student_id}>
                        {friendlyName(child.child_name)} - {child.status_label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {selectedChild && (
                <section
                  style={{
                    marginTop: 22,
                    padding: 18,
                    borderRadius: 22,
                    background: 'rgba(255,255,255,.78)',
                    border: '1px solid rgba(15,23,42,.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                    <div>
                      <h2 style={{ marginBottom: 6 }}>Best next support step</h2>
                      <p className="muted">{selectedChild.parent_friendly_next_step}</p>
                    </div>
                    <span style={labelStyle(selectedChild.status_label)}>{selectedChild.status_label}</span>
                  </div>
                </section>
              )}
            </section>

            {selectedChild && (
              <>
                <section className="grid grid3" style={{ marginTop: 18 }}>
                  <div className="card" style={cardStyle(1)}>
                    <h2>Open work</h2>
                    <p className="stat">{selectedChild.assignments_to_do}</p>
                    <p className="muted">{selectedChild.questions_left} question(s) left</p>
                  </div>

                  <div className="card" style={cardStyle(2)}>
                    <h2>Corrections</h2>
                    <p className="stat">{selectedChild.corrections_needed}</p>
                    <p className="muted">{selectedChild.corrections_accepted} accepted</p>
                  </div>

                  <div className="card" style={cardStyle(3)}>
                    <h2>Mastery</h2>
                    <p className="stat">{selectedChild.average_mastery}%</p>
                    <p className="muted">Confidence: {selectedChild.average_confidence}%</p>
                  </div>
                </section>

                <section className="card" style={{ ...cardStyle(2), marginTop: 18 }}>
                  <h2>How to support at home</h2>
                  <p>{selectedChild.support_tip}</p>
                  <p className="muted">
                    The goal is not for you to reteach the lesson. The goal is to help your child reflect,
                    practise calmly, and ask for help when needed.
                  </p>
                </section>

                {showPrivacyNote && (
                  <section className="card" style={{ ...cardStyle(1), marginTop: 18 }}>
                    <h2>Privacy note</h2>
                    <p>
                      This dashboard is parent-safe. It shows progress, feedback summaries, assignments, memorandums,
                      and corrections. It does not show raw tutor chats or teacher-only internal notes.
                    </p>
                    <button className="btn secondary" onClick={() => setShowPrivacyNote(false)}>Hide note</button>
                  </section>
                )}

                <section className="card" style={{ ...cardStyle(0), marginTop: 18 }}>
                  <h2>Recent assignment activity</h2>
                  {activity.length === 0 ? (
                    <p className="muted">No recent assignment activity yet.</p>
                  ) : (
                    <div className="grid">
                      {activity.map((item, index) => (
                        <div key={item.assignment_id} className="card" style={cardStyle(index)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                            <div>
                              <h3>{item.assignment_title}</h3>
                              <p className="muted">{item.skill_title}</p>
                            </div>
                            <span style={labelStyle(item.parent_message.includes('progress') ? 'Developing' : 'Doing well')}>
                              {item.progress_percent}%
                            </span>
                          </div>

                          <progress value={item.progress_percent} max={100} style={{ width: '100%' }} />
                          <p>
                            <strong>Submitted:</strong> {item.submitted_count}/{item.question_count}<br />
                            <strong>Teacher reviewed:</strong> {item.reviewed_count}<br />
                            <strong>Memo:</strong> {item.memorandums_released ? 'Released' : 'Not released yet'}<br />
                            <strong>Corrections:</strong> {item.corrections_submitted}/{item.corrections_needed}
                          </p>
                          <section className="notice" style={{ marginTop: 12 }}>
                            {item.parent_message}
                          </section>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="grid grid2" style={{ marginTop: 18 }}>
                  <div className="card" style={cardStyle(2)}>
                    <h2>Skill snapshot</h2>
                    {skills.length === 0 ? (
                      <p className="muted">Skill progress will appear as your child completes work.</p>
                    ) : (
                      <div className="grid">
                        {skills.map((skill) => (
                          <div key={skill.course_skill_code}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                              <strong>{skill.skill_title}</strong>
                              <span style={labelStyle(skill.status_label)}>{skill.status_label}</span>
                            </div>
                            <progress value={skill.mastery_percent} max={100} style={{ width: '100%' }} />
                            <p className="muted">
                              Mastery {skill.mastery_percent}% | Confidence {skill.confidence_percent}%<br />
                              {skill.parent_tip}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card" style={cardStyle(3)}>
                    <h2>Quick actions</h2>
                    <p className="muted">
                      Use these when you want a deeper report or a version you can save.
                    </p>
                    <div className="grid">
                      <a className="btn blue" href="/parent-learning-report">Open learning report</a>
                      <a className="btn secondary" href="/export-reports">Export / print report</a>
                      <a className="btn secondary" href="/parent">Parent portal</a>
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
