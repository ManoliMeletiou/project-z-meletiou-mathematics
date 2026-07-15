# Project Z Handover — Phase 58e Collision-Free Vertical Slice

## Authoritative targets

- GitHub: `ManoliMeletiou/project-z-meletiou-mathematics`
- Vercel: `project-z-meletiou-mathematics.vercel.app`
- Supabase: `jlesueqjdvmxkqaqmnke`

The Meletiou Mathematics platform and every other system remain read-only references.

## Outcome

Phase 58e replaces the structurally collided practice contract with a new append-only first-mission event model:

```text
diagnostic first mission
→ reviewed teaching checks
→ guided practice
→ independent practice
→ mandatory correction when needed
→ two checkpoint successes
→ explainable mastery event
→ idempotent first-stage unlock and motivation-only reward
```

The incompatible legacy practice row is preserved and quarantined. The old practice RPCs remain revoked for `anon`, `authenticated` and `service_role`.

This is a review-ready engineering foundation, not a released or human-reviewed curriculum slice. Authorized guide access, a verified curriculum mapper and a different qualified mathematics educator remain owner-only dependencies. Therefore the Phase 58e reviewed-release exit gate is not GREEN.

## Release identifiers

- Starting main commit: `13645c666775d7fbfcc10c34e42ea42c43b00790`
- Phase branch: `agent/phase-58e-reviewed-vertical-slice`
- Phase PR: `#13` — `https://github.com/ManoliMeletiou/project-z-meletiou-mathematics/pull/13`
- Merged implementation commit: `8c06da797c2d06348ff6565bc6276248a010c328`
- GitHub release-gate run: `29415046847` — PASS
- Migration source: `supabase/migrations/20260715143000_phase_58e_vertical_slice_event_model.sql`
- Applied migration: `20260715122514 phase_58e_vertical_slice_event_model`
- Rollback: `supabase/rollbacks/20260715143000_phase_58e_vertical_slice_event_model_rollback.sql`
- Vercel preview deployment: `dpl_LatfoQWj9GaAhHL3g1At9Xit68rB` — READY
- Vercel production deployment: `dpl_F7ABP8zKyRTgPHQqntnexj1e1nr4` — READY
- Production health version after deployment: `phase-58e-vertical-slice-event-model`

## Implemented controls

1. New first-mission teaching, delivery, attempt, correction, mastery, game-unlock and reward ledgers; evidence tables reject update/delete.
2. Server-generated practice is bound to `generator_version`, family and seed. Refresh returns the same unanswered delivery and replay cannot create a second attempt.
3. The database serving generator reproduces all five Phase 58b families and the same 2,500-instance digest.
4. Serving requires the released pathway and diagnostic, approved authorized-source placement, two different placement reviewers, reviewed generator families, reviewed teaching assets and an explicit operator release record.
5. Independent/checkpoint errors block new items until the learner repairs the answer and records a substantive reflection.
6. Mastery requires five teaching checks, two guided attempts, eight independent/remediation attempts, five-family coverage, two correct checkpoints, no unresolved correction and at least 90% scored accuracy.
7. Mastery decisions are append-only and reconstructable. XP/coins are emitted separately, once, and are marked motivation-only.
8. The account export includes every new learner-owned event but never includes private answer keys or reviewer evidence.
9. `/recommended` is now the calm first-learning-mission surface; it reports review blockers honestly when the slice is locked.

## Current release truth

- Exactly fourteen pathways remain registered and unreleased.
- Authorized guides: 0; verified curriculum reviewers: 0; approved atlas skills: 0.
- Place-value slice configs: two candidate pathway placements, both blocked.
- Teaching assets: five draft candidates, zero approved.
- Generator evidence: 2,500 distinct, reproducible and independently checked candidate instances; five families still awaiting human mathematics review.
- First learning missions, teaching events, practice deliveries, attempt events, correction events, mastery events, stage unlocks and rewards: verified zero after apply.
- The one collided legacy practice-attempt row remains preserved.
- Post-apply production assertions: 139 public tables, all with RLS; zero anonymously executable `SECURITY DEFINER` functions; zero direct authenticated writes to the new ledgers; seven authenticated Phase 58e gateways; every legacy practice RPC remains revoked even from `service_role`.

## Verification

- Live-schema transaction/rollback dry run: PASS, including exact 2,500-instance database digest reconciliation.
- Node tests: 58/58 PASS.
- TypeScript: PASS.
- Generator verification: 2,500 distinct and 2,500 independent checks, stable digest.
- Next production build, local smoke and Python compilation: PASS.
- PR CI run `29415046847`: PASS; Vercel preview `dpl_LatfoQWj9GaAhHL3g1At9Xit68rB`: READY.
- Production migration assertions: PASS; applied migration `20260715122514`.
- Production deployment `dpl_F7ABP8zKyRTgPHQqntnexj1e1nr4`: READY; canonical `/api/health`: HTTP 200 with the Phase 58e version; signed-out `/recommended`: authentication-gated; build errors: none; route-scoped runtime errors after deploy: none.
- Post-apply security advisors: 205 total — 14 INFO and 191 WARN, with no ERROR/CRITICAL finding. The seven warnings added by Phase 58e are the intentional authenticated, role-checking gateways; leaked-password protection and the pre-existing authenticated-function inventory remain unresolved.
- Post-apply performance advisors: 427 total — 111 unindexed foreign keys (unchanged), 136 auth RLS init-plan, 82 unused-index, 97 multiple-permissive-policy and one connection finding. The new empty-ledger indexes account for the expected unused-index increase; Phase 58e introduced no unindexed foreign key.
- Supabase logs: no post-migration database error; API logs empty and auth logs informational in the inspected window. Two retained database errors pre-date the successful migration and came from migration-development probes.
- Authenticated browser/data loop: blocked by the review dependencies and representative student account; the hypothetical state-machine and SQL contracts pass, but that is not a substitute for the required real reviewed browser proof.

## Rollback

Run `supabase/rollbacks/20260715143000_phase_58e_vertical_slice_event_model_rollback.sql` to quarantine slice configs, pause active non-mastered missions and revoke all Phase 58e learner RPCs. Preserve every immutable evidence/reward/unlock row. Restore production deployment `dpl_Gje7f2uYscruN9gTA3sHezhGawUw` if application rollback is required. Do not re-enable the legacy practice functions.

## Owner-only dependencies

- Legally permitted current authorized IB guide access.
- A credential-verified curriculum mapper.
- A different qualified mathematics educator for placement, teaching and generator-family review.
- Reviewed diagnostic calibration cases and a representative authenticated student account.

## Exact next steps

1. Owner supplies legally permitted current authorized guide access, a credential-verified source mapper, a different qualified mathematics educator and representative reviewed diagnostic cases/accounts.
2. Register the authorized source and the two verified, distinct reviewers.
3. Review one MYP Year 1 Standard or Extended placement without assuming which flexible sequence is correct.
4. Review the five teaching assets and five generator families; revise and rerun the 2,500-instance evidence on any content change.
5. Approve diagnostic calibration cases for that pathway and explicitly release only that slice.
6. Run the complete authenticated browser/database loop, including one incorrect independent response, correction, mastery, replay attempts and duplicate reward attempts.
7. Record the immutable review IDs, browser trace and event-ledger evidence. Only then may the reviewed Phase 58e exit gate become GREEN and the pattern be replicated.

## Completion warning

Project Z is not 100% complete. Phase 58e does not release a curriculum pathway and does not satisfy the controlled-pilot gate. Every acceptance row must be GREEN and the real-user pilot signed before any completion or “best” claim.
