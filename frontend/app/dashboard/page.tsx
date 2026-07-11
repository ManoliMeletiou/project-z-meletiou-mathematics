'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile } from '../../lib/projectZAuth';
import { supabase } from '../../lib/supabaseClient';
import { fetchMyMastery, fetchMyRecentAttempts, recordPracticeAttempt } from '../../lib/projectZData';

type Question = {
  id: string;
  skill_id: string;
  text: string;
  answer: string;
  accepted_answers?: string[];
  mark_scheme?: string[];
  verified?: boolean;
  source?: string;
  difficulty?: number;
};

type Attempt = {
  id: string;
  question: string;
  answer: string;
  correct: boolean;
  skill: string;
  createdAt: string;
  synced?: boolean;
};

type MasteryRow = {
  skill_id: string;
  attempts: number;
  correct: number;
  mastery_score: number;
  last_attempt_at: string | null;
};

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/\s/g, '')
    .replaceAll(';', ',')
    .replaceAll('and', ',');
}

function isCorrect(userAnswer: string, question: Question) {
  const user = normalise(userAnswer);
  const accepted = [question.answer, ...(question.accepted_answers || [])].map(normalise);
  return accepted.includes(user);
}

function readAttempts(): Attempt[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem('project-z-attempts') || '[]') as Attempt[];
  } catch {
    return [];
  }
}

