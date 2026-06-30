'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchQuestionQualityAudit,
  fetchQuestionQualityItems,
  QualityAuditRow,
  QualityItem,
  reviewQuestionQuality,
  shuffleStoredQuestionOptions
} from '../../lib/projectZQuality';

function scoreLabel(score: number) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 65) return 'Needs review';
  return 'High risk';
}

function flagList(flags: Record<string, boolean | string>) {
  return Object.entries(flags)
    .filter(([, value]) => value === true)
    .map(([key]) => key.replaceAll('_', ' '));
}

export default function QualityPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [audit, setAudit] = useState<QualityAuditRow[]>([]);
  const [items, setItems] = useState<QualityItem[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [status, setStatus] = useState('Question quality audit loads for teachers.');
  const [busy, setBusy] = useState(false);

  async function loadPage(nextCourseFilter = courseFilter) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to view the quality engine.' : 'Only teachers can use the quality engine.');
      return;
    }

    const auditRows = await fetchQuestionQualityAudit();
    const itemRows = await fetchQuestionQualityItems(nextCourseFilter || undefined);

    setAudit(auditRows);
    setItems(itemRows);
    setStatus('Question quality audit loaded.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function applyCourseFilter(value: string) {
    setCourseFilter(value);
    setStatus('Loading course quality items...');
    await loadPage(value);
  }

  async function shuffleOptions() {
    setBusy(true);
    setStatus('Shuffling stored answer positions while preserving correct answer mappings...');

    const result = await shuffleStoredQuestionOptions(courseFilter || undefined);

    if (!result.ok) {
      setStatus(`Could not shuffle options: ${result.reason}`);
      setBusy(false);
      return;
    }

    setStatus('Stored answer options shuffled. Reloading audit...');
    await loadPage(courseFilter);
    setBusy(false);
  }

  async function markReview(questionId: string, nextStatus: string) {
    setBusy(true);
    const result = await reviewQuestionQuality(questionId, nextStatus, `Marked ${nextStatus} from quality page.`);

    if (!result.ok) {
      setStatus(`Could not mark question: ${result.reason}`);
      setBusy(false);
      return;
    }

    setStatus(`Question marked ${nextStatus}.`);
    await loadPage(courseFilter);
    setBusy(false);
  }

  const courseOptions = useMemo(
    () => audit.map((row) => row.course_code),
    [audit]
  );

  const highRiskItems = useMemo(
    () => items.filter((item) => item.quality_score < 85).slice(0, 30),
    [items]
  );

  const distributionWarning = useMemo(
    () => audit.some((row) => row.correct_a === row.total_questions || row.correct_b === row.total_questions || row.correct_c === row.total_questions || row.correct_d === row.total_questions),
    [audit]
  );

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Question Quality Engine</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/reports">Reports</a>
            <a className="btn secondary" href="/generate">Generate</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a teacher to use the question quality engine.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only quality engine</h2>
            <p className="muted">Students and parents cannot access question quality controls.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="grid grid3">
              <div className="card">
                <h2>Audit summary</h2>
                <p>
                  Courses audited: <strong>{audit.length}</strong><br />
                  Questions visible: <strong>{items.length}</strong><br />
                  Needs review: <strong>{items.filter((item) => item.quality_score < 85).length}</strong>
                </p>
              </div>

              <div className="card">
                <h2>Answer distribution</h2>
                <p className="muted">
                  The correct answer should not always be A. This page checks A/B/C/D spread and lets you reshuffle stored options.
                </p>
                {distributionWarning && <p className="notice">Warning: at least one course has all correct answers in the same position.</p>}
              </div>

              <div className="card">
                <h2>Accuracy rule</h2>
                <p className="muted">
                  Quality beats quantity. Every option should be plausible, similar in style, and linked to a real misconception.
                </p>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Controls</h2>
              <div className="grid grid3">
                <label className="label">
                  Course filter
                  <select className="select" value={courseFilter} onChange={(event) => applyCourseFilter(event.target.value)}>
                    <option value="">All courses</option>
                    {courseOptions.map((course) => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </label>

                <div>
                  <p className="muted">Shuffle stored answer positions for the selected course or all courses.</p>
                  <button className="btn blue" disabled={busy} onClick={shuffleOptions}>
                    Shuffle stored answer positions
                  </button>
                </div>

                <div>
                  <p className="muted">This does not change which answer is correct. It only changes where it appears.</p>
                </div>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Course audit</h2>
              {audit.length === 0 ? (
                <p className="muted">No audit rows yet. Run the Phase 16 SQL first.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Questions</th>
                      <th>A/B/C/D correct</th>
                      <th>Avg score</th>
                      <th>Needs review</th>
                      <th>Duplicates</th>
                      <th>Length outliers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((row) => (
                      <tr key={row.course_code}>
                        <td><strong>{row.course_code}</strong></td>
                        <td>{row.total_questions}</td>
                        <td>{row.correct_a}/{row.correct_b}/{row.correct_c}/{row.correct_d}</td>
                        <td>{row.average_quality_score}%</td>
                        <td>{row.needs_review_count}</td>
                        <td>{row.duplicate_option_count}</td>
                        <td>{row.length_outlier_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Highest-risk questions</h2>
              <p className="muted">
                These questions need teacher review first. For MYP Criteria B/C/D, options must show realistic reasoning differences, not obvious wrong answers.
              </p>

              {highRiskItems.length === 0 ? (
                <p className="muted">No high-risk questions found.</p>
              ) : (
                <div className="grid">
                  {highRiskItems.map((item) => (
                    <div key={item.question_id} className="card">
                      <h3>{item.course_code} - {item.assessment_criterion ? `Criterion ${item.assessment_criterion}` : 'Skill question'}</h3>
                      <p className="muted">
                        {item.course_skill_code} - {item.question_type} - difficulty {item.difficulty_band}
                      </p>
                      <p><strong>Prompt:</strong> {item.prompt}</p>
                      <ol type="A">
                        <li>{item.option_a}</li>
                        <li>{item.option_b}</li>
                        <li>{item.option_c}</li>
                        <li>{item.option_d}</li>
                      </ol>
                      <p>
                        Correct option: <strong>{item.correct_option}</strong><br />
                        Quality score: <strong>{item.quality_score}%</strong> ({scoreLabel(item.quality_score)})<br />
                        Review status: <strong>{item.review_status}</strong>
                      </p>
                      <p className="muted">
                        Flags: {flagList(item.flags).length ? flagList(item.flags).join(', ') : 'No major flags'}
                      </p>
                      <div className="navLinks">
                        <button className="btn secondary" disabled={busy} onClick={() => markReview(item.question_id, 'approved')}>Approve</button>
                        <button className="btn secondary" disabled={busy} onClick={() => markReview(item.question_id, 'revise')}>Needs revision</button>
                        <button className="btn secondary" disabled={busy} onClick={() => markReview(item.question_id, 'rejected')}>Reject</button>
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
