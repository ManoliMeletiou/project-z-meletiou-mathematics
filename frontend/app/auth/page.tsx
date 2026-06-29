'use client';

import { useState } from 'react';
import { hasSupabaseConfig, ProjectZRole, storeRole, supabase } from '../../lib/supabaseClient';
import { upsertCurrentProfile } from '../../lib/projectZData';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<ProjectZRole>('student');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setStatus('');

    if (!hasSupabaseConfig || !supabase) {
      storeRole(role);
      setStatus('Supabase is not configured. Role saved locally for MVP testing.');
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
            data: {
              role,
              display_name: displayName || email.split('@')[0]
            }
          }
        });

        if (error) throw error;

        setStatus('Account created. If email confirmation is enabled, check your inbox before signing in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        const profileResult = await upsertCurrentProfile(role, displayName || undefined);

        setStatus(profileResult.ok
          ? 'Signed in and profile synced. Go to your dashboard.'
          : `Signed in, but profile sync needs the Phase 3 SQL migration: ${profileResult.reason}`);
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
            <span>Supabase Auth, role selection, and profile sync</span>
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
              Sign in as a student, teacher, or parent. After the Phase 3 SQL migration, profiles and practice progress sync into Supabase.
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
                Display name
                <input
                  className="input"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Manoli"
                  autoComplete="name"
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
            <h2>Phase 3 database layer</h2>
            <ul>
              <li>Profiles table with student, teacher, and parent roles.</li>
              <li>Practice attempts table.</li>
              <li>Skill mastery table.</li>
              <li>RLS policies so users only see their own data.</li>
              <li>RPC for recording attempts and updating mastery.</li>
            </ul>

            <p className="notice">
              The SQL file is saved at <strong>supabase/project_z_phase3_schema.sql</strong>. Run it once in Supabase SQL Editor.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
