'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  ExportChild,
  ExportTeacherStudent,
  fetchExportParentChildren,
  fetchExportParentReport,
  fetchExportTeacherReport,
  fetchExportTeacherStudents
} from '../../lib/projectZExportReports';

function percent(value: unknown) {
  const numberValue = Number(value || 0);
  return `${Math.round(numberValue * 10) / 10}%`;
}

function ReportTable({ title, rows, mode }: { title: string; rows: any[]; mode: 'strengths' | 'needs' | 'actions' }) {
  return (
    <section className="card report-section">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">No items to show yet.</p>
      ) : (
        <table className="table print-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Evidence</th>
              <th>Mastery / strength</th>
              <th>Next step / notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.course_skill_code || row.skill_title || index}-${index}`}>
                <td>
                  <strong>{row.skill_title || row.course_skill_code || 'Skill'}</strong><br />
                  <span className="muted">{row.course_code || row.course_skill_code || row.evidence_type}</span>
                </td>
                <td>{row.evidence_count ?? row.evidence_strength ?? '-'}</td>
                <td>
                  {mode === 'actions'
                    ? row.teacher_review_status || row.evidence_type
                    : `${percent(row.mastery_percent)} mastery / ${percent(row.confidence_percent)} confidence`}
                </td>
                <td>{row.parent_friendly_next_step || row.teacher_next_step || row.teacher_review_notes || row.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function ExportReportsPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [parentChildren, setParentChildren] = useState<ExportChild[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<ExportTeacherStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reportKind, setReportKind] = useState<'parent' | 'teacher'>('parent');
  const [report, setReport] = useState<any>(null);
  const [status, setStatus] = useState('Export reports load for parents and teachers.');
  const [busy, setBusy] = useState(false);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role === 'parent') {
      setReportKind('parent');
      const children = await fetchExportParentChildren();
      setParentChildren(children);

      if (children.length === 0) {
        setStatus('No linked children found. Link your child from the Parent Portal first.');
        return;
      }

      const firstStudentId = selectedStudentId || children[0].student_id;
      setSelectedStudentId(firstStudentId);
      await loadReport('parent', firstStudentId);
      return;
    }

    if (profile.role === 'teacher') {
      setReportKind('teacher');
      const students = await fetchExportTeacherStudents();
      setTeacherStudents(students);

      if (students.length === 0) {
        setStatus('No students found in your classes yet.');
        return;
      }

      const firstStudentId = selectedStudentId || students[0].student_id;
      setSelectedStudentId(firstStudentId);
      await loadReport('teacher', firstStudentId);
      return;
    }

    setStatus(profile.role === 'guest' ? 'Sign in as a parent or teacher to export reports.' : 'Export reports are available for parents and teachers only.');
  }

  async function loadReport(kind: 'parent' | 'teacher', studentId: string) {
    if (!studentId) return;

    setBusy(true);
    setReport(null);
    setStatus(`Loading ${kind} export report...`);

    const result = kind === 'parent'
      ? await fetchExportParentReport(studentId)
      : await fetchExportTeacherReport(studentId);

    if (!result.ok) {
      setStatus(`Could not load report: ${result.reason}`);
      setBusy(false);
      return;
    }

    setReport(result.data);
    setStatus(`${kind === 'parent' ? 'Parent-safe' : 'Teacher-internal'} export report loaded.`);
    setBusy(false);
  }

  async function changeStudent(studentId: string) {
    setSelectedStudentId(studentId);
    await loadReport(reportKind, studentId);
  }

  function printReport() {
    window.print();
  }

  async function copySummary() {
    if (!report) return;

    const text = [
      `Project Z ${reportKind === 'parent' ? 'Parent Learning Report' : 'Teacher Internal Report'}`,
      `Student: ${report.student?.student_name || report.child?.student_name || 'Student'}`,
      `Email: ${report.student?.student_email || report.child?.student_email || '-'}`,
      `Average mastery: ${report.overview?.average_mastery || 0}%`,
      `Average confidence: ${report.overview?.average_confidence || 0}%`,
      report.parent_message || report.teacher_message || '',
      `Generated: ${report.generated_at || new Date().toISOString()}`
    ].join('\n');

    await navigator.clipboard.writeText(text);
    setStatus('Report summary copied.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  const selectorRows = useMemo(() => {
    if (reportKind === 'parent') {
      return parentChildren.map((child) => ({
        id: child.student_id,
        label: child.student_email
      }));
    }

    return teacherStudents.map((student) => ({
      id: student.student_id,
      label: `${student.student_email} - ${student.class_label}`
    }));
  }, [reportKind, parentChildren, teacherStudents]);

  const reportTitle = reportKind === 'parent'
    ? 'Parent Learning Report'
    : 'Teacher Internal Learning Report';

  const child = report?.child || report?.student;
  const tutorSummary = report?.tutor_summary || report?.tutor_review_summary || {};

  return (
    <main className="page">
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .page {
            padding: 0 !important;
          }
          .container {
            max-width: 100% !important;
          }
          .card {
            break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          .report-section {
            page-break-inside: avoid;
          }
          .print-table {
            font-size: 11px;
          }
          a {
            color: black !important;
            text-decoration: none !important;
          }
        }
      `}</style>

      <div className="container">
        <nav className="nav no-print">
          <div className="brand">
            <strong>Export Reports</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            {role === 'parent' && <a className="btn secondary" href="/parent-learning-report">Parent Report</a>}
            {role === 'teacher' && <a className="btn secondary" href="/teacher-tutor-evidence">Teacher Evidence</a>}
            <a className="btn secondary" href="/reports">Reports</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice no-print" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a parent or teacher to export reports.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && !['parent', 'teacher'].includes(role) && (
          <section className="card">
            <h2>Reports unavailable</h2>
            <p className="muted">Exportable reports are available to parents and teachers.</p>
          </section>
        )}

        {['parent', 'teacher'].includes(role) && (
          <>
            <section className="card no-print">
              <h2>Choose report</h2>
              <p className="muted">
                Parent reports are privacy-safe. Teacher reports are internal and may include teacher review signals.
              </p>

              <label className="label">
                Student
                <select className="select" value={selectedStudentId} onChange={(event) => changeStudent(event.target.value)}>
                  {selectorRows.length === 0 ? (
                    <option value="">No students available</option>
                  ) : (
                    selectorRows.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.label}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className="navLinks">
                <button className="btn blue" disabled={busy || !report} onClick={printReport}>
                  Print / Save as PDF
                </button>
                <button className="btn secondary" disabled={busy || !report} onClick={copySummary}>
                  Copy summary
                </button>
              </div>
            </section>

            {report && (
              <article className="card" style={{ marginTop: 18 }}>
                <header className="report-section" style={{ marginBottom: 18 }}>
                  <p className="muted">Project Z - Meletiou Mathematics</p>
                  <h1>{reportTitle}</h1>
                  <p>
                    Student: <strong>{child?.student_name || 'Student'}</strong><br />
                    Email: <strong>{child?.student_email || '-'}</strong><br />
                    Generated: <strong>{new Date(report.generated_at || Date.now()).toLocaleString()}</strong>
                  </p>
                </header>

                <section className="grid grid3 report-section">
                  <div className="card">
                    <h2>Average mastery</h2>
                    <p className="stat">{percent(report.overview?.average_mastery)}</p>
                  </div>
                  <div className="card">
                    <h2>Average confidence</h2>
                    <p className="stat">{percent(report.overview?.average_confidence)}</p>
                  </div>
                  <div className="card">
                    <h2>Evidence</h2>
                    <p>
                      Skills tracked: <strong>{report.overview?.skills_tracked || 0}</strong><br />
                      Total evidence: <strong>{report.overview?.total_evidence || 0}</strong><br />
                      Strong skills: <strong>{report.overview?.skills_above_70 || 0}</strong><br />
                      Skills below 50%: <strong>{report.overview?.skills_below_50 || 0}</strong>
                    </p>
                  </div>
                </section>

                <section className="card report-section" style={{ marginTop: 18 }}>
                  <h2>Summary</h2>
                  <p>{report.parent_message || report.teacher_message}</p>
                  <p className="muted">{report.overview?.safe_note || report.overview?.teacher_note}</p>
                </section>

                <ReportTable title="Strengths" rows={report.strengths || []} mode="strengths" />
                <ReportTable title="Recommended practice areas" rows={report.needs_practice || []} mode="needs" />

                <section className="card report-section">
                  <h2>{reportKind === 'parent' ? 'Tutor support summary' : 'Tutor evidence review summary'}</h2>
                  <p>
                    Recent tutor evidence: <strong>{tutorSummary.recent_tutor_evidence || 0}</strong><br />
                    Approved evidence: <strong>{tutorSummary.approved_evidence || 0}</strong><br />
                    Action needed: <strong>{tutorSummary.action_needed || 0}</strong><br />
                    Misconceptions: <strong>{tutorSummary.misconceptions || 0}</strong><br />
                    Hints needed: <strong>{tutorSummary.hints_needed || 0}</strong><br />
                    Independent steps: <strong>{tutorSummary.independent_steps || 0}</strong>
                  </p>
                  {tutorSummary.safe_note && <p className="muted">{tutorSummary.safe_note}</p>}
                </section>

                {reportKind === 'teacher' && (
                  <ReportTable title="Teacher action items" rows={report.action_items || []} mode="actions" />
                )}

                <section className="card report-section">
                  <h2>Privacy and use</h2>
                  {reportKind === 'parent' ? (
                    <p className="muted">
                      This is a parent-safe summary. Raw tutor chats, teacher private notes, and teacher-only review details are hidden.
                      Mastery signals are not final grades.
                    </p>
                  ) : (
                    <p className="muted">
                      This is a teacher-internal report. It supports teacher judgement and should not replace professional assessment decisions.
                      Raw tutor chats are not included.
                    </p>
                  )}
                </section>
              </article>
            )}
          </>
        )}
      </div>
    </main>
  );
}
