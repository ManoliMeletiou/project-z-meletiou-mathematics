'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchOwnReportOverview,
  fetchParentReportChildren,
  fetchStudentReportOverview,
  fetchStudentReportSkills,
  fetchTeacherReportStudents,
  ParentReportChild,
  StudentReportOverview,
  StudentReportSkill,
  TeacherReportStudent
} from '../../lib/projectZReports';

function percentValue(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0%';
  return `${Number(value).toFixed(0)}%`;
}

function bandClass(band: string) {
  const lower = band.toLowerCase();
  if (lower.includes('weak')) return 'notice';
  if (lower.includes('developing')) return 'card';
  if (lower.includes('strong')) return 'card';
  return 'card';
}

export default function ReportsPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [ownReport, setOwnReport] = useState<StudentReportOverview | null>(null);
  const [teacherStudents, setTeacherStudents] = useState<TeacherReportStudent[]>([]);
  const [parentChildren, setParentChildren] = useState<ParentReportChild[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<StudentReportOverview | null>(null);
  const [skills, setSkills] = useState<StudentReportSkill[]>([]);
  const [status, setStatus] = useState('Reports load when signed in.');

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role === 'guest') {
      setStatus('Sign in to view reports.');
      return;
    }

    if (profile.role === 'student') {
      const overview = await fetchOwnReportOverview();
      const skillRows = await fetchStudentReportSkills();
      setOwnReport(overview);
      setSelectedReport(overview);
      setSkills(skillRows);
      setStatus('Student report loaded from diagnostic, practice, mastery, skill path, XP, and streak data.');
      return;
    }

    if (profile.role === 'teacher') {
      const rows = await fetchTeacherReportStudents();
      setTeacherStudents(rows);
      setStatus(rows.length ? 'Teacher class reports loaded.' : 'No student reports found yet. Check that students have joined your classes.');
      return;
    }

    if (profile.role === 'parent') {
      const rows = await fetchParentReportChildren();
      setParentChildren(rows);
      setStatus(rows.length ? 'Parent child reports loaded.' : 'No linked child reports found yet.');
      return;
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function selectStudent(studentId: string) {
    setSelectedStudentId(studentId);
    setStatus('Loading detailed student report...');

    const overview = await fetchStudentReportOverview(studentId);
    const skillRows = await fetchStudentReportSkills(studentId);

    setSelectedReport(overview);
    setSkills(skillRows);
    setStatus('Detailed report loaded.');
  }

  const weakestSkills = useMemo(
    () => skills.filter((skill) => skill.skill_band.includes('Weak') || skill.skill_band.includes('Low') || skill.skill_band.includes('No evidence')).slice(0, 8),
    [skills]
  );

  const strongSkills = useMemo(
    () => skills.filter((skill) => skill.skill_band.includes('Strong')).slice(0, 8),
    [skills]
  );

  const rosterForDisplay = teacherStudents.map((student) => ({
    student_id: student.student_id,
    student_name: student.student_name,
    student_email: student.student_email,
    course_display_name: student.course_display_name,
    average_mastery: student.average_mastery,
    average_confidence: student.average_confidence,
    weak_skill_count: student.weak_skill_count,
    developing_skill_count: student.developing_skill_count,
    strong_skill_count: student.strong_skill_count,
    total_diagnostic_attempts: student.total_diagnostic_attempts,
    total_practice_attempts: student.total_practice_attempts,
    urgent_next_step: student.urgent_next_step,
    group_label: student.class_name
  }));

  const childrenForDisplay = parentChildren.map((child) => ({
    student_id: child.student_id,
    student_name: child.student_name,
    student_email: child.student_email,
    course_display_name: child.course_display_name,
    average_mastery: child.average_mastery,
    average_confidence: child.average_confidence,
    weak_skill_count: child.weak_skill_count,
    developing_skill_count: child.developing_skill_count,
    strong_skill_count: child.strong_skill_count,
    total_diagnostic_attempts: child.total_diagnostic_attempts,
    total_practice_attempts: child.total_practice_attempts,
    urgent_next_step: child.urgent_next_step,
    group_label: `XP ${child.total_xp} - streak ${child.current_streak}`
  }));

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Learning Reports</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            {role === 'student' && <a className="btn secondary" href="/student">Student Portal</a>}
            {role === 'student' && <a className="btn secondary" href="/path">Skill Path</a>}
            {role === 'teacher' && <a className="btn secondary" href="/teacher">Teacher Portal</a>}
            {role === 'parent' && <a className="btn secondary" href="/parent">Parent Portal</a>}
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
            <p className="muted">Sign in to view your available reports.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role === 'student' && ownReport && (
          <ReportOverview report={ownReport} />
        )}

        {role === 'teacher' && (
          <section className="card">
            <h2>Teacher class reports</h2>
            <p className="muted">Only students in your own classes are shown.</p>
            <ReportTable rows={rosterForDisplay} onSelect={selectStudent} selectedStudentId={selectedStudentId} />
          </section>
        )}

        {role === 'parent' && (
          <section className="card">
            <h2>Parent child reports</h2>
            <p className="muted">Only linked children are shown.</p>
            <ReportTable rows={childrenForDisplay} onSelect={selectStudent} selectedStudentId={selectedStudentId} />
          </section>
        )}

        {selectedReport && role !== 'student' && (
          <ReportOverview report={selectedReport} />
        )}

        {selectedReport && (
          <>
            <section className="grid grid2" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Highest priority skills</h2>
                {weakestSkills.length === 0 ? (
                  <p className="muted">No weak skills identified yet, or more evidence is needed.</p>
                ) : (
                  <SkillTable skills={weakestSkills} />
                )}
              </div>

              <div className="card">
                <h2>Strong skills</h2>
                {strongSkills.length === 0 ? (
                  <p className="muted">Strong skills will appear after enough correct evidence is collected.</p>
                ) : (
                  <SkillTable skills={strongSkills} />
                )}
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Full skill report</h2>
              <SkillTable skills={skills.slice(0, 30)} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ReportOverview({ report }: { report: StudentReportOverview }) {
  return (
    <section className="grid grid3" style={{ marginTop: 18 }}>
      <div className="card">
        <h2>{report.student_name}</h2>
        <p className="muted">{report.student_email}</p>
        <p>
          Course: <strong>{report.course_display_name || 'No course selected'}</strong><br />
          Generated: {new Date(report.report_generated_at).toLocaleString()}
        </p>
      </div>

      <div className="card">
        <h2>Mastery</h2>
        <p>
          Average mastery: <strong>{percentValue(report.average_mastery)}</strong><br />
          Average confidence: <strong>{percentValue(report.average_confidence)}</strong><br />
          Diagnostic attempts: {report.total_diagnostic_attempts}<br />
          Practice attempts: {report.total_practice_attempts}
        </p>
      </div>

      <div className="card">
        <h2>Next step</h2>
        <p className="muted">{report.urgent_next_step}</p>
        <p>
          XP: <strong>{report.total_xp}</strong><br />
          Streak: <strong>{report.current_streak}</strong> current / {report.longest_streak} longest
        </p>
      </div>

      <div className="card">
        <h2>Skill balance</h2>
        <p>
          Weak: {report.weak_skill_count}<br />
          Developing: {report.developing_skill_count}<br />
          Strong: {report.strong_skill_count}
        </p>
      </div>

      <div className="card">
        <h2>Path status</h2>
        <p>
          Ready: {report.ready_skill_count}<br />
          Locked: {report.locked_skill_count}<br />
          Mastered/review: {report.mastered_review_count}
        </p>
      </div>

      <div className="card">
        <h2>Accuracy rule</h2>
        <p className="muted">
          This report is based on evidence, not a single answer. Low evidence remains visible so teachers and parents do not over-trust weak data.
        </p>
      </div>
    </section>
  );
}

type DisplayReportRow = {
  student_id: string;
  student_name: string;
  student_email: string;
  course_display_name: string | null;
  average_mastery: number;
  average_confidence: number;
  weak_skill_count: number;
  developing_skill_count: number;
  strong_skill_count: number;
  total_diagnostic_attempts: number;
  total_practice_attempts: number;
  urgent_next_step: string;
  group_label: string;
};

function ReportTable({
  rows,
  onSelect,
  selectedStudentId
}: {
  rows: DisplayReportRow[];
  onSelect: (studentId: string) => void;
  selectedStudentId: string | null;
}) {
  if (rows.length === 0) {
    return <p className="muted">No reports available yet.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Student</th>
          <th>Group</th>
          <th>Course</th>
          <th>Mastery</th>
          <th>Weak</th>
          <th>Evidence</th>
          <th>Next step</th>
          <th>Open</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.group_label}-${row.student_id}`}>
            <td>
              <strong>{row.student_name}</strong><br />
              <span className="muted">{row.student_email}</span>
            </td>
            <td>{row.group_label}</td>
            <td>{row.course_display_name || 'No course'}</td>
            <td>
              {percentValue(row.average_mastery)}<br />
              <span className="muted">Conf. {percentValue(row.average_confidence)}</span>
            </td>
            <td>{row.weak_skill_count}</td>
            <td>
              D: {row.total_diagnostic_attempts}<br />
              P: {row.total_practice_attempts}
            </td>
            <td>{row.urgent_next_step}</td>
            <td>
              <button className={selectedStudentId === row.student_id ? 'btn blue' : 'btn secondary'} onClick={() => onSelect(row.student_id)}>
                View
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SkillTable({ skills }: { skills: StudentReportSkill[] }) {
  if (skills.length === 0) {
    return <p className="muted">No skill evidence yet.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Skill</th>
          <th>Band</th>
          <th>Mastery</th>
          <th>Evidence</th>
          <th>Next step</th>
        </tr>
      </thead>
      <tbody>
        {skills.map((skill) => (
          <tr key={skill.course_skill_code}>
            <td>{skill.priority_rank}</td>
            <td>
              <strong>{skill.title}</strong><br />
              <span className="muted">
                {skill.strand_title}
                {skill.assessment_criterion ? ` - Criterion ${skill.assessment_criterion}` : ''}
              </span>
            </td>
            <td>
              <span className={bandClass(skill.skill_band)}>{skill.skill_band}</span>
            </td>
            <td>
              {percentValue(skill.mastery_percent)}<br />
              <span className="muted">Conf. {percentValue(skill.confidence_percent)}</span>
            </td>
            <td>{skill.correct_count}/{skill.evidence_count}</td>
            <td>{skill.next_step}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
