'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProjectZCalmHeader } from '../../components/ProjectZCalmHeader';
import { getCurrentProfile, type ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchProjectZAuthorizedCurriculumSources,
  fetchProjectZCurriculumReviewAccess,
  fetchProjectZCurriculumReviewerRoster,
  fetchProjectZCurriculumReviewQueue,
  projectZReviewPathwayOptions,
  registerProjectZAuthorizedCurriculumSource,
  registerProjectZCurriculumReviewer,
  reviewProjectZCurriculumEducatorSignoff,
  reviewProjectZCurriculumSourceAlignment,
  type ProjectZAuthorizedCurriculumSource,
  type ProjectZCurriculumReviewAccess,
  type ProjectZCurriculumReviewer,
  type ProjectZCurriculumReviewerRole,
  type ProjectZCurriculumReviewItem
} from '../../lib/projectZCurriculumReview';
import type { ProjectZPathwayCode } from '../../lib/projectZCurriculumFoundation';
import { projectZThemeForRole } from '../../lib/projectZNavigation';

const educatorAttestation = 'I CONFIRM THIS SKILL ALIGNMENT';

const blockerLabels: Record<string, string> = {
  authorized_guide_missing: 'Authorized guide not registered',
  source_alignment_incomplete: 'Source mapping pending',
  educator_signoff_incomplete: 'Independent educator sign-off pending',
  variant_floor_incomplete: '2,000 verified variants pending'
};

