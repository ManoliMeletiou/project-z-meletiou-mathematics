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
  DiagnosticGameEntryState,
  DiagnosticQuestion,
  DiagnosticSession,
  DiagnosticSummaryRow,
  fetchDiagnosticGameEntryState,
  fetchDiagnosticSummary,
  fetchNextDiagnosticQuestion,
  prepareDiagnosticPrologue,
  setDiagnosticSessionState,
  startDiagnostic,
  submitDiagnosticAnswer
} from '../../lib/projectZDiagnostic';

type DisplayOption = {
  displayKey: 'A' | 'B' | 'C' | 'D';
  originalKey: 'A' | 'B' | 'C' | 'D';
  text: string;
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

  return shuffleArray([...ORIGINAL_KEYS]).map((originalKey, index) => ({
    displayKey: DISPLAY_KEYS[index],
    originalKey,
    text: question.options?.[originalKey] || ''
  }));
}

function defaultCohort(courseCode: string) {
  return courseCode.startsWith('dp_') ? 'first_assessment_2029' : 'myp_current_framework';
}

export default function DiagnosticPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseCatalogRow[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseRow | null>(null);
  const [courseCode, setCourseCode] = useState('myp_1_standard');
  const [cohortSpecification, setCohortSpecification] = useState(defaultCohort('myp_1_standard'));
  const [languageCode, setLanguageCode] = useState('en');
  const [extraTimeMultiplier, setExtraTimeMultiplier] = useState<1 | 1.25 | 1.5 | 2>(1);
  const [screenReader, setScreenReader] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [inputMode, setInputMode] = useState<'keyboard' | 'touch' | 'mixed'>('mixed');
  const [orientationAnswer, setOrientationAnswer] = useState(false);
  const [orientationPause, setOrientationPause] = useState(false);
  const [gameEntry, setGameEntry] = useState<DiagnosticGameEntryState | null>(null);
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [question, setQuestion] = useState<DiagnosticQuestion | null>(null);
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>([]);
  const [answerRecorded, setAnswerRecorded] = useState(false);
  const [summary, setSummary] = useState<DiagnosticSummaryRow[]>([]);
  const [status, setStatus] = useState('Diagnostic loads when a student signs in.');

  async function refreshGameEntry() {
    const nextEntry = await fetchDiagnosticGameEntryState();
    setGameEntry(nextEntry);
    if (nextEntry?.state === 'first_mission_ready') {
      setSummary(await fetchDiagnosticSummary());
    } else {
      setSummary([]);
    }
    return nextEntry;
  }

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to begin the prologue.' : 'Only students take the diagnostic prologue.');
      return;
    }

    const courseRows = await fetchCurriculumCourses();
    const selectable = courseRows.filter((course) => course.is_selectable);
    const selected = await fetchMySelectedCourse();
    const nextCode = selected?.course_code || selectable[0]?.course_code || 'myp_1_standard';

    setCourses(selectable);
    setSelectedCourse(selected);
    setCourseCode(nextCode);
    setCohortSpecification(defaultCohort(nextCode));

    const entry = await refreshGameEntry();
    setStatus(entry?.state === 'first_mission_ready'
      ? 'Your starting map and first mission are ready.'
      : 'Complete setup and tool orientation. The diagnostic stays locked until its evidence is approved.');
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
    setCohortSpecification(defaultCohort(nextCourseCode));
    setQuestion(null);
    setDisplayOptions([]);
    setAnswerRecorded(false);

    if (role !== 'student') return;
    const result = await selectStudentCourse(nextCourseCode);
    if (!result.ok) {
      setStatus(`Could not select pathway: ${result.reason}`);
      return;
    }

    setSelectedCourse(null);
    setStatus('Pathway selected. Complete the setup below.');
    await refreshGameEntry();
  }

  async function saveSetup() {
    if (!orientationAnswer || !orientationPause) {
      setStatus('Complete both tool-orientation checks before continuing.');
      return;
    }

    setStatus('Saving prologue setup...');
    const result = await prepareDiagnosticPrologue({
      courseCode,
      cohortSpecification: cohortSpecification as 'myp_current_framework' | 'first_assessment_2021' | 'first_assessment_2029',
      languageCode,
      extraTimeMultiplier,
      screenReader,
      reducedMotion,
      largeText,
      inputMode,
      toolOrientationCompleted: true
    });

    if (!result.ok) {
      setStatus(`Could not save setup: ${result.reason}`);
      return;
    }

    setGameEntry(result.data || null);
    setStatus(result.data?.diagnostic_release_ready
      ? 'Setup saved. You can begin the diagnostic prologue.'
      : 'Setup saved. This pathway remains safely locked while its curriculum and diagnostic evidence are reviewed.');
  }

  async function beginDiagnostic() {
    if (role !== 'student') {
      setStatus('Only students can start diagnostics.');
      return;
    }

    if (!gameEntry?.diagnostic_release_ready) {
      setStatus('This diagnostic is locked until its skill map, questions and calibration evidence are approved.');
      return;
    }

    setStatus('Starting diagnostic...');
    setAnswerRecorded(false);
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
    setStatus('Diagnostic started. Take your time; you can pause between questions.');
  }

  async function pauseDiagnostic() {
    if (!session) return;
    const result = await setDiagnosticSessionState(session.id, 'paused');
    if (!result.ok || !result.data) {
      setStatus(`Could not pause diagnostic: ${result.reason}`);
      return;
    }
    setSession(result.data);
    setQuestion(null);
    setDisplayOptions([]);
    await refreshGameEntry();
    setStatus('Diagnostic paused. Your progress is saved.');
  }

  async function answer(displayOption: DisplayOption) {
    if (!session || !question?.question_id) {
      setStatus('Start a diagnostic first.');
      return;
    }

    setStatus('Recording response...');
    const result = await submitDiagnosticAnswer(session.id, question.question_id, displayOption.originalKey);
    if (!result.ok || !result.data) {
      setStatus(`Could not submit answer: ${result.reason}`);
      return;
    }

    setAnswerRecorded(true);
    const nextResult = await fetchNextDiagnosticQuestion(session.id);
    if (!nextResult.ok || !nextResult.data) {
      setStatus(`Could not load next question: ${nextResult.reason}`);
      return;
    }

    setQuestionWithShuffle(nextResult.data);
    if (nextResult.data.done) {
      const entry = await refreshGameEntry();
      setStatus(entry?.state === 'first_mission_ready'
        ? 'Diagnostic complete. Your starting map and first mission are ready.'
        : nextResult.data.message || 'Diagnostic ended without enough trustworthy evidence. No placement was guessed.');
    } else {
      setStatus('Response recorded. The next adaptive question is ready.');
    }
  }

  const selectedCourseName = courses.find((course) => course.course_code === courseCode)?.display_name || selectedCourse?.display_name || courseCode;
  const isDp = courseCode.startsWith('dp_');
  const diagnosticReleased = gameEntry?.diagnostic_release_ready === true;

  const weakSkills = useMemo(() => summary.filter((row) => row.strength_band === 'Weak').slice(0, 5), [summary]);
  const strongSkills = useMemo(() => summary.filter((row) => row.strength_band === 'Strong').slice(0, 5), [summary]);

  return (
    <main className="page pz-theme pz-student-theme">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Diagnostic Prologue</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/student">Student Portal</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }} aria-live="polite">
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to begin the mandatory game prologue.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card">
            <h2>Student-only prologue</h2>
            <p className="muted">Teachers and parents receive appropriate reports; only students complete this diagnostic.</p>
          </section>
        )}

        {role === 'student' && (
          <>
            <section className="grid grid2">
              <div className="card">
                <h2>1. Pathway and access setup</h2>
                <p className="muted">Choose the applicable curriculum cohort. Access preferences do not change the mathematics being assessed.</p>

                <label className="label">Pathway
                  <select className="select" value={courseCode} onChange={(event) => chooseCourse(event.target.value)}>
                    {courses.map((course) => <option key={course.course_code} value={course.course_code}>{course.display_name}</option>)}
                  </select>
                </label>
                <p><strong>Selected:</strong> {selectedCourseName}</p>

                {isDp ? (
                  <label className="label">DP cohort specification
                    <select className="select" value={cohortSpecification} onChange={(event) => setCohortSpecification(event.target.value)}>
                      <option value="first_assessment_2029">First assessment 2029</option>
                      <option value="first_assessment_2021">First assessment 2021</option>
                    </select>
                  </label>
                ) : <p className="muted">Cohort: current MYP framework</p>}

                <label className="label">Language
                  <select className="select" value={languageCode} onChange={(event) => setLanguageCode(event.target.value)}>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="label">Working-time preference
                  <select className="select" value={extraTimeMultiplier} onChange={(event) => setExtraTimeMultiplier(Number(event.target.value) as 1 | 1.25 | 1.5 | 2)}>
                    <option value={1}>Standard pace</option>
                    <option value={1.25}>Extra time ×1.25</option>
                    <option value={1.5}>Extra time ×1.5</option>
                    <option value={2}>Extra time ×2</option>
                  </select>
                </label>
                <label className="label">Input preference
                  <select className="select" value={inputMode} onChange={(event) => setInputMode(event.target.value as 'keyboard' | 'touch' | 'mixed')}>
                    <option value="mixed">Keyboard and touch</option>
                    <option value="keyboard">Keyboard</option>
                    <option value="touch">Touch</option>
                  </select>
                </label>
                <label><input type="checkbox" checked={screenReader} onChange={(event) => setScreenReader(event.target.checked)} /> Screen-reader support</label><br />
                <label><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /> Reduce motion</label><br />
                <label><input type="checkbox" checked={largeText} onChange={(event) => setLargeText(event.target.checked)} /> Larger text</label>
              </div>

              <div className="card">
                <h2>2. Tool orientation</h2>
                <p className="muted">These checks are not scored and do not affect placement.</p>
                <label><input type="checkbox" checked={orientationAnswer} onChange={(event) => setOrientationAnswer(event.target.checked)} /> I know how to select one answer, including “I do not know yet” when offered.</label><br /><br />
                <label><input type="checkbox" checked={orientationPause} onChange={(event) => setOrientationPause(event.target.checked)} /> I know I can pause between questions without losing progress.</label><br /><br />
                <button className="btn blue" onClick={saveSetup}>Save setup</button>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>3. Adaptive diagnostic</h2>
              <p className="muted">Project Z uses repeated, reviewed evidence under the applicable MYP or DP model. It never guesses a placement from one answer.</p>

              <button className="btn blue" onClick={beginDiagnostic} disabled={!diagnosticReleased}>
                {diagnosticReleased ? 'Start or continue diagnostic' : 'Diagnostic review in progress'}
              </button>
              {session?.status === 'active' && <button className="btn secondary" onClick={pauseDiagnostic} style={{ marginLeft: 8 }}>Pause</button>}

              {!diagnosticReleased && (
                <div className="notice" style={{ marginTop: 14 }}>
                  <strong>Safely locked.</strong> Curriculum mapping, independently reviewed questions and calibration evidence must all pass before this pathway can serve a diagnostic.
                  {gameEntry?.blockers && gameEntry.blockers.length > 0 && <p className="muted">Current gates: {gameEntry.blockers.join(', ')}.</p>}
                </div>
              )}

              {!question && <p className="muted">No scored question is active.</p>}
              {question?.done && <p className="muted">{question.message}</p>}
              {question && !question.done && (
                <div className="grid">
                  <p className="muted">Question {question.question_number} of up to {question.max_questions} · {question.skill_title}</p>
                  <h3>{question.prompt}</h3>
                  {displayOptions.map((option) => (
                    <button key={`${question.delivery_id}-${option.displayKey}`} className="btn secondary" onClick={() => answer(option)} style={{ textAlign: 'left' }}>
                      <strong>{option.displayKey}.</strong> {option.text}
                    </button>
                  ))}
                </div>
              )}

              {answerRecorded && <p className="notice" style={{ marginTop: 14 }}>Response recorded. Correct answers and interim mastery are withheld during the adaptive diagnostic so later evidence remains valid.</p>}
            </section>

            {gameEntry?.state === 'first_mission_ready' && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>Starting map</h2>
                <p><strong>First mission:</strong> {gameEntry.first_mission_title || gameEntry.first_mission_skill_code}</p>
                <p className="muted">This map is explainable evidence, not a grade. XP and game rewards remain separate from assessment.</p>
                <a className="btn blue" href="/recommended">Open first mission</a>
              </section>
            )}

            {summary.length > 0 && (
              <section className="grid grid2" style={{ marginTop: 18 }}>
                <div className="card"><h2>Develop next</h2>{weakSkills.map((row) => <p key={row.course_skill_code}><strong>{row.title}</strong><br /><span className="muted">{row.next_step}</span></p>)}</div>
                <div className="card"><h2>Secure evidence</h2>{strongSkills.map((row) => <p key={row.course_skill_code}><strong>{row.title}</strong><br /><span className="muted">{row.next_step}</span></p>)}</div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
