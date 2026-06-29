'use client';

import { useEffect, useState } from 'react';
import { createTeacherClass, fetchTeacherClasses, ProjectZClass } from '../../lib/projectZClasses';

export default function TeacherPage() {
  const [classes, setClasses] = useState<ProjectZClass[]>([]);
  const [name, setName] = useState('Year 10 Mathematics');
  const [course, setCourse] = useState('MYP Mathematics');
  const [yearGroup, setYearGroup] = useState('Year 10');
  const [status, setStatus] = useState('Sign in as a teacher to create and load classes.');

  async function loadClasses() {
    const rows = await fetchTeacherClasses();
    setClasses(rows as ProjectZClass[]);
    if (rows.length > 0) setStatus('Teacher classes loaded from Supabase.');
  }

  useEffect(() => {
    loadClasses();
  }, []);

  async function createClass() {
    setStatus('Creating class...');
    const result = await createTeacherClass(name, course, yearGroup);
    if (!result.ok) {
      setStatus(`Could not create class: ${result.reason}`);
      return;
    }
    setStatus('Class created. Share the join code with students.');
    await loadClasses();
  }

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Teacher Dashboard</strong>
            <span>Class intelligence and roster management</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
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
                      <td>{row.name}<br /><span className="muted">{row.course} · {row.year_group}</span></td>
                      <td><strong>{row.join_code}</strong></td>
                      <td>{row.member_count || 0}</td>
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
