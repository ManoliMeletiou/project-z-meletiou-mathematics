'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ProjectZCalmHeader } from '../../components/ProjectZCalmHeader';
import {
  AssignmentRecommendationClass,
  fetchAssignmentRecommendationClasses,
  fetchSmartAssignmentRecommendations,
  SmartAssignmentRecommendation
} from '../../lib/projectZAssignmentRecommendations';
import {
  auditGeneratedAssignment,
  approveGeneratedAssignmentRelease,
  fetchGeneratedAssignmentReleaseReadiness,
  GeneratedAssignmentReleaseReadiness,
  regenerateAssignmentQuestion,
  runAssignmentReleaseAudit
} from '../../lib/projectZAssignmentAudit';
import {
  createGeneratedAssignmentFromRecommendation,
  fetchGeneratedAssignmentQuestions,
  fetchGeneratedAssignments,
  GeneratedAssignment,
  GeneratedAssignmentQuestion,
} from '../../lib/projectZGeneratedAssignments';
import { publishGeneratedAssignment } from '../../lib/projectZPublishGeneratedAssignments';
import { useProjectZProfile } from '../../lib/useProjectZProfile';

const emptyReadiness: GeneratedAssignmentReleaseReadiness = {
  ready: false,
  assignment_id: '',
  question_count_ok: false,
  actual_question_count: 0,
  unresolved_flags: 0,
  automatic_audit_current: false,
  teacher_approval_current: false,
  latest_content_change: null,
  latest_automatic_pass: null,
  latest_teacher_approval: null,
  rights_status_confirmed: false
};

function GateItem({ passed, children }: { passed: boolean; children: ReactNode }) {
  return (
    <li className={passed ? 'pz-gate-passed' : 'pz-gate-waiting'}>
      <span aria-hidden="true">{passed ? '✓' : '○'}</span>{children}
    </li>
  );
}

function minimumQuestionCount(item: SmartAssignmentRecommendation) {
  return Math.max(30, Number(item.suggested_question_count || 30));
}

