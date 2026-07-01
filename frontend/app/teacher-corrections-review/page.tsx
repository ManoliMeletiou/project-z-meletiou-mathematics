'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchTeacherCorrectionsForReview,
  reviewStudentCorrection,
  TeacherCorrectionRow
} from '../../lib/projectZCorrectionsRetry';

export default function TeacherCorrectionsReviewPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<TeacherCorrectionRow[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Teacher correction review loads for submitted corrections.');
  const [busy, setBusy] = useState(false);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to review corrections.' : 'Only teachers can review corrections.');
      return;
    }

    const nextRows = await fetchTeacherCorrectionsForReview();
    setRows(nextRows);

    const nextFeedback: Record<string, string> = {};
    const nextScores: Record<string, string> = {};

    nextRows.forEach((row) => {
      if (row.teacher_feedback) nextFeedback[row.correction_id] = row.teacher_feedback;
      if (row.teacher_score !== null && row.teacher_score !== undefined) nextScores[row.correction_id] = String(row.teacher_score);
    });

    setFeedback(nextFeedback);
    setScores(nextScores);
    setStatus(`Loaded ${nextRows.length} correction(s).`);
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function saveReview(row: TeacherCorrectionRow, reviewStatus: 'reviewed' | 'accepted' | 'needs_more_work') {
    setBusy(true);
    setStatus(`Saving correction review for ${row.student_email}, Q${row.question_number}...`);

    const result = await reviewStudentCorrection({
      correction_id: row.correction_id,
      status: reviewStatus,
      teacher_feedback: feedback[row.correction_id] || null,
      teacher_score: scores[row.correction_id] ? Number(scores[row.correction_id]) : null
    });

    if (!result.ok) {
      setStatus(`Could not save review: ${result.reason}`);
      setBusy(false);
      return;
    }

    await loadPage();
    setStatus(reviewStatus === 'accepted' ? 'Correction accepted and mastery signal updated.' : 'Correction review saved.');
    setBusy(false);
  }

  const submittedCount = rows.filter((row) => row.correction_status === 'submitted').length;
  const acceptedCount = rows.filter((row) => row.correction_status === 'accepted').length;
  const needsMoreWorkCount = rows.filter((row) => row.correction_status === 'needs_more_work').length;

  return (
    <main className="page pz-theme pz-teacher-theme">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Teacher Corrections Review</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/assignment-lifecycle">Lifecycle</a>
            <a className="btn secondary" href="/teacher-engagement-insights">Engagement</a>
            <a className="btn secondary" href="/teacher-submission-review">Submission Review</a>
            <a className="btn secondary" href="/generated-assignments">Generated Assignments</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a teacher to review corrections.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only tool</h2>
            <p className="muted">Correction review is for teachers.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="grid grid3">
              <div className="card">
                <h2>Submitted</h2>
                <p className="stat">{submittedCount}</p>
              </div>

              <div className="card">
                <h2>Accepted</h2>
                <p className="stat">{acceptedCount}</p>
              </div>

              <div className="card">
                <h2>Needs more work</h2>
                <p className="stat">{needsMoreWorkCount}</p>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Correction queue</h2>
              {rows.length === 0 ? (
                <p className="muted">No submitted corrections yet.</p>
              ) : (
                <div className="grid">
                  {rows.map((row) => (
                    <div key={row.correction_id} className="card">
                      <p className="muted">
                        {row.assignment_title} | {row.class_label} | {row.student_email} | Q{row.question_number}
                      </p>
                      <h3>{row.prompt}</h3>

                      <p>
                        <strong>Original answer:</strong> {row.student_selected_option || row.student_answer_text || '-'}<br />
                        <strong>Correct answer:</strong> {row.correct_answer} {row.correct_option ? `(${row.correct_option})` : ''}<br />
                        <strong>Original auto result:</strong> {row.original_is_correct === true ? 'correct' : row.original_is_correct === false ? 'incorrect' : 'not marked'}
                      </p>

                      {row.original_teacher_feedback && (
                        <section className="notice" style={{ marginTop: 12 }}>
                          <strong>Original feedback:</strong> {row.original_teacher_feedback}
                        </section>
                      )}

                      <section className="card">
                        <h4>Student correction</h4>
                        <p>{row.correction_text}</p>
                        {row.reflection_text && (
                          <p><strong>Reflection:</strong> {row.reflection_text}</p>
                        )}
                        <p className="muted">
                          Confidence after correction: {row.confidence_after_correction || '-'} | Status: {row.correction_status}
                        </p>
                      </section>

                      <label className="label">
                        Teacher score
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="100"
                          value={scores[row.correction_id] || ''}
                          onChange={(event) => setScores((current) => ({ ...current, [row.correction_id]: event.target.value }))}
                          placeholder="Optional score"
                        />
                      </label>

                      <label className="label">
                        Feedback on correction
                        <textarea
                          className="textarea"
                          rows={3}
                          value={feedback[row.correction_id] || ''}
                          onChange={(event) => setFeedback((current) => ({ ...current, [row.correction_id]: event.target.value }))}
                          placeholder="Tell the student what improved and what still needs work..."
                        />
                      </label>

                      <div className="navLinks">
                        <button className="btn blue" disabled={busy} onClick={() => saveReview(row, 'accepted')}>
                          Accept correction
                        </button>
                        <button className="btn secondary" disabled={busy} onClick={() => saveReview(row, 'reviewed')}>
                          Mark reviewed
                        </button>
                        <button className="btn secondary" disabled={busy} onClick={() => saveReview(row, 'needs_more_work')}>
                          Needs more work
                        </button>
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
