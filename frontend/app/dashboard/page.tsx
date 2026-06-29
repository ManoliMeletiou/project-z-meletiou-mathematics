'use client';

import { useEffect, useMemo, useState } from 'react';

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

export default function DashboardPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [skill, setSkill] = useState('quad_fact');
  const [difficulty, setDifficulty] = useState(2);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hint, setHint] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ attempted: 0, correct: 0 });

  const accuracy = useMemo(() => {
    if (!stats.attempted) return 0;
    return Math.round((stats.correct / stats.attempted) * 100);
  }, [stats]);

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
    loadQuestion(skill, difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitAnswer() {
    if (!question) return;

    const correct = isCorrect(answer, question);
    setStats((previous) => ({
      attempted: previous.attempted + 1,
      correct: previous.correct + (correct ? 1 : 0)
    }));

    setFeedback(correct
      ? 'Correct. Excellent work.'
      : 'Not quite yet. Use a hint, check your working, or reveal the mark scheme.');
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

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Student Dashboard</strong>
            <span>Adaptive practice and guided hints</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/teacher">Teacher</a>
            <a className="btn secondary" href="/parent">Parent</a>
          </div>
        </nav>

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
            <p className={accuracy >= 70 ? 'success' : 'warning'}>Accuracy: {accuracy}%</p>
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
      </div>
    </main>
  );
}
