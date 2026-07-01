'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchTutorMemory,
  fetchTutorSafetyStatus,
  sendTutorMessage,
  TutorMemoryItem,
  TutorSafetyStatus
} from '../../lib/projectZTutorMemory';

export default function TutorPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [safetyStatus, setSafetyStatus] = useState<TutorSafetyStatus | null>(null);
  const [memory, setMemory] = useState<TutorMemoryItem[]>([]);
  const [message, setMessage] = useState('');
  const [skillTitle, setSkillTitle] = useState('Solving linear equations');
  const [courseCode, setCourseCode] = useState('myp_standard');
  const [status, setStatus] = useState('Tutor loads for students and teachers.');
  const [busy, setBusy] = useState(false);
  const [latestReply, setLatestReply] = useState('');

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (!['student', 'teacher'].includes(profile.role)) {
      setStatus(profile.role === 'guest' ? 'Sign in to use the tutor.' : 'Only students and teachers can use the learning tutor.');
      return;
    }

    const nextSafety = await fetchTutorSafetyStatus();
    const nextMemory = await fetchTutorMemory();

    setSafetyStatus(nextSafety);
    setMemory(nextMemory);
    setStatus(nextSafety?.allowed ? 'Tutor ready. It will guide, not just give answers.' : nextSafety?.reason || 'Tutor status loaded.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function askTutor() {
    if (!message.trim()) {
      setStatus('Type a question first.');
      return;
    }

    setBusy(true);
    setStatus('Tutor is thinking...');

    const result = await sendTutorMessage({
      message,
      course_code: courseCode,
      skill_title: skillTitle,
      tutor_mode: 'guided_learning'
    });

    if (!result.ok) {
      setStatus(`Tutor failed: ${result.reason}`);
      setBusy(false);
      return;
    }

    setLatestReply(result.data.reply);
    setMessage('');
    setStatus(`Tutor replied. Safety level: ${result.data.safety_level}.`);
    await loadPage();
    setBusy(false);
  }

  return (
    <main className="page pz-theme pz-student-theme">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>AI Maths Tutor</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/student-quest">Quest</a>
            <a className="btn secondary" href="/">Home</a>
            {role === 'student' && <a className="btn secondary" href="/student">Student Portal</a>}
            {role === 'teacher' && <a className="btn secondary" href="/teacher">Teacher Portal</a>}
            <a className="btn secondary" href="/path">Skill Path</a>
            <a className="btn secondary" href="/recommended">Recommended</a>
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
            <p className="muted">Sign in to use the AI maths tutor.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && !['student', 'teacher'].includes(role) && (
          <section className="card">
            <h2>Tutor unavailable</h2>
            <p className="muted">The tutor is for students and teachers only.</p>
          </section>
        )}

        {['student', 'teacher'].includes(role) && (
          <>
            <section className="grid grid3">
              <div className="card">
                <h2>Guided tutor rule</h2>
                <p className="muted">
                  The tutor helps step by step. It should not simply give away the final answer.
                </p>
              </div>

              <div className="card">
                <h2>Hourly tutor use</h2>
                {safetyStatus ? (
                  <p>
                    Used: <strong>{safetyStatus.hourly_count || 0}</strong> / {safetyStatus.hourly_limit || 60}<br />
                    Remaining: <strong>{safetyStatus.remaining_hourly || 0}</strong><br />
                    Allowed: <strong>{safetyStatus.allowed ? 'Yes' : 'No'}</strong>
                  </p>
                ) : (
                  <p className="muted">Run Phase 23 SQL if this stays empty.</p>
                )}
              </div>

              <div className="card">
                <h2>Current skill</h2>
                <label className="label">
                  Course code
                  <input className="input" value={courseCode} onChange={(event) => setCourseCode(event.target.value)} />
                </label>
                <label className="label">
                  Skill
                  <input className="input" value={skillTitle} onChange={(event) => setSkillTitle(event.target.value)} />
                </label>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Ask the tutor</h2>
              <textarea
                className="textarea"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                placeholder="Example: I am stuck on 3x + 5 = 20. What should I do first?"
              />
              <button className="btn blue" disabled={busy || !safetyStatus?.allowed} onClick={askTutor}>
                Ask tutor
              </button>
            </section>

            {latestReply && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>Tutor reply</h2>
                <p>{latestReply}</p>
              </section>
            )}

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Recent tutor memory</h2>
              {memory.length === 0 ? (
                <p className="muted">No tutor memory yet.</p>
              ) : (
                <div className="grid">
                  {memory.map((item) => (
                    <div key={item.id} className="card">
                      <p className="muted">
                        {new Date(item.created_at).toLocaleString()} - {item.skill_title || 'General maths'} - {item.safety_level}
                      </p>
                      <p><strong>You:</strong> {item.student_message}</p>
                      <p><strong>Tutor:</strong> {item.tutor_reply}</p>
                      <p className="muted">{item.learning_action}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
