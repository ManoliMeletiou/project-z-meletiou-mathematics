'use client';

import { useEffect, useState } from 'react';
import { canAccessPortal, getCurrentProfile, portalHomeForRole, ProjectZRole } from '../../lib/projectZAuth';
import {
  ChildMastery,
  fetchChildMastery,
  fetchMyChildren,
  linkChildByEmailAndCode,
  ParentChild
} from '../../lib/projectZParent';

export default function ParentPortalPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [childEmail, setChildEmail] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [mastery, setMastery] = useState<ChildMastery[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [status, setStatus] = useState('Parent reports load from Supabase when signed in.');

  async function loadPortal() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (!canAccessPortal(profile.role, 'parent')) {
      setStatus(`Access denied. ${profile.role} accounts cannot use the Parent Portal.`);
      return;
    }

    if (profile.role === 'teacher') {
      setStatus('Teacher report overview. Parent-link controls are for parent accounts only.');
      return;
    }

    const rows = (await fetchMyChildren()) as ParentChild[];
    setChildren(rows);

    const firstChildId = selectedChildId || rows[0]?.student_id || '';
    if (firstChildId) {
      setSelectedChildId(firstChildId);
      const masteryRows = (await fetchChildMastery(firstChildId)) as ChildMastery[];
      setMastery(masteryRows);
    }

    setStatus('Parent child progress loaded from Supabase.');
  }

  useEffect(() => {
    loadPortal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLinkChild() {
    if (role !== 'parent') {
      setStatus('Only parent accounts can link to a child.');
      return;
    }

    setStatus('Linking child account...');
    const result = await linkChildByEmailAndCode(childEmail, linkCode);

    if (!result.ok) {
      setStatus(`Could not link child: ${result.reason}`);
      return;
    }

    setChildEmail('');
    setLinkCode('');
    setStatus('Child linked.');
    await loadPortal();
  }

  async function openChild(studentId: string) {
    setSelectedChildId(studentId);
    const rows = (await fetchChildMastery(studentId)) as ChildMastery[];
    setMastery(rows);
  }

  if (!canAccessPortal(role, 'parent') && role !== 'guest') {
    return (
      <main className="page">
        <div className="container">
          <section className="card">
            <h1>Access denied</h1>
            <p className="muted">You are signed in as {role}. You cannot access the Parent Portal.</p>
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
            <strong>Parent Portal</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            {role === 'teacher' && <a className="btn secondary" href="/teacher">Teacher Portal</a>}
            {role === 'parent' && <a className="btn secondary" href="/student">Child Student View</a>}
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Parents must sign in to view linked child progress.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role === 'teacher' && (
          <section className="card">
            <h2>Teacher report access</h2>
            <p className="muted">Teachers can access parent-style reports from the teacher dashboard. Parent-child linking is only for parent accounts.</p>
            <a className="btn blue" href="/teacher">Go to Teacher Portal</a>
          </section>
        )}

        {role === 'parent' && (
          <>
            <section className="grid grid2">
              <div className="card">
                <h2>Link my child</h2>
                <p className="muted">
                  Ask your child to open Student Portal and generate a parent access code. Enter their student email and that code here.
                </p>
                <label className="label">
                  Student email
                  <input
                    className="input"
                    value={childEmail}
                    onChange={(event) => setChildEmail(event.target.value)}
                    placeholder="student@example.com"
                  />
                </label>
                <label className="label">
                  Parent access code
                  <input
                    className="input"
                    value={linkCode}
                    onChange={(event) => setLinkCode(event.target.value.toUpperCase())}
                    placeholder="8 character code"
                  />
                </label>
                <button className="btn blue" onClick={handleLinkChild} style={{ marginTop: 12 }}>
                  Link child
                </button>
              </div>

              <div className="card">
                <h2>My children</h2>
                {children.length === 0 ? (
                  <p className="muted">No linked children yet.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Child</th>
                        <th>Attempts</th>
                        <th>Mastery</th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((child) => (
                        <tr key={child.student_id}>
                          <td>
                            <button className="btn secondary" onClick={() => openChild(child.student_id)} style={{ padding: '8px 12px', marginBottom: 8 }}>
                              Open
                            </button>
                            <br />
                            <strong>{child.student_name}</strong><br />
                            <span className="muted">{child.student_email}</span>
                          </td>
                          <td>{child.total_attempts}</td>
                          <td>{child.average_mastery}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Child mastery</h2>
              {mastery.length === 0 ? (
                <p className="muted">No mastery records loaded for the selected child.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Attempts</th>
                      <th>Correct</th>
                      <th>Mastery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mastery.map((row) => (
                      <tr key={row.skill_id}>
                        <td>{row.skill_id}</td>
                        <td>{row.attempts}</td>
                        <td>{row.correct}</td>
                        <td>{row.mastery_score}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
