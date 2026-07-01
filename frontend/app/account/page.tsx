'use client';

import { useEffect, useState } from 'react';
import { getStoredRole, hasSupabaseConfig, ProjectZRole, supabase } from '../../lib/supabaseClient';
import { fetchMyMastery, upsertCurrentProfile } from '../../lib/projectZData';

type UserState = {
  email: string | null;
  id: string | null;
};

type MasteryRow = {
  skill_id: string;
  attempts: number;
  correct: number;
  mastery_score: number;
};

export default function AccountPage() {
  const [user, setUser] = useState<UserState>({ email: null, id: null });
  const [role, setRole] = useState<ProjectZRole>('student');
  const [status, setStatus] = useState('Checking account...');
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [profileStatus, setProfileStatus] = useState('');

  async function load() {
    const storedRole = getStoredRole();
    setRole(storedRole);

    if (!hasSupabaseConfig || !supabase) {
      setStatus('Supabase environment variables are not configured. Local MVP mode is active.');
      return;
    }

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setStatus('Not signed in.');
      setUser({ email: null, id: null });
      return;
    }

    setUser({ email: data.user.email || null, id: data.user.id });
    setStatus('Signed in.');

    const profileResult = await upsertCurrentProfile(storedRole);
    setProfileStatus(profileResult.ok
      ? 'Profile synced.'
      : `Profile sync pending: ${profileResult.reason}`);

    const masteryRows = await fetchMyMastery();
    setMastery(masteryRows as MasteryRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setUser({ email: null, id: null });
    setStatus('Signed out.');
    setProfileStatus('');
    setMastery([]);
  }

  return (
    <main className="page pz-theme pz-guest-theme">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Account</strong>
            <span>Your Project Z session and database status</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/auth">Auth</a>
            <a className="btn secondary" href="/dashboard">Dashboard</a>
          </div>
        </nav>

        <section className="grid grid2">
          <div className="card">
            <h1 style={{ fontSize: 42 }}>Account status</h1>
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Email:</strong> {user.email || 'Not available'}</p>
            <p><strong>User ID:</strong> {user.id || 'Not available'}</p>
            <p><strong>Selected role:</strong> {role}</p>
            {profileStatus && <p><strong>Profile:</strong> {profileStatus}</p>}

            <div className="row" style={{ marginTop: 18 }}>
              <a className="btn blue" href="/auth">Sign in / Create account</a>
              <button className="btn secondary" onClick={signOut}>Sign out</button>
              <button className="btn secondary" onClick={load}>Refresh account</button>
            </div>
          </div>

          <div className="card">
            <h2>Supabase mastery</h2>
            {mastery.length === 0 ? (
              <p className="muted">No mastery data yet. Sign in, run the SQL migration, then submit answers in the dashboard.</p>
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
          </div>
        </section>
      </div>
    </main>
  );
}
