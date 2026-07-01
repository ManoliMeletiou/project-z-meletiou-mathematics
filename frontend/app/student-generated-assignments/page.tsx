'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchStudentGeneratedAssignmentQuestions,
  fetchStudentGeneratedAssignments,
  saveGeneratedAssignmentAnswer,
  StudentGeneratedAssignment,
  StudentGeneratedAssignmentQuestion
} from '../../lib/projectZPublishGeneratedAssignments';

function OptionButtons({
  question,
  value,
  onChange
}: {
  question: StudentGeneratedAssignmentQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  if (!question.options) return null;

  return (
    <div className="grid grid2">
      {(['A', 'B', 'C', 'D'] as const).map((key) => (
        <button
          key={key}
          className={value === key ? 'btn blue' : 'btn secondary'}
          onClick={() => onChange(key)}
          type="button"
        >
          {key}. {question.options?.[key]}
        </button>
      ))}
    </div>
  );
}

export default function StudentGeneratedAssignmentsPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<StudentGeneratedAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [questions, setQuestions] = useState<StudentGeneratedAssignmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Published generated assignments load for students.');
  const [busy, setBusy] = useState(false);

  async function loadPage(assignmentId = selectedAssignmentId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to view assignments.' : 'This page is for students.');
      return;
    }

    const nextAssignments = await fetchStudentGeneratedAssignments();
    setAssignments(nextAssignments);

    if (nextAssignments.length === 0) {
      setStatus('No published generated assignments yet.');
      return;
    }

    const nextAssignmentId = assignmentId || nextAssignments[0].assignment_id;
    setSelectedAssignmentId(nextAssignmentId);
    await loadQuestions(nextAssignmentId);
  }

  async function loadQuestions(assignmentId: string) {
    if (!assignmentId) return;

    setStatus('Loading questions...');
    const nextQuestions = await fetchStudentGeneratedAssignmentQuestions(assignmentId);
    setQuestions(nextQuestions);

    const nextAnswers: Record<string, string> = {};
    const nextOptions: Record<string, string> = {};

    nextQuestions.forEach((question) => {
      if (question.student_answer_text) nextAnswers[question.question_id] = question.student_answer_text;
      if (question.student_selected_option) nextOptions[question.question_id] = question.student_selected_option;
    });

    setAnswers(nextAnswers);
    setSelectedOptions(nextOptions);
    setStatus(`Loaded ${nextQuestions.length} questions.`);
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    await loadQuestions(assignmentId);
  }

  async function saveAnswer(question: StudentGeneratedAssignmentQuestion, submit = false) {
    setBusy(true);
    setStatus(submit ? `Submitting question ${question.question_number}...` : `Saving question ${question.question_number}...`);

    const result = await saveGeneratedAssignmentAnswer({
      assignment_id: selectedAssignmentId,
      question_id: question.question_id,
      answer_text: answers[question.question_id] || '',
      selected_option: selectedOptions[question.question_id] || '',
      submit
    });

    if (!result.ok) {
      setStatus(`Could not save: ${result.reason}`);
      setBusy(false);
      return;
    }

    await loadPage(selectedAssignmentId);
    setStatus(submit ? `Question ${question.question_number} submitted.` : `Question ${question.question_number} saved.`);
    setBusy(false);
  }

  const selectedAssignment = assignments.find((assignment) => assignment.assignment_id === selectedAssignmentId);

  const answeredCount = useMemo(
    () => questions.filter((question) => {
      if (question.question_type === 'multiple_choice') return selectedOptions[question.question_id] || question.student_selected_option;
      return answers[question.question_id] || question.student_answer_text;
    }).length,
    [questions, answers, selectedOptions]
  );

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Generated Assignments</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/student-dashboard">Dashboard</a>
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/student">Student Portal</a>
            <a className="btn secondary" href="/assignments">Assignments</a>
            <a className="btn secondary" href="/path">Skill Path</a>
            <a className="btn secondary" href="/tutor">Tutor</a>
            <a className="btn secondary" href="/student-memorandum">Memorandum</a>
            <a className="btn secondary" href="/student-corrections">Corrections</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to view generated assignments.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card">
            <h2>Student-only page</h2>
            <p className="muted">Published generated assignments are completed from the student account.</p>
          </section>
        )}

        {role === 'student' && (
          <>
            <section className="card">
              <h2>Select assignment</h2>
              {assignments.length === 0 ? (
                <p className="muted">No published generated assignments yet.</p>
              ) : (
                <label className="label">
                  Assignment
                  <select className="select" value={selectedAssignmentId} onChange={(event) => changeAssignment(event.target.value)}>
                    {assignments.map((assignment) => (
                      <option key={assignment.assignment_id} value={assignment.assignment_id}>
                        {assignment.assignment_title} - {assignment.progress_percent}% complete
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
                    <h2>Questions</h2>
                    <p className="stat">{selectedAssignment.question_count}</p>
                  </div>

                  <div className="card">
                    <h2>Progress</h2>
                    <p className="stat">{answeredCount}/{questions.length}</p>
                    <progress value={answeredCount} max={Math.max(questions.length, 1)} style={{ width: '100%' }} />
                  </div>

                  <div className="card">
                    <h2>Skill</h2>
                    <p><strong>{selectedAssignment.skill_title}</strong></p>
                    <p className="muted">{selectedAssignment.course_skill_code}</p>
                  </div>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>{selectedAssignment.assignment_title}</h2>
                  <p>{selectedAssignment.assignment_instructions}</p>
                  <p className="muted">Level: {selectedAssignment.assignment_level} | Class: {selectedAssignment.class_label}</p>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Questions</h2>
                  <div className="grid">
                    {questions.map((question) => (
                      <div key={question.question_id} className="card">
                        <p className="muted">
                          Question {question.question_number} | Criterion {question.criterion} | {question.difficulty_band}
                        </p>
                        <h3>{question.prompt}</h3>

                        {question.question_type === 'multiple_choice' ? (
                          <OptionButtons
                            question={question}
                            value={selectedOptions[question.question_id] || ''}
                            onChange={(value) => setSelectedOptions((current) => ({ ...current, [question.question_id]: value }))}
                          />
                        ) : (
                          <textarea
                            className="textarea"
                            rows={3}
                            value={answers[question.question_id] || ''}
                            onChange={(event) => setAnswers((current) => ({ ...current, [question.question_id]: event.target.value }))}
                            placeholder="Type your answer or working here..."
                          />
                        )}

                        {question.is_submitted && (
                          <section className="notice" style={{ marginTop: 12 }}>
                            Submitted. Result: {question.is_correct === true ? 'correct' : question.is_correct === false ? 'check answer / teacher review may be needed' : 'submitted'}
                          </section>
                        )}

                        <div className="navLinks">
                          <button className="btn secondary" disabled={busy || question.is_submitted} onClick={() => saveAnswer(question, false)}>
                            Save
                          </button>
                          <button className="btn blue" disabled={busy || question.is_submitted} onClick={() => saveAnswer(question, true)}>
                            Submit
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
