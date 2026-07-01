'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import { supabase } from '../../lib/supabaseClient';

type GenerationStatus = {
  ok: boolean;
  configured: boolean;
  endpointConfigured: boolean;
  apiKeyConfigured: boolean;
  modelConfigured: boolean;
  model: string | null;
  provider: string;
  fallbackEnabled: boolean;
};

type SelfTest = {
  ok: boolean;
  configured: boolean;
  provider: string;
  model: string | null;
  mode: string;
  checks: Record<string, boolean>;
  score: number;
  message: string;
  sample?: {
    prompt: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    explanation: string;
  };
  error?: string;
};

function CheckRow({ label, value }: { label: string; value: boolean }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{value ? '✅ Pass' : '❌ Fail'}</td>
    </tr>
  );
}

export default function AiTestPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [selfTest, setSelfTest] = useState<SelfTest | null>(null);
  const [status, setStatus] = useState('AI generation test loads for teachers.');
  const [busy, setBusy] = useState(false);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    const statusResponse = await fetch('/api/generation-status');
    if (statusResponse.ok) setGenerationStatus(await statusResponse.json());

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to test AI generation.' : 'Only teachers can run AI generation tests.');
      return;
    }

    setStatus('AI generator configuration loaded. Run the self-test to verify live model output.');
  }

  async function runSelfTest() {
    setBusy(true);
    setStatus('Running real AI generator self-test...');

    const { data: sessionData } = await supabase!.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setStatus('Sign in as a teacher first.');
      setBusy(false);
      return;
    }

    const response = await fetch('/api/generation-self-test', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      setStatus('Self-test request failed.');
      setBusy(false);
      return;
    }

    const result = await response.json();
    setSelfTest(result);
    setStatus(result.message || 'Self-test complete.');
    setBusy(false);
  }

  useEffect(() => {
    loadPage();
  }, []);

  return (
    <main className="page pz-theme pz-teacher-theme">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>AI Generator Test</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/generate">Generate</a>
            <a className="btn secondary" href="/ai-usage">AI Usage</a>
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
            <p className="muted">Sign in as a teacher to test AI generation.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only AI test</h2>
            <p className="muted">Students and parents cannot run AI generator tests.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="grid grid3">
              <div className="card">
                <h2>Configuration</h2>
                <p>
                  Configured: <strong>{generationStatus?.configured ? 'Yes' : 'No'}</strong><br />
                  Provider: <strong>{generationStatus?.provider || 'Unknown'}</strong><br />
                  Model: <strong>{generationStatus?.model || 'Not set'}</strong>
                </p>
              </div>

              <div className="card">
                <h2>Safety</h2>
                <p className="muted">The self-test checks live model output before teachers rely on it. Fallback templates stay active.</p>
              </div>

              <div className="card">
                <h2>Run test</h2>
                <button className="btn blue" disabled={busy} onClick={runSelfTest}>Run AI self-test</button>
              </div>
            </section>

            {selfTest && (
              <>
                <section className="grid grid2" style={{ marginTop: 18 }}>
                  <div className="card">
                    <h2>{selfTest.ok ? 'Self-test passed' : 'Self-test needs attention'}</h2>
                    <p>
                      Score: <strong>{selfTest.score}%</strong><br />
                      Mode: <strong>{selfTest.mode}</strong><br />
                      Provider: <strong>{selfTest.provider}</strong><br />
                      Model: <strong>{selfTest.model || 'Not set'}</strong>
                    </p>
                    <p className="muted">{selfTest.message}</p>
                    {selfTest.error && <p className="notice">Error: {selfTest.error}</p>}
                  </div>

                  <div className="card">
                    <h2>Checks</h2>
                    <table className="table">
                      <tbody>
                        {Object.entries(selfTest.checks).map(([key, value]) => (
                          <CheckRow key={key} label={key.replaceAll('_', ' ')} value={value} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {selfTest.sample && (
                  <section className="card" style={{ marginTop: 18 }}>
                    <h2>Sample generated question</h2>
                    <h3>{selfTest.sample.prompt}</h3>
                    <ol type="A">
                      <li>{selfTest.sample.option_a}</li>
                      <li>{selfTest.sample.option_b}</li>
                      <li>{selfTest.sample.option_c}</li>
                      <li>{selfTest.sample.option_d}</li>
                    </ol>
                    <p>Correct option: <strong>{selfTest.sample.correct_option}</strong></p>
                    <p className="muted">{selfTest.sample.explanation}</p>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
