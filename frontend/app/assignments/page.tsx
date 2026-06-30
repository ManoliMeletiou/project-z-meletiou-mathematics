'use client';

import { useEffect, useState } from 'react';
import { fetchTeacherClasses, ProjectZClass } from '../../lib/projectZClasses';
import {
  AssignmentSubmission,
  createAssignment,
  fetchAssignmentSubmissions,
  fetchStudentAssignments,
  fetchTeacherAssignments,
  StudentAssignment,
  submitAssignment,
  TeacherAssignment
} from '../../lib/projectZAssignments';

export default function AssignmentsPage() {
  const [classes, setClasses] = useState<ProjectZClass[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [title, setTitle] = useState('Quadratic factorising practice');
  const [instructions, setInstructions] = useState('Complete the assigned practice and submit your answer.');
  const [skillId, setSkillId] = useState('quad_fact');
  const [difficulty, setDifficulty] = useState(2);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('Assignments load from Supabase when signed in.');

  async function loadAll() {
    const classRows = (await fetchTeacherClasses()) as ProjectZClass[];
    const teacherRows = (await fetchTeacherAssignments()) as TeacherAssignment[];
    const studentRows = (await fetchStudentAssignments()) as StudentAssignment[];

    setClasses(classRows);
    setTeacherAssignments(teacherRows);
    setStudentAssignments(studentRows);

    if (classRows.length > 0 && !selectedClassId) {
      setSelectedClassId(classRows[0].id);
    }

    if (teacherRows.length > 0 && !selectedAssignmentId) {
      setSelectedAssignmentId(teacherRows[0].id);
      const submissionRows = (await fetchAssignmentSubmissions(teacherRows[0].id)) as AssignmentSubmission[];
      setSubmissions(submissionRows);
    }

    setStatus('Assignments loaded from Supabase.');
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateAssignment() {
    if (!selectedClassId) {
      setStatus('Create or select a class first.');
      return;
    }

    setStatus('Creating assignment...');
    const result = await createAssignment(selectedClassId, title, instructions, skillId, difficulty);

    if (!result.ok) {
      setStatus(`Could not create assignment: ${result.reason}`);
      return;
    }

    setStatus('Assignment created.');
    await loadAll();
  }

  async function handleSubmitAssignment(assignmentId: string) {
    setStatus('Submitting assignment...');
    const result = await submitAssignment(assignmentId, answer);

    if (!result.ok) {
      setStatus(`Could not submit assignment: ${result.reason}`);
      return;
    }

    setAnswer('');
    setStatus('Assignment submitted.');
    await loadAll();
  }

  async function openSubmissions(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    const rows = (await fetchAssignmentSubmissions(assignmentId)) as AssignmentSubmission[];
    setSubmissions(rows);
  }

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Assignments</strong>
            <span>Teacher assignment creation and student submissions</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/teacher">Teacher</a>
            <a className="btn secondary" href="/dashboard">Student</a>
            <a className="btn secondary" href="/classes">Join Class</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        <section className="grid grid2">
          <div className="card">
            <h2>Create assignment</h2>
            <div className="grid">
              <label className="label">
                Class
                <select className="select" value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                  <option value="">Select a class</option>
                  {classes.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </label>

              <label className="label">
                Title
                <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>

              <label className="label">
                Instructions
                <textarea className="input" value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={4} />
              </label>

              <label className="label">
                Skill
                <select className="select" value={skillId} onChange={(event) => setSkillId(event.target.value)}>
                  <option value="quad_fact">Quadratic factorising</option>
                  <option value="linear_eq">Linear equations</option>
                </select>
              </label>

              <label className="label">
                Difficulty
                <select className="select" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))}>
                  <option value={1}>Foundation</option>
                  <option value={2}>Core</option>
                  <option value={3}>Challenge</option>
                </select>
              </label>

              <button className="btn blue" onClick={handleCreateAssignment}>Create assignment</button>
            </div>
          </div>

          <div className="card">
            <h2>Teacher assignments</h2>
            {teacherAssignments.length === 0 ? (
              <p className="muted">No teacher assignments yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Class</th>
                    <th>Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherAssignments.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button className="btn secondary" onClick={() => openSubmissions(row.id)} style={{ padding: '8px 12px', marginBottom: 8 }}>
                          Open
                        </button>
                        <br />
                        <strong>{row.title}</strong><br />
                        <span className="muted">{row.skill_id} · difficulty {row.difficulty}</span>
                      </td>
                      <td>{row.class_name}</td>
                      <td>{row.submission_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="grid grid2" style={{ marginTop: 18 }}>
          <div className="card">
            <h2>Student assignments</h2>
            {studentAssignments.length === 0 ? (
              <p className="muted">No student assignments yet.</p>
            ) : (
              <div className="grid">
                <textarea
                  className="input"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={3}
                  placeholder="Write your answer here, then submit under the correct assignment."
                />

                <table className="table">
                  <thead>
                    <tr>
                      <th>Assignment</th>
                      <th>Class</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAssignments.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.title}</strong><br />
                          <span className="muted">{row.instructions}</span><br />
                          <button className="btn blue" onClick={() => handleSubmitAssignment(row.id)} style={{ marginTop: 8 }}>
                            Submit
                          </button>
                        </td>
                        <td>{row.class_name}</td>
                        <td>{row.submitted ? 'Submitted' : 'Not submitted'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Submissions</h2>
            {submissions.length === 0 ? (
              <p className="muted">No submissions loaded for the selected assignment.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Answer</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((row) => (
                    <tr key={row.submission_id}>
                      <td>
                        <strong>{row.student_name}</strong><br />
                        <span className="muted">{row.student_email}</span>
                      </td>
                      <td>{row.answer}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