export default function CurriculumReviewPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [access, setAccess] = useState<ProjectZCurriculumReviewAccess | null>(null);
  const [courseCode, setCourseCode] = useState<ProjectZPathwayCode>('myp_1_standard');
  const [queue, setQueue] = useState<ProjectZCurriculumReviewItem[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [sources, setSources] = useState<ProjectZAuthorizedCurriculumSource[]>([]);
  const [reviewers, setReviewers] = useState<ProjectZCurriculumReviewer[]>([]);
  const [status, setStatus] = useState('Checking curriculum-review access…');
  const [busy, setBusy] = useState(false);

  const [sourceCode, setSourceCode] = useState('');
  const [sourceLocator, setSourceLocator] = useState('');
  const [sourceNotes, setSourceNotes] = useState('');
  const [educatorNotes, setEducatorNotes] = useState('');
  const [attestation, setAttestation] = useState('');

  const [reviewerUserId, setReviewerUserId] = useState('');
  const [reviewerKind, setReviewerKind] = useState<ProjectZCurriculumReviewerRole>('curriculum_mapper');
  const [credentialNote, setCredentialNote] = useState('');
  const [newSource, setNewSource] = useState({
    sourceCode: '', title: '', publisher: 'International Baccalaureate Organization',
    frameworkVersion: '', notes: ''
  });

  const selected = queue.find((item) => item.atlas_skill_code === selectedCode) || queue[0] || null;
  const mapper = access?.reviewer_roles.includes('curriculum_mapper') === true;
  const educator = access?.reviewer_roles.includes('mathematics_educator') === true;
  const summary = useMemo(() => ({
    aligned: queue.filter((item) => item.source_alignment_status === 'aligned').length,
    approved: queue.filter((item) => item.educator_review_status === 'approved').length,
    variantsReady: queue.filter((item) => item.strict_verified_variant_count >= item.required_min_variants).length
  }), [queue]);

  async function load(nextCourseCode: ProjectZPathwayCode = courseCode, preserveStatus = false) {
    const profile = await getCurrentProfile();
    setEmail(profile.email);
    setRole(profile.role);

    const accessResult = await fetchProjectZCurriculumReviewAccess();
    if (!accessResult.ok || !accessResult.data) {
      setAccess(null);
      setQueue([]);
      const reason = 'reason' in accessResult ? accessResult.reason : 'Restricted curriculum-review access.';
      setStatus(accessResult.ok ? 'Restricted curriculum-review access.' : `Access check failed: ${reason}`);
      return;
    }

    const accessRow = accessResult.data;
    const allowed = accessRow.is_operator || accessRow.reviewer_roles.length > 0;
    setAccess(accessRow);
    if (!allowed) {
      setQueue([]);
      setStatus('This workbench is limited to verified Project Z curriculum reviewers and operators.');
      return;
    }

    const [queueResult, sourceResult, rosterResult] = await Promise.all([
      fetchProjectZCurriculumReviewQueue(nextCourseCode),
      fetchProjectZAuthorizedCurriculumSources(),
      accessRow.is_operator ? fetchProjectZCurriculumReviewerRoster() : Promise.resolve({ ok: true as const, data: [] })
    ]);

    setQueue(queueResult.data);
    setSources(sourceResult.data);
    setReviewers(rosterResult.data);
    setSelectedCode((current) => queueResult.data.some((item) => item.atlas_skill_code === current)
      ? current
      : queueResult.data[0]?.atlas_skill_code || '');
    setSourceCode((current) => current || sourceResult.data[0]?.source_code || '');
    if (!preserveStatus) {
      setStatus(sourceResult.data.length === 0
        ? 'Review queue loaded. Approval is blocked until authorized-guide metadata and two independent reviewers exist.'
        : 'Review queue loaded. Work on one skill and one evidence stage at a time.');
    }
  }

  useEffect(() => { void load('myp_1_standard'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function changeCourse(value: ProjectZPathwayCode) {
    setCourseCode(value);
    setStatus('Loading this pathway review queue…');
    await load(value, true);
    setStatus('Pathway queue ready. No review action releases learner content.');
  }

  async function submitSourceDecision(decision: 'aligned' | 'needs_revision') {
    if (!selected) return;
    setBusy(true);
    setStatus('Recording source-mapping evidence…');
    const result = await reviewProjectZCurriculumSourceAlignment({
      atlasSkillCode: selected.atlas_skill_code,
      sourceCode: decision === 'aligned' ? sourceCode : null,
      sourceLocator: decision === 'aligned' ? sourceLocator : null,
      decision,
      notes: sourceNotes
    });
    if (result.ok) {
      setSourceNotes('');
      setSourceLocator('');
      await load(courseCode, true);
    }
    setStatus(result.ok ? `Source review recorded as ${decision.replace('_', ' ')}.` : `Source review failed: ${'reason' in result ? result.reason : 'Unknown error'}`);
    setBusy(false);
  }

  async function submitEducatorDecision(decision: 'approved' | 'needs_revision') {
    if (!selected) return;
    setBusy(true);
    setStatus('Recording independent educator evidence…');
    const result = await reviewProjectZCurriculumEducatorSignoff({
      atlasSkillCode: selected.atlas_skill_code,
      decision,
      notes: educatorNotes,
      attestation: decision === 'approved' ? attestation : ''
    });
    if (result.ok) {
      setEducatorNotes('');
      setAttestation('');
      await load(courseCode, true);
    }
    setStatus(result.ok ? `Educator review recorded as ${decision.replace('_', ' ')}.` : `Educator review failed: ${'reason' in result ? result.reason : 'Unknown error'}`);
    setBusy(false);
  }

  async function registerReviewer() {
    setBusy(true);
    const result = await registerProjectZCurriculumReviewer(reviewerUserId, reviewerKind, credentialNote);
    if (result.ok) {
      setReviewerUserId('');
      setCredentialNote('');
      await load(courseCode, true);
    }
    setStatus(result.ok ? 'Verified reviewer role registered.' : `Reviewer registration failed: ${'reason' in result ? result.reason : 'Unknown error'}`);
    setBusy(false);
  }

  async function registerSource() {
    setBusy(true);
    const result = await registerProjectZAuthorizedCurriculumSource(newSource);
    if (result.ok) {
      setNewSource({ sourceCode: '', title: '', publisher: 'International Baccalaureate Organization', frameworkVersion: '', notes: '' });
      await load(courseCode, true);
    }
    setStatus(result.ok ? 'Authorized-guide metadata registered. No guide text was copied.' : `Source registration failed: ${'reason' in result ? result.reason : 'Unknown error'}`);
    setBusy(false);
  }

  const allowed = access?.is_operator || Boolean(access?.reviewer_roles.length);

  return (
    <main className={`page pz-theme pz-calm-page ${projectZThemeForRole(role)}`}>
      <div className="pz-calm-container">
        <ProjectZCalmHeader email={email} role={role} backHref="/curriculum" backLabel="Curriculum" />

        <section className="pz-calm-hero pz-calm-hero-compact">
          <p className="pz-eyebrow">Restricted evidence workbench</p>
          <h1>Review one curriculum skill at a time</h1>
          <p>Source mapping and educator sign-off are separate. Neither step releases practice until every remaining evidence gate passes.</p>
        </section>

        <section className="notice" aria-live="polite" style={{ marginTop: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {!allowed ? (
          <section className="pz-calm-section">
            <h2>Restricted access</h2>
            <p className="muted">A Project Z operator must verify reviewer credentials before this queue becomes available.</p>
          </section>
        ) : (
          <>
            <section className="pz-calm-section">
              <p className="pz-eyebrow">Step 1 · pathway</p>
              <h2>Choose the pathway to review</h2>
              <label className="label" style={{ maxWidth: 680 }}>IB pathway
                <select className="select" value={courseCode} onChange={(event) => void changeCourse(event.target.value as ProjectZPathwayCode)}>
                  {projectZReviewPathwayOptions.map((pathway) => (
                    <option key={pathway.courseCode} value={pathway.courseCode}>{pathway.displayName}</option>
                  ))}
                </select>
              </label>

              <div className="pz-evidence-strip">
                <div><strong>{queue.length}</strong><span>skills in this queue</span></div>
                <div><strong>{summary.aligned}</strong><span>source-aligned</span></div>
                <div><strong>{summary.approved}</strong><span>educator-approved</span></div>
                <div><strong>{summary.variantsReady}</strong><span>at the 2,000 floor</span></div>
              </div>
            </section>

            <section className="pz-calm-section">
              <p className="pz-eyebrow">Step 2 · skill</p>
              <h2>Inspect one candidate</h2>
              <label className="label">Candidate skill
                <select className="select" value={selected?.atlas_skill_code || ''} onChange={(event) => setSelectedCode(event.target.value)}>
                  {queue.map((item) => (
                    <option key={item.atlas_skill_code} value={item.atlas_skill_code}>
                      {item.course_sequence}. {item.title}
                    </option>
                  ))}
                </select>
              </label>

              {selected ? (
                <article className="pz-review-focus">
                  <div>
                    <p className="pz-eyebrow">{selected.strand_code}</p>
                    <h3>{selected.title}</h3>
                    <p>{selected.learning_objective}</p>
                  </div>
                  <div className="pz-review-blockers">
                    {selected.readiness_blockers.map((blocker) => (
                      <span className="pz-status-pill" key={blocker}>{blockerLabels[blocker] || blocker}</span>
                    ))}
                  </div>
                </article>
              ) : <p className="muted">No candidate is available for this pathway.</p>}
            </section>

            {selected && mapper ? (
              <details className="pz-more-tools" open>
                <summary>Source alignment <span>{selected.source_alignment_status.replace('_', ' ')}</span></summary>
                <div className="pz-more-tools-content">
                  {sources.length === 0 ? (
                    <div className="pz-calm-callout">
                      <strong>Blocked: no authorized guide metadata</strong>
                      <p>An operator must first register the school’s authorized guide metadata. Do not paste guide text or a private Drive link into this form.</p>
                    </div>
                  ) : (
                    <div className="grid" style={{ maxWidth: 760 }}>
                      <label className="label">Authorized source
                        <select className="select" value={sourceCode} onChange={(event) => setSourceCode(event.target.value)}>
                          {sources.map((source) => <option key={source.source_code} value={source.source_code}>{source.title} · {source.framework_version}</option>)}
                        </select>
                      </label>
                      <label className="label">Section label inside the guide
                        <input className="input" value={sourceLocator} onChange={(event) => setSourceLocator(event.target.value)} placeholder="For example: topic 2 · functions" />
                      </label>
                      <label className="label">Review evidence — paraphrase only
                        <textarea className="input" rows={4} value={sourceNotes} onChange={(event) => setSourceNotes(event.target.value)} placeholder="Explain the alignment or the revision needed. Do not copy protected guide text." />
                      </label>
                      <div className="row">
                        <button className="btn blue" disabled={busy || sourceNotes.trim().length < 20 || sourceLocator.trim().length < 3} onClick={() => void submitSourceDecision('aligned')}>Record aligned</button>
                        <button className="btn secondary" disabled={busy || sourceNotes.trim().length < 20} onClick={() => void submitSourceDecision('needs_revision')}>Needs revision</button>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            ) : null}

            {selected && educator ? (
              <details className="pz-more-tools" open={selected.source_alignment_status === 'aligned'}>
                <summary>Independent educator sign-off <span>{selected.educator_review_status.replace('_', ' ')}</span></summary>
                <div className="pz-more-tools-content">
                  {selected.source_alignment_status !== 'aligned' ? (
                    <p className="muted">A different verified curriculum mapper must complete source alignment first.</p>
                  ) : (
                    <div className="grid" style={{ maxWidth: 760 }}>
                      <label className="label">Educator evidence
                        <textarea className="input" rows={4} value={educatorNotes} onChange={(event) => setEducatorNotes(event.target.value)} placeholder="Check the objective, mathematical accuracy, placement and prerequisite logic." />
                      </label>
                      <label className="label">Type {educatorAttestation} to approve
                        <input className="input" value={attestation} onChange={(event) => setAttestation(event.target.value)} />
                      </label>
                      <div className="row">
                        <button className="btn blue" disabled={busy || educatorNotes.trim().length < 20 || attestation !== educatorAttestation} onClick={() => void submitEducatorDecision('approved')}>Approve alignment</button>
                        <button className="btn secondary" disabled={busy || educatorNotes.trim().length < 20} onClick={() => void submitEducatorDecision('needs_revision')}>Return for revision</button>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            ) : null}

            {access?.is_operator ? (
              <details className="pz-more-tools">
                <summary>Operator setup <span>{sources.length} guides · {reviewers.length} reviewer roles</span></summary>
                <div className="pz-more-tools-content grid grid2">
                  <section>
                    <h3>Register authorized-guide metadata</h3>
                    <p className="muted">Record metadata only. The protected guide stays in the school-approved private source.</p>
                    <label className="label">Source code<input className="input" value={newSource.sourceCode} onChange={(event) => setNewSource({ ...newSource, sourceCode: event.target.value })} placeholder="authorized_myp_math_current" /></label>
                    <label className="label">Title<input className="input" value={newSource.title} onChange={(event) => setNewSource({ ...newSource, title: event.target.value })} /></label>
                    <label className="label">Publisher<input className="input" value={newSource.publisher} onChange={(event) => setNewSource({ ...newSource, publisher: event.target.value })} /></label>
                    <label className="label">Framework version<input className="input" value={newSource.frameworkVersion} onChange={(event) => setNewSource({ ...newSource, frameworkVersion: event.target.value })} /></label>
                    <label className="label">Verification note<textarea className="input" rows={3} value={newSource.notes} onChange={(event) => setNewSource({ ...newSource, notes: event.target.value })} /></label>
                    <button className="btn secondary" disabled={busy || newSource.notes.trim().length < 20} onClick={() => void registerSource()}>Register metadata</button>
                  </section>

                  <section>
                    <h3>Verify a reviewer</h3>
                    <p className="muted">The target must already have a verified teacher profile. Operators cannot verify themselves.</p>
                    <label className="label">Teacher user ID<input className="input" value={reviewerUserId} onChange={(event) => setReviewerUserId(event.target.value)} /></label>
                    <label className="label">Reviewer role
                      <select className="select" value={reviewerKind} onChange={(event) => setReviewerKind(event.target.value as ProjectZCurriculumReviewerRole)}>
                        <option value="curriculum_mapper">Curriculum mapper</option>
                        <option value="mathematics_educator">Mathematics educator</option>
                      </select>
                    </label>
                    <label className="label">Credential evidence<textarea className="input" rows={3} value={credentialNote} onChange={(event) => setCredentialNote(event.target.value)} /></label>
                    <button className="btn secondary" disabled={busy || reviewerUserId.length < 30 || credentialNote.trim().length < 20} onClick={() => void registerReviewer()}>Verify reviewer role</button>
                    {reviewers.length > 0 ? <p className="muted" style={{ marginTop: 12 }}>{reviewers.filter((item) => item.active).length} active reviewer roles registered.</p> : null}
                  </section>
                </div>
              </details>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
