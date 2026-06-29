'use client';

import { useEffect, useState } from 'react';
import { getStoredRole, hasSupabaseConfig, ProjectZRole, supabase } from '../../lib/supabaseClient';

type UserState = {
  email: string | null;
  id: string | null;
};

export default function AccountPage() {
  const [user, setUser] = useState<UserState>({ email: null, id: null });
  const [role, setRole] = useState<ProjectZRole>('student');
  const [status, setStatus] = useState('Checking account...');

  useEffect(() => {
    setRole(getStoredRole());

    async function load() {
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
    }

    load();
  }, []);

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setUser({ email: null, id: null });
    setStatus('Signed out.');
  }

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Account</strong>
            <span>Your Project Z session</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/auth">Auth</a>
            <a className="btn secondary" href="/dashboard">Dashboard</a>
          </div>
        </nav>

        <section className="card">
          <h1 style={{ fontSize: 42 }}>Account status</h1>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Email:</strong> {user.email || 'Not available'}</p>
          <p><strong>User ID:</strong> {user.id || 'Not available'}</p>
          <p><strong>Selected role:</strong> {role}</p>

          <div className="row" style={{ marginTop: 18 }}>
            <a className="btn blue" href="/auth">Sign in / Create account</a>
            <button className="btn secondary" onClick={signOut}>Sign out</button>
          </div>
        </section>
      </div>
    </main>
  );
}
