'use client';

import { useEffect, useState } from 'react';
import { canAccessPortal, getCurrentProfile, portalHomeForRole, ProjectZRole } from '../../lib/projectZAuth';
import { fetchMyChildren, ParentChild } from '../../lib/projectZParent';

export default function StudentPortalPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [status, setStatus] = useState('Student portal loads when signed in.');

  async function loadPortal() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (!canAccessPortal(profile.role, 'student')) {
      setStatus(`Access denied. ${profile.role} accounts cannot use the Student Portal.`);
      return;
    }

    if (profile.role === 'parent') {
      const rows = (await fetchMyChildren()) as ParentChild[];
      setChildren(rows);
      setStatus('Parent view: you can only see your linked child/student information.');
      return;
    }

    if (profile.role === 'teacher') {
      setStatus('Teacher oversight view: teachers can access student tools for monitoring and testing.');
      return;
    }

    if (profile.role === 'student') {
      setStatus('Student tools loaded.');
      return;
    }

    setStatus('Sign in to access your portal.');
  }

  useEffect(() => {
    loadPortal();
  }, []);

  if (!canAccessPortal(role, 'student') && role !== 'guest') {
    return (
      <main className="page">
        <div className="container">
          <section className="card">
            <h1>Access denied</h1>
            <p className="muted">You are signed in as {role}. You cannot access the Student Portal.</p>
            <a className="btn blue" href={portalHomeForRole(role)}>Go to your portal</a>
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
            <strong>{role === 'parent' ? 'Child Student View' : role === 'teacher' ? 'Teacher Student View' : 'Student Portal'}</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            {role === 'student' && <a className="btn secondary" href="/dashboard">Practice</a>}
            {role === 'student' && <a className="btn secondary" href="/assignments">My Assignments</a>}
            {role === 'student' && <a className="btn secondary" href="/classes">Join Class</a>}
            {role === 'teacher' && <a className="btn secondary" href="/teacher">Teacher Portal</a>}
            {role === 'parent' && <a className="btn secondary" href="/parent">Parent Portal</a>}
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in to access the correct student view.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role === 'student' && (
          <section className="grid grid3">
            <a className="card" href="/dashboard">
              <h2>Practice</h2>
              <p className="muted">Answer questions, get hints, and build mastery.</p>
            </a>
            <a className="card" href="/assignments">
              <h2>My assignments</h2>
              <p className="muted">Download teacher documents and upload your return files.</p>
            </a>
            <a className="card" href="/classes">
              <h2>My classes</h2>
              <p className="muted">Join a class using your teacher's class code.</p>
            </a>
          </section>
        )}

        {role === 'teacher' && (
          <section className="grid grid3">
            <a className="card" href="/teacher">
              <h2>Teacher oversight</h2>
              <p className="muted">View classes, rosters, reports, and student progress from the teacher portal.</p>
            </a>
            <a className="card" href="/dashboard">
              <h2>Practice preview</h2>
              <p className="muted">Preview the student practice experience for testing.</p>
            </a>
            <a className="card" href="/assignments">
              <h2>Assignment management</h2>
              <p className="muted">Create assignments and review submissions.</p>
            </a>
          </section>
        )}

        {role === 'parent' && (
          <section className="card">
            <h2>My child/student view</h2>
            {children.length === 0 ? (
              <p className="muted">No linked child yet. Go to the Parent Portal and link your child by student email.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Child</th>
                    <th>Attempts</th>
                    <th>Correct</th>
                    <th>Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((child) => (
                    <tr key={child.student_id}>
                      <td>
                        <strong>{child.student_name}</strong><br />
                        <span className="muted">{child.student_email}</span>
                      </td>
                      <td>{child.total_attempts}</td>
                      <td>{child.total_correct}</td>
                      <td>{child.average_mastery}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
