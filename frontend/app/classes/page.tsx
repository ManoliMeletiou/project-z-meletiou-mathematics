'use client';

import { useEffect, useState } from 'react';
import { fetchStudentClasses, joinClass, ProjectZClass } from '../../lib/projectZClasses';

export default function ClassesPage() {
  const [joinCode, setJoinCode] = useState('');
  const [classes, setClasses] = useState<ProjectZClass[]>([]);
  const [status, setStatus] = useState('Sign in as a student, then enter a class join code.');

  async function loadClasses() {
    const rows = await fetchStudentClasses();
    setClasses(rows as ProjectZClass[]);
    if (rows.length > 0) setStatus('Student classes loaded from Supabase.');
  }

  useEffect(() => {
    loadClasses();
  }, []);

  async function submitJoinCode() {
    setStatus('Joining class...');
    const result = await joinClass(joinCode);
    if (!result.ok) {
      setStatus(`Could not join class: ${result.reason}`);
      return;
    }
    setJoinCode('');
    setStatus('Class joined successfully.');
    await loadClasses();
  }

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Join Class</strong>
            <span>Student class membership</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/dashboard">Dashboard</a>
            <a className="btn secondary" href="/teacher">Teacher</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        <section className="grid grid2">
          <div className="card">
            <h2>Enter join code</h2>
            <p className="muted">Your teacher can create a class and share the join code.</p>
            <div className="grid">
              <input
                className="input"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Example: A1B2C3D4"
              />
              <button className="btn blue" onClick={submitJoinCode} disabled={!joinCode.trim()}>
                Join class
              </button>
            </div>
          </div>

          <div className="card">
            <h2>My classes</h2>
            {classes.length === 0 ? (
              <p className="muted">No classes joined yet.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Name</th><th>Course</th><th>Year</th></tr></thead>
                <tbody>
                  {classes.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.course}</td>
                      <td>{row.year_group}</td>
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
