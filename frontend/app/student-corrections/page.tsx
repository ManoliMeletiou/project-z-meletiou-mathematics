'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchStudentCorrectionAssignments,
  fetchStudentCorrectionQuestions,
  saveStudentCorrection,
  StudentCorrectionAssignment,
  StudentCorrectionQuestion
} from '../../lib/projectZCorrectionsRetry';

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

function shouldCorrect(question: StudentCorrectionQuestion) {
  return question.student_is_correct === false || question.teacher_review_status === 'needs_revision' || question.correction_status === 'needs_more_work';
}

export default function StudentCorrectionsPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<StudentCorrectionAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [questions, setQuestions] = useState<StudentCorrectionQuestion[]>([]);
  const [correctionText, setCorrectionText] = useState<Record<string, string>>({});
  const [reflectionText, setReflectionText] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Corrections load after your teacher releases the memorandum.');
  const [busy, setBusy] = useState(false);

  async function loadPage(assignmentId = selectedAssignmentId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to submit corrections.' : 'This page is for students.');
      return;
    }

    const nextAssignments = await fetchStudentCorrectionAssignments();
    setAssignments(nextAssignments);

    if (nextAssignments.length === 0) {
      setStatus('No correction assignments yet. Your teacher must release a memorandum first.');
      return;
    }

    const nextId = assignmentId || nextAssignments[0].assignment_id;
    setSelectedAssignmentId(nextId);
    await loadQuestions(nextId);
  }

  async function loadQuestions(assignmentId: string) {
    if (!assignmentId) return;

    setStatus('Loading correction questions...');
    const nextQuestions = await fetchStudentCorrectionQuestions(assignmentId);
    setQuestions(nextQuestions);

    const nextCorrectionText: Record<string, string> = {};
    const nextReflectionText: Record<string, string> = {};
    const nextConfidence: Record<string, string> = {};

    nextQuestions.forEach((question) => {
      if (question.correction_text) nextCorrectionText[question.question_id] = question.correction_text;
      if (question.reflection_text) nextReflectionText[question.question_id] = question.reflection_text;
      if (question.confidence_after_correction) nextConfidence[question.question_id] = String(question.confidence_after_correction);
    });

    setCorrectionText(nextCorrectionText);
    setReflectionText(nextReflectionText);
    setConfidence(nextConfidence);
    setStatus(`Loaded ${nextQuestions.length} memorandum questions.`);
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    await loadQuestions(assignmentId);
  }

  async function saveCorrection(question: StudentCorrectionQuestion, submit = false) {
    setBusy(true);
    setStatus(submit ? `Submitting correction for Q${question.question_number}...` : `Saving correction for Q${question.question_number}...`);

    const result = await saveStudentCorrection({
      assignment_id: selectedAssignmentId,
      question_id: question.question_id,
      correction_text: correctionText[question.question_id] || '',
      reflection_text: reflectionText[question.question_id] || '',
      confidence_after_correction: confidence[question.question_id] ? Number(confidence[question.question_id]) : null,
      submit
    });

    if (!result.ok) {
      setStatus(`Could not save correction: ${result.reason}`);
      setBusy(false);
      return;
    }

    await loadPage(selectedAssignmentId);
    setStatus(submit ? `Correction for Q${question.question_number} submitted.` : `Correction for Q${question.question_number} saved.`);
    setBusy(false);
  }

  const selectedAssignment = assignments.find((assignment) => assignment.assignment_id === selectedAssignmentId);

  const correctionQueue = useMemo(
    () => questions.filter(shouldCorrect),
    [questions]
  );

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Student Corrections</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/student">Student Portal</a>
            <a className="btn secondary" href="/student-memorandum">Memorandum</a>
            <a className="btn secondary" href="/student-generated-assignments">Assignments</a>
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
            <p className="muted">Sign in as a student to submit corrections.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card">
            <h2>Student-only page</h2>
            <p className="muted">Corrections are completed from the student account.</p>
          </section>
        )}

        {role === 'student' && (
          <>
            <section className="card">
              <h2>Select assignment</h2>
              {assignments.length === 0 ? (
                <p className="muted">No released memorandums yet.</p>
              ) : (
                <label className="label">
                  Assignment
                  <select className="select" value={selectedAssignmentId} onChange={(event) => changeAssignment(event.target.value)}>
                    {assignments.map((assignment) => (
                      <option key={assignment.assignment_id} value={assignment.assignment_id}>
                        {assignment.assignment_title} - {assignment.correction_progress_percent}% corrections
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
                    <h2>Needs correction</h2>
                    <p className="stat">{selectedAssignment.responses_needing_correction}</p>
                  </div>

                  <div className="card">
                    <h2>Submitted</h2>
                    <p className="stat">{selectedAssignment.corrections_submitted}</p>
                  </div>

                  <div className="card">
                    <h2>Accepted</h2>
                    <p className="stat">{selectedAssignment.corrections_accepted}</p>
                  </div>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Correction focus</h2>
                  <p className="muted">
                    Corrections are strongest when you explain what went wrong, show the corrected method, and reflect on what you now understand.
                  </p>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Questions to correct first</h2>
                  {correctionQueue.length === 0 ? (
                    <p className="muted">No required corrections detected. You may still correct any question below for extra learning.</p>
                  ) : (
                    <p>{correctionQueue.length} question(s) should be corrected first.</p>
                  )}
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Correction questions</h2>
                  <div className="grid">
                    {questions.map((question) => (
                      <div key={question.question_id} className="card">
                        <p className="muted">
                          Q{question.question_number} | Criterion {question.criterion} | {question.difficulty_band}
                        </p>
                        <h3>{question.prompt}</h3>
                        {optionDisplay(question.options)}
                        <p>
                          <strong>Your original answer:</strong> {question.student_selected_option || question.student_answer_text || '-'}<br />
                          <strong>Correct answer:</strong> {question.correct_answer} {question.correct_option ? `(${question.correct_option})` : ''}<br />
                          <strong>Explanation:</strong> {question.explanation}
                        </p>

                        {question.teacher_feedback && (
                          <section className="notice" style={{ marginTop: 12 }}>
                            <strong>Teacher feedback:</strong> {question.teacher_feedback}
                          </section>
                        )}

                        {question.correction_teacher_feedback && (
                          <section className="notice" style={{ marginTop: 12 }}>
                            <strong>Correction feedback:</strong> {question.correction_teacher_feedback}
                          </section>
                        )}

                        <label className="label">
                          My correction
                          <textarea
                            className="textarea"
                            rows={4}
                            value={correctionText[question.question_id] || ''}
                            onChange={(event) => setCorrectionText((current) => ({ ...current, [question.question_id]: event.target.value }))}
                            placeholder="Explain the corrected method and answer..."
                          />
                        </label>

                        <label className="label">
                          Reflection
                          <textarea
                            className="textarea"
                            rows={3}
                            value={reflectionText[question.question_id] || ''}
                            onChange={(event) => setReflectionText((current) => ({ ...current, [question.question_id]: event.target.value }))}
                            placeholder="What mistake did you make and what do you understand now?"
                          />
                        </label>

                        <label className="label">
                          Confidence after correction: 1 low - 5 high
                          <select
                            className="select"
                            value={confidence[question.question_id] || ''}
                            onChange={(event) => setConfidence((current) => ({ ...current, [question.question_id]: event.target.value }))}
                          >
                            <option value="">Choose confidence</option>
                            <option value="1">1 - I still need help</option>
                            <option value="2">2</option>
                            <option value="3">3 - I partly understand</option>
                            <option value="4">4</option>
                            <option value="5">5 - I understand now</option>
                          </select>
                        </label>

                        <p className="muted">
                          Correction status: {question.correction_status || 'not started'}
                        </p>

                        <div className="navLinks">
                          <button className="btn secondary" disabled={busy} onClick={() => saveCorrection(question, false)}>
                            Save draft
                          </button>
                          <button className="btn blue" disabled={busy} onClick={() => saveCorrection(question, true)}>
                            Submit correction
                          </button>
                        </div>
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
