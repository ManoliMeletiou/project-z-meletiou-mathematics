'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProjectZCalmHeader } from '../../components/ProjectZCalmHeader';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  AtlasSkillCoverageRow,
  CourseCatalogRow,
  fetchAtlasSkillCoverage,
  fetchCurriculumCourses,
  fetchMySelectedCourse,
  selectStudentCourse,
  SelectedCourseRow
} from '../../lib/projectZCurriculum';
import {
  mypPathwayCode,
  PROJECT_Z_DP_PATHWAY_CODES,
  PROJECT_Z_MYP_YEARS
} from '../../lib/projectZCurriculumFoundation';

function themeForRole(role: ProjectZRole) {
  if (role === 'student') return 'pz-student-theme';
  if (role === 'parent') return 'pz-parent-theme';
  if (role === 'teacher') return 'pz-teacher-theme';
  return 'pz-guest-theme';
}

function compactStrand(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function CurriculumPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [pathways, setPathways] = useState<CourseCatalogRow[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseRow | null>(null);
  const [visibleCourseCode, setVisibleCourseCode] = useState('myp_1_standard');
  const [mypYear, setMypYear] = useState<(typeof PROJECT_Z_MYP_YEARS)[number]>(1);
  const [skills, setSkills] = useState<AtlasSkillCoverageRow[]>([]);
  const [showAtlas, setShowAtlas] = useState(false);
  const [status, setStatus] = useState('Loading the Project Z curriculum evidence…');

  async function showPathway(courseCode: string) {
    setVisibleCourseCode(courseCode);
    setShowAtlas(false);
    setStatus('Loading pathway evidence…');
    const skillRows = await fetchAtlasSkillCoverage(courseCode);
    setSkills(skillRows);
    setStatus('Pathway evidence loaded. Unreleased content remains locked.');
  }

  async function loadCurriculum() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role === 'guest') {
      setStatus('Sign in to choose a pathway and inspect its curriculum evidence.');
      return;
    }

    const courseRows = await fetchCurriculumCourses();
    const selected = await fetchMySelectedCourse();
    const firstCode = selected?.course_code || courseRows[0]?.course_code || 'myp_1_standard';

    setPathways(courseRows);
    setSelectedCourse(selected);
    setVisibleCourseCode(firstCode);

    const selectedMyp = courseRows.find((course) => course.course_code === firstCode && course.program === 'MYP');
    if (selectedMyp?.year_number) {
      setMypYear(selectedMyp.year_number as (typeof PROJECT_Z_MYP_YEARS)[number]);
    }

    const skillRows = await fetchAtlasSkillCoverage(firstCode);
    setSkills(skillRows);
    setStatus('Fourteen pathways are registered. Content stays locked until every release check passes.');
  }

  useEffect(() => {
    loadCurriculum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function choosePathway(courseCode: string) {
    if (role !== 'student') {
      await showPathway(courseCode);
      setStatus('Previewing this pathway. Student accounts can save a selection.');
      return;
    }

    setStatus('Saving pathway…');
    const result = await selectStudentCourse(courseCode);
    if (!result.ok) {
      setStatus(`Could not save the pathway: ${result.reason}`);
      return;
    }

    await showPathway(courseCode);
    const selected = await fetchMySelectedCourse();
    setSelectedCourse(selected);
    setStatus('Pathway saved. Practice will unlock only after the curriculum and content evidence pass.');
  }

  const visiblePathway = pathways.find((pathway) => pathway.course_code === visibleCourseCode) || null;
  const dpPathways = PROJECT_Z_DP_PATHWAY_CODES
    .map((code) => pathways.find((pathway) => pathway.course_code === code))
    .filter((pathway): pathway is CourseCatalogRow => Boolean(pathway));
  const groupedSkills = useMemo(() => {
    const groups = new Map<string, AtlasSkillCoverageRow[]>();
    for (const skill of skills) {
      const current = groups.get(skill.strand_code) || [];
      current.push(skill);
      groups.set(skill.strand_code, current);
    }
    return [...groups.entries()];
  }, [skills]);

  const reviewedPercent = visiblePathway?.atlas_skill_count
    ? Math.round(((visiblePathway.reviewed_skill_count || 0) / visiblePathway.atlas_skill_count) * 100)
    : 0;

  return (
    <main className={`page pz-theme ${themeForRole(role)}`}>
      <div className="container">
        <ProjectZCalmHeader email={email} role={role} />

        <section className="pz-hero-panel" style={{ marginTop: 20 }}>
          <p className="pz-eyebrow">IB mathematics · evidence first</p>
          <h1>Choose one clear pathway</h1>
          <p className="pz-hero-copy">
            Project Z covers ten MYP year-and-level pathways and four DP courses. A pathway is never called complete
            until its skill map is reviewed and every skill has at least 2,000 distinct, verified practice variants.
          </p>
        </section>

        <section className="notice" style={{ marginTop: 18 }} aria-live="polite">
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' ? (
          <section className="card" style={{ marginTop: 18 }}>
            <h2>Sign in to continue</h2>
            <p className="muted">Your pathway connects diagnostics, teaching support and practice evidence.</p>
            <a className="btn blue" href="/auth?next=%2Fcurriculum">Sign in</a>
          </section>
        ) : (
          <>
            <section className="card" style={{ marginTop: 18 }}>
              <p className="pz-eyebrow">Middle Years Programme</p>
              <h2>First choose the MYP year</h2>
              <div className="pz-choice-row" aria-label="MYP year">
                {PROJECT_Z_MYP_YEARS.map((year) => (
                  <button
                    key={year}
                    className={mypYear === year ? 'btn blue' : 'btn secondary'}
                    onClick={() => {
                      setMypYear(year);
                      showPathway(mypPathwayCode(year, 'Standard'));
                    }}
                  >
                    Year {year}
                  </button>
                ))}
              </div>

              <div className="grid grid2" style={{ marginTop: 18 }}>
                {(['Standard', 'Extended'] as const).map((level) => {
                  const code = mypPathwayCode(mypYear, level);
                  const pathway = pathways.find((row) => row.course_code === code);
                  return (
                    <button
                      key={code}
                      className={`pz-pathway-choice ${visibleCourseCode === code ? 'is-selected' : ''}`}
                      onClick={() => choosePathway(code)}
                    >
                      <span>
                        <strong>{level}</strong>
                        <small>{pathway?.atlas_skill_count || 0} candidate skills · release checks pending</small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <p className="pz-eyebrow">Diploma Programme</p>
              <h2>Or choose one DP course</h2>
              <div className="grid grid2">
                {dpPathways.map((pathway) => (
                  <button
                    key={pathway.course_code}
                    className={`pz-pathway-choice ${visibleCourseCode === pathway.course_code ? 'is-selected' : ''}`}
                    onClick={() => choosePathway(pathway.course_code)}
                  >
                    <span>
                      <strong>{pathway.display_name.replace('DP Mathematics: ', '')}</strong>
                      <small>{pathway.atlas_skill_count || 0} candidate skills · {pathway.level_name}</small>
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <p className="pz-eyebrow">Current pathway</p>
              <h2>{visiblePathway?.display_name || 'Choose a pathway'}</h2>
              {selectedCourse ? (
                <p className="muted">Saved for this student: {selectedCourse.display_name}</p>
              ) : (
                <p className="muted">No pathway is saved yet.</p>
              )}

              <div className="pz-evidence-strip">
                <div>
                  <strong>{visiblePathway?.atlas_skill_count || 0}</strong>
                  <span>candidate skills</span>
                </div>
                <div>
                  <strong>{reviewedPercent}%</strong>
                  <span>educator-reviewed</span>
                </div>
                <div>
                  <strong>{visiblePathway?.variant_ready_skill_count || 0}</strong>
                  <span>skills at the 2,000-variant floor</span>
                </div>
              </div>

              <div className="pz-calm-callout" style={{ marginTop: 18 }}>
                <strong>Release state: not ready</strong>
                <p>
                  The current atlas is a useful candidate skeleton. Official-guide alignment, mathematics educator
                  approval and verified practice depth are still incomplete, so Project Z does not present it as finished.
                </p>
              </div>

              <button className="btn secondary" style={{ marginTop: 16 }} onClick={() => setShowAtlas((value) => !value)}>
                {showAtlas ? 'Hide skill atlas' : `View candidate skill atlas (${skills.length})`}
              </button>
            </section>

            {showAtlas && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>Candidate skill atlas</h2>
                <p className="muted">These skills are visible for review, but none are served as released practice yet.</p>
                <div className="pz-atlas-groups">
                  {groupedSkills.map(([strand, strandSkills]) => (
                    <details key={strand}>
                      <summary>
                        <span>{compactStrand(strand)}</span>
                        <span>{strandSkills.length} skills</span>
                      </summary>
                      <div className="pz-atlas-list">
                        {strandSkills.map((skill) => (
                          <article key={skill.atlas_skill_code}>
                            <div>
                              <strong>{skill.title}</strong>
                              <p>{skill.learning_objective}</p>
                            </div>
                            <span className="pz-status-pill">Review pending</span>
                          </article>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
