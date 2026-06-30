'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  CourseCatalogRow,
  fetchCurriculumCourses,
  fetchMySelectedCourse,
  selectStudentCourse,
  SelectedCourseRow
} from '../../lib/projectZCurriculum';
import {
  DiagnosticAnswerResult,
  DiagnosticQuestion,
  DiagnosticSession,
  DiagnosticSummaryRow,
  fetchDiagnosticSummary,
  fetchNextDiagnosticQuestion,
  startDiagnostic,
  submitDiagnosticAnswer
} from '../../lib/projectZDiagnostic';

type DisplayOption = {
  displayKey: 'A' | 'B' | 'C' | 'D';
  originalKey: 'A' | 'B' | 'C' | 'D';
  text: string;
};

type DisplayResult = DiagnosticAnswerResult & {
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

function buildDisplayOptions(question: DiagnosticQuestion | null): DisplayOption[] {
  if (!question || question.done || !question.options) return [];

  const shuffledOriginalKeys = shuffleArray([...ORIGINAL_KEYS]);

  return shuffledOriginalKeys.map((originalKey, index) => ({
    displayKey: DISPLAY_KEYS[index],
    originalKey,
    text: question.options?.[originalKey] || ''
  }));
}

export default function DiagnosticPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseCatalogRow[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseRow | null>(null);
  const [courseCode, setCourseCode] = useState('myp_standard');
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [question, setQuestion] = useState<DiagnosticQuestion | null>(null);
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>([]);
  const [lastResult, setLastResult] = useState<DisplayResult | null>(null);
  const [summary, setSummary] = useState<DiagnosticSummaryRow[]>([]);
  const [status, setStatus] = useState('Diagnostic loads when a student signs in.');

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to take a diagnostic.' : 'Only students can take diagnostics. Teachers and parents can view reports.');
      return;
    }

    const courseRows = await fetchCurriculumCourses();
    const selectable = courseRows.filter((course) => course.is_selectable);
    const selected = await fetchMySelectedCourse();

    setCourses(selectable);
    setSelectedCourse(selected);
    setCourseCode(selected?.course_code || selectable[0]?.course_code || 'myp_standard');

    const summaryRows = await fetchDiagnosticSummary();
    setSummary(summaryRows);

    setStatus('Choose your course and start the adaptive diagnostic.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  function setQuestionWithShuffle(nextQuestion: DiagnosticQuestion) {
    setQuestion(nextQuestion);
    setDisplayOptions(buildDisplayOptions(nextQuestion));
  }

  async function chooseCourse(nextCourseCode: string) {
    setCourseCode(nextCourseCode);

    if (role === 'student') {
      const result = await selectStudentCourse(nextCourseCode);
      if (!result.ok) {
        setStatus(`Could not select course: ${result.reason}`);
        return;
      }

      setSelectedCourse(null);
      setQuestion(null);
      setDisplayOptions([]);
      setLastResult(null);
      setStatus('Course selected. Start the diagnostic when ready.');
      await loadPage();
    }
  }

  async function beginDiagnostic() {
    if (role !== 'student') {
      setStatus('Only students can start diagnostics.');
      return;
    }

    setStatus('Starting diagnostic...');
    setLastResult(null);

    const startResult = await startDiagnostic(courseCode);

    if (!startResult.ok || !startResult.data) {
      setStatus(`Could not start diagnostic: ${startResult.reason}`);
      return;
    }

    setSession(startResult.data);

    const nextResult = await fetchNextDiagnosticQuestion(startResult.data.id);

    if (!nextResult.ok || !nextResult.data) {
      setStatus(`Could not load question: ${nextResult.reason}`);
      return;
    }

    setQuestionWithShuffle(nextResult.data);
    setStatus('Diagnostic started. Answer the question.');
  }

  async function answer(displayOption: DisplayOption) {
    if (!session || !question?.question_id) {
      setStatus('Start a diagnostic first.');
      return;
    }

    setStatus('Checking answer...');

    // Submit the original hidden option key so marking stays accurate even though
    // the displayed A/B/C/D labels are shuffled for the student.
    const result = await submitDiagnosticAnswer(session.id, question.question_id, displayOption.originalKey);

    if (!result.ok || !result.data) {
      setStatus(`Could not submit answer: ${result.reason}`);
      return;
    }

    const correctDisplayOption = displayOptions.find((option) => option.originalKey === result.data.correct_option);

    setLastResult({
      ...result.data,
      selected_display_option: displayOption.displayKey,
      correct_display_option: correctDisplayOption?.displayKey
    });

    const summaryRows = await fetchDiagnosticSummary();
    setSummary(summaryRows);

    const nextResult = await fetchNextDiagnosticQuestion(session.id);

    if (!nextResult.ok || !nextResult.data) {
      setStatus(`Could not load next question: ${nextResult.reason}`);
      return;
    }

    setQuestionWithShuffle(nextResult.data);

    if (nextResult.data.done) {
      setStatus(nextResult.data.message || 'Diagnostic completed.');
    } else {
      setStatus('Answer recorded. Next adaptive question loaded with shuffled answer options.');
    }
  }

  const selectedCourseName = courses.find((course) => course.course_code === courseCode)?.display_name || selectedCourse?.display_name || courseCode;

  const weakSkills = useMemo(
    () => summary.filter((row) => row.strength_band === 'Weak').slice(0, 5),
    [summary]
  );

  const strongSkills = useMemo(
    () => summary.filter((row) => row.strength_band === 'Strong').slice(0, 5),
    [summary]
  );

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Adaptive Diagnostic</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/student">Student Portal</a>
            <a className="btn secondary" href="/curriculum">Curriculum</a>
            <a className="btn secondary" href="/recommended">Recommended</a>
            <a className="btn secondary" href="/path">Skill Path</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to take the diagnostic.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card">
            <h2>Student-only diagnostic</h2>
            <p className="muted">Teachers and parents can view reports, but only students take diagnostic tests.</p>
          </section>
        )}

        {role === 'student' && (
          <>
            <section className="grid grid2">
              <div className="card">
                <h2>Course</h2>
                <p className="muted">The diagnostic uses the selected curriculum skill map.</p>

                <label className="label">
                  Course
                  <select className="select" value={courseCode} onChange={(event) => chooseCourse(event.target.value)}>
                    {courses.map((course) => (
                      <option key={course.course_code} value={course.course_code}>
                        {course.display_name}
                      </option>
                    ))}
                  </select>
                </label>

                <p>
                  <strong>Selected:</strong> {selectedCourseName}
                </p>

                <button className="btn blue" onClick={beginDiagnostic}>
                  Start / continue diagnostic
                </button>
              </div>

              <div className="card">
                <h2>How it works</h2>
                <p className="muted">
                  The app asks questions from different skills until it has enough evidence. Mastery is capped, so students do not easily reach 100 percent.
                </p>
                <ul>
                  <li>Answer choices shuffle every question.</li>
                  <li>Questions shuffle, but the skill stays tracked.</li>
                  <li>MYP Criteria A-D can be diagnosed.</li>
                  <li>Wrong answers represent realistic misconceptions.</li>
                  <li>The next phase will use this to recommend practice.</li>
                </ul>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Diagnostic question</h2>

              {!question && (
                <p className="muted">Start the diagnostic to load the first question.</p>
              )}

              {question?.done && (
                <div>
                  <h3>Diagnostic completed</h3>
                  <p className="muted">{question.message}</p>
                  <a className="btn blue" href="/curriculum">View skill map</a>
                </div>
              )}

              {question && !question.done && (
                <div className="grid">
                  <p className="muted">
                    Question {question.question_number} of up to {question.max_questions} - {question.skill_title}
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
                  <strong>Skill mastery:</strong> {lastResult.mastery_percent}%
                  <br />
                  <span className="muted">Evidence: {lastResult.correct_count}/{lastResult.evidence_count}, confidence {lastResult.confidence_percent}%</span>
                </p>
              </section>
            )}

            <section className="grid grid2" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Weakest skills</h2>
                {weakSkills.length === 0 ? (
                  <p className="muted">Weak skills will appear after enough evidence is collected.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Skill</th>
                        <th>Mastery</th>
                        <th>Next step</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weakSkills.map((row) => (
                        <tr key={row.course_skill_code}>
                          <td>
                            <strong>{row.title}</strong><br />
                            <span className="muted">{row.assessment_criterion ? `Criterion ${row.assessment_criterion}` : 'DP skill'}</span>
                          </td>
                          <td>{row.mastery_percent}%</td>
                          <td>{row.next_step}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card">
                <h2>Strong skills</h2>
                {strongSkills.length === 0 ? (
                  <p className="muted">Strong skills will appear after enough evidence is collected.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Skill</th>
                        <th>Mastery</th>
                        <th>Next step</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strongSkills.map((row) => (
                        <tr key={row.course_skill_code}>
                          <td>
                            <strong>{row.title}</strong><br />
                            <span className="muted">{row.assessment_criterion ? `Criterion ${row.assessment_criterion}` : 'DP skill'}</span>
                          </td>
                          <td>{row.mastery_percent}%</td>
                          <td>{row.next_step}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
