'use client';

import { useState } from 'react';
import { hasSupabaseConfig, ProjectZRole, storeRole, supabase } from '../../lib/supabaseClient';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<ProjectZRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setStatus('');

    if (!hasSupabaseConfig || !supabase) {
      storeRole(role);
      setStatus('Supabase is not configured in this browser build. Role saved locally for MVP testing.');
      setBusy(false);
      return;
    }

    try {
      storeRole(role);

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role }
          }
        });

        if (error) throw error;

        setStatus('Account created. If email confirmation is enabled, check your inbox before signing in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        setStatus('Signed in successfully. You can now go to your dashboard.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Project Z Account</strong>
            <span>Supabase Auth and role selection</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="grid grid2">
          <div className="card">
            <span className="badge">{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
            <h1 style={{ fontSize: 42 }}>{mode === 'signin' ? 'Welcome back' : 'Create your Project Z profile'}</h1>
            <p className="muted">
              Use this screen to sign in as a student, teacher, or parent. The role is saved locally now and can later be mirrored into Supabase profiles.
            </p>

            <div className="grid">
              <label className="label">
                Email
                <input
                  className="input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </label>

              <label className="label">
                Password
                <input
                  className="input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </label>

              <label className="label">
                Role
                <select
                  className="select"
                  value={role}
                  onChange={(event) => setRole(event.target.value as ProjectZRole)}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                </select>
              </label>

              <div className="row">
                <button className="btn blue" onClick={submit} disabled={busy || !email || password.length < 6}>
                  {busy ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
                </button>

                <button
                  className="btn secondary"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  type="button"
                >
                  {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}
                </button>
              </div>

              {status && <div className="notice">{status}</div>}
            </div>
          </div>

          <div className="card">
            <h2>What works now</h2>
            <ul>
              <li>Email/password sign up and sign in through Supabase, if email auth is enabled.</li>
              <li>Role selection for student, teacher, and parent.</li>
              <li>Account status page.</li>
              <li>Local role persistence for MVP testing.</li>
            </ul>

            <h2>Next database step</h2>
            <p className="muted">
              Persist roles, classes, assignments, parent links, and mastery data into Supabase tables with RLS policies.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
