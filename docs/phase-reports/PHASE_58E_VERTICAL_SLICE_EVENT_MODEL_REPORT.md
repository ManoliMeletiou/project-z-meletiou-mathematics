# Phase 58e Report — Collision-Free First-Mission Event Model

## Decision

Replace the collided practice model instead of adding ambiguous columns to the legacy table. The old row and functions remain for audit/rollback, but every old practice RPC is revoked. New evidence has explicit, versioned meaning and is append-only.

## Evidence model

| Ledger | Evidence boundary |
|---|---|
| `project_z_first_learning_missions` | Mutable mission projection tied to one sufficient diagnostic and first-mission skill. |
| `project_z_first_mission_teaching_events` | Every teaching check attempt; only correct reviewed checks complete a step. |
| `project_z_first_mission_practice_deliveries` | Server-issued generator version/family/seed and prompt without an answer key. |
| `private.project_z_first_mission_answer_keys` | Private canonical answer, worked solution and misconception metadata. |
| `project_z_first_mission_attempt_events` | Exactly one immutable response per delivery. |
| `project_z_first_mission_correction_events` | Retry plus reflection; a correct repair is unique per original attempt. |
| `project_z_first_mission_mastery_events` | Reconstructable rule inputs, decision and evidence digest. |
| `project_z_first_mission_game_unlock_events` | Unique server-derived first-stage unlock. |
| `project_z_first_mission_reward_events` | Unique XP/coin reward explicitly separated from mastery and grades. |

All public ledgers use owner-scoped RLS with indexed `user_id`; clients have read-only table access and writes occur only through authenticated, student-role-checking, fixed-search-path RPCs. Private configs, teaching answers and practice answer keys have no API-role table access.

## Learning-science and game rules

- Teaching checks precede guided practice.
- Guided evidence never creates mastery.
- Independent work spans all five genuinely different families.
- A wrong independent/checkpoint response blocks progression until the learner retries and explains the change.
- Two independently correct checkpoint items are required; a corrected wrong checkpoint does not count as an independently correct checkpoint.
- A single response cannot create mastery.
- The mastery event excludes XP, streak, companion and cosmetic state.
- The reward and unlock are inserted idempotently only after a new server-verified mastery event.
- After bounded remediation, the mission pauses for calm teacher-supported review instead of creating an endless engagement loop.

## Generator reconciliation

The migration contains a private database serving implementation of the same five `place-value-v1.0.0` families. During migration it generates seeds 0–499 for every family, normalizes the prompt/answer keys identically to the Phase 58b verifier, proves 2,500/2,500 distinct instances and requires digest:

```text
cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f
```

The live-schema transaction/rollback dry run passed that assertion. This automated agreement does not replace the outstanding independent human mathematics review.

## Test evidence

| Check | Result |
|---|---|
| Existing + Phase 58e Node contracts | 58/58 PASS |
| Pure release gate: every missing dependency | PASS, fail-closed |
| Hypothetical diagnostic → teaching → guided → independent → correction → checkpoint → mastery → unlock | PASS |
| One-answer, family-undercoverage and checkpoint-undercoverage denial | PASS |
| Motivation-only reward idempotency | PASS |
| Legacy table non-retrofit contract | PASS |
| New SQL immutable/replay/answer-key/reviewer contracts | PASS |
| TypeScript | PASS |
| Production-schema migration transaction + rollback | PASS |
| Exact DB/TypeScript 2,500-instance digest | PASS |
| Next build/smoke/Python | PASS |
| PR CI and Vercel preview | PASS — run `29415046847`; preview `dpl_LatfoQWj9GaAhHL3g1At9Xit68rB` READY |
| Applied migration assertions and advisors | PASS for Phase 58e change — migration `20260715122514`; no new unindexed foreign key or ERROR/CRITICAL security finding |
| Production deployment/health/build/runtime | PASS — `dpl_F7ABP8zKyRTgPHQqntnexj1e1nr4` READY; Phase 58e health 200; no build or route-scoped runtime error |
| Authenticated reviewed browser/data loop | BLOCKED — owner-only review and representative account |

## Accessibility and child-safety details

- `/recommended` uses semantic navigation, headings, labels, status live regions and ordinary text inputs; no animation or timed response is required.
- Hints are progressively disclosed.
- The learner sees why a release is blocked rather than a broken practice action.
- Remediation is bounded and pauses for human support.
- The page states that XP/coins are motivation only.

Full WCAG 2.2 AA evidence across role-critical flows remains a later acceptance gate and is not claimed here.

## Security and privacy details

- No answer key is stored in a public table.
- Only the currently outstanding server-issued delivery can be answered once.
- Client event UUIDs make retries idempotent; unique constraints protect concurrent replay.
- Mission-row locking serializes issue, submit, correction, mastery and reward mutations.
- All foreign keys introduced by the phase have supporting indexes.
- New learner-owned events are included in account export and cascade with controlled account deletion.
- Rollback preserves evidence and fails closed.

## Exit-gate status

Engineering foundation: PASS and live. PR `#13` merged as `8c06da797c2d06348ff6565bc6276248a010c328`; Project Z Supabase applied `20260715122514 phase_58e_vertical_slice_event_model`; Vercel production `dpl_F7ABP8zKyRTgPHQqntnexj1e1nr4` is READY.

Post-apply evidence remains fail-closed: zero released pathways, zero approved atlas skills, zero approved generator families, zero approved teaching assets and zero first-mission learner events. The one collided legacy practice row is preserved; the legacy service RPCs remain revoked. All 139 public tables have RLS, anonymous `SECURITY DEFINER` execution remains zero, and the new ledgers expose no authenticated direct write privilege.

Advisor reconciliation: security 205 total (14 INFO, 191 WARN, no ERROR/CRITICAL); performance 427 total, including 111 unindexed foreign keys unchanged from the pre-phase baseline. Phase 58e adds seven intentional authenticated gateway warnings and expected unused-index findings on empty, indexed ledgers. Leaked-password protection and the wider pre-existing authenticated-function/policy inventory remain open platform risks.

Reviewed vertical-slice release: RED/BLOCKED. No authorized source, verified mapper, different qualified educator, approved calibration, released pathway or authenticated reviewed browser trace exists yet.

Project Z is not 100% complete.
