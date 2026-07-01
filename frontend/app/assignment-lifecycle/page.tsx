'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  AssignmentLifecycleRow,
  AssignmentLifecycleSummary,
  fetchAssignmentLifecycleDashboard,
  fetchAssignmentLifecycleSummary
} from '../../lib/projectZAssignmentLifecycle';

function friendlyDate(value: string | null | undefined) {
  if (!value) return 'No date yet';
  return new Date(value).toLocaleString();
}

function urgencyClass(label: string) {
  if (label === 'Urgent') return 'notice';
  if (label === 'High') return 'notice';
  return 'muted';
}

function stageEmoji(stage: string) {
  if (stage.includes('Fix')) return '🛠️';
  if (stage.includes('audit')) return '🔍';
  if (stage.includes('publish')) return '🚀';
  if (stage.includes('Waiting')) return '⏳';
  if (stage.includes('Review submissions')) return '📝';
  if (stage.includes('memorandum')) return '📘';
  if (stage.includes('corrections')) return '🔁';
  if (stage.includes('complete')) return '✅';
  return '📌';
}

export default function AssignmentLifecyclePage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<AssignmentLifecycleRow[]>([]);
  const [summary, setSummary] = useState<AssignmentLifecycleSummary | null>(null);
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState('Assignment lifecycle dashboard loads for teachers.');
  const [showHelp, setShowHelp] = useState(true);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to view the lifecycle dashboard.' : 'Only teachers can view the assignment lifecycle dashboard.');
      return;
    }

    const [nextRows, nextSummary] = await Promise.all([
      fetchAssignmentLifecycleDashboard(),
      fetchAssignmentLifecycleSummary()
    ]);

    setRows(nextRows);
    setSummary(nextSummary);

    if (nextRows.length === 0) {
      setStatus('No generated assignments yet. Start with Assignment Recommendations.');
    } else {
      setStatus(`Loaded ${nextRows.length} assignment lifecycle item(s).`);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'urgent') return rows.filter((row) => row.urgency_label === 'Urgent' || row.urgency_label === 'High');
    if (filter === 'publish') return rows.filter((row) => row.lifecycle_stage === 'Ready to publish');
    if (filter === 'review') return rows.filter((row) => row.lifecycle_stage === 'Review submissions');
    if (filter === 'memo') return rows.filter((row) => row.lifecycle_stage === 'Release memorandum');
    if (filter === 'corrections') return rows.filter((row) => row.lifecycle_stage === 'Review corrections' || row.lifecycle_stage === 'Corrections need follow-up');
    if (filter === 'complete') return rows.filter((row) => row.lifecycle_stage === 'Lifecycle complete');
    return rows;
  }, [rows, filter]);

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Assignment Lifecycle Dashboard</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
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
            <p className="muted">Sign in as a teacher to see what needs attention.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only dashboard</h2>
            <p className="muted">This dashboard is designed for teachers managing class assignments.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            {showHelp && (
              <section className="card" style={{ marginBottom: 18 }}>
                <h2>How to use this page</h2>
                <p>
                  This page puts the full assignment cycle in one place. Look at the <strong>Next action</strong>,
                  then click the suggested page. Urgent items appear first so you do not have to search.
                </p>
                <button className="btn secondary" onClick={() => setShowHelp(false)}>Hide help</button>
              </section>
            )}

            <section className="grid grid3">
              <div className="card">
                <h2>Total assignments</h2>
                <p className="stat">{summary?.total_assignments || 0}</p>
              </div>

              <div className="card">
                <h2>Urgent / High</h2>
                <p className="stat">{summary?.urgent_count || 0} / {summary?.high_count || 0}</p>
              </div>

              <div className="card">
                <h2>Average completion</h2>
                <p className="stat">{summary?.average_completion_percent ?? 0}%</p>
              </div>
            </section>

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Ready to publish</h2>
                <p className="stat">{summary?.ready_to_publish || 0}</p>
              </div>

              <div className="card">
                <h2>Need review</h2>
                <p className="stat">{summary?.needs_submission_review || 0}</p>
              </div>

              <div className="card">
                <h2>Correction review</h2>
                <p className="stat">{summary?.needs_correction_review || 0}</p>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Filter assignments</h2>
              <div className="navLinks">
                <button className={filter === 'all' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('all')}>All</button>
                <button className={filter === 'urgent' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('urgent')}>Urgent / High</button>
                <button className={filter === 'publish' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('publish')}>Publish</button>
                <button className={filter === 'review' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('review')}>Review</button>
                <button className={filter === 'memo' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('memo')}>Memo</button>
                <button className={filter === 'corrections' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('corrections')}>Corrections</button>
                <button className={filter === 'complete' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('complete')}>Complete</button>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Assignments</h2>
              {filteredRows.length === 0 ? (
                <p className="muted">No assignments match this filter.</p>
              ) : (
                <div className="grid">
                  {filteredRows.map((row) => (
                    <div key={row.assignment_id} className="card">
                      <p className="muted">
                        {row.class_label} | {row.course_code || 'course'} | Updated {friendlyDate(row.updated_at)}
                      </p>
                      <h3>{stageEmoji(row.lifecycle_stage)} {row.assignment_title}</h3>

                      <section className={urgencyClass(row.urgency_label)} style={{ marginBottom: 12 }}>
                        <strong>{row.urgency_label}:</strong> {row.lifecycle_stage}
                      </section>

                      <p>
                        <strong>Next action:</strong> {row.user_friendly_next_action}
                      </p>

                      <progress value={row.completion_percent} max={100} style={{ width: '100%' }} />
                      <p className="muted">Lifecycle completion: {row.completion_percent}%</p>

                      <section className="grid grid3">
                        <div>
                          <strong>Questions</strong><br />
                          {row.actual_question_count}/{row.question_count}
                        </div>
                        <div>
                          <strong>Audit flags</strong><br />
                          {row.unresolved_flag_count}
                        </div>
                        <div>
                          <strong>Students</strong><br />
                          {row.student_count}
                        </div>
                        <div>
                          <strong>Submitted</strong><br />
                          {row.submitted_responses}
                        </div>
                        <div>
                          <strong>Reviewed</strong><br />
                          {row.reviewed_responses}
                        </div>
                        <div>
                          <strong>Memo</strong><br />
                          {row.memorandum_released ? 'Released' : 'Hidden'}
                        </div>
                        <div>
                          <strong>Corrections</strong><br />
                          {row.corrections_submitted}
                        </div>
                        <div>
                          <strong>Corrections reviewed</strong><br />
                          {row.corrections_reviewed}
                        </div>
                        <div>
                          <strong>Accepted</strong><br />
                          {row.corrections_accepted}
                        </div>
                      </section>

                      <p className="muted">
                        Skill: {row.skill_title} | {row.course_skill_code} | Level: {row.assignment_level}
                      </p>

                      <div className="navLinks">
                        <a className="btn blue" href={row.next_page_path}>Open next step</a>
                        <a className="btn secondary" href="/generated-assignments">Generated</a>
                        <a className="btn secondary" href="/assignment-audit">Audit</a>
                        <a className="btn secondary" href="/teacher-submission-review">Review</a>
                        <a className="btn secondary" href="/teacher-corrections-review">Corrections</a>
                      </div>
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
