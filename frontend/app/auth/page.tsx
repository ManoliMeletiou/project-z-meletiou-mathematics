'use client';

import { useState } from 'react';
import { getCurrentProfile, portalHomeForRole, ProjectZRole } from '../../lib/projectZAuth';
import { supabase } from '../../lib/supabaseClient';

export default function AuthPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<ProjectZRole>('student');
  const [status, setStatus] = useState('Sign in or create an account.');

  async function redirectToMyPortal() {
    const profile = await getCurrentProfile();
    window.location.href = portalHomeForRole(profile.role);
  }

  async function signIn() {
    if (!supabase) {
      setStatus('Supabase is not configured.');
      return;
    }

    setStatus('Signing in...');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus('Signed in. Redirecting...');
    await redirectToMyPortal();
  }

  async function signUp() {
    if (!supabase) {
      setStatus('Supabase is not configured.');
      return;
    }

    setStatus('Creating account...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.rpc('project_z_upsert_profile', {
        p_role: role,
        p_display_name: displayName || email.split('@')[0]
      });

      if (profileError) {
        setStatus(`Account created, but profile setup failed: ${profileError.message}`);
        return;
      }
    }

    if (!data.session) {
      setStatus('Account created. Check your email if confirmation is required, then sign in.');
      setMode('sign-in');
      return;
    }

    setStatus('Account created. Redirecting...');
    await redirectToMyPortal();
  }

  async function continueToPortal() {
    await redirectToMyPortal();
  }

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</strong>
            <span>Project Z role-based access</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <button className="btn secondary" onClick={continueToPortal}>Go to my portal</button>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        <section className="card" style={{ maxWidth: 720 }}>
          <div className="grid">
            <label className="label">
              Email
              <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>

            <label className="label">
              Password
              <input className="input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </label>

            {mode === 'sign-up' && (
              <>
                <label className="label">
                  Display name
                  <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name shown in reports" />
                </label>

                <label className="label">
                  Role
                  <select className="select" value={role} onChange={(event) => setRole(event.target.value as ProjectZRole)}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                  </select>
                </label>
              </>
            )}

            {mode === 'sign-in' ? (
              <button className="btn blue" onClick={signIn}>Sign in</button>
            ) : (
              <button className="btn blue" onClick={signUp}>Create account</button>
            )}

            {mode === 'sign-in' ? (
              <button className="btn secondary" onClick={() => setMode('sign-up')}>Need an account?</button>
            ) : (
              <button className="btn secondary" onClick={() => setMode('sign-in')}>Already have an account?</button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
