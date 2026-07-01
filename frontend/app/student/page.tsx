'use client';

import { useEffect, useState } from 'react';
import { canAccessPortal, getCurrentProfile, portalHomeForRole, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchActiveParentLinkCodes,
  fetchMyChildren,
  generateParentLinkCode,
  ParentChild,
  ParentLinkCode
} from '../../lib/projectZParent';

export default function StudentPortalPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [codes, setCodes] = useState<ParentLinkCode[]>([]);
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
      const activeCodes = (await fetchActiveParentLinkCodes()) as ParentLinkCode[];
      setCodes(activeCodes);
      setStatus('Student tools loaded.');
      return;
    }

    setStatus('Sign in to access your portal.');
  }

  useEffect(() => {
    loadPortal();
  }, []);

  async function createParentCode() {
    if (role !== 'student') {
      setStatus('Only student accounts can generate a parent access code.');
      return;
    }

    setStatus('Generating parent access code...');
    const result = await generateParentLinkCode();

    if (!result.ok) {
      setStatus(`Could not generate code: ${result.reason}`);
      return;
    }

    setStatus('Parent access code generated. Share it only with your parent/guardian.');
    await loadPortal();
  }

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
            <a className="btn secondary" href="/student-dashboard">Dashboard</a>
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/student">Student Portal</a>
            <a className="btn secondary" href="/curriculum">Curriculum</a>
            <a className="btn secondary" href="/diagnostic">Diagnostic</a>
            <a className="btn secondary" href="/recommended">Recommended</a>
            <a className="btn secondary" href="/path">Skill Path</a>
            <a className="btn secondary" href="/assignments">Assignments</a>
            <a className="btn secondary" href="/student-generated-assignments">Generated Assignments</a>
            <a className="btn secondary" href="/tutor">Tutor</a>
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
            <p className="muted">Sign in to access the correct student view.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role === 'student' && (
          <>
            <section className="grid grid3">
              <a className="card" href="/curriculum">
                <h2>Curriculum map</h2>
                <p className="muted">Choose MYP Standard, MYP Extended, DP AA Standard, DP AI Standard, DP AA Higher, or DP AI Higher.</p>
              </a>

              <a className="card" href="/diagnostic">
                <h2>Diagnostic</h2>
                <p className="muted">Find your strong and weak skills with adaptive questions.</p>
              </a>

              <a className="card" href="/path">
                <h2>Game-style skill path</h2>
                <p className="muted">Move through the curriculum like levels in a game.</p>
              </a>

              <a className="card" href="/recommended">
                <h2>Recommended practice</h2>
                <p className="muted">Practise the weak skills identified by your diagnostic.</p>
              </a>

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

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Parent access code</h2>
              <p className="muted">
                Generate a code and share it with your parent/guardian. A parent needs your student email and this code to link to your progress.
              </p>
              <button className="btn blue" onClick={createParentCode}>Generate parent access code</button>

              {codes.length > 0 && (
                <table className="table" style={{ marginTop: 18 }}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((code) => (
                      <tr key={code.code}>
                        <td><strong>{code.code}</strong></td>
                        <td>{new Date(code.expires_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}

        {role === 'teacher' && (
          <section className="grid grid3">
            <a className="card" href="/teacher">
              <h2>Teacher oversight</h2>
              <p className="muted">View classes, rosters, reports, and student progress from the teacher portal.</p>
            </a>

            <a className="card" href="/curriculum">
              <h2>Curriculum preview</h2>
              <p className="muted">Preview the curriculum and skill map.</p>
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
              <p className="muted">No linked child yet. Go to the Parent Portal and link your child using their student email and parent access code.</p>
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
