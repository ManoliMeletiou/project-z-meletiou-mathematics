'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  CourseCatalogRow,
  CurriculumSkillRow,
  fetchCurriculumCourses,
  fetchCurriculumSkillMap,
  fetchMySelectedCourse,
  selectStudentCourse,
  SelectedCourseRow
} from '../../lib/projectZCurriculum';

export default function CurriculumPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseCatalogRow[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseRow | null>(null);
  const [visibleCourseCode, setVisibleCourseCode] = useState('myp_standard');
  const [skills, setSkills] = useState<CurriculumSkillRow[]>([]);
  const [status, setStatus] = useState('Loading curriculum...');

  async function loadCurriculum(courseCode?: string) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role === 'guest') {
      setStatus('Sign in to view the curriculum and skill map.');
      return;
    }

    const courseRows = await fetchCurriculumCourses();
    const selected = await fetchMySelectedCourse();

    setCourses(courseRows);
    setSelectedCourse(selected);

    const code = courseCode || selected?.course_code || visibleCourseCode || 'myp_standard';
    setVisibleCourseCode(code);

    const skillRows = await fetchCurriculumSkillMap(code);
    setSkills(skillRows);

    setStatus('Curriculum and skill map loaded from Supabase.');
  }

  useEffect(() => {
    loadCurriculum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chooseCourse(courseCode: string) {
    setStatus('Selecting course...');

    if (role !== 'student') {
      setVisibleCourseCode(courseCode);
      const skillRows = await fetchCurriculumSkillMap(courseCode);
      setSkills(skillRows);
      setStatus('Previewing course. Only student accounts can save a course selection.');
      return;
    }

    const result = await selectStudentCourse(courseCode);

    if (!result.ok) {
      setStatus(`Could not select course: ${result.reason}`);
      return;
    }

    setVisibleCourseCode(courseCode);
    await loadCurriculum(courseCode);
    setStatus('Course selected. Diagnostic and recommended practice will use this curriculum.');
  }

  const mypCourses = courses.filter((course) => course.program === 'MYP');
  const dpGateways = courses.filter((course) => course.program === 'DP' && course.is_gateway);
  const dpChildren = courses.filter((course) => course.program === 'DP' && !course.is_gateway);

  const groupedSkills = useMemo(() => {
    const groups: Record<string, CurriculumSkillRow[]> = {};
    for (const skill of skills) {
      const key = skill.assessment_criterion
        ? `Criterion ${skill.assessment_criterion} - ${skill.strand_title}`
        : skill.strand_title;

      if (!groups[key]) groups[key] = [];
      groups[key].push(skill);
    }
    return groups;
  }, [skills]);

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Curriculum and Skill Map</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            {role === 'student' && <a className="btn secondary" href="/diagnostic">Diagnostic</a>}
            {role === 'student' && <a className="btn secondary" href="/recommended">Recommended</a>}
            {role === 'student' && <a className="btn secondary" href="/path">Skill Path</a>}
            <a className="btn secondary" href="/reports">Reports</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' ? (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in to choose a course and view the skill map.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        ) : (
          <>
            <section className="grid grid2">
              <div className="card">
                <h2>MYP course choice</h2>
                <p className="muted">The app uses the labels MYP Standard and MYP Extended.</p>
                <div className="grid">
                  {mypCourses.map((course) => (
                    <button
                      key={course.course_code}
                      className={visibleCourseCode === course.course_code ? 'btn blue' : 'btn secondary'}
                      onClick={() => chooseCourse(course.course_code)}
                    >
                      {course.display_name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2>DP course choice</h2>
                <p className="muted">Students first choose DP Standard or DP Higher, then AA or AI.</p>
                <div className="grid">
                  {dpGateways.map((gateway) => (
                    <div key={gateway.course_code} className="card" style={{ padding: 14 }}>
                      <h3>{gateway.display_name}</h3>
                      <div className="grid">
                        {dpChildren
                          .filter((child) => child.parent_course_code === gateway.course_code)
                          .map((child) => (
                            <button
                              key={child.course_code}
                              className={visibleCourseCode === child.course_code ? 'btn blue' : 'btn secondary'}
                              onClick={() => chooseCourse(child.course_code)}
                            >
                              {child.display_name}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Selected curriculum</h2>
              {selectedCourse ? (
                <p>
                  <strong>{selectedCourse.display_name}</strong>
                  <br />
                  <span className="muted">This is the saved course for diagnostics, recommended practice, and the skill path.</span>
                </p>
              ) : (
                <p className="muted">No saved course yet. Students should choose one course.</p>
              )}
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Skill map</h2>
              <p className="muted">
                Mastery should grow with evidence. Skills have a max mastery cap so students do not easily reach 100 percent.
              </p>

              {Object.entries(groupedSkills).map(([groupName, groupSkills]) => (
                <div key={groupName} style={{ marginTop: 20 }}>
                  <h3>{groupName}</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Skill</th>
                        <th>Level</th>
                        <th>Mastery</th>
                        <th>Evidence</th>
                        <th>Diagnostic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupSkills.map((skill) => (
                        <tr key={skill.course_skill_code}>
                          <td>
                            <strong>{skill.title}</strong><br />
                            <span className="muted">{skill.description}</span><br />
                            <span className="muted">{skill.course_skill_code}</span>
                          </td>
                          <td>Band {skill.difficulty_band}</td>
                          <td>
                            <strong>{skill.mastery_percent}%</strong><br />
                            <span className="muted">Max {skill.max_mastery_percent}%</span>
                          </td>
                          <td>
                            {skill.correct_count}/{skill.evidence_count}<br />
                            <span className="muted">Confidence {skill.confidence_percent}%</span>
                          </td>
                          <td>{skill.diagnostic_enabled ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Next: Diagnostic</h2>
                <p className="muted">The next phase will ask enough questions until the system has strong evidence of strengths and weaknesses.</p>
              </div>
              <div className="card">
                <h2>Next: Recommended practice</h2>
                <p className="muted">Practice will recommend weak skills, missing prerequisites, and review skills.</p>
              </div>
              <div className="card">
                <h2>Next: Game path</h2>
                <p className="muted">The Duolingo-style path will unlock skill nodes while still adapting to weak prerequisite skills.</p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
