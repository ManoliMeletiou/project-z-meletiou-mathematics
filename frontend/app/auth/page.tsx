'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, portalHomeForRole } from '../../lib/projectZAuth';
import { safeProjectZNextPath } from '../../lib/projectZAuthRedirect';
import { supabase } from '../../lib/supabaseClient';

export default function AuthPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'forgot' | 'reset'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('Sign in or create an account.');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    if (params.get('mode') === 'reset') {
      setMode('reset');
      setStatus('Choose a new password for your Project Z account.');
    } else if (reason === 'session-required') {
      setStatus('Sign in securely to continue to that Project Z page.');
    } else if (reason === 'callback-failed' || reason === 'confirmation-failed') {
      setStatus('That secure email link could not be verified. Request a new link and try again.');
    } else if (reason === 'configuration') {
      setStatus('Project Z sign-in is temporarily unavailable. Please try again shortly.');
    }

    const { data: listener } = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setStatus('Choose a new password for your Project Z account.');
      }
    }) || { data: { subscription: null } };
    return () => listener.subscription?.unsubscribe();
  }, []);

  async function redirectToMyPortal() {
    const requestedNext = safeProjectZNextPath(
      new URLSearchParams(window.location.search).get('next'),
      ''
    );
    if (requestedNext) {
      window.location.href = requestedNext;
      return;
    }
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
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/account')}`
      }
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.rpc('project_z_upsert_profile', {
        p_role: 'student',
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

  async function sendPasswordReset() {
    if (!supabase || !email.trim()) {
      setStatus('Enter your account email first.');
      return;
    }
    setStatus('Sending a secure reset link…');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/auth?mode=reset')}`
    });
    setStatus(error ? error.message : 'Reset link sent. Check your email and follow the link.');
  }

  async function updatePassword() {
    if (!supabase || password.length < 8) {
      setStatus('Use a password of at least 8 characters.');
      return;
    }
    setStatus('Updating your password…');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('Password updated. Redirecting…');
    await redirectToMyPortal();
  }

  return (
    <main className="page pz-theme pz-guest-theme">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>{mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : mode === 'forgot' ? 'Reset password' : 'Choose new password'}</strong>
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
            {mode !== 'reset' ? <label className="label">
              Email
              <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label> : null}

            {mode !== 'forgot' ? <label className="label">
              Password
              <input className="input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </label> : null}

            {mode === 'sign-up' && (
              <>
                <label className="label">
                  Display name
                  <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name shown in reports" />
                </label>

                <p className="notice">
                  New accounts begin as students. Teacher and parent access is verified through a request from the Account page.
                </p>
              </>
            )}

            {mode === 'sign-in' ? (
              <button className="btn blue" onClick={signIn}>Sign in</button>
            ) : mode === 'sign-up' ? (
              <button className="btn blue" onClick={signUp}>Create account</button>
            ) : mode === 'forgot' ? (
              <button className="btn blue" onClick={sendPasswordReset}>Send reset link</button>
            ) : <button className="btn blue" onClick={updatePassword}>Update password</button>}

            {mode === 'sign-in' ? (
              <>
                <button className="btn secondary" onClick={() => setMode('sign-up')}>Need an account?</button>
                <button className="btn secondary" onClick={() => setMode('forgot')}>Forgot password?</button>
              </>
            ) : mode === 'sign-up' ? (
              <button className="btn secondary" onClick={() => setMode('sign-in')}>Already have an account?</button>
            ) : <button className="btn secondary" onClick={() => setMode('sign-in')}>Back to sign in</button>}
          </div>
        </section>
      </div>
    </main>
  );
}
