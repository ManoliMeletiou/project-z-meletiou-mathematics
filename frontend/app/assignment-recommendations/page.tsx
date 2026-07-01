'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  AssignmentRecommendationClass,
  fetchAssignmentRecommendationClasses,
  fetchSmartAssignmentRecommendations,
  logAssignmentRecommendationAction,
  SmartAssignmentRecommendation
} from '../../lib/projectZAssignmentRecommendations';

function PriorityBadge({ label }: { label: string }) {
  return <strong>{label}</strong>;
}

function recommendationText(item: SmartAssignmentRecommendation) {
  return [
    item.suggested_assignment_title,
    '',
    `Class: ${item.class_label}`,
    `Skill: ${item.skill_title}`,
    `Course skill code: ${item.course_skill_code}`,
    `Priority: ${item.priority_label} (${item.priority_score})`,
    `Type: ${item.recommendation_type}`,
    `Suggested duration: ${item.suggested_duration_minutes} minutes`,
    `Suggested questions: ${item.suggested_question_count}`,
    '',
    'Why this is recommended:',
    `- Weak students: ${item.weak_students}`,
    `- Low confidence students: ${item.low_confidence_students}`,
    `- Misconceptions: ${item.misconception_count}`,
    `- Hints needed: ${item.hint_needed_count}`,
    `- Action-needed tutor evidence: ${item.action_needed_count}`,
    `- Average mastery: ${item.average_mastery}%`,
    `- Average confidence: ${item.average_confidence}%`,
    '',
    'Instructions:',
    item.suggested_assignment_instructions
  ].join('\n');
}

