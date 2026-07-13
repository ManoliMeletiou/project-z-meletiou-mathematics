'use client';

import { useEffect, useState } from 'react';
import { ProjectZCalmHeader } from '../../components/ProjectZCalmHeader';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  cancelProjectZAccountDeletion,
  exportMyProjectZData,
  fetchMyAccountDeletionRequest,
  fetchMyRoleRequests,
  fetchOperatorDeletionQueue,
  fetchOperatorRoleRequestQueue,
  isProjectZOperator,
  processProjectZAccountDeletion,
  ProjectZAccountDeletionRequest,
  ProjectZOperatorDeletionRequest,
  ProjectZOperatorRoleRequest,
  ProjectZRoleRequest,
  requestProjectZAccountDeletion,
  requestRoleAccess,
  reviewProjectZRoleRequest
} from '../../lib/projectZData';
import { projectZThemeForRole } from '../../lib/projectZNavigation';
import { supabase } from '../../lib/supabaseClient';

const deletionPhrase = 'DELETE PROJECT Z ACCOUNT';
const processingPhrase = 'PROCESS APPROVED DELETION';

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [requests, setRequests] = useState<ProjectZRoleRequest[]>([]);
  const [requestedRole, setRequestedRole] = useState<'teacher' | 'parent'>('teacher');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('Checking your account…');
  const [busy, setBusy] = useState(false);
  const [operator, setOperator] = useState(false);
  const [operatorRoleQueue, setOperatorRoleQueue] = useState<ProjectZOperatorRoleRequest[]>([]);
  const [operatorDeletionQueue, setOperatorDeletionQueue] = useState<ProjectZOperatorDeletionRequest[]>([]);
  const [deletion, setDeletion] = useState<ProjectZAccountDeletionRequest | null>(null);
  const [deletionConfirmation, setDeletionConfirmation] = useState('');
  const [processingConfirmation, setProcessingConfirmation] = useState('');

  async function load(preserveStatus = false) {
    const profile = await getCurrentProfile();
    setEmail(profile.email);
    setRole(profile.role);

    if (!profile.user) {
      setRequests([]);
      setDeletion(null);
      setOperator(false);
      setOperatorRoleQueue([]);
      setOperatorDeletionQueue([]);
      if (!preserveStatus) setStatus('Sign in to manage your account.');
      return;
    }

    const [roleRequests, deletionRequest, hasOperatorAccess] = await Promise.all([
      fetchMyRoleRequests(),
      fetchMyAccountDeletionRequest(),
      isProjectZOperator()
    ]);
    setRequests(roleRequests);
    setDeletion(deletionRequest);
    setOperator(hasOperatorAccess);

    if (hasOperatorAccess) {
      const [roleQueue, deletionQueue] = await Promise.all([
        fetchOperatorRoleRequestQueue(),
        fetchOperatorDeletionQueue()
      ]);
      setOperatorRoleQueue(roleQueue);
      setOperatorDeletionQueue(deletionQueue);
    } else {
      setOperatorRoleQueue([]);
      setOperatorDeletionQueue([]);
    }

    if (!preserveStatus) setStatus('Your database role is authoritative.');
  }

  useEffect(() => { void load(); }, []);

  async function submitRequest() {
    setBusy(true);
    setStatus(`Requesting ${requestedRole} access…`);
    const result = await requestRoleAccess(requestedRole, reason);
    await load(true);
    setStatus(result.ok ? 'Request submitted for verification. Your current access has not changed.' : `Request failed: ${result.reason}`);
    setBusy(false);
  }

  async function reviewRoleRequest(requestId: string, decision: 'approved' | 'rejected') {
    setBusy(true);
    setStatus(`${decision === 'approved' ? 'Approving' : 'Rejecting'} verified access request…`);
    const result = await reviewProjectZRoleRequest(requestId, decision);
    await load(true);
    setStatus(result.ok ? `Role request ${decision}.` : `Review failed: ${result.reason}`);
    setBusy(false);
  }

  async function downloadData() {
    setBusy(true);
    setStatus('Preparing your Project Z data export…');
    const result = await exportMyProjectZData();
    if (!result.ok) {
      setStatus(`Export failed: ${result.reason}`);
      setBusy(false);
      return;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `project-z-account-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
    setStatus('Your Project Z data export is ready.');
    setBusy(false);
  }

  async function requestDeletion() {
    setBusy(true);
    setStatus('Creating a protected deletion request…');
    const result = await requestProjectZAccountDeletion(deletionConfirmation);
    await load(true);
    setDeletionConfirmation('');
    setStatus(result.ok
      ? 'Deletion requested. You have seven days to cancel before an operator can process it.'
      : `Deletion request failed: ${result.reason}`);
    setBusy(false);
  }

  async function cancelDeletion() {
    setBusy(true);
    const result = await cancelProjectZAccountDeletion();
    await load(true);
    setStatus(result.ok ? 'Account deletion cancelled.' : `Cancellation failed: ${result.reason}`);
    setBusy(false);
  }

  async function processDeletion(requestId: string) {
    setBusy(true);
    const result = await processProjectZAccountDeletion(requestId, processingConfirmation);
    await load(true);
    setProcessingConfirmation('');
    setStatus(result.ok ? 'Account deletion processed and access revoked.' : `Deletion processing failed: ${result.reason}`);
    setBusy(false);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut({ scope: 'global' });
    window.location.href = '/home';
  }

  return (
    <main className={`page pz-theme pz-calm-page ${projectZThemeForRole(role)}`}>
      <div className="pz-calm-container">
        <ProjectZCalmHeader email={email} role={role} backHref="/home" backLabel="Home" />

        <section className="pz-calm-hero pz-calm-hero-compact">
          <p className="pz-eyebrow">Account</p>
          <h1>{email ? 'Your Project Z access' : 'Sign in to Project Z'}</h1>
          <p aria-live="polite">{status}</p>
          {!email ? <a className="pz-primary-action" href="/auth">Sign in <span>→</span></a> : null}
        </section>

        {email ? (
          <>
            <section className="pz-calm-section">
              <p className="pz-eyebrow">Current access</p>
              <h2>{role.charAt(0).toUpperCase() + role.slice(1)}</h2>
              <p className="muted">Your role comes from the protected Project Z profile—not this browser or local storage.</p>
              {operator ? (
                <div className="notice">
                  <p><strong>Operator controls active.</strong> This is separate from your learning role.</p>
                  <a className="btn secondary" href="/curriculum-review">Open curriculum review</a>
                </div>
              ) : null}
              <button className="btn secondary" onClick={() => void signOut()}>Sign out everywhere</button>
            </section>

            {role === 'student' ? (
              <section className="pz-calm-section">
                <p className="pz-eyebrow">Verified access</p>
                <h2>Request teacher or parent access</h2>
                <p className="muted">Requesting a role does not grant it. An authorized Project Z operator must verify it, and operators cannot approve themselves.</p>
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

            <details className="pz-more-tools">
              <summary>Privacy and account data <span>Export or delete</span></summary>
              <div className="pz-more-tools-content">
                <section aria-labelledby="account-export-title">
                  <h3 id="account-export-title">Download your data</h3>
                  <p className="muted">Create a JSON copy of your Project Z profile, learning evidence, work, motivation records, and relationships.</p>
                  <button className="btn secondary" disabled={busy} onClick={() => void downloadData()}>Download my data</button>
                </section>

                <section aria-labelledby="account-deletion-title">
                  <h3 id="account-deletion-title">Delete your account</h3>
                  {deletion?.status === 'pending' ? (
                    <div className="notice">
                      <p><strong>Deletion pending.</strong> It becomes eligible after {new Date(deletion.grace_ends_at).toLocaleString()}.</p>
                      <button className="btn secondary" disabled={busy} onClick={() => void cancelDeletion()}>Cancel deletion</button>
                    </div>
                  ) : (
                    <div className="grid" style={{ maxWidth: 620 }}>
                      <p className="muted">Download your data first. A seven-day safety window begins after the request, and you can cancel during that time.</p>
                      <label className="label">Type {deletionPhrase} to request deletion
                        <input className="input" value={deletionConfirmation} onChange={(event) => setDeletionConfirmation(event.target.value)} />
                      </label>
                      <button className="btn secondary" disabled={busy || deletionConfirmation !== deletionPhrase} onClick={() => void requestDeletion()}>Request account deletion</button>
                    </div>
                  )}
                </section>
              </div>
            </details>

            {operator ? (
              <details className="pz-more-tools">
                <summary>Operator verification queue <span>{operatorRoleQueue.length + operatorDeletionQueue.length}</span></summary>
                <div className="pz-more-tools-content">
                  <section aria-labelledby="role-queue-title">
                    <h3 id="role-queue-title">Role requests</h3>
                    {operatorRoleQueue.length === 0 ? <p className="muted">No pending role requests.</p> : operatorRoleQueue.map((request) => (
                      <div className="notice" key={request.request_id}>
                        <p><strong>{request.email}</strong> requests {request.requested_role} access.</p>
                        <p className="muted">{request.reason || 'No context supplied.'}</p>
                        <div className="row">
                          <button className="btn blue" disabled={busy} onClick={() => void reviewRoleRequest(request.request_id, 'approved')}>Approve verified request</button>
                          <button className="btn secondary" disabled={busy} onClick={() => void reviewRoleRequest(request.request_id, 'rejected')}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </section>

                  <section aria-labelledby="deletion-queue-title">
                    <h3 id="deletion-queue-title">Deletion requests</h3>
                    {operatorDeletionQueue.length === 0 ? <p className="muted">No pending deletion requests.</p> : (
                      <>
                        <label className="label">Type {processingPhrase} before processing an eligible request
                          <input className="input" value={processingConfirmation} onChange={(event) => setProcessingConfirmation(event.target.value)} />
                        </label>
                        {operatorDeletionQueue.map((request) => (
                          <div className="notice" key={request.request_id}>
                            <p><strong>{request.email}</strong> · {request.role}</p>
                            <p className="muted">Grace period ends {new Date(request.grace_ends_at).toLocaleString()}.</p>
                            <button className="btn secondary" disabled={busy || !request.eligible || processingConfirmation !== processingPhrase} onClick={() => void processDeletion(request.request_id)}>
                              {request.eligible ? 'Process deletion' : 'Waiting for grace period'}
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </section>
                </div>
              </details>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
