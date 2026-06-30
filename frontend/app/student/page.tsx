'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';

export default function StudentPortalPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    getCurrentProfile().then((result) => {
      setRole(result.role);
      setEmail(result.email);
    });
  }, []);

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Student Portal</strong>
            <span>{email || 'Sign in to access your student workspace'}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/dashboard">Practice</a>
            <a className="btn secondary" href="/assignments">My Assignments</a>
            <a className="btn secondary" href="/classes">Join Class</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        {role !== 'student' && role !== 'guest' ? (
          <section className="notice" style={{ marginBottom: 18 }}>
            <strong>Wrong portal:</strong> You are signed in as {role}. Use the correct portal for your role.
          </section>
        ) : (
          <section className="notice" style={{ marginBottom: 18 }}>
            <strong>Student only:</strong> This area contains only student tools.
          </section>
        )}

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
      </div>
    </main>
  );
}
