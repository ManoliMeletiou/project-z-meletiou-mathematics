'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchTeacherEngagementClasses,
  fetchTeacherEngagementInsights,
  fetchTeacherEngagementSummary,
  TeacherEngagementClass,
  TeacherEngagementRow,
  TeacherEngagementSummary
} from '../../lib/projectZTeacherEngagement';

function cardStyle(index: number): CSSProperties {
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

function statusStyle(status: string): CSSProperties {
  if (status === 'No engagement yet' || status === 'Low assignment engagement') {
    return { background: '#fff1f2', color: '#9f1239', border: '1px solid rgba(190,18,60,.18)' };
  }

  if (status === 'Needs correction support') {
    return { background: '#fffbeb', color: '#92400e', border: '1px solid rgba(180,83,9,.18)' };
  }

  if (status === 'Building momentum') {
    return { background: '#ecfdf5', color: '#166534', border: '1px solid rgba(22,101,52,.18)' };
  }

  return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid rgba(29,78,216,.18)' };
}

function studentName(email: string) {
  return (email || 'student')
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Student';
}

function updatedLabel(value: string | null) {
  if (!value) return 'No activity yet';
  return new Date(value).toLocaleString();
}

export default function TeacherEngagementInsightsPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [classes, setClasses] = useState<TeacherEngagementClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [summary, setSummary] = useState<TeacherEngagementSummary | null>(null);
  const [rows, setRows] = useState<TeacherEngagementRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState('Teacher engagement insights load support signals.');
  const [showCaution, setShowCaution] = useState(true);

  async function loadPage(classId = selectedClassId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to view engagement insights.' : 'This page is for teacher accounts.');
      return;
    }

    const nextClasses = await fetchTeacherEngagementClasses();
    setClasses(nextClasses);

    const classToUse = classId || '';
    setSelectedClassId(classToUse);

    const [nextSummary, nextRows] = await Promise.all([
      fetchTeacherEngagementSummary(classToUse || null),
      fetchTeacherEngagementInsights(classToUse || null)
    ]);

    setSummary(nextSummary);
    setRows(nextRows);
    setStatus(nextRows.length === 0 ? 'No engagement data yet. Generate and publish assignments first.' : `Loaded ${nextRows.length} student engagement record(s).`);
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeClass(value: string) {
    setSelectedClassId(value);
    await loadPage(value);
  }

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'support') return rows.filter((row) => ['No engagement yet', 'Low assignment engagement', 'Needs correction support'].includes(row.engagement_status));
    if (filter === 'momentum') return rows.filter((row) => row.engagement_status === 'Building momentum');
    if (filter === 'active') return rows.filter((row) => row.engagement_status === 'Active');
    if (filter === 'corrections') return rows.filter((row) => row.corrections_needed > row.corrections_submitted);
    return rows;
  }, [rows, filter]);

  return (
    <main
      className="page"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(99,102,241,.16), transparent 30%), radial-gradient(circle at top right, rgba(20,184,166,.14), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)'
      }}
    >
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Teacher Engagement Insights</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/role-navigation">Navigation</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/assignment-lifecycle">Lifecycle</a>
            <a className="btn secondary" href="/teacher-submission-review">Submissions</a>
            <a className="btn secondary" href="/teacher-corrections-review">Corrections</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a teacher to see engagement insights.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Teacher-only insights</h2>
            <p className="muted">This page is for teachers supporting students in their classes.</p>
          </section>
        )}

        {role === 'teacher' && (
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
                🧭 Support signals, not grades
              </p>

              <h1 style={{ fontSize: 38, lineHeight: 1.05, margin: '4px 0 12px', maxWidth: 820 }}>
                See who needs support and who is building momentum.
              </h1>

              <p style={{ fontSize: 18, maxWidth: 780, color: '#475569' }}>
                This page combines assignment completion, correction effort, XP, level, streaks, and achievements
                to help you decide how to support students next.
              </p>

              {classes.length > 0 && (
                <label className="label" style={{ maxWidth: 460, marginTop: 20 }}>
                  Class filter
                  <select className="select" value={selectedClassId} onChange={(event) => changeClass(event.target.value)}>
                    <option value="">All classes</option>
                    {classes.map((item) => (
                      <option key={item.class_id} value={item.class_id}>
                        {item.class_label} — {item.student_count} student(s), {item.assignment_count} assignment(s)
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            {showCaution && (
              <section className="card" style={{ ...cardStyle(1), marginTop: 18 }}>
                <h2>Important assessment boundary</h2>
                <p>
                  XP, streaks, levels, and achievements are motivation signals. They must not be used as formal marks,
                  IB criteria scores, grades, or a replacement for teacher judgement.
                </p>
                <button className="btn secondary" onClick={() => setShowCaution(false)}>Hide note</button>
              </section>
            )}

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card" style={cardStyle(1)}>
                <h2>Students</h2>
                <p className="stat">{summary?.student_count || 0}</p>
                <p className="muted">Visible through your generated assignments</p>
              </div>

              <div className="card" style={cardStyle(2)}>
                <h2>Need support</h2>
                <p className="stat">
                  {(summary?.no_engagement_count || 0) + (summary?.correction_support_count || 0) + (summary?.low_assignment_engagement_count || 0)}
                </p>
                <p className="muted">No engagement, low completion, or correction support</p>
              </div>

              <div className="card" style={cardStyle(3)}>
                <h2>Momentum</h2>
                <p className="stat">{summary?.building_momentum_count || 0}</p>
                <p className="muted">Consistent and active students</p>
              </div>
            </section>

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card" style={cardStyle(0)}>
                <h2>Avg completion</h2>
                <p className="stat">{summary?.average_completion_percent || 0}%</p>
              </div>

              <div className="card" style={cardStyle(1)}>
                <h2>Avg correction effort</h2>
                <p className="stat">{summary?.average_correction_effort_percent || 0}%</p>
              </div>

              <div className="card" style={cardStyle(2)}>
                <h2>Total XP</h2>
                <p className="stat">{summary?.total_xp || 0}</p>
              </div>
            </section>

            <section className="card" style={{ ...cardStyle(2), marginTop: 18 }}>
              <h2>Filter students</h2>
              <div className="navLinks">
                <button className={filter === 'all' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('all')}>All</button>
                <button className={filter === 'support' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('support')}>Needs support</button>
                <button className={filter === 'corrections' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('corrections')}>Corrections</button>
                <button className={filter === 'active' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('active')}>Active</button>
                <button className={filter === 'momentum' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('momentum')}>Momentum</button>
              </div>
            </section>

            <section className="card" style={{ ...cardStyle(0), marginTop: 18 }}>
              <h2>Student engagement</h2>
              {filteredRows.length === 0 ? (
                <p className="muted">No students match this filter yet.</p>
              ) : (
                <div className="grid">
                  {filteredRows.map((row, index) => (
                    <div key={`${row.student_id}-${row.class_id}`} className="card" style={cardStyle(index)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                        <div>
                          <h3>{studentName(row.student_email)}</h3>
                          <p className="muted">{row.class_label} | Updated: {updatedLabel(row.updated_at)}</p>
                        </div>
                        <span
                          style={{
                            ...statusStyle(row.engagement_status),
                            padding: '6px 10px',
                            borderRadius: 999,
                            fontWeight: 700,
                            fontSize: 13,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {row.engagement_status}
                        </span>
                      </div>

                      <section className="grid grid3">
                        <div>
                          <strong>Completion</strong><br />
                          {row.completion_percent}%
                        </div>
                        <div>
                          <strong>Accuracy</strong><br />
                          {row.accuracy_percent}%
                        </div>
                        <div>
                          <strong>Corrections</strong><br />
                          {row.corrections_submitted}/{row.corrections_needed}
                        </div>
                        <div>
                          <strong>Level</strong><br />
                          {row.level}
                        </div>
                        <div>
                          <strong>XP</strong><br />
                          {row.total_xp}
                        </div>
                        <div>
                          <strong>Streak</strong><br />
                          {row.current_streak}
                        </div>
                        <div>
                          <strong>Achievements</strong><br />
                          {row.achievements_unlocked}
                        </div>
                        <div>
                          <strong>Submitted</strong><br />
                          {row.submitted_responses}
                        </div>
                        <div>
                          <strong>Reviewed</strong><br />
                          {row.reviewed_responses}
                        </div>
                      </section>

                      <section className="notice" style={{ marginTop: 12 }}>
                        <strong>Suggested teacher action:</strong> {row.teacher_next_action}
                      </section>

                      <p className="muted">{row.caution_note}</p>
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
