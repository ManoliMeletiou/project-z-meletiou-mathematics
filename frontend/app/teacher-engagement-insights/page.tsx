'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchTeacherEngagementClasses,
  fetchTeacherEngagementInsights,
  fetchTeacherEngagementSummary,
  TeacherEngagementClass,
  TeacherEngagementRow,
  TeacherEngagementSummary
} from '../../lib/projectZTeacherEngagement';

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
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

function statusTone(status: string) {
  if (status === 'No engagement yet' || status === 'Low assignment engagement') return 'danger';
  if (status === 'Needs correction support') return 'warning';
  if (status === 'Building momentum') return 'success';
  if (status === 'Active') return 'info';
  return 'neutral';
}

function supportScore(row: TeacherEngagementRow) {
  let score = 0;
  if (row.engagement_status === 'No engagement yet') score += 34;
  if (row.engagement_status === 'Low assignment engagement') score += 28;
  if (row.engagement_status === 'Needs correction support') score += 26;
  if (row.completion_percent < 40) score += 18;
  if (row.corrections_needed > row.corrections_submitted) score += 16;
  if (row.accuracy_percent > 0 && row.accuracy_percent < 50) score += 10;
  if (!row.checked_in_today) score += 6;
  return clampPercent(score);
}

function momentumScore(row: TeacherEngagementRow) {
  const completion = clampPercent(row.completion_percent) * 0.35;
  const accuracy = clampPercent(row.accuracy_percent) * 0.24;
  const correction = clampPercent(row.correction_effort_percent) * 0.18;
  const streak = Math.min(100, row.current_streak * 12) * 0.13;
  const achievement = Math.min(100, row.achievements_unlocked * 14) * 0.10;
  return clampPercent(completion + accuracy + correction + streak + achievement);
}

function priorityLabel(row: TeacherEngagementRow) {
  if (row.engagement_status === 'No engagement yet') return 'Start contact';
  if (row.engagement_status === 'Low assignment engagement') return 'Completion support';
  if (row.engagement_status === 'Needs correction support') return 'Correction conference';
  if (row.engagement_status === 'Building momentum') return 'Stretch next';
  if (row.engagement_status === 'Active') return 'Maintain momentum';
  return 'Review';
}

function heatCellClass(row: TeacherEngagementRow) {
  const score = supportScore(row);
  if (score >= 70) return 'hot';
  if (score >= 42) return 'warm';
  if (momentumScore(row) >= 70) return 'cool';
  return 'neutral';
}

function supportStatusRows(rows: TeacherEngagementRow[]) {
  return rows
    .filter((row) => supportScore(row) > 0 || ['No engagement yet', 'Low assignment engagement', 'Needs correction support'].includes(row.engagement_status))
    .sort((a, b) => supportScore(b) - supportScore(a))
    .slice(0, 5);
}

export default function TeacherEngagementInsightsPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [classes, setClasses] = useState<TeacherEngagementClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [summary, setSummary] = useState<TeacherEngagementSummary | null>(null);
  const [rows, setRows] = useState<TeacherEngagementRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState('Teacher command centre is loading support signals.');
  const [showBoundary, setShowBoundary] = useState(true);

  async function loadPage(classId = selectedClassId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to view the command centre.' : 'This command centre is for teacher accounts.');
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
    setStatus(nextRows.length === 0 ? 'No engagement data yet. Generate and publish assignments first.' : `Command centre loaded ${nextRows.length} student signal record(s).`);
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
    if (filter === 'corrections') return rows.filter((row) => row.corrections_needed > row.corrections_submitted);
    if (filter === 'active') return rows.filter((row) => row.engagement_status === 'Active');
    if (filter === 'momentum') return rows.filter((row) => row.engagement_status === 'Building momentum' || momentumScore(row) >= 70);
    return rows;
  }, [rows, filter]);

  const supportRows = useMemo(() => supportStatusRows(rows), [rows]);
  const selectedClass = classes.find((item) => item.class_id === selectedClassId);
  const supportCount = (summary?.no_engagement_count || 0) + (summary?.correction_support_count || 0) + (summary?.low_assignment_engagement_count || 0);
  const totalStudents = summary?.student_count || rows.length || 0;
  const activeOrMomentum = (summary?.active_count || 0) + (summary?.building_momentum_count || 0);
  const supportPercent = totalStudents ? clampPercent((supportCount / totalStudents) * 100) : 0;
  const momentumPercent = totalStudents ? clampPercent((activeOrMomentum / totalStudents) * 100) : 0;

  return (
    <main className="page pz-theme pz-teacher-theme">
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Teacher Command Centre</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/role-navigation">Navigation</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/assignment-lifecycle">Lifecycle</a>
            <a className="btn secondary" href="/generated-assignments">Generate</a>
            <a className="btn secondary" href="/assignment-audit">Audit</a>
            <a className="btn secondary" href="/teacher-submission-review">Submissions</a>
            <a className="btn secondary" href="/teacher-corrections-review">Corrections</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card pz-teacher-access-card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a teacher to see the analytics command centre.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card pz-teacher-access-card">
            <h2>Teacher-only command centre</h2>
            <p className="muted">This page is for teachers supporting students in their classes.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="pz-teacher-command-hero">
              <div className="pz-teacher-hero-copy">
                <div className="pz-role-badge">🧠 Professional analytics command centre</div>
                <h1>Know who needs help, what to do next, and where momentum is building.</h1>
                <p className="muted">
                  This command centre combines assignment completion, correction effort, accuracy, activity,
                  XP, streaks, and achievements into teacher-friendly support signals. These are guidance signals,
                  not formal marks or IB criteria scores.
                </p>

                <div className="pz-teacher-control-row">
                  <label className="label">
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

                  <div className="pz-teacher-live-chip">
                    <span>Current view</span>
                    <strong>{selectedClass?.class_label || 'All classes'}</strong>
                  </div>
                </div>
              </div>

              <aside className="pz-teacher-radar-card">
                <span>Support load</span>
                <strong>{supportPercent}%</strong>
                <progress value={supportPercent} max={100} />
                <span>Momentum</span>
                <strong>{momentumPercent}%</strong>
                <progress value={momentumPercent} max={100} />
                <p className="muted">Use this as a planning lens. It is not a gradebook.</p>
              </aside>
            </section>

            {showBoundary && (
              <section className="notice pz-teacher-boundary-note" style={{ marginTop: 18 }}>
                <div>
                  <strong>Assessment boundary:</strong> XP, streaks, levels, achievements, and companion progress are motivation and engagement signals only. Formal assessment still depends on learning evidence, teacher feedback, and the relevant criteria.
                </div>
                <button className="btn secondary" onClick={() => setShowBoundary(false)}>Hide note</button>
              </section>
            )}

            <section className="pz-teacher-kpi-grid" style={{ marginTop: 18 }}>
              <div className="card pz-teacher-kpi-card critical">
                <span>Students needing support</span>
                <strong>{supportCount}</strong>
                <p className="muted">No engagement, low completion, or correction support</p>
              </div>
              <div className="card pz-teacher-kpi-card success">
                <span>Active / momentum</span>
                <strong>{activeOrMomentum}</strong>
                <p className="muted">Students showing consistent learning movement</p>
              </div>
              <div className="card pz-teacher-kpi-card info">
                <span>Average completion</span>
                <strong>{summary?.average_completion_percent || 0}%</strong>
                <p className="muted">Across visible generated assignment work</p>
              </div>
              <div className="card pz-teacher-kpi-card warning">
                <span>Correction effort</span>
                <strong>{summary?.average_correction_effort_percent || 0}%</strong>
                <p className="muted">How strongly students are using feedback</p>
              </div>
            </section>

            <section className="grid grid2" style={{ marginTop: 18 }}>
              <div className="card pz-teacher-panel">
                <div className="pz-panel-header">
                  <div>
                    <div className="pz-role-badge">🚦 Support queue</div>
                    <h2>Highest-priority students</h2>
                  </div>
                  <a className="btn secondary" href="/teacher-submission-review">Open submissions</a>
                </div>
                {supportRows.length === 0 ? (
                  <p className="muted">No urgent support signals yet.</p>
                ) : (
                  <div className="pz-teacher-support-list">
                    {supportRows.map((row) => (
                      <div key={`queue-${row.student_id}-${row.class_id}`} className="pz-teacher-support-item">
                        <div>
                          <strong>{studentName(row.student_email)}</strong>
                          <p className="muted">{row.class_label} · {priorityLabel(row)}</p>
                        </div>
                        <span className={`pz-teacher-status ${statusTone(row.engagement_status)}`}>{row.engagement_status}</span>
                        <progress value={supportScore(row)} max={100} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card pz-teacher-panel">
                <div className="pz-panel-header">
                  <div>
                    <div className="pz-role-badge">🧩 Signal heatmap</div>
                    <h2>Class pulse</h2>
                  </div>
                  <span className="muted">{filteredRows.length} visible</span>
                </div>
                <div className="pz-teacher-signal-heatmap">
                  {rows.slice(0, 40).map((row) => (
                    <span
                      key={`heat-${row.student_id}-${row.class_id}`}
                      className={heatCellClass(row)}
                      title={`${studentName(row.student_email)} — ${row.engagement_status}`}
                    />
                  ))}
                </div>
                <div className="pz-teacher-legend">
                  <span><i className="hot" /> urgent</span>
                  <span><i className="warm" /> watch</span>
                  <span><i className="cool" /> momentum</span>
                  <span><i className="neutral" /> neutral</span>
                </div>
                <p className="muted">Each square is one student signal. Use it to plan check-ins, not to grade.</p>
              </div>
            </section>

            <section className="card pz-teacher-filter-panel" style={{ marginTop: 18 }}>
              <div>
                <h2>Student signal board</h2>
                <p className="muted">Filter the command centre by immediate teacher action.</p>
              </div>
              <div className="navLinks">
                <button className={filter === 'all' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('all')}>All</button>
                <button className={filter === 'support' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('support')}>Needs support</button>
                <button className={filter === 'corrections' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('corrections')}>Corrections</button>
                <button className={filter === 'active' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('active')}>Active</button>
                <button className={filter === 'momentum' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('momentum')}>Momentum</button>
              </div>
            </section>

            <section className="pz-teacher-student-grid" style={{ marginTop: 18 }}>
              {filteredRows.length === 0 ? (
                <section className="card pz-teacher-panel">
                  <h2>No students match this filter yet.</h2>
                  <p className="muted">Try all classes or publish an assignment to generate support signals.</p>
                </section>
              ) : (
                filteredRows.map((row) => (
                  <article key={`${row.student_id}-${row.class_id}`} className="card pz-teacher-student-card">
                    <header>
                      <div>
                        <h3>{studentName(row.student_email)}</h3>
                        <p className="muted">{row.class_label} · Updated {updatedLabel(row.updated_at)}</p>
                      </div>
                      <span className={`pz-teacher-status ${statusTone(row.engagement_status)}`}>{row.engagement_status}</span>
                    </header>

                    <div className="pz-teacher-mini-metrics">
                      <div><span>Completion</span><strong>{row.completion_percent}%</strong></div>
                      <div><span>Accuracy</span><strong>{row.accuracy_percent}%</strong></div>
                      <div><span>Corrections</span><strong>{row.corrections_submitted}/{row.corrections_needed}</strong></div>
                      <div><span>Streak</span><strong>{row.current_streak}</strong></div>
                    </div>

                    <div className="pz-teacher-progress-pair">
                      <label>Support priority <progress value={supportScore(row)} max={100} /></label>
                      <label>Momentum <progress value={momentumScore(row)} max={100} /></label>
                    </div>

                    <section className="notice">
                      <strong>Suggested teacher action:</strong> {row.teacher_next_action}
                    </section>

                    <footer>
                      <span>Level {row.level}</span>
                      <span>{row.total_xp} XP</span>
                      <span>{row.achievements_unlocked} achievement(s)</span>
                      <span>{row.reviewed_responses}/{row.submitted_responses} reviewed</span>
                    </footer>

                    <p className="muted">{row.caution_note}</p>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

