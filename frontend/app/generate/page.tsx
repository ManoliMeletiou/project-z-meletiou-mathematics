'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import { fetchGenerationCandidates, fetchGenerationCourses, fetchGenerationSkills, generateQualityCandidate, GeneratedQuestionCandidate, GenerationSkill, promoteGeneratedQuestion, rejectGeneratedQuestion, stageGeneratedQuestion, StagedCandidate } from '../../lib/projectZGeneration';

function flagList(flags: Record<string, boolean | string>) {
  return Object.entries(flags || {}).filter(([, value]) => value === true).map(([key]) => key.replaceAll('_', ' '));
}

export default function GeneratePage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseCode, setCourseCode] = useState('myp_standard');
  const [skills, setSkills] = useState<GenerationSkill[]>([]);
  const [selectedSkillCode, setSelectedSkillCode] = useState('');
  const [criterion, setCriterion] = useState('auto');
  const [candidate, setCandidate] = useState<GeneratedQuestionCandidate | null>(null);
  const [staged, setStaged] = useState<StagedCandidate[]>([]);
  const [status, setStatus] = useState('Generation lab loads for teachers.');
  const [busy, setBusy] = useState(false);

  async function loadPage(nextCourse = courseCode) {
    const profile = await getCurrentProfile();
    setRole(profile.role); setEmail(profile.email);
    if (profile.role !== 'teacher') { setStatus(profile.role === 'guest' ? 'Sign in as a teacher to generate questions.' : 'Only teachers can generate and promote questions.'); return; }
    const courseRows = await fetchGenerationCourses();
    const activeCourse = nextCourse || courseRows[0]?.course_code || 'myp_standard';
    const skillRows = await fetchGenerationSkills(activeCourse);
    const candidateRows = await fetchGenerationCandidates(activeCourse);
    setCourses(courseRows); setCourseCode(activeCourse); setSkills(skillRows); setStaged(candidateRows);
    if (!selectedSkillCode && skillRows.length) setSelectedSkillCode(skillRows[0].course_skill_code);
    setStatus('Generation lab loaded. Generate a candidate, then stage it through quality gates.');
  }

  useEffect(() => { loadPage(); }, []);

  async function changeCourse(value: string) { setCourseCode(value); setSelectedSkillCode(''); setCandidate(null); await loadPage(value); }

  const selectedSkill = useMemo(() => skills.find((skill) => skill.course_skill_code === selectedSkillCode) || skills[0], [skills, selectedSkillCode]);

  async function makeCandidate() {
    if (!selectedSkill) { setStatus('Select a skill first.'); return; }
    setBusy(true); setStatus('Generating candidate question...');
    const result = await generateQualityCandidate({ course_code: courseCode, course_skill_code: selectedSkill.course_skill_code, skill_title: selectedSkill.title, skill_description: selectedSkill.description, assessment_criterion: criterion === 'auto' ? selectedSkill.assessment_criterion : criterion, difficulty_band: selectedSkill.difficulty_band });
    if (!result.ok || !result.data) setStatus(`Could not generate candidate: ${result.reason}`); else { setCandidate(result.data); setStatus('Candidate generated. Stage it to run database quality gates.'); }
    setBusy(false);
  }

  async function stageCandidate() {
    if (!candidate) return;
    setBusy(true); setStatus('Running quality gates and staging candidate...');
    const result = await stageGeneratedQuestion(candidate);
    if (!result.ok) setStatus(`Could not stage candidate: ${result.reason}`); else { setStatus(`Candidate staged. Gate status: ${result.data?.gate_status}, score: ${result.data?.quality_score}.`); setCandidate(null); await loadPage(courseCode); }
    setBusy(false);
  }

  async function promote(id: string) { setBusy(true); const r = await promoteGeneratedQuestion(id); setStatus(r.ok ? 'Question promoted to verified question bank.' : `Could not promote: ${r.reason}`); await loadPage(courseCode); setBusy(false); }
  async function reject(id: string) { setBusy(true); const r = await rejectGeneratedQuestion(id); setStatus(r.ok ? 'Candidate rejected.' : `Could not reject: ${r.reason}`); await loadPage(courseCode); setBusy(false); }

  return <main className="page"><div className="container">
    <nav className="nav"><div className="brand"><strong>Question Generation Lab</strong><span>{email || 'Sign in'} - role: {role}</span></div><div className="navLinks"><a className="btn secondary" href="/">Home</a><a className="btn secondary" href="/teacher">Teacher Portal</a><a className="btn secondary" href="/quality">Quality</a><a className="btn secondary" href="/reports">Reports</a><a className="btn secondary" href="/account">Account</a></div></nav>
    <section className="notice" style={{ marginBottom: 18 }}><strong>Status:</strong> {status}</section>
    {role === 'guest' && <section className="card"><h2>Sign in required</h2><p className="muted">Sign in as a teacher to generate questions.</p><a className="btn blue" href="/auth">Sign in</a></section>}
    {role !== 'guest' && role !== 'teacher' && <section className="card"><h2>Teacher-only generation</h2><p className="muted">Students and parents cannot generate or promote questions.</p></section>}
    {role === 'teacher' && <>
      <section className="grid grid3"><div className="card"><h2>1. Choose course and skill</h2><label className="label">Course<select className="select" value={courseCode} onChange={(e) => changeCourse(e.target.value)}>{courses.map((c) => <option key={c.course_code} value={c.course_code}>{c.display_name}</option>)}</select></label><label className="label">Skill<select className="select" value={selectedSkillCode} onChange={(e) => setSelectedSkillCode(e.target.value)}>{skills.map((s) => <option key={s.course_skill_code} value={s.course_skill_code}>{s.title} {s.assessment_criterion ? `(Criterion ${s.assessment_criterion})` : ''}</option>)}</select></label></div><div className="card"><h2>2. Criterion</h2><label className="label">Type<select className="select" value={criterion} onChange={(e) => setCriterion(e.target.value)}><option value="auto">Auto from skill</option><option value="A">Criterion A</option><option value="B">Criterion B</option><option value="C">Criterion C</option><option value="D">Criterion D</option></select></label><p className="muted">B/C/D use structured reasoning choices.</p></div><div className="card"><h2>3. Generate</h2><p className="muted">Candidates are not live until they pass gates and are promoted.</p><button className="btn blue" disabled={busy || !selectedSkill} onClick={makeCandidate}>Generate candidate</button></div></section>
      {candidate && <section className="card" style={{ marginTop: 18 }}><h2>Generated candidate</h2><p className="muted">{candidate.course_skill_code} - {candidate.question_type} - stored correct answer {candidate.correct_option}</p><h3>{candidate.prompt}</h3><ol type="A"><li>{candidate.option_a}</li><li>{candidate.option_b}</li><li>{candidate.option_c}</li><li>{candidate.option_d}</li></ol><p><strong>Explanation:</strong> {candidate.explanation}</p><button className="btn blue" disabled={busy} onClick={stageCandidate}>Stage and run quality gates</button></section>}
      <section className="card" style={{ marginTop: 18 }}><h2>Staged generated candidates</h2><p className="muted">Passed candidates can be promoted into the verified question bank.</p>{staged.length === 0 ? <p className="muted">No staged candidates yet.</p> : <div className="grid">{staged.map((item) => <div key={item.id} className="card"><h3>{item.course_code} - {item.assessment_criterion ? `Criterion ${item.assessment_criterion}` : 'Skill question'}</h3><p className="muted">{item.course_skill_code} - {item.question_type}</p><p><strong>Prompt:</strong> {item.prompt}</p><ol type="A"><li>{item.option_a}</li><li>{item.option_b}</li><li>{item.option_c}</li><li>{item.option_d}</li></ol><p>Correct: <strong>{item.correct_option}</strong><br />Score: <strong>{item.quality_score}%</strong><br />Gate: <strong>{item.gate_status}</strong></p><p className="muted">Flags: {flagList(item.flags).length ? flagList(item.flags).join(', ') : 'No major flags'}</p><div className="navLinks"><button className="btn blue" disabled={busy || item.gate_status !== 'passed'} onClick={() => promote(item.id)}>Promote to live bank</button><button className="btn secondary" disabled={busy || item.gate_status === 'promoted'} onClick={() => reject(item.id)}>Reject</button></div></div>)}</div>}</section>
    </>}
  </div></main>;
}
