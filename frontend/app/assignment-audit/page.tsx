'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchGeneratedAssignmentQuestions,
  fetchGeneratedAssignments,
  GeneratedAssignment,
  GeneratedAssignmentQuestion
} from '../../lib/projectZGeneratedAssignments';
import {
  auditGeneratedAssignment,
  fetchAssignmentQualityAuditLogs,
  logAssignmentQualityAudit,
  regenerateAssignmentQuestion,
  AssignmentQualityAuditLog
} from '../../lib/projectZAssignmentAudit';

function issueText(issues: { code: string; severity: string; message: string }[]) {
  if (issues.length === 0) return 'No issues detected';
  return issues.map((issue) => `${issue.severity.toUpperCase()}: ${issue.message}`).join(' | ');
}

function optionList(question: GeneratedAssignmentQuestion) {
  if (!question.options) return null;
  return (
    <ul>
      <li>A. {question.options.A}</li>
      <li>B. {question.options.B}</li>
      <li>C. {question.options.C}</li>
      <li>D. {question.options.D}</li>
    </ul>
  );
}

export default function AssignmentAuditPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<GeneratedAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [questions, setQuestions] = useState<GeneratedAssignmentQuestion[]>([]);
  const [logs, setLogs] = useState<AssignmentQualityAuditLog[]>([]);
  const [teacherNotes, setTeacherNotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Assignment quality audit loads for teachers.');
  const [busy, setBusy] = useState(false);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to audit assignments.' : 'Only teachers can audit generated assignments.');
      return;
    }

    const nextAssignments = await fetchGeneratedAssignments();
    setAssignments(nextAssignments);

    if (nextAssignments.length === 0) {
      setStatus('No generated assignments yet. Create one first from Assignment Recommendations.');
      return;
    }

    const firstId = selectedAssignmentId || nextAssignments[0].assignment_id;
    setSelectedAssignmentId(firstId);
    await loadAssignment(firstId);
  }

  async function loadAssignment(assignmentId: string) {
    if (!assignmentId) return;

    setStatus('Loading assignment audit...');
    const nextQuestions = await fetchGeneratedAssignmentQuestions(assignmentId);
    const nextLogs = await fetchAssignmentQualityAuditLogs(assignmentId);

    setQuestions(nextQuestions);
    setLogs(nextLogs);
    setStatus(`Loaded ${nextQuestions.length} questions for audit.`);
  }

  async function changeAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    await loadAssignment(assignmentId);
  }

  useEffect(() => {
    loadPage();
  }, []);

  const selectedAssignment = assignments.find((assignment) => assignment.assignment_id === selectedAssignmentId);

  const audit = useMemo(
    () => auditGeneratedAssignment(questions),
    [questions]
  );

  async function logAutomaticAudit() {
    if (!selectedAssignmentId) return;

    setBusy(true);
    setStatus('Saving automatic audit result...');

    const issueCodes = audit.allIssues.map((issue) => issue.code);
    const result = await logAssignmentQualityAudit({
      assignment_id: selectedAssignmentId,
      question_id: null,
      audit_type: 'automatic_check',
      audit_status: audit.allIssues.length === 0 && audit.questionCountOk ? 'passed' : 'flagged',
      issue_codes: issueCodes,
      notes: `Automatic audit: ${questions.length} questions, ${audit.flaggedQuestions.length} flagged questions.`
    });

    if (!result.ok) {
      setStatus(`Could not save audit: ${result.reason}`);
      setBusy(false);
      return;
    }

    await loadAssignment(selectedAssignmentId);
    setStatus('Automatic audit saved.');
    setBusy(false);
  }

  async function approveQuestion(question: GeneratedAssignmentQuestion) {
    const result = await logAssignmentQualityAudit({
      assignment_id: selectedAssignmentId,
      question_id: question.question_id,
      audit_type: 'teacher_review',
      audit_status: 'approved',
      issue_codes: [],
      notes: teacherNotes[question.question_id] || 'Teacher approved this question.'
    });

    setStatus(result.ok ? 'Question approved.' : `Could not approve question: ${result.reason}`);
    await loadAssignment(selectedAssignmentId);
  }

  async function flagQuestion(question: GeneratedAssignmentQuestion, issueCodes: string[]) {
    const result = await logAssignmentQualityAudit({
      assignment_id: selectedAssignmentId,
      question_id: question.question_id,
      audit_type: 'teacher_review',
      audit_status: 'flagged',
      issue_codes: issueCodes,
      notes: teacherNotes[question.question_id] || 'Teacher flagged this question for review.'
    });

    setStatus(result.ok ? 'Question flagged.' : `Could not flag question: ${result.reason}`);
    await loadAssignment(selectedAssignmentId);
  }

  async function regenerateQuestion(question: GeneratedAssignmentQuestion, issueCodes: string[]) {
    setBusy(true);
    setStatus(`Regenerating question ${question.question_number} on the same skill and level...`);

    const result = await regenerateAssignmentQuestion({
      assignment_id: selectedAssignmentId,
      question_id: question.question_id,
      issue_codes: issueCodes,
      notes: teacherNotes[question.question_id] || 'Teacher requested regeneration from audit page.'
    });

    if (!result.ok) {
      setStatus(`Could not regenerate: ${result.reason}`);
      setBusy(false);
      return;
    }

    await loadAssignment(selectedAssignmentId);
    setStatus(`Question ${question.question_number} regenerated.`);
    setBusy(false);
  }

  async function regenerateFlagged() {
    const flagged = audit.flaggedQuestions.slice(0, 5);

    if (flagged.length === 0) {
      setStatus('No flagged questions to regenerate.');
      return;
    }

    setBusy(true);
    setStatus(`Regenerating first ${flagged.length} flagged questions...`);

    for (const item of flagged) {
      await regenerateAssignmentQuestion({
        assignment_id: selectedAssignmentId,
        question_id: item.question.question_id,
        issue_codes: item.issues.map((issue) => issue.code),
        notes: 'Bulk regeneration of flagged question.'
      });
    }

    await loadAssignment(selectedAssignmentId);
    setStatus(`Regenerated ${flagged.length} flagged questions. Re-run audit before assigning.`);
    setBusy(false);
  }

  return (
    <main className="page pz-theme pz-teacher-theme">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Assignment Quality Audit</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/generated-assignments">Generated Assignments</a>
            <a className="btn secondary" href="/assignment-recommendations">Recommendations</a>
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
            <p className="muted">Sign in as a teacher to audit assignments.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only tool</h2>
            <p className="muted">Assignment quality audit is for teachers only.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="card">
              <h2>Select assignment</h2>
              {assignments.length === 0 ? (
                <p className="muted">No generated assignments yet.</p>
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
                    <p className="stat">{questions.length}</p>
                    <p className={audit.questionCountOk ? 'muted' : ''}>
                      {audit.questionCountOk ? 'Minimum 30 passed.' : 'Warning: fewer than 30 questions.'}
                    </p>
                  </div>

                  <div className="card">
                    <h2>Flagged questions</h2>
                    <p className="stat">{audit.flaggedQuestions.length}</p>
                    <p className="muted">High issues: {audit.highIssues.length}, medium issues: {audit.mediumIssues.length}</p>
                  </div>

                  <div className="card">
                    <h2>Skill lock</h2>
                    <p><strong>{selectedAssignment.skill_title}</strong></p>
                    <p className="muted">{selectedAssignment.course_skill_code}</p>
                  </div>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Audit actions</h2>
                  <p className="muted">
                    Regeneration preserves the same skill, criterion, difficulty band, and question type wherever possible.
                  </p>
                  <div className="navLinks">
                    <button className="btn blue" disabled={busy} onClick={logAutomaticAudit}>
                      Save automatic audit
                    </button>
                    <button className="btn secondary" disabled={busy || audit.flaggedQuestions.length === 0} onClick={regenerateFlagged}>
                      Regenerate first 5 flagged
                    </button>
                    <a className="btn secondary" href="/generated-assignments">Open generated assignment</a>
                  </div>
                </section>

                <section className="grid grid2" style={{ marginTop: 18 }}>
                  <div className="card">
                    <h2>Correct option distribution</h2>
                    <p>
                      A: {audit.optionDistribution.A || 0}<br />
                      B: {audit.optionDistribution.B || 0}<br />
                      C: {audit.optionDistribution.C || 0}<br />
                      D: {audit.optionDistribution.D || 0}
                    </p>
                  </div>

                  <div className="card">
                    <h2>Criterion distribution</h2>
                    <p>
                      A: {audit.criterionDistribution.A || 0}<br />
                      B: {audit.criterionDistribution.B || 0}<br />
                      C: {audit.criterionDistribution.C || 0}<br />
                      D: {audit.criterionDistribution.D || 0}
                    </p>
                  </div>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Question audit queue</h2>
                  {questions.length === 0 ? (
                    <p className="muted">No questions loaded.</p>
                  ) : (
                    <div className="grid">
                      {audit.byQuestion.map(({ question, issues }) => (
                        <div key={question.question_id} className="card">
                          <p className="muted">
                            Q{question.question_number} | Criterion {question.criterion} | {question.difficulty_band} | {question.question_type}
                          </p>
                          <h3>{question.prompt}</h3>
                          {optionList(question)}
                          <p><strong>Correct answer:</strong> {question.correct_answer} {question.correct_option ? `(${question.correct_option})` : ''}</p>
                          <p><strong>Explanation:</strong> {question.explanation}</p>
                          <p className={issues.length ? '' : 'muted'}>
                            <strong>Audit:</strong> {issueText(issues)}
                          </p>

                          <label className="label">
                            Teacher notes
                            <textarea
                              className="textarea"
                              rows={3}
                              value={teacherNotes[question.question_id] || ''}
                              onChange={(event) => setTeacherNotes((current) => ({ ...current, [question.question_id]: event.target.value }))}
                              placeholder="Optional note for audit or regeneration..."
                            />
                          </label>

                          <div className="navLinks">
                            <button className="btn blue" disabled={busy} onClick={() => approveQuestion(question)}>
                              Approve
                            </button>
                            <button className="btn secondary" disabled={busy} onClick={() => flagQuestion(question, issues.map((issue) => issue.code))}>
                              Flag
                            </button>
                            <button className="btn secondary" disabled={busy} onClick={() => regenerateQuestion(question, issues.map((issue) => issue.code))}>
                              Regenerate
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Audit history</h2>
                  {logs.length === 0 ? (
                    <p className="muted">No audit logs yet.</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Question</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.audit_id}>
                            <td>{new Date(log.created_at).toLocaleString()}</td>
                            <td>{log.audit_type}</td>
                            <td>{log.audit_status}</td>
                            <td>{log.question_id || 'Assignment'}</td>
                            <td>{log.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