export default function AssignmentFactoryPage() {
  const { role, email } = useProjectZProfile();
  const [classes, setClasses] = useState<AssignmentRecommendationClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [recommendations, setRecommendations] = useState<SmartAssignmentRecommendation[]>([]);
  const [assignments, setAssignments] = useState<GeneratedAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [questions, setQuestions] = useState<GeneratedAssignmentQuestion[]>([]);
  const [readiness, setReadiness] = useState<GeneratedAssignmentReleaseReadiness>(emptyReadiness);
  const [status, setStatus] = useState('Choose evidence, create a draft, verify it, then publish.');
  const [busy, setBusy] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const selectedAssignment = assignments.find((item) => item.assignment_id === selectedAssignmentId);
  const clientAudit = useMemo(() => auditGeneratedAssignment(questions), [questions]);
  const topRecommendation = recommendations[0];

  async function loadAssignment(assignmentId: string) {
    if (!assignmentId) {
      setQuestions([]);
      setReadiness(emptyReadiness);
      return;
    }

    const [nextQuestions, nextReadiness] = await Promise.all([
      fetchGeneratedAssignmentQuestions(assignmentId),
      fetchGeneratedAssignmentReleaseReadiness(assignmentId)
    ]);
    setQuestions(nextQuestions);
    setReadiness(nextReadiness || { ...emptyReadiness, assignment_id: assignmentId });
  }

  async function loadTeacherWorkspace(preferredAssignmentId = '') {
    const [nextClasses, nextAssignments] = await Promise.all([
      fetchAssignmentRecommendationClasses(),
      fetchGeneratedAssignments()
    ]);
    const classId = selectedClassId || nextClasses[0]?.class_id || '';
    const assignmentId = preferredAssignmentId || selectedAssignmentId || nextAssignments[0]?.assignment_id || '';

    setClasses(nextClasses);
    setSelectedClassId(classId);
    setAssignments(nextAssignments);
    setSelectedAssignmentId(assignmentId);
    setRecommendations(await fetchSmartAssignmentRecommendations(classId || undefined));
    await loadAssignment(assignmentId);
  }

  useEffect(() => {
    if (role !== 'teacher') return;
    void loadTeacherWorkspace();
  }, [role]);

  async function changeClass(classId: string) {
    setSelectedClassId(classId);
    setStatus('Loading recommendations for this class…');
    setRecommendations(await fetchSmartAssignmentRecommendations(classId));
    setStatus('Recommendations updated.');
  }

  async function createDraft(item: SmartAssignmentRecommendation) {
    setBusy(true);
    setStatus('Generating a skill-locked 30-question draft…');
    const result = await createGeneratedAssignmentFromRecommendation({
      ...item,
      suggested_question_count: minimumQuestionCount(item)
    });

    if (!result.ok) {
      setStatus(`Draft not created: ${result.reason}`);
      setBusy(false);
      return;
    }

    await loadTeacherWorkspace(result.data.assignment_id);
    setStatus('Draft created. The database release audit is the next required step.');
    setBusy(false);
  }

  async function selectAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    setStatus('Loading draft and release gates…');
    await loadAssignment(assignmentId);
    setStatus('Draft loaded.');
  }

  async function runAudit() {
    if (!selectedAssignmentId) return;
    setBusy(true);
    setStatus('Running the database release audit…');
    const result = await runAssignmentReleaseAudit(selectedAssignmentId);
    await loadAssignment(selectedAssignmentId);
    if (!result.ok) {
      setStatus(`Audit could not run: ${result.reason}`);
    } else if (result.data.ok) {
      setStatus('Structural audit passed. Review the work and approve it next.');
    } else {
      setStatus(`Audit found blocking issues: ${result.data.issue_codes.join(', ')}`);
    }
    setBusy(false);
  }

  async function approveForRelease() {
    if (!selectedAssignmentId || !readiness.automatic_audit_current || readiness.unresolved_flags > 0 || !rightsConfirmed) return;
    setBusy(true);
    setStatus('Recording your approval…');
    const result = await approveGeneratedAssignmentRelease(selectedAssignmentId);
    await loadTeacherWorkspace(selectedAssignmentId);
    setStatus(result.ok ? 'Teacher approval recorded. The assignment is ready to publish.' : `Approval failed: ${result.reason}`);
    setBusy(false);
  }

  async function repairQuestion(question: GeneratedAssignmentQuestion, issueCodes: string[]) {
    if (!selectedAssignmentId) return;
    setBusy(true);
    setStatus(`Regenerating question ${question.question_number} while preserving its skill and level…`);
    const result = await regenerateAssignmentQuestion({
      assignment_id: selectedAssignmentId,
      question_id: question.question_id,
      issue_codes: issueCodes,
      notes: 'Regenerated from the controlled Assignment Factory.'
    });
    await loadAssignment(selectedAssignmentId);
    setStatus(result.ok ? 'Question regenerated. The previous audit and approval are now invalid; run the audit again.' : `Regeneration failed: ${result.reason}`);
    setBusy(false);
  }

  async function publish() {
    if (!selectedAssignmentId) return;
    setBusy(true);
    setStatus('Publishing the verified assignment to the class…');
    const result = await publishGeneratedAssignment(selectedAssignmentId);
    await loadTeacherWorkspace(selectedAssignmentId);
    setStatus(result.ok ? 'Verified assignment published to students.' : `Publication blocked: ${result.reason}`);
    setBusy(false);
  }

  const primaryAction = selectedAssignment?.status === 'assigned'
    ? { label: 'Published to students', action: () => undefined, disabled: true }
    : !readiness.automatic_audit_current
    ? { label: 'Run release audit', action: runAudit, disabled: !selectedAssignmentId }
    : readiness.unresolved_flags > 0
      ? { label: 'Repair flagged questions', action: () => undefined, disabled: true }
      : !readiness.teacher_approval_current
        ? { label: 'Approve audited assignment', action: approveForRelease, disabled: !rightsConfirmed }
        : { label: 'Publish to students', action: publish, disabled: !readiness.ready || selectedAssignment?.status === 'assigned' };

  return (
    <main className="page pz-theme pz-teacher-theme pz-calm-page">
      <div className="pz-calm-container pz-factory-container">
        <ProjectZCalmHeader email={email} role={role} backHref="/home" backLabel="Home" />

        <section className="pz-calm-hero pz-calm-hero-compact">
          <p className="pz-eyebrow">Teacher · Assignment Factory</p>
          <h1>Evidence to assignment, without unsafe shortcuts</h1>
          <p>Choose the learning need, create a draft, pass the database audit, approve the current version, and only then publish.</p>
        </section>

        {role === 'guest' ? (
          <section className="pz-calm-section"><h2>Teacher sign-in required</h2><a className="pz-primary-action" href="/auth">Sign in as a teacher <span>→</span></a></section>
        ) : role !== 'teacher' ? (
          <section className="pz-calm-section"><h2>This workspace is for teachers</h2><p className="muted">Your role does not have access to assignment generation or answer-bearing reviews.</p></section>
        ) : (
          <>
            <p className="pz-factory-status" role="status" aria-live="polite">{status}</p>

            <section className="pz-calm-section" aria-labelledby="evidence-title">
              <p className="pz-eyebrow">1 · Evidence</p>
              <h2 id="evidence-title">Choose the learning need</h2>
              {classes.length > 0 ? (
                <label className="label pz-factory-select">Class
                  <select className="select" value={selectedClassId} onChange={(event) => void changeClass(event.target.value)}>
                    {classes.map((item) => <option key={item.class_id} value={item.class_id}>{item.class_label} · {item.student_count} students</option>)}
                  </select>
                </label>
              ) : <p className="muted">Create a class and add students before generating targeted work.</p>}

              {topRecommendation ? (
                <article className="pz-factory-recommendation">
                  <div><span className="badge">{topRecommendation.priority_label}</span><h3>{topRecommendation.suggested_assignment_title}</h3></div>
                  <p>{topRecommendation.suggested_assignment_instructions}</p>
                  <dl className="pz-evidence-grid">
                    <div><dt>Skill</dt><dd>{topRecommendation.skill_title}</dd></div>
                    <div><dt>Average mastery</dt><dd>{topRecommendation.average_mastery}%</dd></div>
                    <div><dt>Learners affected</dt><dd>{topRecommendation.affected_students}</dd></div>
                    <div><dt>Misconceptions</dt><dd>{topRecommendation.misconception_count}</dd></div>
                  </dl>
                  <button className="btn blue" disabled={busy} onClick={() => void createDraft(topRecommendation)}>Create audited draft</button>
                </article>
              ) : <p className="muted">No recommendation is available yet. Collect diagnostic, mastery, or tutor evidence first.</p>}

              {recommendations.length > 1 ? (
                <details className="pz-factory-more"><summary>Other recommendations <span>{recommendations.length - 1}</span></summary>
                  <div className="pz-tool-list">
                    {recommendations.slice(1).map((item) => (
                      <button key={item.recommendation_id} disabled={busy} onClick={() => void createDraft(item)}>
                        <span><strong>{item.suggested_assignment_title}</strong><small>{item.skill_title} · {item.priority_label}</small></span><span>Create →</span>
                      </button>
                    ))}
                  </div>
                </details>
              ) : null}
            </section>

            <section className="pz-calm-section" aria-labelledby="draft-title">
              <p className="pz-eyebrow">2 · Draft</p>
              <h2 id="draft-title">Select the assignment to verify</h2>
              {assignments.length > 0 ? (
                <label className="label pz-factory-select">Draft
                  <select className="select" value={selectedAssignmentId} onChange={(event) => void selectAssignment(event.target.value)}>
                    {assignments.map((item) => <option key={item.assignment_id} value={item.assignment_id}>{item.assignment_title} · {item.status}</option>)}
                  </select>
                </label>
              ) : <p className="muted">No generated draft yet.</p>}

              {selectedAssignment ? (
                <div className="pz-draft-summary">
                  <div><small>Skill lock</small><strong>{selectedAssignment.skill_title}</strong><span>{selectedAssignment.course_skill_code}</span></div>
                  <div><small>Questions</small><strong>{questions.length}</strong><span>Minimum 30</span></div>
                  <div><small>Level</small><strong>{selectedAssignment.assignment_level}</strong><span>{selectedAssignment.course_code || 'Course pending'}</span></div>
                </div>
              ) : null}
            </section>

            {selectedAssignment ? (
              <section className="pz-calm-section" aria-labelledby="release-title">
                <p className="pz-eyebrow">3 · Verify and release</p>
                <h2 id="release-title">Complete every release gate</h2>
                <ul className="pz-release-gates">
                  <GateItem passed={readiness.question_count_ok}>At least 30 stored questions</GateItem>
                  <GateItem passed={readiness.automatic_audit_current}>Current database audit passed</GateItem>
                  <GateItem passed={readiness.unresolved_flags === 0}>No unresolved audit flags</GateItem>
                  <GateItem passed={readiness.teacher_approval_current}>Teacher approved this exact version</GateItem>
                  <GateItem passed={readiness.rights_status_confirmed}>Originality and content rights confirmed</GateItem>
                </ul>

                {readiness.automatic_audit_current && readiness.unresolved_flags === 0 && !readiness.teacher_approval_current ? (
                  <label className="pz-rights-confirmation">
                    <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />
                    <span>I reviewed this draft and confirm it is original/authorized for classroom use.</span>
                  </label>
                ) : null}

                <button className="pz-primary-action pz-factory-primary" disabled={busy || primaryAction.disabled} onClick={() => void primaryAction.action()}>
                  <span>{busy ? 'Working…' : primaryAction.label}</span><span aria-hidden="true">→</span>
                </button>

                {clientAudit.flaggedQuestions.length > 0 ? (
                  <details className="pz-factory-more" open>
                    <summary>Questions needing attention <span>{clientAudit.flaggedQuestions.length}</span></summary>
                    <div className="pz-factory-issues">
                      {clientAudit.flaggedQuestions.map(({ question, issues }) => (
                        <article key={question.question_id}>
                          <div><strong>Question {question.question_number}</strong><small>{issues.map((issue) => issue.message).join(' ')}</small></div>
                          <button className="btn secondary" disabled={busy} onClick={() => void repairQuestion(question, issues.map((issue) => issue.code))}>Regenerate safely</button>
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}

                <details className="pz-factory-more">
                  <summary>Review all questions <span>{questions.length}</span></summary>
                  <div className="pz-question-review-list">
                    {questions.map((question) => (
                      <article key={question.question_id}>
                        <small>Q{question.question_number} · Criterion {question.criterion} · {question.difficulty_band}</small>
                        <strong>{question.prompt}</strong>
                        <span>Answer: {question.correct_answer}</span>
                        <p>{question.explanation}</p>
                      </article>
                    ))}
                  </div>
                </details>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
