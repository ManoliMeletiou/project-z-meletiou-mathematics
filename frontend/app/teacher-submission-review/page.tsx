'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchReviewAssignments,
  fetchTeacherMemorandum,
  fetchTeacherSubmissions,
  releaseMemorandum,
  reviewGeneratedResponse,
  MemorandumRow,
  ReviewAssignment,
  TeacherSubmissionRow
} from '../../lib/projectZReviewFeedbackMemorandum';

function optionDisplay(options: Record<string, string> | null) {
  if (!options) return null;
  return (
    <ul>
      <li>A. {options.A}</li>
      <li>B. {options.B}</li>
      <li>C. {options.C}</li>
      <li>D. {options.D}</li>
    </ul>
  );
}

export default function TeacherSubmissionReviewPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [submissions, setSubmissions] = useState<TeacherSubmissionRow[]>([]);
  const [memorandum, setMemorandum] = useState<MemorandumRow[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const [correctMap, setCorrectMap] = useState<Record<string, string>>({});
  const [memoNotes, setMemoNotes] = useState('');
  const [status, setStatus] = useState('Teacher submission review loads for teachers.');
  const [busy, setBusy] = useState(false);

  async function loadPage(assignmentId = selectedAssignmentId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to review submissions.' : 'Only teachers can review submissions.');
      return;
    }

    const nextAssignments = await fetchReviewAssignments();
    setAssignments(nextAssignments);

    if (nextAssignments.length === 0) {
      setStatus('No generated assignments available for review yet.');
      return;
    }

    const nextId = assignmentId || nextAssignments[0].assignment_id;
    setSelectedAssignmentId(nextId);
    await loadAssignment(nextId);
  }

  async function loadAssignment(assignmentId: string) {
    if (!assignmentId) return;

    setStatus('Loading submissions and memorandum...');
    const nextSubmissions = await fetchTeacherSubmissions(assignmentId);
    const nextMemo = await fetchTeacherMemorandum(assignmentId);

    setSubmissions(nextSubmissions);
    setMemorandum(nextMemo);

    const nextFeedback: Record<string, string> = {};
    const nextScores: Record<string, string> = {};
    const nextCorrect: Record<string, string> = {};

    nextSubmissions.forEach((row) => {
      if (row.teacher_feedback) nextFeedback[row.response_id] = row.teacher_feedback;
      if (row.teacher_score !== null && row.teacher_score !== undefined) nextScores[row.response_id] = String(row.teacher_score);
      if (row.auto_is_correct === true) nextCorrect[row.response_id] = 'true';
      if (row.auto_is_correct === false) nextCorrect[row.response_id] = 'false';
    });

    setFeedback(nextFeedback);
    setScores(nextScores);
    setCorrectMap(nextCorrect);
    setStatus(`Loaded ${nextSubmissions.length} submitted response rows.`);
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    await loadAssignment(assignmentId);
  }

  async function saveReview(row: TeacherSubmissionRow, reviewStatus: 'reviewed' | 'needs_revision') {
    setBusy(true);
    setStatus(`Saving review for ${row.student_email}, question ${row.question_number}...`);

    const selectedCorrect = correctMap[row.response_id];
    const scoreText = scores[row.response_id];

    const result = await reviewGeneratedResponse({
      response_id: row.response_id,
      teacher_score: scoreText ? Number(scoreText) : null,
      is_correct: selectedCorrect === 'true' ? true : selectedCorrect === 'false' ? false : null,
      feedback: feedback[row.response_id] || null,
      review_status: reviewStatus
    });

    if (!result.ok) {
      setStatus(`Could not save review: ${result.reason}`);
      setBusy(false);
      return;
    }

    await loadAssignment(selectedAssignmentId);
    setStatus('Review saved and mastery signal updated where appropriate.');
    setBusy(false);
  }

  async function releaseMemo() {
    if (!selectedAssignmentId) return;

    setBusy(true);
    setStatus('Releasing memorandum to students...');

    const result = await releaseMemorandum(selectedAssignmentId, memoNotes);

    if (!result.ok) {
      setStatus(`Could not release memorandum: ${result.reason}`);
      setBusy(false);
      return;
    }

    await loadPage(selectedAssignmentId);
    setStatus('Memorandum released to students.');
    setBusy(false);
  }

  const selectedAssignment = assignments.find((assignment) => assignment.assignment_id === selectedAssignmentId);

  const groupedByStudent = useMemo(() => {
    const map = new Map<string, TeacherSubmissionRow[]>();
    submissions.forEach((row) => {
      const existing = map.get(row.student_email) || [];
      existing.push(row);
      map.set(row.student_email, existing);
    });
    return Array.from(map.entries());
  }, [submissions]);

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Teacher Submission Review</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/assignment-lifecycle">Lifecycle</a>
            <a className="btn secondary" href="/generated-assignments">Generated Assignments</a>
            <a className="btn secondary" href="/assignment-audit">Quality Audit</a>
            <a className="btn secondary" href="/teacher-corrections-review">Corrections Review</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a teacher to review submissions.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only tool</h2>
            <p className="muted">Submission review and memorandum release are for teachers.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="card">
              <h2>Select assignment</h2>
              {assignments.length === 0 ? (
                <p className="muted">No assignments found.</p>
              ) : (
                <label className="label">
                  Assignment
                  <select className="select" value={selectedAssignmentId} onChange={(event) => changeAssignment(event.target.value)}>
                    {assignments.map((assignment) => (
                      <option key={assignment.assignment_id} value={assignment.assignment_id}>
                        {assignment.assignment_title} - submitted {assignment.submitted_responses} - memo {assignment.memorandum_released ? 'released' : 'hidden'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            {selectedAssignment && (
              <>
                <section className="grid grid3" style={{ marginTop: 18 }}>
                  <div className="card">
                    <h2>Submitted</h2>
                    <p className="stat">{selectedAssignment.submitted_responses}</p>
                    <p className="muted">Students: {selectedAssignment.student_count}</p>
                  </div>

                  <div className="card">
                    <h2>Reviewed</h2>
                    <p className="stat">{selectedAssignment.reviewed_responses}</p>
                    <p className="muted">Needs revision: {selectedAssignment.needs_revision_responses}</p>
                  </div>

                  <div className="card">
                    <h2>Memorandum</h2>
                    <p className="stat">{selectedAssignment.memorandum_released ? 'Released' : 'Hidden'}</p>
                    <p className="muted">Teacher controls when students see answers.</p>
                  </div>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Release memorandum to students</h2>
                  <p className="muted">
                    This sends/shows the memorandum to students in the class. It includes correct answers and explanations.
                  </p>
                  <label className="label">
                    Memorandum notes
                    <textarea
                      className="textarea"
                      rows={3}
                      value={memoNotes}
                      onChange={(event) => setMemoNotes(event.target.value)}
                      placeholder="Example: Please review the corrections before next lesson."
                    />
                  </label>
                  <button className="btn blue" disabled={busy || selectedAssignment.memorandum_released || memorandum.length === 0} onClick={releaseMemo}>
                    {selectedAssignment.memorandum_released ? 'Memorandum already released' : 'Release memorandum to students'}
                  </button>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Memorandum preview</h2>
                  {memorandum.length === 0 ? (
                    <p className="muted">No memorandum questions loaded yet.</p>
                  ) : (
                    <div className="grid">
                      {memorandum.slice(0, 5).map((row) => (
                        <div key={row.question_id} className="card">
                          <p className="muted">Q{row.question_number} | Criterion {row.criterion} | {row.difficulty_band}</p>
                          <h3>{row.prompt}</h3>
                          {optionDisplay(row.options)}
                          <p><strong>Answer:</strong> {row.correct_answer} {row.correct_option ? `(${row.correct_option})` : ''}</p>
                          <p><strong>Explanation:</strong> {row.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Student submissions</h2>
                  {groupedByStudent.length === 0 ? (
                    <p className="muted">No submitted responses yet.</p>
                  ) : (
                    <div className="grid">
                      {groupedByStudent.map(([studentEmail, rows]) => (
                        <section key={studentEmail} className="card">
                          <h3>{studentEmail}</h3>
                          <p className="muted">{rows.length} response rows</p>

                          <div className="grid">
                            {rows.map((row) => (
                              <div key={row.response_id} className="card">
                                <p className="muted">
                                  Q{row.question_number} | Criterion {row.criterion} | {row.difficulty_band} | {row.question_type}
                                </p>
                                <h4>{row.prompt}</h4>
                                {optionDisplay(row.options)}
                                <p>
                                  <strong>Student answer:</strong> {row.student_selected_option || row.student_answer_text || '-'}<br />
                                  <strong>Correct answer:</strong> {row.correct_answer} {row.correct_option ? `(${row.correct_option})` : ''}<br />
                                  <strong>Auto result:</strong> {row.auto_is_correct === true ? 'correct' : row.auto_is_correct === false ? 'incorrect / check' : 'not auto-marked'}
                                </p>

                                <label className="label">
                                  Correct?
                                  <select
                                    className="select"
                                    value={correctMap[row.response_id] || ''}
                                    onChange={(event) => setCorrectMap((current) => ({ ...current, [row.response_id]: event.target.value }))}
                                  >
                                    <option value="">Keep auto result</option>
                                    <option value="true">Correct</option>
                                    <option value="false">Incorrect / needs correction</option>
                                  </select>
                                </label>

                                <label className="label">
                                  Teacher score
                                  <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={scores[row.response_id] || ''}
                                    onChange={(event) => setScores((current) => ({ ...current, [row.response_id]: event.target.value }))}
                                    placeholder="Optional score"
                                  />
                                </label>

                                <label className="label">
                                  Feedback
                                  <textarea
                                    className="textarea"
                                    rows={3}
                                    value={feedback[row.response_id] || ''}
                                    onChange={(event) => setFeedback((current) => ({ ...current, [row.response_id]: event.target.value }))}
                                    placeholder="Feedback for student..."
                                  />
                                </label>

                                <div className="navLinks">
                                  <button className="btn blue" disabled={busy} onClick={() => saveReview(row, 'reviewed')}>
                                    Save review
                                  </button>
                                  <button className="btn secondary" disabled={busy} onClick={() => saveReview(row, 'needs_revision')}>
                                    Needs revision
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
