'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchTeacherTutorEvidence,
  fetchTeacherTutorEvidenceSummary,
  reviewTutorEvidence,
  TeacherTutorEvidence,
  TeacherTutorEvidenceSummary
} from '../../lib/projectZTeacherTutorEvidence';

function evidenceLabel(type: string) {
  if (type === 'misconception') return 'Misconception';
  if (type === 'hint_needed') return 'Hint needed';
  if (type === 'partial_understanding') return 'Partial understanding';
  if (type === 'independent_step') return 'Independent step';
  if (type === 'review_complete') return 'Review complete';
  return type;
}

function statusLabel(status: string) {
  if (status === 'approved') return 'Approved';
  if (status === 'ignored') return 'Ignored';
  if (status === 'action_needed') return 'Action needed';
  return 'Pending';
}

export default function TeacherTutorEvidencePage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [summary, setSummary] = useState<TeacherTutorEvidenceSummary[]>([]);
  const [evidence, setEvidence] = useState<TeacherTutorEvidence[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Teacher tutor evidence review loads for teachers.');
  const [busy, setBusy] = useState(false);

  async function loadPage(studentId = selectedStudentId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to review tutor evidence.' : 'Only teachers can review tutor evidence.');
      return;
    }

    const nextSummary = await fetchTeacherTutorEvidenceSummary();
    const nextEvidence = await fetchTeacherTutorEvidence(studentId || undefined);

    setSummary(nextSummary);
    setEvidence(nextEvidence);
    setStatus('Tutor evidence loaded for students in your classes.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeStudent(studentId: string) {
    setSelectedStudentId(studentId);
    setStatus('Loading selected student evidence...');
    await loadPage(studentId);
  }

  async function review(evidenceId: string, nextStatus: string) {
    setBusy(true);
    setStatus(`Marking evidence as ${nextStatus}...`);

    const result = await reviewTutorEvidence(
      evidenceId,
      nextStatus,
      reviewNotes[evidenceId] || `Teacher marked evidence as ${nextStatus}.`
    );

    if (!result.ok) {
      setStatus(`Could not review evidence: ${result.reason}`);
      setBusy(false);
      return;
    }

    setStatus(`Evidence marked as ${nextStatus}.`);
    await loadPage(selectedStudentId);
    setBusy(false);
  }

  const pendingCount = useMemo(
    () => evidence.filter((item) => item.teacher_review_status === 'pending').length,
    [evidence]
  );

  const actionNeededCount = useMemo(
    () => evidence.filter((item) => item.teacher_review_status === 'action_needed').length,
    [evidence]
  );

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Teacher Tutor Evidence Review</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/tutor-evidence">Tutor Evidence</a>
            <a className="btn secondary" href="/reports">Reports</a>
            <a className="btn secondary" href="/quality">Quality</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a teacher to review tutor evidence.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only review</h2>
            <p className="muted">Students and parents cannot review tutor evidence.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="grid grid3">
              <div className="card">
                <h2>Pending review</h2>
                <p className="stat">{pendingCount}</p>
              </div>

              <div className="card">
                <h2>Action needed</h2>
                <p className="stat">{actionNeededCount}</p>
              </div>

              <div className="card">
                <h2>Review rule</h2>
                <p className="muted">
                  Tutor evidence supports teacher judgment. Approve useful evidence, ignore weak evidence, or mark action needed.
                </p>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Student summary</h2>
              {summary.length === 0 ? (
                <p className="muted">No tutor evidence found for students in your classes yet.</p>
              ) : (
                <>
                  <label className="label">
                    Filter by student
                    <select className="select" value={selectedStudentId} onChange={(event) => changeStudent(event.target.value)}>
                      <option value="">All students</option>
                      {summary.map((item) => (
                        <option key={item.student_id} value={item.student_id}>
                          {item.student_email} - pending {item.pending_count}
                        </option>
                      ))}
                    </select>
                  </label>

                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Total</th>
                        <th>Pending</th>
                        <th>Approved</th>
                        <th>Ignored</th>
                        <th>Action needed</th>
                        <th>Misconceptions / hints / independent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((item) => (
                        <tr key={item.student_id}>
                          <td>
                            <strong>{item.student_name}</strong><br />
                            <span className="muted">{item.student_email}</span>
                          </td>
                          <td>{item.total_evidence}</td>
                          <td>{item.pending_count}</td>
                          <td>{item.approved_count}</td>
                          <td>{item.ignored_count}</td>
                          <td>{item.action_needed_count}</td>
                          <td>{item.misconception_count} / {item.hint_needed_count} / {item.independent_step_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Evidence review queue</h2>
              {evidence.length === 0 ? (
                <p className="muted">No evidence to review yet.</p>
              ) : (
                <div className="grid">
                  {evidence.map((item) => (
                    <div key={item.evidence_id} className="card">
                      <p className="muted">
                        {new Date(item.created_at).toLocaleString()} - {item.class_label}
                      </p>
                      <h3>{evidenceLabel(item.evidence_type)} - {statusLabel(item.teacher_review_status)}</h3>
                      <p>
                        <strong>{item.student_name}</strong> ({item.student_email})<br />
                        <strong>{item.skill_title || item.course_skill_code || 'Skill'}</strong><br />
                        <span className="muted">{item.course_code} - {item.course_skill_code}</span>
                      </p>
                      <p>
                        Evidence strength: <strong>{item.evidence_strength}</strong><br />
                        Mastery delta: <strong>{item.mastery_delta}</strong><br />
                        Confidence delta: <strong>{item.confidence_delta}</strong>
                      </p>
                      <p className="muted">{item.notes}</p>

                      {item.teacher_review_notes && (
                        <p><strong>Teacher notes:</strong> {item.teacher_review_notes}</p>
                      )}

                      <label className="label">
                        Review notes
                        <textarea
                          className="textarea"
                          rows={3}
                          value={reviewNotes[item.evidence_id] || ''}
                          onChange={(event) => setReviewNotes((current) => ({ ...current, [item.evidence_id]: event.target.value }))}
                          placeholder="Optional note..."
                        />
                      </label>

                      <div className="navLinks">
                        <button className="btn blue" disabled={busy} onClick={() => review(item.evidence_id, 'approved')}>
                          Approve
                        </button>
                        <button className="btn secondary" disabled={busy} onClick={() => review(item.evidence_id, 'ignored')}>
                          Ignore
                        </button>
                        <button className="btn secondary" disabled={busy} onClick={() => review(item.evidence_id, 'action_needed')}>
                          Action needed
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
