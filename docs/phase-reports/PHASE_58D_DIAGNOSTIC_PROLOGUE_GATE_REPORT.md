# Phase 58d Report — Diagnostic Prologue and Evidence Gate

## Decision

Phase 58d closes the highest-risk unblocked validity boundary before the first reviewed learning vertical slice. It does **not** release a pathway, approve curriculum, validate the adaptive model or complete the student learning loop.

Project Z is not 100% complete. Every pathway, diagnostic calibration and learner-facing generator remains fail-closed.

## Verified starting state

- GitHub `main`: `02a13db96549592e56f0fb8e69a09d2350c267cc`; zero open PRs.
- Vercel production: `dpl_24VhLeFNZbPU25pZSFq3PkcyMVnx`, READY, health version `phase-58b-golden-generator-foundation`, HTTP 200.
- Supabase: 129 public RLS-enabled tables; 92 migrations; latest `20260713140118 phase_58b_golden_generator_foundation`.
- Curriculum: 14 pathways, 438 candidate placements, zero authorized guides, zero verified reviewers, zero approved skills and zero released pathways.
- Practice: live `project_z_practice_attempts` has a legacy shape incompatible with the practice RPCs that expect session/delivery columns.
- Security: 213 advisor notices and 400 performance notices; no ERROR/CRITICAL security advisor result.

## Implemented boundary

### Database

- Adds private per-path diagnostic configurations with a separately reviewed calibration state. All fourteen begin `draft`.
- Adds student pathway/cohort/language/access setup and explicit tool orientation.
- Adds diagnostic completion outcomes, engine version, pause/resume, confidence requirement and first mission.
- Requires answer verification, misconception review, accessibility review, human mathematics approval and evidence digest before a diagnostic item can be verified.
- Adds a server delivery ledger with one outstanding item per session and one evidence row per delivery.
- Requires released curriculum plus approved calibration at start, resume, serve and submit.
- Stops inconclusively rather than guessing when confidence/questions are insufficient.
- Withholds correctness, solution/explanation and interim mastery during the adaptive run.
- Produces a first mission only from an approved atlas placement and exposes an explainable game-entry state.
- Revokes direct answer-bearing access, client-controlled XP, collided legacy practice/path RPCs and pre-prologue quest/studio/streak RPCs.
- Removes direct authenticated DML on diagnostic evidence and game-reward tables.

### Product/UI

- Rebuilds `/diagnostic` as a calm three-step prologue: pathway/access setup, unscored tool orientation, adaptive diagnostic.
- Separates MYP current framework from DP first-assessment cohort selection.
- Adds accessible preferences, pause/save behavior, honest locked/inconclusive states and an explainable first mission.
- Removes immediate answer/mastery feedback during the diagnostic.
- Gates Student Quest, Quest Studio and the game dashboard on the database game-entry decision.

### Evidence plan

- Adds `docs/PROJECT_Z_OBJECTIVE_100_EXECUTION_PLAN.md`, with dependency order, measurable gates, tests, live evidence, rollback and owner-only dependencies from current truth through pilot.

## Verification evidence

| Check | Result |
|---|---|
| Full Phase 58d migration in `BEGIN … ROLLBACK` against Project Z production schema | PASS |
| Node contract/property suite | PASS — 50/50 |
| TypeScript | PASS — `tsc --noEmit` |
| Golden generator | PASS — 2,500/2,500 distinct; 2,500 independent checks; stable digest |
| Python engine | PASS — `python -m py_compile engine/main.py` |
| Next production build | PASS |
| Whitespace/migration diff | PASS |
| GitHub PR #11 release-gate run `29411633625` | PASS |
| Vercel preview `dpl_2AjAnHNiGtFhE74asgsMzC5jiwfR` | READY; health 200 |
| Supabase migration `20260715112739` | APPLIED |
| Supabase FK-index migration `20260715112958` | APPLIED |
| Post-apply fail-closed assertions | PASS — 14 draft, 0 approved/released/verified/delivered/active |
| Unsafe RPC execute matrix | PASS — anon denied; authenticated practice/XP/quest denied; Phase 58d diagnostic allow-list only |
| Security advisors | 198 total, down from 213; 0 ERROR/CRITICAL |
| Missing-FK-index advisors | 111, unchanged from baseline |

PR/CI, preview, production migrations and database assertions are verified. Merge and final live deployment evidence remain before phase closure.

## Acceptance impact

- Mandatory diagnostic prologue: browser-only RED defect replaced by an AMBER database-authoritative foundation; still not GREEN because calibration and real-user validation are zero.
- Diagnostic validity: remains RED.
- Student loop: remains RED; the incompatible legacy practice RPCs are explicitly quarantined.
- Least privilege: remains RED, though answer-bearing access, direct evidence/game DML and unsafe reward/game entry points are reduced.
- Curriculum/practice/game/pilot gates: unchanged RED.

## Rollback

- Database: `supabase/rollbacks/20260715105711_phase_58d_diagnostic_prologue_gate_rollback.sql` quarantines configurations, pauses sessions, expires outstanding deliveries and revokes phase RPCs without deleting evidence.
- Application: restore Vercel deployment `dpl_24VhLeFNZbPU25pZSFq3PkcyMVnx`.
- Do not re-grant legacy answer, XP, practice or quest functions during rollback.

## Exact next phase

Phase 58e builds one reviewed vertical slice for `number.place-value.round-order`:

1. connect a legally permitted current authorized guide;
2. verify a source mapper and a different qualified mathematics educator;
3. approve the exact placement/prerequisites/sequence and five generator families;
4. replace the collided practice model with immutable session/delivery/attempt/correction events;
5. implement and test diagnostic → teaching → guided/independent practice → feedback → correction → mastery → first mission/game unlock;
6. prove the full loop with authenticated role/RLS/browser fixtures before replication.

All unblocked schema, test, security, accessibility and content-tooling work continues while owner-only review dependencies are outstanding.
