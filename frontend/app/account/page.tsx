'use client';

import { useEffect, useState } from 'react';
import { ProjectZCalmHeader } from '../../components/ProjectZCalmHeader';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchMyRoleRequests,
  ProjectZRoleRequest,
  requestRoleAccess
} from '../../lib/projectZData';
import { projectZThemeForRole } from '../../lib/projectZNavigation';
import { supabase } from '../../lib/supabaseClient';

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [requests, setRequests] = useState<ProjectZRoleRequest[]>([]);
  const [requestedRole, setRequestedRole] = useState<'teacher' | 'parent'>('teacher');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('Checking your account…');
  const [busy, setBusy] = useState(false);

  async function load() {
    const profile = await getCurrentProfile();
    setEmail(profile.email);
    setRole(profile.role);
    setRequests(profile.user ? await fetchMyRoleRequests() : []);
    setStatus(profile.user ? 'Your database role is authoritative.' : 'Sign in to manage your account.');
  }

  useEffect(() => { void load(); }, []);

  async function submitRequest() {
    setBusy(true);
    setStatus(`Requesting ${requestedRole} access…`);
    const result = await requestRoleAccess(requestedRole, reason);
    await load();
    setStatus(result.ok ? 'Request submitted for verification. Your current access has not changed.' : `Request failed: ${result.reason}`);
    setBusy(false);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    await load();
    window.location.href = '/home';
  }

  return (
    <main className={`page pz-theme pz-calm-page ${projectZThemeForRole(role)}`}>
      <div className="pz-calm-container">
        <ProjectZCalmHeader email={email} role={role} backHref="/home" backLabel="Home" />

        <section className="pz-calm-hero pz-calm-hero-compact">
          <p className="pz-eyebrow">Account</p>
          <h1>{email ? 'Your Project Z access' : 'Sign in to Project Z'}</h1>
          <p>{status}</p>
          {!email ? <a className="pz-primary-action" href="/auth">Sign in <span>→</span></a> : null}
        </section>

        {email ? (
          <>
            <section className="pz-calm-section">
              <p className="pz-eyebrow">Current access</p>
              <h2>{role.charAt(0).toUpperCase() + role.slice(1)}</h2>
              <p className="muted">Your role comes from the protected Project Z profile—not this browser or local storage.</p>
              <button className="btn secondary" onClick={() => void signOut()}>Sign out</button>
            </section>

            {role === 'student' ? (
              <section className="pz-calm-section">
                <p className="pz-eyebrow">Verified access</p>
                <h2>Request teacher or parent access</h2>
                <p className="muted">Requesting a role does not grant it. Approval must be completed by an authorized Project Z operator.</p>
                <div className="grid" style={{ maxWidth: 620 }}>
                  <label className="label">Requested role
                    <select className="select" value={requestedRole} onChange={(event) => setRequestedRole(event.target.value as 'teacher' | 'parent')}>
                      <option value="teacher">Teacher</option>
                      <option value="parent">Parent</option>
                    </select>
                  </label>
                  <label className="label">Reason or school context
                    <textarea className="input" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Briefly explain the access you need." />
                  </label>
                  <button className="btn blue" disabled={busy} onClick={() => void submitRequest()}>Submit access request</button>
                </div>
              </section>
            ) : null}

            {requests.length > 0 ? (
              <details className="pz-more-tools">
                <summary>Access request history <span>{requests.length}</span></summary>
                <div className="pz-more-tools-content">
                  {requests.map((request) => (
                    <p key={request.request_id}><strong>{request.requested_role}</strong> · {request.status}<br /><small className="muted">Updated {new Date(request.updated_at).toLocaleString()}</small></p>
                  ))}
                </div>
              </details>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
