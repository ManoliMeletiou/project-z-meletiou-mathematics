'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  AiGenerationAllowance,
  AiGenerationLog,
  fetchAiGenerationAllowance,
  fetchMyAiGenerationLogs
} from '../../lib/projectZAiUsage';

function percent(used: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

function statusLabel(status: string) {
  if (status.includes('success')) return '✅ Success';
  if (status.includes('blocked')) return '⛔ Blocked';
  if (status.includes('error')) return '⚠️ Error';
  if (status.includes('warning')) return '⚠️ Warning';
  return status || 'Unknown';
}

export default function AiUsagePage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<AiGenerationAllowance | null>(null);
  const [logs, setLogs] = useState<AiGenerationLog[]>([]);
  const [status, setStatus] = useState('AI usage dashboard loads for teachers.');
  const [busy, setBusy] = useState(false);

  async function loadPage() {
    setBusy(true);

    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to view AI usage.' : 'Only teachers can view AI usage.');
      setBusy(false);
      return;
    }

    const nextAllowance = await fetchAiGenerationAllowance();
    const nextLogs = await fetchMyAiGenerationLogs();

    setAllowance(nextAllowance);
    setLogs(nextLogs);
    setStatus(nextAllowance ? 'AI usage loaded from Supabase.' : 'AI usage functions are not available yet. Check that Phase 21B SQL was run.');
    setBusy(false);
  }

  useEffect(() => {
    loadPage();
  }, []);

  const successfulCount = useMemo(
    () => logs.filter((log) => log.status.includes('success')).length,
    [logs]
  );

  const blockedCount = useMemo(
    () => logs.filter((log) => log.status.includes('blocked')).length,
    [logs]
  );

  const errorCount = useMemo(
    () => logs.filter((log) => log.status.includes('error')).length,
    [logs]
  );

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>AI Usage Dashboard</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/generate">Generate</a>
            <a className="btn secondary" href="/ai-test">AI Test</a>
            <a className="btn secondary" href="/quality">Quality</a>
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
            <p className="muted">Sign in as a teacher to view AI usage.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only usage dashboard</h2>
            <p className="muted">Students and parents cannot view AI usage or cost controls.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="grid grid3">
              <div className="card">
                <h2>Hourly limit</h2>
                {allowance ? (
                  <>
                    <p>
                      Used: <strong>{allowance.hourly_count}</strong> / {allowance.hourly_limit}<br />
                      Remaining: <strong>{allowance.remaining_hourly}</strong>
                    </p>
                    <progress value={percent(allowance.hourly_count, allowance.hourly_limit)} max="100" style={{ width: '100%' }} />
                  </>
                ) : (
                  <p className="muted">No allowance data yet.</p>
                )}
              </div>

              <div className="card">
                <h2>Daily limit</h2>
                {allowance ? (
                  <>
                    <p>
                      Used: <strong>{allowance.daily_count}</strong> / {allowance.daily_limit}<br />
                      Remaining: <strong>{allowance.remaining_daily}</strong>
                    </p>
                    <progress value={percent(allowance.daily_count, allowance.daily_limit)} max="100" style={{ width: '100%' }} />
                  </>
                ) : (
                  <p className="muted">No allowance data yet.</p>
                )}
              </div>

              <div className="card">
                <h2>Current access</h2>
                {allowance ? (
                  <p>
                    Allowed now: <strong>{allowance.allowed ? 'Yes' : 'No'}</strong><br />
                    Reason: <strong>{allowance.reason}</strong><br />
                    Role: <strong>{allowance.role}</strong>
                  </p>
                ) : (
                  <p className="muted">Run Phase 21B SQL first if this is empty.</p>
                )}
                <button className="btn secondary" disabled={busy} onClick={loadPage}>
                  Refresh usage
                </button>
              </div>
            </section>

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Successful calls</h2>
                <p className="stat">{successfulCount}</p>
              </div>

              <div className="card">
                <h2>Blocked calls</h2>
                <p className="stat">{blockedCount}</p>
              </div>

              <div className="card">
                <h2>Errors</h2>
                <p className="stat">{errorCount}</p>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Recent AI usage logs</h2>
              <p className="muted">
                These logs help you see whether AI calls are successful, blocked by limits, or failing. This protects cost and accuracy.
              </p>

              {logs.length === 0 ? (
                <p className="muted">No AI usage logs yet. Generate a question or run an AI self-test.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Status</th>
                      <th>Mode / model</th>
                      <th>Skill</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>{log.action}</td>
                        <td>{statusLabel(log.status)}</td>
                        <td>
                          {log.generation_mode || 'unknown'}<br />
                          <span className="muted">{log.model || 'no model'}</span>
                        </td>
                        <td>
                          {log.course_code || '-'}<br />
                          <span className="muted">{log.course_skill_code || '-'}</span>
                        </td>
                        <td>
                          {log.input_summary || log.error_message || '-'}
                        </td>
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
