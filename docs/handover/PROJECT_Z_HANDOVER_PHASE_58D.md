# Project Z Handover — Phase 58d Diagnostic Prologue Gate

## Authoritative targets

- GitHub: `ManoliMeletiou/project-z-meletiou-mathematics`
- Vercel: `project-z-meletiou-mathematics.vercel.app`
- Supabase: `jlesueqjdvmxkqaqmnke`

The Meletiou Mathematics platform and all other systems remain read-only references.

## Outcome

Phase 58d makes the mandatory first diagnostic and main-game prologue fail closed at the Project Z database boundary. It binds evidence to server-served reviewed items, withholds answers during adaptation, supports inconclusive completion, and blocks gameplay until sufficient evidence produces an approved first mission.

It also records the objective-100 dependency plan in `docs/PROJECT_Z_OBJECTIVE_100_EXECUTION_PLAN.md`.

## Release identifiers

- Starting main commit: `02a13db96549592e56f0fb8e69a09d2350c267cc`
- Phase branch: `agent/phase-58d-diagnostic-prologue`
- Phase PR: `#11`
- Phase PR head: `28a9d0f5ac3671a4c805476af405cef80fb8fd50`
- GitHub release-gate run: `29411633625` — SUCCESS
- Migration source: `supabase/migrations/20260715105711_phase_58d_diagnostic_prologue_gate.sql`
- Applied migration: `20260715112739 phase_58d_diagnostic_prologue_gate`
- FK-index source: `supabase/migrations/20260715112915_phase_58d_fk_index_completion.sql`
- Applied FK-index migration: `20260715112958 phase_58d_fk_index_completion`
- Rollback: `supabase/rollbacks/20260715105711_phase_58d_diagnostic_prologue_gate_rollback.sql`
- Previous Vercel production deployment: `dpl_24VhLeFNZbPU25pZSFq3PkcyMVnx`
- Vercel preview deployment: `dpl_2AjAnHNiGtFhE74asgsMzC5jiwfR` — READY, health 200
- Production deployment: append after merge/live verification before declaring the phase complete.

## Current release truth

- Exactly 14 pathways remain registered.
- Authorized guides: 0; verified reviewers: 0; approved atlas skills: 0.
- Diagnostic calibration configurations: 14, all expected `draft`; approved: 0.
- Post-migration live assertion: 14 draft, 0 approved, 0 released pathways, 0 verified Phase 58d items, 0 deliveries, 0 active sessions and 1 safely paused legacy session.
- Released pathways: 0; verified Phase 58d diagnostic items: 0; main-game unlocks: 0.
- Golden generator evidence remains 2,500 distinct/verified candidate instances for one skill, not released.
- The legacy practice schema collision is quarantined and must be replaced in Phase 58e.

## Verification

- Migration transaction/rollback dry run: PASS against live Project Z schema.
- Node tests: 50/50 PASS.
- TypeScript: PASS.
- Next production build: PASS.
- Golden generator: 2,500 distinct, 2,500 independent checks, stable digest.
- Python compilation: PASS.
- PR CI/preview and production migration assertions: PASS.
- Supabase security advisors: 198 total after apply (14 INFO, 184 WARN), improved from 213; zero ERROR/CRITICAL.
- Supabase missing-FK-index advisories: 111, unchanged from the pre-phase baseline after the follow-up index migration.
- Post-merge production smoke/logs: still required before phase closure.

## Rollback

Run the Phase 58d fail-closed rollback to quarantine configs, pause sessions, expire deliveries and revoke serving. Restore Vercel deployment `dpl_24VhLeFNZbPU25pZSFq3PkcyMVnx`. Preserve evidence/audit rows and do not revive the unsafe legacy grants.

## Owner-only dependencies

- Legally permitted current authorized IB guide access.
- Verified source mapper and a different qualified mathematics educator.
- Reviewed diagnostic calibration cases and representative role accounts.
- Later: legal/privacy/safeguarding decisions and consented pilot participants.

## Exact next steps

1. Mark PR #11 ready, merge it and verify production health/logs/assertions.
2. Record the final production deployment here and in the phase report/current handover.
3. Start Phase 58e with a new immutable practice event model for `number.place-value.round-order`.
4. Obtain two-person placement/family review without copying protected guide content.
5. Prove the complete reviewed learning-to-game slice in authenticated browser/database tests.

## Completion warning

Project Z is not 100% complete. Phase 58d closes a validity/security boundary only; every acceptance row must be GREEN and the real-user pilot signed before any completion or “best” claim.
