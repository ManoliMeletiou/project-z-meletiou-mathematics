'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchFirstMissionSummary,
  fetchNextMissionPractice,
  fetchNextTeachingStep,
  FirstMissionSummary,
  PracticeDelivery,
  startFirstLearningMission,
  submitMissionCorrection,
  submitMissionPractice,
  submitTeachingCheck,
  TeachingStep
} from '../../lib/projectZFirstMission';

const blockerLabels: Record<string, string> = {
  reviewed_diagnostic_release_required: 'Reviewed diagnostic calibration',
  authorized_source_and_two_person_placement_review_required: 'Authorized source mapping and two-person placement review',
  pathway_release_required: 'Pathway curriculum release',
  generator_family_mathematics_review_required: 'Independent review of all five generator families',
  teaching_asset_mathematics_review_required: 'Independent review of the teaching sequence',
  operator_slice_release_required: 'Final operator release record',
  slice_not_registered: 'A registered first-mission slice'
};

export default function RecommendedPracticePage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [summary, setSummary] = useState<FirstMissionSummary | null>(null);
  const [teaching, setTeaching] = useState<TeachingStep | null>(null);
  const [practice, setPractice] = useState<PracticeDelivery | null>(null);
  const [answer, setAnswer] = useState('');
  const [reflection, setReflection] = useState('');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('Your first mission loads when you sign in.');

  async function refreshSummary() {
    const result = await fetchFirstMissionSummary();
    if ('reason' in result) {
      setStatus(result.reason);
      return null;
    }
    setSummary(result.data);
    return result.data;
  }

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);
    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest'
        ? 'Sign in as a student to continue the prologue.'
        : 'The first learning mission is a student workflow.');
      return;
    }
    const next = await refreshSummary();
    setStatus(next?.message || 'Your mission evidence is ready.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function beginMission() {
    setStatus('Starting the reviewed first mission…');
    const result = await startFirstLearningMission();
    if ('reason' in result) {
      setStatus(result.reason);
      return;
    }
    await refreshSummary();
    await loadTeaching(result.data.id);
  }

  async function loadTeaching(missionId = summary?.mission_id) {
    if (!missionId) return;
    setStatus('Loading the next teaching step…');
    const result = await fetchNextTeachingStep(missionId);
    if ('reason' in result) {
      setStatus(result.reason);
      return;
    }
    setTeaching(result.data.done ? null : result.data);
    setPractice(null);
    setAnswer('');
    setFeedback('');
    if (result.data.done) {
      await refreshSummary();
      setStatus(result.data.message || 'Teaching complete. Guided practice is ready.');
    } else {
      setStatus('Read the example, then complete the check in your own time.');
    }
  }

  async function checkTeaching() {
    if (!summary?.mission_id || !teaching?.asset_code) return;
    const result = await submitTeachingCheck(
      summary.mission_id,
      teaching.asset_code,
      answer,
      crypto.randomUUID()
    );
    if ('reason' in result) {
      setStatus(result.reason);
      return;
    }
    setFeedback(result.data.correct
      ? result.data.worked_solution || 'That reasoning is ready.'
      : result.data.scaffold_hint || 'Try the check again.');
    setStatus(result.data.correct ? 'Teaching check complete.' : 'Use the scaffold and try again.');
    setAnswer('');
    if (result.data.correct) {
      await refreshSummary();
      await loadTeaching();
    }
  }

  async function loadPractice() {
    if (!summary?.mission_id) return;
    setStatus('Loading one server-issued item…');
    const result = await fetchNextMissionPractice(summary.mission_id);
    if ('reason' in result) {
      setStatus(result.reason);
      return;
    }
    setPractice(result.data);
    setTeaching(null);
    setAnswer('');
    setReflection('');
    setFeedback('');
    setStatus(result.data.message || (
      result.data.state === 'correction_required'
        ? 'Repair the missed item before continuing.'
        : 'Work independently, then submit your reasoning.'
    ));
    await refreshSummary();
  }

  async function checkPractice() {
    if (!summary?.mission_id || !practice?.delivery_id) return;
    const result = await submitMissionPractice(
      summary.mission_id,
      practice.delivery_id,
      answer,
      crypto.randomUUID()
    );
    if ('reason' in result) {
      setStatus(result.reason);
      return;
    }
    setFeedback(result.data.worked_solution);
    setPractice(result.data.correction_required
      ? { ...practice, done: true, state: 'correction_required', attempt_id: result.data.attempt_id }
      : null);
    setAnswer('');
    await refreshSummary();
    setStatus(result.data.next_action === 'game_stage_unlocked'
      ? 'Mastery verified. The first game stage is unlocked.'
      : result.data.correction_required
        ? 'This item needs a correction before the mission continues.'
        : 'Evidence recorded. Continue when you are ready.');
  }

  async function checkCorrection() {
    if (!summary?.mission_id || !practice?.attempt_id) return;
    const result = await submitMissionCorrection(
      summary.mission_id,
      practice.attempt_id,
      answer,
      reflection,
      crypto.randomUUID()
    );
    if ('reason' in result) {
      setStatus(result.reason);
      return;
    }
    setFeedback(result.data.worked_solution);
    setAnswer('');
    setReflection('');
    await refreshSummary();
    if (result.data.answer_repaired) {
      setPractice(null);
      setStatus(result.data.next_action === 'game_stage_unlocked'
        ? 'Correction resolved and mastery verified. The first game stage is unlocked.'
        : 'Correction resolved. Continue with the mission when ready.');
    } else {
      setStatus('The correction is not resolved yet. Rework the place-value step and try again.');
    }
  }

  const releaseBlockers = summary?.release_blockers || [];
  const isCorrection = practice?.state === 'correction_required';

  return (
    <main className="page pz-theme pz-student-theme">
      <div className="container">
        <nav className="nav" aria-label="First mission navigation">
          <div className="brand">
            <strong>First Learning Mission</strong>
            <span>{email || 'Sign in'} · role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="button secondary" href="/diagnostic">Diagnostic prologue</a>
            <a className="button secondary" href="/student">Student home</a>
          </div>
        </nav>

        <section className="hero compact">
          <p className="eyebrow">Learn → practise → correct → master</p>
          <h1>A calm first mission, with evidence before rewards.</h1>
          <p>
            Teaching and practice evidence determines mastery. XP and coins are motivation only;
            they never change a grade or an IB assessment judgement.
          </p>
        </section>

        <p className="notice" role="status" aria-live="polite">{status}</p>

        {summary && (
          <section className="panel" aria-labelledby="mission-progress-title">
            <h2 id="mission-progress-title">Mission progress</h2>
            <div className="statsGrid">
              <article className="statCard"><span>State</span><strong>{summary.state.replaceAll('_', ' ')}</strong></article>
              <article className="statCard"><span>Teaching</span><strong>{summary.teaching_steps_completed || 0}/5</strong></article>
              <article className="statCard"><span>Independent</span><strong>{summary.independent_attempts || 0}/8</strong></article>
              <article className="statCard"><span>Checkpoints</span><strong>{summary.checkpoint_attempts || 0}/2</strong></article>
            </div>
            {summary.mastery_percent !== undefined && (
              <p>Current evidence: {summary.mastery_percent}% accuracy, {summary.confidence_percent}% confidence.</p>
            )}
            {summary.game_stage_unlocked && (
              <p className="success">The first place-value game stage is unlocked from verified mastery.</p>
            )}
          </section>
        )}

        {releaseBlockers.length > 0 && (
          <section className="panel" aria-labelledby="review-lock-title">
            <p className="eyebrow">Release lock</p>
            <h2 id="review-lock-title">This candidate is not learner-facing yet</h2>
            <p>Engineering evidence is in place. The following human and release evidence remains mandatory:</p>
            <ul>
              {releaseBlockers.map((blocker) => <li key={blocker}>{blockerLabels[blocker] || blocker.replaceAll('_', ' ')}</li>)}
            </ul>
          </section>
        )}

        {summary?.state === 'diagnostic_required' && (
          <section className="panel">
            <h2>Complete the prologue first</h2>
            <p>The main mission cannot begin without a sufficient, reviewed diagnostic and an explainable first mission.</p>
            <a className="button" href="/diagnostic">Open diagnostic prologue</a>
          </section>
        )}

        {summary?.state === 'ready_to_start' && (
          <button className="button" type="button" onClick={beginMission}>Start first mission</button>
        )}

        {teaching && (
          <section className="panel" aria-labelledby="teaching-title">
            <p className="eyebrow">Teaching step {teaching.step_order} of 5</p>
            <h2 id="teaching-title">{teaching.title}</h2>
            <p>{teaching.explanation}</p>
            <div className="notice">
              <strong>Worked example:</strong> {teaching.worked_example_prompt}<br />
              {teaching.worked_example_solution}
            </div>
            <label>
              {teaching.check_prompt}
              <input value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="off" />
            </label>
            <button className="button" type="button" onClick={checkTeaching}>Check my reasoning</button>
          </section>
        )}

        {practice && practice.prompt && (
          <section className="panel" aria-labelledby="practice-title">
            <p className="eyebrow">{isCorrection ? 'Correction' : practice.phase || practice.state}</p>
            <h2 id="practice-title">{practice.prompt}</h2>
            {practice.scaffold_hint && <p className="notice">Scaffold: {practice.scaffold_hint}</p>}
            {!isCorrection && practice.hints?.[0] && <details><summary>Need a hint?</summary><p>{practice.hints[0]}</p></details>}
            <label>
              {isCorrection ? 'Repaired answer' : 'Your answer'}
              <input value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="off" />
            </label>
            {isCorrection && (
              <label>
                What changed in your reasoning? (at least 20 characters)
                <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} rows={4} />
              </label>
            )}
            <button className="button" type="button" onClick={isCorrection ? checkCorrection : checkPractice}>
              {isCorrection ? 'Submit correction' : 'Check answer'}
            </button>
          </section>
        )}

        {feedback && <section className="panel" aria-live="polite"><h2>Feedback</h2><p>{feedback}</p></section>}

        {summary?.mission_started && !teaching && !practice && !summary.game_stage_unlocked && (
          <button
            className="button"
            type="button"
            onClick={() => summary.state === 'teaching' ? loadTeaching() : loadPractice()}
          >
            Continue mission
          </button>
        )}
      </div>
    </main>
  );
}