export default function AssignmentRecommendationsPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [classes, setClasses] = useState<AssignmentRecommendationClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [recommendations, setRecommendations] = useState<SmartAssignmentRecommendation[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Smart assignment recommendations load for teachers.');
  const [busy, setBusy] = useState(false);

  async function loadPage(classId = selectedClassId) {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'teacher') {
      setStatus(profile.role === 'guest' ? 'Sign in as a teacher to view recommendations.' : 'Only teachers can view smart assignment recommendations.');
      return;
    }

    const nextClasses = await fetchAssignmentRecommendationClasses();
    const nextClassId = classId || nextClasses[0]?.class_id || '';

    setClasses(nextClasses);
    setSelectedClassId(nextClassId);

    const nextRecommendations = await fetchSmartAssignmentRecommendations(nextClassId || undefined);
    setRecommendations(nextRecommendations);

    if (nextClasses.length === 0) {
      setStatus('No classes found. Create a class and add students first.');
    } else if (nextRecommendations.length === 0) {
      setStatus('No recommendations yet. More mastery, diagnostic, or tutor evidence may be needed.');
    } else {
      setStatus('Smart assignment recommendations loaded.');
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function changeClass(classId: string) {
    setSelectedClassId(classId);
    setStatus('Loading class recommendations...');
    await loadPage(classId);
  }

  async function copyPlan(item: SmartAssignmentRecommendation) {
    await navigator.clipboard.writeText(recommendationText(item));

    const result = await logAssignmentRecommendationAction({
      class_id: item.class_id,
      course_skill_code: item.course_skill_code,
      skill_title: item.skill_title,
      recommendation_type: item.recommendation_type,
      action: 'copied',
      teacher_notes: notes[item.recommendation_id] || 'Teacher copied recommendation plan.'
    });

    setStatus(result.ok ? 'Recommendation copied and logged.' : `Copied, but log failed: ${result.reason}`);
  }

  async function markAction(item: SmartAssignmentRecommendation, action: string) {
    setBusy(true);
    setStatus(`Marking recommendation as ${action}...`);

    const result = await logAssignmentRecommendationAction({
      class_id: item.class_id,
      course_skill_code: item.course_skill_code,
      skill_title: item.skill_title,
      recommendation_type: item.recommendation_type,
      action,
      teacher_notes: notes[item.recommendation_id] || `Teacher marked recommendation as ${action}.`
    });

    if (!result.ok) {
      setStatus(`Could not log action: ${result.reason}`);
      setBusy(false);
      return;
    }

    setStatus(`Recommendation marked as ${action}.`);
    setBusy(false);
  }

  const urgentCount = useMemo(
    () => recommendations.filter((item) => item.priority_label === 'Urgent').length,
    [recommendations]
  );

  const highCount = useMemo(
    () => recommendations.filter((item) => item.priority_label === 'High').length,
    [recommendations]
  );

  const topRecommendation = recommendations[0];

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Smart Assignment Recommendations</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/teacher">Teacher Portal</a>
            <a className="btn secondary" href="/assignments">Assignments</a>
            <a className="btn secondary" href="/teacher-tutor-evidence">Tutor Evidence</a>
            <a className="btn secondary" href="/reports">Reports</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a teacher to view smart assignment recommendations.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'teacher' && (
          <section className="card">
            <h2>Teacher-only tool</h2>
            <p className="muted">Assignment recommendations are for teachers only.</p>
          </section>
        )}

        {role === 'teacher' && (
          <>
            <section className="grid grid3">
              <div className="card">
                <h2>Recommendations</h2>
                <p className="stat">{recommendations.length}</p>
              </div>

              <div className="card">
                <h2>Urgent / High</h2>
                <p className="stat">{urgentCount} / {highCount}</p>
              </div>

              <div className="card">
                <h2>How it decides</h2>
                <p className="muted">
                  Uses mastery, confidence, tutor hints, misconceptions, and teacher-reviewed action-needed evidence.
                </p>
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Choose class</h2>
              {classes.length === 0 ? (
                <p className="muted">No classes found yet.</p>
              ) : (
                <label className="label">
                  Class
                  <select className="select" value={selectedClassId} onChange={(event) => changeClass(event.target.value)}>
                    {classes.map((item) => (
                      <option key={item.class_id} value={item.class_id}>
                        {item.class_label} - {item.student_count} students
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            {topRecommendation && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>Top recommendation</h2>
                <h3>{topRecommendation.suggested_assignment_title}</h3>
                <p>
                  Priority: <PriorityBadge label={topRecommendation.priority_label} /> ({topRecommendation.priority_score})<br />
                  Type: <strong>{topRecommendation.recommendation_type}</strong><br />
                  Suggested duration: <strong>{topRecommendation.suggested_duration_minutes} minutes</strong><br />
                  Suggested questions: <strong>{topRecommendation.suggested_question_count}</strong>
                </p>
                <p>{topRecommendation.suggested_assignment_instructions}</p>
              </section>
            )}

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Recommendation queue</h2>
              {recommendations.length === 0 ? (
                <p className="muted">No recommendations yet. More student evidence may be needed.</p>
              ) : (
                <div className="grid">
                  {recommendations.map((item) => (
                    <div key={item.recommendation_id} className="card">
                      <p className="muted">{item.class_label} - {item.course_code || 'course'}</p>
                      <h3>{item.suggested_assignment_title}</h3>

                      <p>
                        Priority: <PriorityBadge label={item.priority_label} /> ({item.priority_score})<br />
                        Type: <strong>{item.recommendation_type}</strong><br />
                        Average mastery: <strong>{item.average_mastery}%</strong><br />
                        Average confidence: <strong>{item.average_confidence}%</strong>
                      </p>

                      <p>
                        Affected students: <strong>{item.affected_students}</strong><br />
                        Weak students: <strong>{item.weak_students}</strong><br />
                        Low confidence: <strong>{item.low_confidence_students}</strong><br />
                        Misconceptions: <strong>{item.misconception_count}</strong><br />
                        Hints needed: <strong>{item.hint_needed_count}</strong><br />
                        Action needed: <strong>{item.action_needed_count}</strong>
                      </p>

                      <p>{item.suggested_assignment_instructions}</p>

                      <label className="label">
                        Teacher notes
                        <textarea
                          className="textarea"
                          rows={3}
                          value={notes[item.recommendation_id] || ''}
                          onChange={(event) => setNotes((current) => ({ ...current, [item.recommendation_id]: event.target.value }))}
                          placeholder="Optional planning note..."
                        />
                      </label>

                      <div className="navLinks">
                        <button className="btn blue" disabled={busy} onClick={() => copyPlan(item)}>
                          Copy assignment plan
                        </button>
                        <button className="btn secondary" disabled={busy} onClick={() => markAction(item, 'planned')}>
                          Mark planned
                        </button>
                        <button className="btn secondary" disabled={busy} onClick={() => markAction(item, 'dismissed')}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
