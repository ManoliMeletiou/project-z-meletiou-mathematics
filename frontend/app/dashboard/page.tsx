"use client";
import { useState, useEffect } from 'react'

export default function DashboardPage() {
  const [question, setQuestion] = useState<any>(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [hint, setHint] = useState('')

  // Fetch a new question when the component mounts
  useEffect(() => {
    async function fetchQuestion() {
      try {
        const res = await fetch('/api/question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill_id: 'quad_fact', criterion: 'A' })
        })
        const data = await res.json()
        setQuestion(data)
        setFeedback('')
        setAnswer('')
        setHint('')
      } catch (err) {
        console.error(err)
      }
    }
    fetchQuestion()
  }, [])

  const checkAnswer = () => {
    if (!question) return
    // Compare answers ignoring whitespace
    if (answer.trim().toLowerCase() === question.answer?.toLowerCase()) {
      setFeedback('Correct!')
    } else {
      setFeedback('Incorrect. Try again or ask for a hint.')
    }
  }

  const getHint = async () => {
    if (!question) return
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questionText: question.text, 
          userAttempt: answer, 
          skill: 'Quadratic Factoring' 
        })
      })
      const data = await res.json()
      setHint(data.hint || data.message || '')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Student Dashboard</h1>
      {question ? (
        <div className="space-y-2">
          <p className="bg-gray-100 p-4 rounded">{question.text}</p>
          <input 
            type="text" 
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer" 
            className="w-full p-2 border rounded" 
          />
          <div className="flex space-x-2">
            <button onClick={checkAnswer} className="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
            <button onClick={getHint} className="bg-purple-600 text-white px-4 py-2 rounded">Ask for a hint</button>
          </div>
          {feedback && <p className="text-sm text-gray-700">{feedback}</p>}
          {hint && <p className="text-sm italic text-gray-600">Hint: {hint}</p>}
        </div>
      ) : (
        <p>Loading question...</p>
      )}
    </div>
  )
}
