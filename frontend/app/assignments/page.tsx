'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
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
import {
  AssignmentFile,
  createFileDownloadUrl,
  fetchAssignmentFiles,
  uploadAssignmentDocument,
  uploadStudentReturn
} from '../../lib/projectZFiles';

export default function AssignmentsPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [classes, setClasses] = useState<ProjectZClass[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [assignmentFiles, setAssignmentFiles] = useState<AssignmentFile[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [title, setTitle] = useState('Quadratic factorising practice');
  const [instructions, setInstructions] = useState('Download the document, complete your work, and upload your return file.');
  const [skillId, setSkillId] = useState('quad_fact');
  const [difficulty, setDifficulty] = useState(2);
  const [answer, setAnswer] = useState('');
  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [studentFiles, setStudentFiles] = useState<Record<string, File | null>>({});
  const [status, setStatus] = useState('Assignments load from Supabase when signed in.');

  async function loadFiles(assignmentId: string) {
    if (!assignmentId) return;
    const rows = (await fetchAssignmentFiles(assignmentId)) as AssignmentFile[];
    setAssignmentFiles(rows);
  }

  async function loadAll() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role === 'teacher') {
      const classRows = (await fetchTeacherClasses()) as ProjectZClass[];
      const teacherRows = (await fetchTeacherAssignments()) as TeacherAssignment[];

      setClasses(classRows);
      setTeacherAssignments(teacherRows);
      setStudentAssignments([]);

      if (classRows.length > 0 && !selectedClassId) {
        setSelectedClassId(classRows[0].id);
      }

      const firstAssignmentId = selectedAssignmentId || teacherRows[0]?.id || '';
      if (firstAssignmentId) {
        setSelectedAssignmentId(firstAssignmentId);
        const submissionRows = (await fetchAssignmentSubmissions(firstAssignmentId)) as AssignmentSubmission[];
        setSubmissions(submissionRows);
        await loadFiles(firstAssignmentId);
      }

      setStatus('Teacher assignment tools loaded from Supabase.');
      return;
    }

    if (profile.role === 'student') {
      const studentRows = (await fetchStudentAssignments()) as StudentAssignment[];

      setClasses([]);
      setTeacherAssignments([]);
      setStudentAssignments(studentRows);
      setSubmissions([]);

      const firstAssignmentId = selectedAssignmentId || studentRows[0]?.id || '';
      if (firstAssignmentId) {
        setSelectedAssignmentId(firstAssignmentId);
        await loadFiles(firstAssignmentId);
      }

      setStatus('Student assignment tools loaded from Supabase.');
      return;
    }

    if (profile.role === 'parent') {
      setStatus('Parent accounts can view reports, not create or submit assignments.');
      return;
    }

    setStatus('Sign in to access your role-specific assignment portal.');
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateAssignment() {
    if (role !== 'teacher') {
      setStatus('Only teachers can create assignments.');
      return;
    }

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

  async function openAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);

    if (role === 'teacher') {
      const rows = (await fetchAssignmentSubmissions(assignmentId)) as AssignmentSubmission[];
      setSubmissions(rows);
    }

    await loadFiles(assignmentId);
  }

  async function handleTeacherFileUpload() {
    if (role !== 'teacher') {
      setStatus('Only teachers can upload teacher documents.');
      return;
    }

    if (!selectedAssignmentId) {
      setStatus('Open an assignment first.');
      return;
    }

    if (!teacherFile) {
      setStatus('Choose a teacher document first.');
      return;
    }

    setStatus('Uploading teacher document...');
    const result = await uploadAssignmentDocument(selectedAssignmentId, teacherFile);

    if (!result.ok) {
      setStatus(`Could not upload document: ${result.reason}`);
      return;
    }

    setTeacherFile(null);
    setStatus('Teacher document uploaded.');
    await loadFiles(selectedAssignmentId);
  }

  async function handleStudentReturnUpload(assignmentId: string) {
    if (role !== 'student') {
      setStatus('Only students can upload return files.');
      return;
    }

    const file = studentFiles[assignmentId];

    if (!file) {
      setStatus('Choose a return file first.');
      return;
    }

    setStatus('Uploading student return file...');
    const result = await uploadStudentReturn(assignmentId, file);

    if (!result.ok) {
      setStatus(`Could not upload return file: ${result.reason}`);
      return;
    }

    setStudentFiles((current) => ({ ...current, [assignmentId]: null }));
    setStatus('Student return file uploaded.');
    await openAssignment(assignmentId);
  }

  async function handleSubmitAssignment(assignmentId: string) {
    if (role !== 'student') {
      setStatus('Only students can submit assignment responses.');
      return;
    }

    setStatus('Submitting text response...');
    const result = await submitAssignment(assignmentId, answer || 'Submitted with file upload.');

    if (!result.ok) {
      setStatus(`Could not submit assignment: ${result.reason}`);
      return;
    }

    setAnswer('');
    setStatus('Text response submitted.');
    await loadAll();
  }

  async function downloadFile(file: AssignmentFile) {
    setStatus('Creating download link...');
    const result = await createFileDownloadUrl(file.file_path);

    if (!result.ok || !result.url) {
      setStatus(`Could not download file: ${result.reason}`);
      return;
    }

    window.open(result.url, '_blank', 'noopener,noreferrer');
    setStatus(`Download opened for ${file.file_name}.`);
  }

  const teacherFiles = assignmentFiles.filter((file) => file.kind === 'teacher_attachment');
  const returnFiles = assignmentFiles.filter((file) => file.kind === 'student_return');

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>{role === 'teacher' ? 'Teacher Assignments' : role === 'student' ? 'Student Assignments' : 'Assignments'}</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            {role === 'teacher' && <a className="btn secondary" href="/teacher">Teacher Portal</a>}
            {role === 'student' && <a className="btn secondary" href="/student">Student Portal</a>}
            {role === 'parent' && <a className="btn secondary" href="/parent">Parent Portal</a>}
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'teacher' && (
          <>
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
                            <button className="btn secondary" onClick={() => openAssignment(row.id)} style={{ padding: '8px 12px', marginBottom: 8 }}>
                              Open
                            </button>
                            <br />
                            <strong>{row.title}</strong><br />
                            <span className="muted">{row.skill_id} - difficulty {row.difficulty}</span>
                          </td>
                          <td>{row.class_name}</td>
                          <td>{row.submission_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <hr />
                <h3>Upload teacher document</h3>
                <p className="muted">Open an assignment, choose a document, then upload it for students to download.</p>
                <input className="input" type="file" onChange={(event) => setTeacherFile(event.target.files?.[0] || null)} />
                <button className="btn blue" onClick={handleTeacherFileUpload} style={{ marginTop: 12 }}>
                  Upload document
                </button>
              </div>
            </section>

            <section className="grid grid2" style={{ marginTop: 18 }}>
              <FilePanel
                teacherFiles={teacherFiles}
                returnFiles={returnFiles}
                submissions={submissions}
                canSeeReturns={true}
                downloadFile={downloadFile}
              />
            </section>
          </>
        )}

        {role === 'student' && (
          <section className="grid grid2">
            <div className="card">
              <h2>My assignments</h2>
              {studentAssignments.length === 0 ? (
                <p className="muted">No student assignments yet.</p>
              ) : (
                <div className="grid">
                  <textarea
                    className="input"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    rows={3}
                    placeholder="Optional text response. You can also upload a return file below."
                  />

                  <table className="table">
                    <thead>
                      <tr>
                        <th>Assignment</th>
                        <th>Class</th>
                        <th>Submit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAssignments.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.title}</strong><br />
                            <span className="muted">{row.instructions}</span><br />
                            <span className="muted">{row.submitted ? 'Text submitted' : 'No text submission yet'}</span>
                          </td>
                          <td>{row.class_name}</td>
                          <td>
                            <button className="btn secondary" onClick={() => openAssignment(row.id)} style={{ marginBottom: 8 }}>
                              Open files
                            </button>
                            <br />
                            <button className="btn blue" onClick={() => handleSubmitAssignment(row.id)} style={{ marginBottom: 8 }}>
                              Submit text
                            </button>
                            <br />
                            <input
                              className="input"
                              type="file"
                              onChange={(event) => setStudentFiles((current) => ({
                                ...current,
                                [row.id]: event.target.files?.[0] || null
                              }))}
                            />
                            <button className="btn blue" onClick={() => handleStudentReturnUpload(row.id)} style={{ marginTop: 8 }}>
                              Upload return file
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <FilePanel
              teacherFiles={teacherFiles}
              returnFiles={returnFiles}
              submissions={[]}
              canSeeReturns={false}
              downloadFile={downloadFile}
            />
          </section>
        )}

        {role === 'parent' && (
          <section className="card">
            <h2>Parent assignment view</h2>
            <p className="muted">Parents can view progress reports in the parent portal. They do not create assignments or submit student work.</p>
            <a className="btn blue" href="/parent">Go to Parent Portal</a>
          </section>
        )}

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in to see the correct assignment portal for your role.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}
      </div>
    </main>
  );
}

