'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  fetchSkillPath,
  fetchSkillPathSummary,
  SkillPathNode,
  SkillPathSummary,
  touchLearningDay
} from '../../lib/projectZSkillPath';

const statusLabels: Record<SkillPathNode['path_status'], string> = {
  locked: 'Locked',
  ready: 'Ready',
  weak: 'Weak',
  developing: 'Developing',
  strong_needs_evidence: 'Strong - needs evidence',
  mastered_review: 'Mastered / review'
};

const statusSymbols: Record<SkillPathNode['path_status'], string> = {
  locked: '🔒',
  ready: '▶️',
  weak: '⚠️',
  developing: '📈',
  strong_needs_evidence: '⭐',
  mastered_review: '🏆'
};

function actionHref(node: SkillPathNode) {
  if (node.path_status === 'locked') return '/path';
  if (node.path_status === 'ready') return '/diagnostic';
  if (node.path_status === 'weak') return '/recommended';
  if (node.path_status === 'developing') return '/recommended';
  if (node.path_status === 'strong_needs_evidence') return '/recommended';
  return '/recommended';
}

export default function SkillPathPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [nodes, setNodes] = useState<SkillPathNode[]>([]);
  const [summary, setSummary] = useState<SkillPathSummary | null>(null);
  const [status, setStatus] = useState('Skill path loads when a student signs in.');

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to view the skill path.' : 'Only students can use the game path. Teachers and parents will receive reports.');
      return;
    }

    await touchLearningDay();

    const pathRows = await fetchSkillPath();
    const summaryRow = await fetchSkillPathSummary();

    setNodes(pathRows);
    setSummary(summaryRow);

    if (pathRows.length === 0) {
      setStatus('No skill path yet. Choose a course in Curriculum first.');
      return;
    }

    setStatus('Skill path loaded from curriculum, prerequisites, mastery, confidence, and evidence.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  const groupedNodes = useMemo(() => {
    const groups: Record<string, SkillPathNode[]> = {};

    for (const node of nodes) {
      const key = `Band ${node.difficulty_band} - ${node.strand_title}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(node);
    }

    return groups;
  }, [nodes]);

  const progressPercent = summary && summary.total_nodes > 0
    ? Math.round((summary.mastered_review_nodes / summary.total_nodes) * 100)
    : 0;

  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Skill Path</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/student">Student Portal</a>
            <a className="btn secondary" href="/curriculum">Curriculum</a>
            <a className="btn secondary" href="/diagnostic">Diagnostic</a>
            <a className="btn secondary" href="/recommended">Recommended</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to use the game-style skill path.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card">
            <h2>Student-only path</h2>
            <p className="muted">Teachers and parents will view progress reports. The game path is for students.</p>
          </section>
        )}

        {role === 'student' && (
          <>
            <section className="grid grid3">
              <div className="card">
                <h2>{summary?.course_display_name || 'No course selected'}</h2>
                <p className="muted">Your path is based on the selected curriculum.</p>
                <p>
                  Path progress: <strong>{progressPercent}%</strong><br />
                  Mastered nodes: {summary?.mastered_review_nodes || 0}/{summary?.total_nodes || 0}
                </p>
              </div>

              <div className="card">
                <h2>XP and streak</h2>
                <p>
                  XP: <strong>{summary?.total_xp || 0}</strong><br />
                  Current streak: <strong>{summary?.current_streak || 0}</strong><br />
                  Longest streak: <strong>{summary?.longest_streak || 0}</strong>
                </p>
              </div>

              <div className="card">
                <h2>Next move</h2>
                <p className="muted">{summary?.next_recommended_action || 'Choose a course and complete the diagnostic.'}</p>
              </div>
            </section>

            <section className="grid grid3" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Needs work</h2>
                <p>
                  Weak: {summary?.weak_nodes || 0}<br />
                  Developing: {summary?.developing_nodes || 0}
                </p>
              </div>

              <div className="card">
                <h2>Ready</h2>
                <p>
                  Ready: {summary?.ready_nodes || 0}<br />
                  Locked: {summary?.locked_nodes || 0}
                </p>
              </div>

              <div className="card">
                <h2>Strong</h2>
                <p>
                  Strong needs evidence: {summary?.strong_nodes || 0}<br />
                  Mastered/review: {summary?.mastered_review_nodes || 0}
                </p>
              </div>
            </section>

            {nodes.length === 0 ? (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>No path yet</h2>
                <p className="muted">Choose a course first, then complete diagnostic questions.</p>
                <a className="btn blue" href="/curriculum">Choose course</a>
              </section>
            ) : (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>Game-style curriculum path</h2>
                <p className="muted">
                  This path is not random. Nodes are controlled by curriculum order, prerequisites, mastery percentage, confidence, and evidence.
                </p>

                {Object.entries(groupedNodes).map(([groupName, groupNodes]) => (
                  <div key={groupName} style={{ marginTop: 24 }}>
                    <h3>{groupName}</h3>

                    <div className="grid grid3">
                      {groupNodes.map((node) => (
                        <div key={node.course_skill_code} className="card">
                          <h3>
                            {statusSymbols[node.path_status]} {node.path_position}. {node.title}
                          </h3>
                          <p className="muted">
                            {node.assessment_criterion ? `Criterion ${node.assessment_criterion}` : 'DP skill'}
                            <br />
                            {statusLabels[node.path_status]}
                          </p>
                          <p>{node.description}</p>
                          <p>
                            Mastery: <strong>{node.mastery_percent}%</strong><br />
                            Confidence: <strong>{node.confidence_percent}%</strong><br />
                            Evidence: <strong>{node.correct_count}/{node.evidence_count}</strong>
                          </p>

                          {node.lock_reason ? (
                            <p className="muted">{node.lock_reason}</p>
                          ) : (
                            <p className="muted">Next action: {node.next_action}</p>
                          )}

                          {node.path_status === 'locked' ? (
                            <button className="btn secondary" disabled>Locked</button>
                          ) : (
                            <a className="btn blue" href={actionHref(node)}>
                              {node.next_action}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
