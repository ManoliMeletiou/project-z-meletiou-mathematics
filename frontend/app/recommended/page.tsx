'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchLearningReport,
  fetchNextPracticeQuestion,
  fetchRecommendedPractice,
  LearningReport,
  PracticeAnswerResult,
  PracticeQuestion,
  PracticeSession,
  RecommendedSkill,
  startPracticeSkill,
  submitPracticeAnswer
} from '../../lib/projectZRecommendedPractice';

type DisplayOption = {
  displayKey: 'A' | 'B' | 'C' | 'D';
  originalKey: 'A' | 'B' | 'C' | 'D';
  text: string;
};

type DisplayResult = PracticeAnswerResult & {
  selected_display_option?: string;
  correct_display_option?: string;
};

const DISPLAY_KEYS = ['A', 'B', 'C', 'D'] as const;
const ORIGINAL_KEYS = ['A', 'B', 'C', 'D'] as const;

function shuffleArray<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function buildDisplayOptions(question: PracticeQuestion | null): DisplayOption[] {
  if (!question || question.done || !question.options) return [];

  const shuffledOriginalKeys = shuffleArray([...ORIGINAL_KEYS]);

  return shuffledOriginalKeys.map((originalKey, index) => ({
    displayKey: DISPLAY_KEYS[index],
    originalKey,
    text: question.options?.[originalKey] || ''
  }));
}

