'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  AssignmentLifecycleRow,
  AssignmentLifecycleSummary,
  fetchAssignmentLifecycleDashboard,
  fetchAssignmentLifecycleSummary
} from '../../lib/projectZAssignmentLifecycle';

function clampPercent(value: number | null | undefined) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function friendlyDate(value: string | null | undefined) {
  if (!value) return 'No date yet';
  return new Date(value).toLocaleString();
}

function stageIcon(stage: string) {
  if (stage.includes('Fix')) return '🛠️';
  if (stage.toLowerCase().includes('audit')) return '🔍';
  if (stage.includes('publish')) return '🚀';
  if (stage.includes('Waiting')) return '⏳';
  if (stage.includes('Review submissions')) return '📝';
  if (stage.includes('memorandum')) return '📘';
  if (stage.includes('corrections')) return '🔁';
  if (stage.includes('complete')) return '✅';
  return '📌';
}

function urgencyBadgeClass(label: string) {
  if (label === 'Urgent') return 'pz-lifecycle-badge pz-lifecycle-badge-urgent';
  if (label === 'High') return 'pz-lifecycle-badge pz-lifecycle-badge-high';
  if (label === 'Normal') return 'pz-lifecycle-badge pz-lifecycle-badge-normal';
  return 'pz-lifecycle-badge';
}

function actionTone(row: AssignmentLifecycleRow) {
  if (row.unresolved_flag_count > 0) return 'Quality check required before students see this assignment.';
  if (!row.memorandum_released && row.submitted_responses > 0) return 'Keep the memo hidden until teacher review is ready.';
  if (row.corrections_needing_more_work > 0) return 'Correction feedback loop is still active.';
  if (row.lifecycle_stage === 'Lifecycle complete') return 'This assignment cycle is complete.';
  return 'Open the next step and keep the assignment moving.';
}

function filterLabel(filter: string) {
  if (filter === 'urgent') return 'Urgent / high attention';
  if (filter === 'audit') return 'Audit flags';
  if (filter === 'publish') return 'Ready to publish';
  if (filter === 'review') return 'Submissions to review';
  if (filter === 'memo') return 'Memorandum release';
  if (filter === 'corrections') return 'Corrections loop';
  if (filter === 'complete') return 'Complete cycles';
  return 'All assignments';
}

function progressWidth(value: number | null | undefined) {
  return `${clampPercent(value)}%`;
}

