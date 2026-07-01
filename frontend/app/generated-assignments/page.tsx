'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchGeneratedAssignmentQuestions,
  fetchGeneratedAssignments,
  GeneratedAssignment,
  GeneratedAssignmentQuestion,
  markGeneratedAssignmentStatus
} from '../../lib/projectZGeneratedAssignments';
import { publishGeneratedAssignment, fetchTeacherGeneratedAssignmentProgress, TeacherGeneratedAssignmentProgress } from '../../lib/projectZPublishGeneratedAssignments';

function formatOptions(options: Record<string, string> | null) {
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

export default function GeneratedAssignmentsPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<GeneratedAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [questions, setQuestions] = useState<GeneratedAssignmentQuestion[]>([]);
  const [status, setStatus] = useState('Generated assignments load for teachers.');
  const [progressRows, setProgressRows] = useState<TeacherGeneratedAssignmentProgress[]>([]);
  const [busy, setBusy] = useState(false);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to view generated assignments.' : 'Only teachers can view generated assignments.');
      return;
    }

    const nextAssignments = await fetchGeneratedAssignments();
    setAssignments(nextAssignments);

    if (nextAssignments.length === 0) {
      setStatus('No generated assignments yet. Create one from Assignment Recommendations.');
      return;
    }

    const firstId = selectedAssignmentId || nextAssignments[0].assignment_id;
    setSelectedAssignmentId(firstId);
    await loadQuestions(firstId);
  }

  async function loadQuestions(assignmentId: string) {
    if (!assignmentId) return;

    setStatus('Loading assignment questions...');
    const nextQuestions = await fetchGeneratedAssignmentQuestions(assignmentId);
    setQuestions(nextQuestions);
    setProgressRows(await fetchTeacherGeneratedAssignmentProgress(assignmentId));
    setStatus(`Loaded ${nextQuestions.length} questions.`);
  }

  async function changeAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    await loadQuestions(assignmentId);
  }

  async function updateStatus(nextStatus: string) {
    if (!selectedAssignmentId) return;

    setBusy(true);
    setStatus(`Marking assignment as ${nextStatus}...`);

    const result = await markGeneratedAssignmentStatus(selectedAssignmentId, nextStatus);

    if (!result.ok) {
      setStatus(`Could not update assignment: ${result.reason}`);
      setBusy(false);
      return;
    }

    setStatus(`Assignment marked as ${nextStatus}.`);
    await loadPage();
    setBusy(false);
  }

  async function publishAssignment() {
    if (!selectedAssignmentId) return;

    setBusy(true);
    setStatus('Publishing generated assignment to students...');

    const result = await publishGeneratedAssignment(selectedAssignmentId);

    if (!result.ok) {
      setStatus(`Could not publish: ${result.reason}`);
      setBusy(false);
      return;
    }

    setStatus('Generated assignment published to students.');
    await loadPage();
    setBusy(false);
  }

  const selectedAssignment = assignments.find((assignment) => assignment.assignment_id === selectedAssignmentId);

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Generated Assignments</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/assignment-recommendations">Recommendations</a>
            <a className="btn secondary" href="/assignment-audit">Quality Audit</a>
            <a className="btn secondary" href="/teacher-submission-review">Submission Review</a>
            <a className="btn secondary" href="/assignments">Assignments</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a teacher to view generated assignments.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only page</h2>
            <p className="muted">Generated assignment review is for teachers only.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="card">
              <h2>Select generated assignment</h2>
              {assignments.length === 0 ? (
                <p className="muted">No generated assignments yet. Create one from the recommendations page.</p>
              ) : (
                <label className="label">
                  Assignment
                  <select className="select" value={selectedAssignmentId} onChange={(event) => changeAssignment(event.target.value)}>
                    {assignments.map((assignment) => (
                      <option key={assignment.assignment_id} value={assignment.assignment_id}>
                        {assignment.assignment_title} - {assignment.question_count} questions - {assignment.status}
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
                    <h2>Question count</h2>
                    <p className="stat">{selectedAssignment.question_count}</p>
                    <p className="muted">Minimum required: 30</p>
                  </div>

                  <div className="card">
                    <h2>Skill lock</h2>
                    <p><strong>{selectedAssignment.skill_title}</strong></p>
                    <p className="muted">{selectedAssignment.course_skill_code}</p>
                  </div>

                  <div className="card">
                    <h2>Level</h2>
                    <p className="stat">{selectedAssignment.assignment_level}</p>
                  </div>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>{selectedAssignment.assignment_title}</h2>
                  <p>{selectedAssignment.assignment_instructions}</p>
                  <p className="muted">
                    Status: {selectedAssignment.status} | Model: {selectedAssignment.ai_model || 'unknown'} | Course: {selectedAssignment.course_code || 'unknown'}
                  </p>

                  <div className="navLinks">
                    <button className="btn blue" disabled={busy} onClick={() => updateStatus('reviewed')}>
                      Mark reviewed
                    </button>
                    <button className="btn secondary" disabled={busy} onClick={() => updateStatus('assigned')}>
                      Mark assigned
                    </button>
                    <button className="btn blue" disabled={busy || selectedAssignment.question_count < 30} onClick={publishAssignment}>
                      Publish to students
                    </button>
                    <button className="btn secondary" disabled={busy} onClick={() => updateStatus('archived')}>
                      Archive
                    </button>
                  </div>
                </section>

                
                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Student progress after publishing</h2>
                  {progressRows.length === 0 ? (
                    <p className="muted">No student progress yet. This will populate after students start.</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Answered</th>
                          <th>Submitted</th>
                          <th>Correct</th>
                          <th>Progress</th>
                          <th>Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {progressRows.map((row) => (
                          <tr key={row.student_id}>
                            <td>{row.student_email}</td>
                            <td>{row.answered_count}/{row.question_count}</td>
                            <td>{row.submitted_count}</td>
                            <td>{row.correct_count}</td>
                            <td>{row.progress_percent}%</td>
                            <td>{row.accuracy_percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Questions</h2>
                  {questions.length < 30 && (
                    <section className="notice" style={{ marginBottom: 18 }}>
                      Warning: this assignment has fewer than 30 questions. Do not assign it.
                    </section>
                  )}

                  <div className="grid">
                    {questions.map((question) => (
                      <div key={question.question_id} className="card">
                        <p className="muted">
                          Question {question.question_number} | Criterion {question.criterion} | {question.difficulty_band} | {question.question_type}
                        </p>
                        <h3>{question.prompt}</h3>
                        {formatOptions(question.options)}
                        <p>
                          <strong>Correct answer:</strong> {question.correct_answer}
                          {question.correct_option && <> ({question.correct_option})</>}
                        </p>
                        <p><strong>Explanation:</strong> {question.explanation}</p>
                        <p className="muted">
                          Skill: {question.skill_title} | {question.course_skill_code}
                        </p>
                      </div>
                    ))}
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