export default function RecommendedPracticePage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedSkill[]>([]);
  const [report, setReport] = useState<LearningReport | null>(null);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>([]);
  const [activeSkill, setActiveSkill] = useState<RecommendedSkill | null>(null);
  const [lastResult, setLastResult] = useState<DisplayResult | null>(null);
  const [status, setStatus] = useState('Recommended practice loads when a student signs in.');

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to use recommended practice.' : 'Only students can practise here. Teachers and parents can view reports.');
      return;
    }

    const rows = await fetchRecommendedPractice();
    const learningReport = await fetchLearningReport();

    setRecommendations(rows);
    setReport(learningReport);

    if (rows.length === 0) {
      setStatus('No recommendations yet. Complete the diagnostic first, or choose a course in Curriculum.');
      return;
    }

    setStatus('Recommended practice loaded from your diagnostic and mastery evidence.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  function setQuestionWithShuffle(nextQuestion: PracticeQuestion) {
    setQuestion(nextQuestion);
    setDisplayOptions(buildDisplayOptions(nextQuestion));
  }

  async function startSkill(skill: RecommendedSkill) {
    setActiveSkill(skill);
    setLastResult(null);
    setStatus(`Starting practice for ${skill.title}...`);

    const startResult = await startPracticeSkill(skill.course_skill_code);

    if (!startResult.ok || !startResult.data) {
      setStatus(`Could not start practice: ${startResult.reason}`);
      return;
    }

    setSession(startResult.data);

    const nextResult = await fetchNextPracticeQuestion(startResult.data.id);

    if (!nextResult.ok || !nextResult.data) {
      setStatus(`Could not load practice question: ${nextResult.reason}`);
      return;
    }

    setQuestionWithShuffle(nextResult.data);
    setStatus('Recommended practice started. Answer the question.');
  }

  async function answer(option: DisplayOption) {
    if (!session || !question?.question_id) {
      setStatus('Start a practice session first.');
      return;
    }

    setStatus('Checking answer...');

    const result = await submitPracticeAnswer(session.id, question.question_id, option.originalKey);

    if (!result.ok || !result.data) {
      setStatus(`Could not submit answer: ${result.reason}`);
      return;
    }

    const correctDisplayOption = displayOptions.find((displayOption) => displayOption.originalKey === result.data.correct_option);

    setLastResult({
      ...result.data,
      selected_display_option: option.displayKey,
      correct_display_option: correctDisplayOption?.displayKey
    });

    const nextResult = await fetchNextPracticeQuestion(session.id);

    const rows = await fetchRecommendedPractice();
    const learningReport = await fetchLearningReport();
    setRecommendations(rows);
    setReport(learningReport);

    if (!nextResult.ok || !nextResult.data) {
      setStatus(`Could not load next question: ${nextResult.reason}`);
      return;
    }

    setQuestionWithShuffle(nextResult.data);

    if (nextResult.data.done) {
      setStatus(nextResult.data.message || 'Practice set completed.');
      setSession(null);
    } else {
      setStatus('Answer recorded. Next recommended practice question loaded with shuffled options.');
    }
  }

  const urgentRecommendations = useMemo(
    () => recommendations.slice(0, 4),
    [recommendations]
  );

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Recommended Practice</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/student">Student Portal</a>
            <a className="btn secondary" href="/diagnostic">Diagnostic</a>
            <a className="btn secondary" href="/curriculum">Curriculum</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to use recommended practice.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card">
            <h2>Student-only practice</h2>
            <p className="muted">Teachers and parents can view reports, but only students complete practice sessions.</p>
          </section>
        )}

        {role === 'student' && (
          <>
            <section className="grid grid3">
              <div className="card">
                <h2>Learning report</h2>
                {report ? (
                  <p>
                    <strong>{report.course_display_name || 'No course selected'}</strong><br />
                    Average mastery: {report.average_mastery}%<br />
                    Average confidence: {report.average_confidence}%<br />
                    Diagnostic attempts: {report.total_diagnostic_attempts}<br />
                    Practice attempts: {report.total_practice_attempts}
                  </p>
                ) : (
                  <p className="muted">No report yet.</p>
                )}
              </div>

              <div className="card">
                <h2>Skill balance</h2>
                {report ? (
                  <p>
                    Weak: {report.weak_skill_count}<br />
                    Developing: {report.developing_skill_count}<br />
                    Strong: {report.strong_skill_count}
                  </p>
                ) : (
                  <p className="muted">Complete diagnostic questions to build this.</p>
                )}
              </div>

              <div className="card">
                <h2>Next step</h2>
                <p className="muted">{report?.next_steps || 'Complete the diagnostic first.'}</p>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Highest-priority recommended skills</h2>
              <p className="muted">
                These are selected using mastery, confidence, evidence count, and curriculum priority. The app should practise the skill, not just random topics.
              </p>

              {urgentRecommendations.length === 0 ? (
                <div>
                  <p className="muted">No recommended skills yet.</p>
                  <a className="btn blue" href="/diagnostic">Take diagnostic</a>
                </div>
              ) : (
                <div className="grid grid2">
                  {urgentRecommendations.map((skill) => (
                    <div key={skill.course_skill_code} className="card">
                      <h3>{skill.title}</h3>
                      <p className="muted">
                        {skill.course_display_name}
                        {skill.assessment_criterion ? ` - Criterion ${skill.assessment_criterion}` : ''}
                        <br />
                        {skill.strand_title}
                      </p>
                      <p>{skill.description}</p>
                      <p>
                        Mastery: <strong>{skill.mastery_percent}%</strong><br />
                        Confidence: <strong>{skill.confidence_percent}%</strong><br />
                        Evidence: <strong>{skill.correct_count}/{skill.evidence_count}</strong><br />
                        Priority: <strong>{skill.priority_score}</strong>
                      </p>
                      <p className="muted">{skill.recommendation_reason}</p>
                      <button className="btn blue" onClick={() => startSkill(skill)}>
                        {skill.next_action}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Practice question</h2>

              {!question && (
                <p className="muted">Choose a recommended skill to start targeted practice.</p>
              )}

              {question?.done && (
                <div>
                  <h3>Practice complete</h3>
                  <p className="muted">{question.message}</p>
                  <button className="btn blue" onClick={loadPage}>Refresh recommendations</button>
                </div>
              )}

              {question && !question.done && (
                <div className="grid">
                  <p className="muted">
                    Question {question.question_number} of {question.target_questions} - {question.skill_title}
                    {question.assessment_criterion ? ` - Criterion ${question.assessment_criterion}` : ''}
                  </p>

                  <h3>{question.prompt}</h3>

                  {displayOptions.map((option) => (
                    <button key={`${question.question_id}-${option.displayKey}`} className="btn secondary" onClick={() => answer(option)} style={{ textAlign: 'left' }}>
                      <strong>{option.displayKey}.</strong> {option.text}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {lastResult && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>{lastResult.correct ? 'Correct' : 'Not yet correct'}</h2>
                <p>
                  <strong>Your answer:</strong> {lastResult.selected_display_option || lastResult.selected_option}
                  <br />
                  <strong>Correct answer:</strong> {lastResult.correct_display_option || lastResult.correct_option}
                </p>
                <p className="muted">{lastResult.explanation}</p>
                <p>
                  <strong>Updated skill mastery:</strong> {lastResult.mastery_percent}%
                  <br />
                  <span className="muted">
                    Evidence: {lastResult.correct_count}/{lastResult.evidence_count}, confidence {lastResult.confidence_percent}%
                  </span>
                </p>
              </section>
            )}

            {recommendations.length > 4 && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>More recommended skills</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Mastery</th>
                      <th>Reason</th>
                      <th>Start</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.slice(4).map((skill) => (
                      <tr key={skill.course_skill_code}>
                        <td>
                          <strong>{skill.title}</strong><br />
                          <span className="muted">{skill.assessment_criterion ? `Criterion ${skill.assessment_criterion}` : 'DP skill'}</span>
                        </td>
                        <td>{skill.mastery_percent}%</td>
                        <td>{skill.recommendation_reason}</td>
                        <td>
                          <button className="btn secondary" onClick={() => startSkill(skill)}>
                            Practise
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
