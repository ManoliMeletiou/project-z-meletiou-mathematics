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
| Next build/smoke/Python | Pending final local gate |
| PR CI and Vercel preview | Pending |
| Applied migration assertions and advisors | Pending |
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

Engineering foundation: PASS locally and against a rolled-back production-schema transaction.

Reviewed vertical-slice release: RED/BLOCKED. No authorized source, verified mapper, different qualified educator, approved calibration, released pathway or authenticated reviewed browser trace exists yet.

Project Z is not 100% complete.
