'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchStudentGeneratedAssignments,
  StudentGeneratedAssignment
} from '../../lib/projectZPublishGeneratedAssignments';
import {
  fetchStudentMemorandum,
  MemorandumRow
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

export default function StudentMemorandumPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<StudentGeneratedAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [memoRows, setMemoRows] = useState<MemorandumRow[]>([]);
  const [status, setStatus] = useState('Memorandums appear after your teacher releases them.');

  async function loadPage(assignmentId = selectedAssignmentId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to view memorandums.' : 'This page is for students.');
      return;
    }

    const nextAssignments = await fetchStudentGeneratedAssignments();
    setAssignments(nextAssignments);

    if (nextAssignments.length === 0) {
      setStatus('No assignments found yet.');
      return;
    }

    const nextId = assignmentId || nextAssignments[0].assignment_id;
    setSelectedAssignmentId(nextId);
    await loadMemo(nextId);
  }

  async function loadMemo(assignmentId: string) {
    if (!assignmentId) return;

    setStatus('Loading memorandum...');
    const rows = await fetchStudentMemorandum(assignmentId);
    setMemoRows(rows);

    if (rows.length === 0) {
      setStatus('The memorandum is not released yet, or this assignment is not available to you.');
    } else {
      setStatus(`Memorandum loaded with ${rows.length} questions.`);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    await loadMemo(assignmentId);
  }

  const first = memoRows[0];

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Assignment Memorandum</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/student">Student Portal</a>
            <a className="btn secondary" href="/student-generated-assignments">Generated Assignments</a>
            <a className="btn secondary" href="/tutor">Tutor</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to view memorandums.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card">
            <h2>Student-only page</h2>
            <p className="muted">Memorandums are shown to students after release.</p>
          </section>
        )}

        {role === 'student' && (
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
                        {assignment.assignment_title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            {first && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>{first.assignment_title}</h2>
                <p className="muted">
                  Released: {first.memorandum_released_at ? new Date(first.memorandum_released_at).toLocaleString() : '-'}
                </p>
                {first.memorandum_notes && <p>{first.memorandum_notes}</p>}
              </section>
            )}

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Memorandum</h2>
              {memoRows.length === 0 ? (
                <p className="muted">The memorandum is not released yet.</p>
              ) : (
                <div className="grid">
                  {memoRows.map((row) => (
                    <div key={row.question_id} className="card">
                      <p className="muted">
                        Q{row.question_number} | Criterion {row.criterion} | {row.difficulty_band}
                      </p>
                      <h3>{row.prompt}</h3>
                      {optionDisplay(row.options)}
                      <p>
                        <strong>Your answer:</strong> {row.student_selected_option || row.student_answer_text || '-'}<br />
                        <strong>Correct answer:</strong> {row.correct_answer} {row.correct_option ? `(${row.correct_option})` : ''}<br />
                        <strong>Result:</strong> {row.student_is_correct === true ? 'correct' : row.student_is_correct === false ? 'check correction' : 'not marked'}
                      </p>
                      <p><strong>Explanation:</strong> {row.explanation}</p>
                      {row.teacher_feedback && (
                        <section className="notice" style={{ marginTop: 12 }}>
                          <strong>Teacher feedback:</strong> {row.teacher_feedback}
                        </section>
                      )}
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