function writeAttempts(attempts: Attempt[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('project-z-attempts', JSON.stringify(attempts.slice(0, 50)));
}

export default function DashboardPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [skill, setSkill] = useState('quad_fact');
  const [difficulty, setDifficulty] = useState(2);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hint, setHint] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [accountLabel, setAccountLabel] = useState('Guest student');
  const [syncStatus, setSyncStatus] = useState('Local progress mode');

  const stats = useMemo(() => {
    const attempted = attempts.length;
    const correct = attempts.filter((attempt) => attempt.correct).length;
    const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
    return { attempted, correct, accuracy };
  }, [attempts]);

  async function refreshDatabaseData() {
    const masteryData = await fetchMyMastery();
    setMastery(masteryData as MasteryRow[]);

    const remoteAttempts = await fetchMyRecentAttempts(8);

    if (remoteAttempts.length > 0) {
      setSyncStatus('Synced with Supabase');
    }
  }

  async function loadQuestion(nextSkill = skill, nextDifficulty = difficulty) {
    setLoading(true);
    setAnswer('');
    setFeedback('');
    setHint('');
    setShowAnswer(false);

    try {
      const res = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_id: nextSkill, difficulty: nextDifficulty })
      });

      const data = await res.json();
      setQuestion(data);
    } catch {
      setFeedback('Could not load a question. Refresh and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setAttempts(readAttempts());

    async function loadAccount() {
      const profile = await getCurrentProfile();
      const role = profile.role;

      if (!supabase) {
        setAccountLabel(`Guest ${role}`);
        setSyncStatus('Local progress mode');
        return;
      }

      setAccountLabel(profile.email ? `${profile.email} · ${role}` : 'Guest student');
      setSyncStatus(profile.user ? 'Ready to sync with Supabase' : 'Sign in to sync with Supabase');

      await refreshDatabaseData();
    }

    loadAccount();
    loadQuestion(skill, difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitAnswer() {
    if (!question || !answer.trim()) return;

    const correct = isCorrect(answer, question);

    const syncResult = await recordPracticeAttempt({
      skillId: skill,
      questionText: question.text,
      givenAnswer: answer,
      correct,
      source: question.source || 'unknown',
      difficulty: question.difficulty || difficulty
    });

    const newAttempt: Attempt = {
      id: `${Date.now()}`,
      question: question.text,
      answer,
      correct,
      skill,
      createdAt: new Date().toISOString(),
      synced: Boolean(syncResult.synced)
    };

    const nextAttempts = [newAttempt, ...attempts].slice(0, 50);
    setAttempts(nextAttempts);
    writeAttempts(nextAttempts);

    setSyncStatus(syncResult.synced
      ? 'Synced with Supabase'
      : `Saved locally. ${syncResult.reason || 'Sign in or run the Phase 3 SQL migration to enable database sync.'}`);

    setFeedback(correct
      ? 'Correct. Excellent work.'
      : 'Not quite yet. Use a hint, check your working, or reveal the mark scheme.');

    await refreshDatabaseData();
  }

  async function askHint() {
    if (!question) return;

    const res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionText: question.text, userAttempt: answer })
    });

    const data = await res.json();
    setHint(data.hint || 'Try breaking the question into smaller steps.');
  }

  function resetSession() {
    setAttempts([]);
    writeAttempts([]);
    setFeedback('Local session progress reset. Supabase history is kept.');
  }

  return (
    <main className="page pz-theme pz-guest-theme">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Student Dashboard</strong>
            <span>{accountLabel}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/account">Account</a>
            <a className="btn secondary" href="/student">Student Portal</a>
            <a className="btn secondary" href="/assignments">Assignments</a>
          </div>
        </nav>

        <div className="notice" style={{ marginBottom: 18 }}>
          <strong>Data status:</strong> {syncStatus}
        </div>

        <div className="grid grid2">
          <section className="card">
            <h2>Practice setup</h2>
            <div className="grid">
              <label className="label">
                Skill
                <select
                  className="select"
                  value={skill}
                  onChange={(event) => {
                    const nextSkill = event.target.value;
                    setSkill(nextSkill);
                    loadQuestion(nextSkill, difficulty);
                  }}
                >
                  <option value="quad_fact">Quadratic factorising</option>
                  <option value="linear_eq">Linear equations</option>
                </select>
              </label>

              <label className="label">
                Difficulty
                <select
                  className="select"
                  value={difficulty}
                  onChange={(event) => {
                    const nextDifficulty = Number(event.target.value);
                    setDifficulty(nextDifficulty);
                    loadQuestion(skill, nextDifficulty);
                  }}
                >
                  <option value={1}>Foundation</option>
                  <option value={2}>Core</option>
                  <option value={3}>Challenge</option>
                </select>
              </label>
            </div>
          </section>

          <section className="card">
            <h2>Session progress</h2>
            <p className="muted">Attempted: {stats.attempted}</p>
            <p className="muted">Correct: {stats.correct}</p>
            <p className={stats.accuracy >= 70 ? 'success' : 'warning'}>Accuracy: {stats.accuracy}%</p>
            <button className="btn secondary" onClick={resetSession}>Reset local session</button>
          </section>
        </div>

        <section className="card" style={{ marginTop: 18 }}>
          {loading && <p>Loading question...</p>}

          {!loading && question && (
            <>
              <div className="row">
                <span className="badge">{question.verified ? 'Verified' : 'Pending review'}</span>
                <span className="badge">Source: {question.source || 'engine'}</span>
                <span className="badge">Difficulty: {question.difficulty || difficulty}</span>
              </div>

              <p className="questionText">{question.text}</p>

              <input
                className="input"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type your answer, e.g. x = 2, x = -3"
              />

              <div className="row" style={{ marginTop: 16 }}>
                <button className="btn blue" onClick={submitAnswer}>Submit</button>
                <button className="btn secondary" onClick={askHint}>Ask Hint</button>
                <button className="btn secondary" onClick={() => setShowAnswer(true)}>Show Answer</button>
                <button className="btn green" onClick={() => loadQuestion(skill, difficulty)}>New Question</button>
              </div>

              {feedback && <p className={feedback.startsWith('Correct') ? 'success' : 'warning'}>{feedback}</p>}
              {hint && <div className="notice"><strong>Hint:</strong> {hint}</div>}

              {showAnswer && (
                <div className="card" style={{ marginTop: 18, background: '#f8fafc' }}>
                  <h2>Solution</h2>
                  <p><strong>Answer:</strong> {question.answer}</p>
                  <ol>
                    {(question.mark_scheme || []).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </section>

        <section className="grid grid2" style={{ marginTop: 18 }}>
          <div className="card">
            <h2>Recent attempts</h2>
            {attempts.length === 0 ? (
              <p className="muted">No attempts yet. Submit an answer to start tracking your progress.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Answer</th>
                    <th>Result</th>
                    <th>Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.slice(0, 8).map((attempt) => (
                    <tr key={attempt.id}>
                      <td>{attempt.skill}</td>
                      <td>{attempt.answer}</td>
                      <td>{attempt.correct ? 'Correct' : 'Review'}</td>
                      <td>{attempt.synced ? 'Supabase' : 'Local'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2>Database mastery</h2>
            {mastery.length === 0 ? (
              <p className="muted">No Supabase mastery rows yet. Sign in, run the Phase 3 SQL, and submit answers.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Attempts</th>
                    <th>Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {mastery.map((row) => (
                    <tr key={row.skill_id}>
                      <td>{row.skill_id}</td>
                      <td>{row.attempts}</td>
                      <td>{row.mastery_score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