function FilePanel({
  teacherFiles,
  returnFiles,
  submissions,
  canSeeReturns,
  downloadFile
}: {
  teacherFiles: AssignmentFile[];
  returnFiles: AssignmentFile[];
  submissions: AssignmentSubmission[];
  canSeeReturns: boolean;
  downloadFile: (file: AssignmentFile) => Promise<void>;
}) {
  return (
    <div className="card">
      <h2>Files for opened assignment</h2>

      <h3>Teacher documents</h3>
      {teacherFiles.length === 0 ? (
        <p className="muted">No teacher documents uploaded yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>File</th>
              <th>Uploaded by</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {teacherFiles.map((file) => (
              <tr key={file.id}>
                <td>{file.file_name}</td>
                <td>{file.uploader_name}</td>
                <td>
                  <button className="btn secondary" onClick={() => downloadFile(file)}>Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canSeeReturns && (
        <>
          <hr />
          <h3>Student return files</h3>
          {returnFiles.length === 0 ? (
            <p className="muted">No student return files uploaded yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Student</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {returnFiles.map((file) => (
                  <tr key={file.id}>
                    <td>{file.file_name}</td>
                    <td>
                      {file.uploader_name}<br />
                      <span className="muted">{file.uploader_email}</span>
                    </td>
                    <td>
                      <button className="btn secondary" onClick={() => downloadFile(file)}>Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <hr />
          <h3>Text submissions</h3>
          {submissions.length === 0 ? (
            <p className="muted">No text submissions loaded for the selected assignment.</p>
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
        </>
      )}
    </div>
  );
}
