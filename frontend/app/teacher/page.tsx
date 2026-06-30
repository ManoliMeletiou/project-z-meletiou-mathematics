'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, portalHomeForRole, ProjectZRole } from '../../lib/projectZAuth';
import {
  createTeacherClass,
  fetchClassMastery,
  fetchClassRoster,
  fetchTeacherClasses,
  ProjectZClass,
  ProjectZClassMasteryRow,
  ProjectZRosterRow
} from '../../lib/projectZClasses';

export default function TeacherPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const [classes, setClasses] = useState<ProjectZClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [roster, setRoster] = useState<ProjectZRosterRow[]>([]);
  const [mastery, setMastery] = useState<ProjectZClassMasteryRow[]>([]);
  const [name, setName] = useState('Year 10 Mathematics');
  const [course, setCourse] = useState('MYP Mathematics');
  const [yearGroup, setYearGroup] = useState('Year 10');
  const [status, setStatus] = useState('Checking teacher access...');

  async function loadRoster(classId: string) {
    if (!classId) return;
    const rosterRows = await fetchClassRoster(classId);
    const masteryRows = await fetchClassMastery(classId);
    setRoster(rosterRows as ProjectZRosterRow[]);
    setMastery(masteryRows as ProjectZClassMasteryRow[]);
  }

  async function loadClasses() {
    const rows = await fetchTeacherClasses();
    const typedRows = rows as ProjectZClass[];
    setClasses(typedRows);

    if (typedRows.length > 0) {
      const firstId = selectedClassId || typedRows[0].id;
      setSelectedClassId(firstId);
      setStatus('Teacher classes loaded from Supabase.');
      await loadRoster(firstId);
    } else {
      setStatus('Teacher Portal loaded. Create a class to begin.');
    }
  }

  useEffect(() => {
    async function load() {
      const profile = await getCurrentProfile();
      setRole(profile.role);
      setEmail(profile.email);
      setAuthLoaded(true);

      if (profile.role !== 'teacher') {
        setStatus(`Access denied. ${profile.role} accounts cannot access the Teacher Portal.`);
        return;
      }

      await loadClasses();
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createClass() {
    if (role !== 'teacher') {
      setStatus('Only teachers can create classes.');
      return;
    }

    setStatus('Creating class...');
    const result = await createTeacherClass(name, course, yearGroup);

    if (!result.ok) {
      setStatus(`Could not create class: ${result.reason}`);
      return;
    }

    setStatus('Class created. Share the join code with students.');
    await loadClasses();
  }

  async function selectClass(classId: string) {
    setSelectedClassId(classId);
    await loadRoster(classId);
  }

  const selectedClass = classes.find((row) => row.id === selectedClassId);

  if (!authLoaded) {
    return (
      <main className="page">
        <div className="container">
          <section className="card">
            <h1>Checking access...</h1>
            <p className="muted">Loading your account role.</p>
          </section>
        </div>
      </main>
    );
  }

  if (role !== 'teacher') {
    return (
      <main className="page">
        <div className="container">
          <section className="card">
            <h1>Access denied</h1>
            <p className="muted">
              You are signed in as {role}. Only teacher accounts can open the Teacher Portal.
            </p>
            {role === 'guest' ? (
              <a className="btn blue" href="/auth">Sign in</a>
            ) : (
              <a className="btn blue" href={portalHomeForRole(role)}>Go to your portal</a>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Teacher Portal</strong>
            <span>{email || 'Teacher'} - teacher-only controls, rosters, analytics, assignments, and reports</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/assignments">Assignments</a>
            <a className="btn secondary" href="/student">Student View</a>
            <a className="btn secondary" href="/parent">Parent Reports</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        <section className="grid grid2">
          <div className="card">
            <h2>Create a class</h2>
            <div className="grid">
              <label className="label">Class name
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="label">Course
                <input className="input" value={course} onChange={(event) => setCourse(event.target.value)} />
              </label>
              <label className="label">Year group
                <input className="input" value={yearGroup} onChange={(event) => setYearGroup(event.target.value)} />
              </label>
              <button className="btn blue" onClick={createClass}>Create class</button>
            </div>
          </div>

          <div className="card">
            <h2>My classes</h2>
            {classes.length === 0 ? (
              <p className="muted">No classes loaded yet. Create one after signing in as a teacher.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Name</th><th>Join code</th><th>Students</th></tr></thead>
                <tbody>
                  {classes.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button
                          className="btn secondary"
                          onClick={() => selectClass(row.id)}
                          style={{ padding: '8px 12px', marginBottom: 8 }}
                        >
                          Open
                        </button>
                        <br />
                        <strong>{row.name}</strong><br />
                        <span className="muted">{row.course} - {row.year_group}</span>
                      </td>
                      <td><strong>{row.join_code}</strong></td>
                      <td>{row.member_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="grid grid2" style={{ marginTop: 18 }}>
          <div className="card">
            <h2>Roster {selectedClass ? `- ${selectedClass.name}` : ''}</h2>
            {roster.length === 0 ? (
              <p className="muted">No students loaded for this class yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Attempts</th>
                    <th>Correct</th>
                    <th>Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((student) => (
                    <tr key={student.student_id}>
                      <td>
                        <strong>{student.display_name || 'Student'}</strong><br />
                        <span className="muted">{student.email}</span>
                      </td>
                      <td>{student.attempts}</td>
                      <td>{student.correct}</td>
                      <td>{student.average_mastery}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2>Class skill analytics</h2>
            {mastery.length === 0 ? (
              <p className="muted">No class mastery data yet. Students need to practise while signed in.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Attempts</th>
                    <th>Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {mastery.map((row) => (
                    <tr key={row.skill_id}>
                      <td>{row.skill_id}</td>
                      <td>{row.total_attempts}</td>
                      <td>{row.average_mastery}%</td>
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
