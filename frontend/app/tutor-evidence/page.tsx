'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchTutorEvidenceSummary,
  fetchTutorLearningEvidence,
  recordTutorEvidence,
  TutorEvidenceSummary,
  TutorLearningEvidence
} from '../../lib/projectZTutorEvidence';

function evidenceLabel(type: string) {
  if (type === 'misconception') return 'Misconception';
  if (type === 'hint_needed') return 'Hint needed';
  if (type === 'partial_understanding') return 'Partial understanding';
  if (type === 'independent_step') return 'Independent step';
  if (type === 'review_complete') return 'Review complete';
  return type;
}

export default function TutorEvidencePage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [summary, setSummary] = useState<TutorEvidenceSummary[]>([]);
  const [evidence, setEvidence] = useState<TutorLearningEvidence[]>([]);
  const [courseCode, setCourseCode] = useState('myp_standard');
  const [skillCode, setSkillCode] = useState('myp_standard.linear_equations');
  const [skillTitle, setSkillTitle] = useState('Solving linear equations');
  const [evidenceType, setEvidenceType] = useState('partial_understanding');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Tutor evidence loads for students and teachers.');
  const [busy, setBusy] = useState(false);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (!['student', 'teacher'].includes(profile.role)) {
      setStatus(profile.role === 'guest' ? 'Sign in to view tutor evidence.' : 'Only students and teachers can view tutor evidence.');
      return;
    }

    const nextSummary = await fetchTutorEvidenceSummary();
    const nextEvidence = await fetchTutorLearningEvidence();

    setSummary(nextSummary);
    setEvidence(nextEvidence);
    setStatus('Tutor evidence loaded. New tutor interactions will automatically create evidence when a skill is attached.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function addManualEvidence() {
    setBusy(true);
    setStatus('Recording tutor evidence...');

    const result = await recordTutorEvidence({
      course_code: courseCode,
      course_skill_code: skillCode,
      skill_title: skillTitle,
      evidence_type: evidenceType,
      notes: notes || 'Manual teacher/student tutor evidence entry.'
    });

    if (!result.ok) {
      setStatus(`Could not record evidence: ${result.reason}`);
      setBusy(false);
      return;
    }

    setStatus('Tutor evidence recorded and mastery signal updated.');
    setNotes('');
    await loadPage();
    setBusy(false);
  }

  const totalEvidence = useMemo(
    () => evidence.length,
    [evidence]
  );

  const totalMasteryDelta = useMemo(
    () => evidence.reduce((sum, item) => sum + Number(item.mastery_delta || 0), 0),
    [evidence]
  );

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Tutor Evidence</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/tutor">Tutor</a>
            <a className="btn secondary" href="/recommended">Recommended</a>
            <a className="btn secondary" href="/path">Skill Path</a>
            <a className="btn secondary" href="/reports">Reports</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in to view tutor evidence.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && !['student', 'teacher'].includes(role) && (
          <section className="card">
            <h2>Unavailable</h2>
            <p className="muted">Tutor evidence is for students and teachers only.</p>
          </section>
        )}

        {['student', 'teacher'].includes(role) && (
          <>
            <section className="grid grid3">
              <div className="card">
                <h2>Total evidence</h2>
                <p className="stat">{totalEvidence}</p>
                <p className="muted">Tutor-based learning evidence records.</p>
              </div>

              <div className="card">
                <h2>Mastery signal</h2>
                <p className="stat">{totalMasteryDelta}</p>
                <p className="muted">Total mastery delta from tutor evidence.</p>
              </div>

              <div className="card">
                <h2>How it works</h2>
                <p className="muted">
                  Tutor conversations create evidence such as hint needed, misconception, partial understanding, or independent step.
                </p>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Manual tutor evidence</h2>
              <p className="muted">
                This is useful when a teacher observes a helpful tutor interaction or wants to record a learning signal manually.
              </p>
              <div className="grid grid2">
                <label className="label">
                  Course code
                  <input className="input" value={courseCode} onChange={(event) => setCourseCode(event.target.value)} />
                </label>
                <label className="label">
                  Skill code
                  <input className="input" value={skillCode} onChange={(event) => setSkillCode(event.target.value)} />
                </label>
                <label className="label">
                  Skill title
                  <input className="input" value={skillTitle} onChange={(event) => setSkillTitle(event.target.value)} />
                </label>
                <label className="label">
                  Evidence type
                  <select className="select" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}>
                    <option value="misconception">Misconception</option>
                    <option value="hint_needed">Hint needed</option>
                    <option value="partial_understanding">Partial understanding</option>
                    <option value="independent_step">Independent step</option>
                    <option value="review_complete">Review complete</option>
                  </select>
                </label>
              </div>
              <label className="label">
                Notes
                <textarea className="textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>
              <button className="btn blue" disabled={busy} onClick={addManualEvidence}>
                Record evidence
              </button>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Evidence summary by skill</h2>
              {summary.length === 0 ? (
                <p className="muted">No tutor evidence summary yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Evidence</th>
                      <th>Avg strength</th>
                      <th>Mastery delta</th>
                      <th>Confidence delta</th>
                      <th>Misconceptions / hints / independent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((item) => (
                      <tr key={item.course_skill_code || item.skill_title || 'unknown'}>
                        <td>
                          <strong>{item.skill_title || item.course_skill_code}</strong><br />
                          <span className="muted">{item.course_skill_code}</span>
                        </td>
                        <td>{item.evidence_count}</td>
                        <td>{item.average_evidence_strength}</td>
                        <td>{item.total_mastery_delta}</td>
                        <td>{item.total_confidence_delta}</td>
                        <td>{item.misconception_count} / {item.hint_needed_count} / {item.independent_step_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Recent tutor evidence</h2>
              {evidence.length === 0 ? (
                <p className="muted">No tutor evidence yet.</p>
              ) : (
                <div className="grid">
                  {evidence.map((item) => (
                    <div key={item.id} className="card">
                      <p className="muted">{new Date(item.created_at).toLocaleString()}</p>
                      <h3>{evidenceLabel(item.evidence_type)}</h3>
                      <p>
                        <strong>{item.skill_title || 'Skill'}</strong><br />
                        <span className="muted">{item.course_skill_code}</span>
                      </p>
                      <p>
                        Strength: <strong>{item.evidence_strength}</strong><br />
                        Mastery delta: <strong>{item.mastery_delta}</strong><br />
                        Confidence delta: <strong>{item.confidence_delta}</strong>
                      </p>
                      <p className="muted">{item.notes}</p>
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
