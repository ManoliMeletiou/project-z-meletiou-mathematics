'use client';

import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [question, setQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    async function fetchQuestion() {
      try {
        const res = await fetch('/api/question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill_id: 'quad_fact' })
        });
        const data = await res.json();
        setQuestion(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchQuestion();
  }, []);

  const checkAnswer = () => {
    if (!question) return;
    const correct = question.answer.replace(/\s/g, '');
    const user = answer.replace(/\s/g, '');
    if (user === correct) {
      setMessage('Correct!');
    } else {
      setMessage('Incorrect. Try again.');
    }
  };

  const requestHint = async () => {
    if (!question) return;
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: question.text,
          userAttempt: answer,
          skill: 'Quadratic Factoring'
        })
      });
      const data = await res.json();
      setHint(data.hint || 'No hint available.');
    } catch (err) {
      console.error(err);
      setHint('Error retrieving hint.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Student Dashboard</h2>
      {question ? (
        <>
          <p>{question.text}</p>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer"
            style={{ width: '100%', padding: '0.5rem' }}
          />
          <div style={{ marginTop: '1rem' }}>
            <button onClick={checkAnswer}>Submit</button>
            <button onClick={requestHint} style={{ marginLeft: '1rem' }}>
              Ask Hint
            </button>
          </div>
          {message && <p>{message}</p>}
          {hint && <p>Hint: {hint}</p>}
        </>
      ) : (
        <p>Loading question...</p>
      )}
    </div>
  );
}