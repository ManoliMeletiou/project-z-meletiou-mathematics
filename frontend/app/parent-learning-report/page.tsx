'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchParentLearningChildren,
  fetchParentLearningReport,
  ParentLearningChild,
  ParentLearningReport
} from '../../lib/projectZParentLearningReport';

function ProgressLine({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p><strong>{label}:</strong> {value}%</p>
      <progress value={Math.max(0, Math.min(100, value))} max="100" style={{ width: '100%' }} />
    </div>
  );
}

export default function ParentLearningReportPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [children, setChildren] = useState<ParentLearningChild[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [report, setReport] = useState<ParentLearningReport | null>(null);
  const [status, setStatus] = useState('Parent learning report loads for linked children.');
  const [busy, setBusy] = useState(false);

  async function loadReport(studentId: string) {
    if (!studentId) return;

    setBusy(true);
    setStatus('Loading parent-safe learning report...');

    const result = await fetchParentLearningReport(studentId);

    if (!result.ok) {
      setStatus(`Could not load report: ${result.reason}`);
      setBusy(false);
      return;
    }

    setReport(result.data);
    setStatus('Parent-safe learning report loaded.');
    setBusy(false);
  }

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'parent') {
      setStatus(profile.role === 'guest' ? 'Sign in as a parent to view learning reports.' : 'This page is for parent-safe reports.');
      return;
    }

    const nextChildren = await fetchParentLearningChildren();
    setChildren(nextChildren);

    if (nextChildren.length === 0) {
      setStatus('No linked children found. Link your child from the Parent Portal first.');
      return;
    }

    const firstStudentId = selectedStudentId || nextChildren[0].student_id;
    setSelectedStudentId(firstStudentId);
    await loadReport(firstStudentId);
  }

  async function changeStudent(studentId: string) {
    setSelectedStudentId(studentId);
    await loadReport(studentId);
  }

  useEffect(() => {
    loadPage();
  }, []);

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Parent Learning Report</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/parent-dashboard">Dashboard</a>
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/parent">Parent Portal</a>
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
            <p className="muted">Sign in as a parent to view linked child learning reports.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'parent' && (
          <section className="card">
            <h2>Parent report only</h2>
            <p className="muted">This page is designed for parent-safe summaries. Teacher tools stay separate.</p>
          </section>
        )}

        {role === 'parent' && (
          <>
            <section className="card">
              <h2>Select child</h2>
              {children.length === 0 ? (
                <p className="muted">No linked children found. Go to the Parent Portal and link your child first.</p>
              ) : (
                <label className="label">
                  Linked child
                  <select className="select" value={selectedStudentId} onChange={(event) => changeStudent(event.target.value)}>
                    {children.map((child) => (
                      <option key={child.student_id} value={child.student_id}>
                        {child.student_email}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            {report && (
              <>
                <section className="grid grid3" style={{ marginTop: 18 }}>
                  <div className="card">
                    <h2>Overall progress</h2>
                    <ProgressLine label="Average mastery" value={Number(report.overview.average_mastery || 0)} />
                    <ProgressLine label="Average confidence" value={Number(report.overview.average_confidence || 0)} />
                  </div>

                  <div className="card">
                    <h2>Learning evidence</h2>
                    <p>
                      Skills tracked: <strong>{report.overview.skills_tracked}</strong><br />
                      Total evidence: <strong>{report.overview.total_evidence}</strong><br />
                      Strong skills: <strong>{report.overview.skills_above_70}</strong><br />
                      Needs practice: <strong>{report.overview.skills_below_50}</strong>
                    </p>
                  </div>

                  <div className="card">
                    <h2>Parent summary</h2>
                    <p>{report.parent_message}</p>
                    <p className="muted">{report.overview.safe_note}</p>
                  </div>
                </section>

                <section className="grid grid2" style={{ marginTop: 18 }}>
                  <div className="card">
                    <h2>Strengths</h2>
                    {report.strengths.length === 0 ? (
                      <p className="muted">Not enough strong-skill evidence yet.</p>
                    ) : (
                      <div className="grid">
                        {report.strengths.map((skill: any) => (
                          <div key={skill.course_skill_code} className="card">
                            <h3>{skill.skill_title}</h3>
                            <p>
                              Mastery: <strong>{skill.mastery_percent}%</strong><br />
                              Confidence: <strong>{skill.confidence_percent}%</strong><br />
                              Evidence: <strong>{skill.evidence_count}</strong>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <h2>Recommended practice areas</h2>
                    {report.needs_practice.length === 0 ? (
                      <p className="muted">No urgent practice areas yet.</p>
                    ) : (
                      <div className="grid">
                        {report.needs_practice.map((skill: any) => (
                          <div key={skill.course_skill_code} className="card">
                            <h3>{skill.skill_title}</h3>
                            <p>
                              Mastery: <strong>{skill.mastery_percent}%</strong><br />
                              Confidence: <strong>{skill.confidence_percent}%</strong><br />
                              Next step: {skill.parent_friendly_next_step}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Tutor support summary</h2>
                  <p>
                    Recent tutor evidence: <strong>{report.tutor_summary.recent_tutor_evidence}</strong><br />
                    Teacher-approved evidence: <strong>{report.tutor_summary.approved_evidence}</strong><br />
                    Action needed: <strong>{report.tutor_summary.action_needed}</strong><br />
                    Hints needed: <strong>{report.tutor_summary.hints_needed}</strong><br />
                    Independent steps: <strong>{report.tutor_summary.independent_steps}</strong>
                  </p>
                  <p className="muted">{report.tutor_summary.safe_note}</p>
                </section>

                <section className="card" style={{ marginTop: 18 }}>
                  <h2>Privacy protection</h2>
                  <p className="muted">
                    Raw tutor chats hidden: {report.privacy.raw_tutor_chats_hidden ? 'yes' : 'no'}<br />
                    Teacher private notes hidden: {report.privacy.teacher_private_notes_hidden ? 'yes' : 'no'}<br />
                    Teacher-only review details hidden: {report.privacy.teacher_only_review_details_hidden ? 'yes' : 'no'}
                  </p>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
