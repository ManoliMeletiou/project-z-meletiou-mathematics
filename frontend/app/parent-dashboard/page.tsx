'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchParentDashboardActivity,
  fetchParentDashboardOverview,
  fetchParentDashboardSkills,
  ParentDashboardActivity,
  ParentDashboardOverview,
  ParentDashboardSkill
} from '../../lib/projectZParentDashboard';

function friendlyName(value: string) {
  return (value || 'Student')
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Student';
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function statusTone(label: string) {
  if (label === 'Needs support' || label === 'Needs practice') return 'support';
  if (label === 'Work to complete' || label === 'Corrections to do' || label === 'Developing') return 'watch';
  return 'good';
}

function parentHeadline(child: ParentDashboardOverview | null) {
  if (!child) return 'A calm command centre for your child’s mathematics journey.';
  const name = friendlyName(child.child_name);
  if (child.corrections_needing_more_work > 0) return `${name} needs calm correction support.`;
  if (child.assignments_to_do > 0) return `${name} has learning work to complete.`;
  if (child.corrections_needed > child.corrections_submitted) return `${name} should use feedback to complete corrections.`;
  if (child.average_mastery >= 75) return `${name} is showing strong learning progress.`;
  return `${name} is building understanding step by step.`;
}

function supportQuestion(child: ParentDashboardOverview | null) {
  if (!child) return 'What is one thing you understood better today?';
  if (child.assignments_to_do > 0) return 'Which assignment question should you finish first, and what help do you need?';
  if (child.corrections_needed > child.corrections_submitted) return 'What did the feedback show, and what will you try differently?';
  if (child.average_mastery < 55) return 'Which skill feels hardest right now, and where should we ask for help?';
  return 'What is one skill you can explain clearly now?';
}

function updatedLabel(value: string | null | undefined) {
  if (!value) return 'No recent update';
  return new Date(value).toLocaleString();
}

function progressTone(percent: number) {
  if (percent >= 75) return 'good';
  if (percent >= 45) return 'watch';
  return 'support';
}

export default function ParentDashboardPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [children, setChildren] = useState<ParentDashboardOverview[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [activity, setActivity] = useState<ParentDashboardActivity[]>([]);
  const [skills, setSkills] = useState<ParentDashboardSkill[]>([]);
  const [status, setStatus] = useState('Loading parent command centre.');
  const [showPrivacyNote, setShowPrivacyNote] = useState(true);

  async function loadPage(studentId = selectedStudentId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'parent') {
      setStatus(profile.role === 'guest' ? 'Sign in as a parent to view the command centre.' : 'This command centre is for linked parent accounts.');
      return;
    }

    const nextChildren = await fetchParentDashboardOverview();
    setChildren(nextChildren);

    if (nextChildren.length === 0) {
      setStatus('No linked student found yet.');
      return;
    }

    const nextStudentId = studentId || nextChildren[0].student_id;
    setSelectedStudentId(nextStudentId);

    const [nextActivity, nextSkills] = await Promise.all([
      fetchParentDashboardActivity(nextStudentId),
      fetchParentDashboardSkills(nextStudentId)
    ]);

    setActivity(nextActivity);
    setSkills(nextSkills);
    setStatus('Parent command centre is ready.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeChild(studentId: string) {
    setSelectedStudentId(studentId);
    await loadPage(studentId);
  }

  const selectedChild = useMemo(
    () => children.find((child) => child.student_id === selectedStudentId) || children[0] || null,
    [children, selectedStudentId]
  );

  const activeSkills = useMemo(() => skills.slice(0, 6), [skills]);
  const recentActivity = useMemo(() => activity.slice(0, 5), [activity]);
  const openWorkPercent = selectedChild ? clampPercent(100 - Math.min(100, selectedChild.questions_left * 8)) : 0;
  const correctionPercent = selectedChild && selectedChild.corrections_needed > 0
    ? clampPercent((selectedChild.corrections_accepted / selectedChild.corrections_needed) * 100)
    : 100;

  return (
    <main className="page pz-theme pz-parent-theme pz-parent-command-theme">
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Parent Command Centre</strong>
            <span>{email || 'Sign in'} - parent-safe learning overview</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/role-navigation">Navigation</a>
            <a className="btn secondary" href="/parent">Parent Portal</a>
            <a className="btn secondary" href="/parent-learning-report">Learning Report</a>
            <a className="btn secondary" href="/parent-engagement-view">Engagement</a>
            <a className="btn secondary" href="/export-reports">Export</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card pz-parent-command-card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a parent to view your child’s parent-safe learning command centre.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'parent' && (
          <section className="card pz-parent-command-card">
            <h2>Parent-only command centre</h2>
            <p className="muted">This page is designed for linked parent accounts.</p>
          </section>
        )}

        {role === 'parent' && (
          <>
            <section className="pz-parent-command-hero">
              <div className="pz-parent-hero-copy">
                <div className="pz-role-badge">🌿 Parent-safe command centre</div>
                <h1>{parentHeadline(selectedChild)}</h1>
                <p className="muted">
                  A calm overview of what matters most: open work, corrections, mastery, confidence,
                  and supportive next steps at home.
                </p>

                {children.length > 1 && (
                  <label className="label pz-parent-child-selector">
                    Choose child
                    <select className="select" value={selectedStudentId} onChange={(event) => changeChild(event.target.value)}>
                      {children.map((child) => (
                        <option key={child.student_id} value={child.student_id}>
                          {friendlyName(child.child_name)} - {child.status_label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {selectedChild && (
                <aside className="pz-parent-support-card">
                  <span className={`pz-parent-status-pill ${statusTone(selectedChild.status_label)}`}>{selectedChild.status_label}</span>
                  <h2>Best next support step</h2>
                  <p>{selectedChild.parent_friendly_next_step}</p>
                  <div className="pz-parent-question-box">
                    <strong>Ask tonight:</strong>
                    <span>{supportQuestion(selectedChild)}</span>
                  </div>
                  <p className="muted">Updated: {updatedLabel(selectedChild.updated_at)}</p>
                </aside>
              )}
            </section>

            {selectedChild && (
              <>
                <section className="pz-parent-pulse-grid">
                  <div className="card pz-parent-command-card">
                    <span className="pz-parent-kicker">Open work</span>
                    <p className="stat">{selectedChild.assignments_to_do}</p>
                    <progress value={openWorkPercent} max={100} />
                    <p className="muted">{selectedChild.questions_left} question(s) left</p>
                  </div>

                  <div className="card pz-parent-command-card">
                    <span className="pz-parent-kicker">Corrections</span>
                    <p className="stat">{selectedChild.corrections_needed}</p>
                    <progress value={correctionPercent} max={100} />
                    <p className="muted">{selectedChild.corrections_submitted} submitted, {selectedChild.corrections_accepted} accepted</p>
                  </div>

                  <div className="card pz-parent-command-card">
                    <span className="pz-parent-kicker">Mastery</span>
                    <p className="stat">{selectedChild.average_mastery}%</p>
                    <progress value={selectedChild.average_mastery} max={100} />
                    <p className="muted">{selectedChild.strong_skills} strong skill(s), {selectedChild.weak_skills} needing practice</p>
                  </div>

                  <div className="card pz-parent-command-card">
                    <span className="pz-parent-kicker">Confidence</span>
                    <p className="stat">{selectedChild.average_confidence}%</p>
                    <progress value={selectedChild.average_confidence} max={100} />
                    <p className="muted">Confidence is a learning signal, not a grade.</p>
                  </div>
                </section>

                <section className="pz-parent-command-layout">
                  <section className="card pz-parent-command-card pz-parent-support-plan">
                    <div className="pz-role-badge">🏡 Home support plan</div>
                    <h2>How to support without taking over</h2>
                    <p>{selectedChild.support_tip}</p>
                    <div className="pz-parent-support-steps">
                      <div><strong>1</strong><span>Ask what feedback means.</span></div>
                      <div><strong>2</strong><span>Let your child explain one method.</span></div>
                      <div><strong>3</strong><span>Encourage corrections before more new work.</span></div>
                    </div>
                    <p className="muted">The goal is calm reflection, not pressure or reteaching the whole lesson.</p>
                  </section>

                  <section className="card pz-parent-command-card">
                    <div className="pz-role-badge">📘 Parent-safe boundaries</div>
                    <h2>What this dashboard shows</h2>
                    <div className="pz-parent-boundary-list">
                      <span>Progress summaries</span>
                      <span>Assignments and corrections</span>
                      <span>Parent-friendly skill signals</span>
                      <span>Released memorandums</span>
                    </div>
                    <h3>What remains private</h3>
                    <p className="muted">Raw tutor chats, teacher-only notes, other students’ data, and internal school records are not exposed here.</p>
                    {showPrivacyNote && <button className="btn secondary" onClick={() => setShowPrivacyNote(false)}>Hide privacy note</button>}
                  </section>
                </section>

                <section className="grid grid2" style={{ marginTop: 18 }}>
                  <section className="card pz-parent-command-card">
                    <h2>Recent assignment activity</h2>
                    {recentActivity.length === 0 ? (
                      <p className="muted">No recent assignment activity yet.</p>
                    ) : (
                      <div className="pz-parent-activity-list">
                        {recentActivity.map((item) => (
                          <article key={item.assignment_id} className="pz-parent-activity-item">
                            <div>
                              <h3>{item.assignment_title}</h3>
                              <p className="muted">{item.skill_title} - {item.course_skill_code}</p>
                            </div>
                            <span className={`pz-parent-status-pill ${progressTone(item.progress_percent)}`}>{item.progress_percent}%</span>
                            <progress value={item.progress_percent} max={100} />
                            <p>
                              <strong>Submitted:</strong> {item.submitted_count}/{item.question_count}<br />
                              <strong>Teacher reviewed:</strong> {item.reviewed_count}<br />
                              <strong>Memo:</strong> {item.memorandums_released ? 'Released' : 'Not released yet'}<br />
                              <strong>Corrections:</strong> {item.corrections_submitted}/{item.corrections_needed}
                            </p>
                            <section className="notice">{item.parent_message}</section>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="card pz-parent-command-card">
                    <h2>Skill snapshot</h2>
                    {activeSkills.length === 0 ? (
                      <p className="muted">Skill progress will appear as your child completes work.</p>
                    ) : (
                      <div className="pz-parent-skill-list">
                        {activeSkills.map((skill) => (
                          <article key={skill.course_skill_code} className="pz-parent-skill-row">
                            <div>
                              <strong>{skill.skill_title}</strong>
                              <p className="muted">{skill.course_skill_code}</p>
                            </div>
                            <span className={`pz-parent-status-pill ${statusTone(skill.status_label)}`}>{skill.status_label}</span>
                            <progress value={skill.mastery_percent} max={100} />
                            <p className="muted">Mastery {skill.mastery_percent}% | Confidence {skill.confidence_percent}%<br />{skill.parent_tip}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </section>

                <section className="card pz-parent-command-card" style={{ marginTop: 18 }}>
                  <h2>Quick actions</h2>
                  <div className="pz-parent-action-strip">
                    <a className="btn blue" href="/parent-learning-report">Open learning report</a>
                    <a className="btn secondary" href="/parent-engagement-view">Open engagement view</a>
                    <a className="btn secondary" href="/export-reports">Export / print report</a>
                    <a className="btn secondary" href="/parent">Parent portal</a>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