export default function AssignmentLifecyclePage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<AssignmentLifecycleRow[]>([]);
  const [summary, setSummary] = useState<AssignmentLifecycleSummary | null>(null);
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState('Assignment lifecycle command centre loads for teachers.');
  const [showBoundary, setShowBoundary] = useState(true);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to view the lifecycle command centre.' : 'Only teachers can view the assignment lifecycle command centre.');
      return;
    }

    const [nextRows, nextSummary] = await Promise.all([
      fetchAssignmentLifecycleDashboard(),
      fetchAssignmentLifecycleSummary()
    ]);

    setRows(nextRows);
    setSummary(nextSummary);

    setStatus(nextRows.length === 0
      ? 'No generated assignments yet. Start with Assignment Recommendations.'
      : `Loaded ${nextRows.length} assignment lifecycle item(s).`);
  }

  useEffect(() => {
    loadPage();
  }, []);

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'urgent') return rows.filter((row) => row.urgency_label === 'Urgent' || row.urgency_label === 'High');
    if (filter === 'audit') return rows.filter((row) => row.unresolved_flag_count > 0 || row.lifecycle_stage.toLowerCase().includes('audit'));
    if (filter === 'publish') return rows.filter((row) => row.lifecycle_stage === 'Ready to publish');
    if (filter === 'review') return rows.filter((row) => row.lifecycle_stage === 'Review submissions');
    if (filter === 'memo') return rows.filter((row) => row.lifecycle_stage === 'Release memorandum');
    if (filter === 'corrections') return rows.filter((row) => row.lifecycle_stage === 'Review corrections' || row.lifecycle_stage === 'Corrections need follow-up');
    if (filter === 'complete') return rows.filter((row) => row.lifecycle_stage === 'Lifecycle complete');
    return rows;
  }, [rows, filter]);

  const priorityRows = useMemo(() => {
    return [...rows]
      .sort((a, b) => {
        const order: Record<string, number> = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
        return (order[a.urgency_label] ?? 4) - (order[b.urgency_label] ?? 4);
      })
      .slice(0, 4);
  }, [rows]);

  const workflowSteps = useMemo(() => {
    return [
      { key: 'generated', label: 'Generated', detail: 'AI-created drafts', count: rows.filter((row) => row.actual_question_count > 0).length, path: '/generated-assignments' },
      { key: 'audit', label: 'Audit', detail: 'Quality flags', count: rows.filter((row) => row.unresolved_flag_count > 0).length, path: '/assignment-audit' },
      { key: 'publish', label: 'Publish', detail: 'Ready for class', count: summary?.ready_to_publish || 0, path: '/generated-assignments' },
      { key: 'work', label: 'Student work', detail: 'Responses submitted', count: rows.filter((row) => row.submitted_responses > 0).length, path: '/teacher-submission-review' },
      { key: 'review', label: 'Review', detail: 'Teacher marking', count: summary?.needs_submission_review || 0, path: '/teacher-submission-review' },
      { key: 'memo', label: 'Memo', detail: 'Feedback release', count: rows.filter((row) => row.lifecycle_stage === 'Release memorandum').length, path: '/teacher-submission-review' },
      { key: 'corrections', label: 'Corrections', detail: 'Second learning loop', count: summary?.needs_correction_review || 0, path: '/teacher-corrections-review' },
      { key: 'complete', label: 'Complete', detail: 'Cycle finished', count: summary?.complete_count || 0, path: '/assignment-lifecycle' }
    ];
  }, [rows, summary]);

  return (
    <main className="page pz-theme pz-teacher-theme">
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Assignment Lifecycle Command Centre</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/role-navigation">Navigation</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/teacher-engagement-insights">Engagement</a>
            <a className="btn secondary" href="/assignment-recommendations">Recommendations</a>
            <a className="btn secondary" href="/generated-assignments">Generated</a>
            <a className="btn secondary" href="/assignment-audit">Audit</a>
            <a className="btn secondary" href="/teacher-submission-review">Submissions</a>
            <a className="btn secondary" href="/teacher-corrections-review">Corrections</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a teacher to manage the assignment lifecycle.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only command centre</h2>
            <p className="muted">This workflow page is designed for teachers managing class assignments.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="pz-lifecycle-hero">
              <div className="pz-role-badge">🧭 Teacher workflow operating system</div>
              <h1>Move every assignment from idea to evidence.</h1>
              <p className="muted">
                Track the full journey: recommendation, generation, audit, publication, student work, teacher review,
                memorandum release, correction cycles, and completion. This is workflow intelligence, not decoration.
              </p>

              <div className="pz-lifecycle-hero-actions">
                <a className="btn blue" href="/assignment-recommendations">Create from recommendations</a>
                <a className="btn secondary" href="/generated-assignments">Open generated assignments</a>
                <a className="btn secondary" href="/assignment-audit">Quality audit</a>
              </div>
            </section>

            {showBoundary && (
              <section className="notice pz-lifecycle-boundary" style={{ marginTop: 18 }}>
                <div>
                  <strong>Assessment boundary preserved:</strong> AI can generate and organise the workflow, but teacher judgement,
                  verification, feedback, and IB criteria decisions remain protected.
                </div>
                <button className="btn secondary" onClick={() => setShowBoundary(false)}>Hide</button>
              </section>
            )}

            <section className="pz-lifecycle-kpi-grid" style={{ marginTop: 18 }}>
              <div className="card pz-lifecycle-kpi">
                <span>Total assignments</span>
                <strong>{summary?.total_assignments || 0}</strong>
                <small className="muted">All active generated assignment cycles</small>
              </div>
              <div className="card pz-lifecycle-kpi danger">
                <span>Urgent / High</span>
                <strong>{summary?.urgent_count || 0} / {summary?.high_count || 0}</strong>
                <small className="muted">Needs immediate teacher attention</small>
              </div>
              <div className="card pz-lifecycle-kpi">
                <span>Ready to publish</span>
                <strong>{summary?.ready_to_publish || 0}</strong>
                <small className="muted">Verified enough to move forward</small>
              </div>
              <div className="card pz-lifecycle-kpi">
                <span>Submission review</span>
                <strong>{summary?.needs_submission_review || 0}</strong>
                <small className="muted">Student evidence waiting</small>
              </div>
              <div className="card pz-lifecycle-kpi">
                <span>Correction review</span>
                <strong>{summary?.needs_correction_review || 0}</strong>
                <small className="muted">Feedback loop still open</small>
              </div>
              <div className="card pz-lifecycle-kpi success">
                <span>Average completion</span>
                <strong>{summary?.average_completion_percent ?? 0}%</strong>
                <small className="muted">Lifecycle progress across assignments</small>
              </div>
            </section>

            <section className="card pz-lifecycle-runway" style={{ marginTop: 18 }}>
              <div className="pz-lifecycle-section-heading">
                <div>
                  <h2>Lifecycle runway</h2>
                  <p className="muted">A quick visual map of where teacher attention is needed.</p>
                </div>
                <a className="btn secondary" href="/teacher-engagement-insights">View engagement signals</a>
              </div>
              <div className="pz-lifecycle-steps">
                {workflowSteps.map((step) => (
                  <a key={step.key} className={`pz-lifecycle-step ${step.count > 0 ? 'active' : ''}`} href={step.path}>
                    <strong>{step.count}</strong>
                    <span>{step.label}</span>
                    <small>{step.detail}</small>
                  </a>
                ))}
              </div>
            </section>

            <section className="grid grid2" style={{ marginTop: 18 }}>
              <div className="card">
                <div className="pz-lifecycle-section-heading">
                  <div>
                    <h2>Priority queue</h2>
                    <p className="muted">The most important assignment cycles appear first.</p>
                  </div>
                  <button className="btn secondary" onClick={() => setFilter('urgent')}>Show urgent</button>
                </div>
                {priorityRows.length === 0 ? (
                  <p className="muted">No assignment priorities yet.</p>
                ) : (
                  <div className="grid">
                    {priorityRows.map((row) => (
                      <a key={row.assignment_id} className="pz-lifecycle-priority-card" href={row.next_page_path}>
                        <div>
                          <span className={urgencyBadgeClass(row.urgency_label)}>{row.urgency_label}</span>
                          <h3>{stageIcon(row.lifecycle_stage)} {row.assignment_title}</h3>
                          <p className="muted">{row.class_label} - {row.lifecycle_stage}</p>
                        </div>
                        <strong>{clampPercent(row.completion_percent)}%</strong>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h2>Teacher workflow links</h2>
                <p className="muted">Use the right tool for the current stage instead of searching through pages.</p>
                <div className="pz-lifecycle-link-grid">
                  <a className="btn blue" href="/assignment-recommendations">Recommendations</a>
                  <a className="btn secondary" href="/generated-assignments">Generated assignments</a>
                  <a className="btn secondary" href="/assignment-audit">Audit questions</a>
                  <a className="btn secondary" href="/teacher-submission-review">Review submissions</a>
                  <a className="btn secondary" href="/teacher-corrections-review">Review corrections</a>
                  <a className="btn secondary" href="/export-reports">Export reports</a>
                </div>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <div className="pz-lifecycle-section-heading">
                <div>
                  <h2>{filterLabel(filter)}</h2>
                  <p className="muted">Filter by the next teacher decision point.</p>
                </div>
              </div>
              <div className="navLinks">
                <button className={filter === 'all' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('all')}>All</button>
                <button className={filter === 'urgent' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('urgent')}>Urgent / High</button>
                <button className={filter === 'audit' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('audit')}>Audit</button>
                <button className={filter === 'publish' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('publish')}>Publish</button>
                <button className={filter === 'review' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('review')}>Review</button>
                <button className={filter === 'memo' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('memo')}>Memo</button>
                <button className={filter === 'corrections' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('corrections')}>Corrections</button>
                <button className={filter === 'complete' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('complete')}>Complete</button>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Assignment command list</h2>
              {filteredRows.length === 0 ? (
                <p className="muted">No assignments match this filter.</p>
              ) : (
                <div className="grid">
                  {filteredRows.map((row) => (
                    <article key={row.assignment_id} className="card pz-lifecycle-assignment-card">
                      <div className="pz-lifecycle-assignment-head">
                        <div>
                          <span className={urgencyBadgeClass(row.urgency_label)}>{row.urgency_label}</span>
                          <h3>{stageIcon(row.lifecycle_stage)} {row.assignment_title}</h3>
                          <p className="muted">{row.class_label} | {row.course_code || 'course'} | Updated {friendlyDate(row.updated_at)}</p>
                        </div>
                        <a className="btn blue" href={row.next_page_path}>Open next step</a>
                      </div>

                      <section className="notice" style={{ marginTop: 12 }}>
                        <strong>Next action:</strong> {row.user_friendly_next_action}<br />
                        <span className="muted">{actionTone(row)}</span>
                      </section>

                      <div className="pz-lifecycle-progress-shell">
                        <div className="pz-lifecycle-progress-top">
                          <strong>Lifecycle progress</strong>
                          <span>{clampPercent(row.completion_percent)}%</span>
                        </div>
                        <div className="pz-lifecycle-progress-track">
                          <span style={{ width: progressWidth(row.completion_percent) }} />
                        </div>
                      </div>

                      <section className="pz-lifecycle-signal-grid">
                        <div><strong>Questions</strong><span>{row.actual_question_count}/{row.question_count}</span></div>
                        <div><strong>Audit flags</strong><span>{row.unresolved_flag_count}</span></div>
                        <div><strong>Students</strong><span>{row.student_count}</span></div>
                        <div><strong>Submitted</strong><span>{row.submitted_responses}</span></div>
                        <div><strong>Reviewed</strong><span>{row.reviewed_responses}</span></div>
                        <div><strong>Memo</strong><span>{row.memorandum_released ? 'Released' : 'Hidden'}</span></div>
                        <div><strong>Corrections</strong><span>{row.corrections_submitted}</span></div>
                        <div><strong>Corrections reviewed</strong><span>{row.corrections_reviewed}</span></div>
                        <div><strong>Accepted</strong><span>{row.corrections_accepted}</span></div>
                      </section>

                      <p className="muted">
                        Skill: {row.skill_title} | {row.course_skill_code} | Level: {row.assignment_level}
                      </p>

                      <div className="pz-floating-action-bar">
                        <a className="btn secondary" href="/generated-assignments">Generated</a>
                        <a className="btn secondary" href="/assignment-audit">Audit</a>
                        <a className="btn secondary" href="/teacher-submission-review">Submissions</a>
                        <a className="btn secondary" href="/teacher-corrections-review">Corrections</a>
                      </div>
                    </article>
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

