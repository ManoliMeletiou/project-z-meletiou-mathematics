# Project Z 100% Acceptance Matrix

## Status meanings

- `GREEN`: gate passed with current reproducible evidence.
- `AMBER`: foundation exists, but evidence or coverage is incomplete.
- `RED`: material capability or release evidence is missing.

No percentage based on page count, route count, question rows, or phases completed may replace these gates.

## Baseline — 11 July 2026

| Gate | Current status | Evidence required for GREEN |
|---|---|---|
| Scope boundary | GREEN | Binding writable/read-only register exists and every external write verifies its target. |
| Release foundation | GREEN | CI build/typecheck/Python checks, production health, deployment evidence, rollback path. |
| Automated release tests | AMBER | Unit, API-boundary, SQL-contract, and production-smoke tests exist; authenticated role/RLS/browser fixtures and full E2E loops remain. |
| Anonymous RPC containment | GREEN | Zero anonymously executable `SECURITY DEFINER` functions. |
| Least-privilege data security | RED | Role matrix tests pass; no unresolved high/critical advisor issue; privileged RPCs minimized; RLS policy gaps resolved. |
| Identity lifecycle | AMBER | Signup/reset/global logout, self-promotion prevention, server route guards, operator approval, export, deletion grace/cancellation, and safe callbacks exist; authenticated browser fixtures, leaked-password protection, and MFA policy remain. |
| Calm product shell | AMBER | Home and role navigation simplified in Phase 53; every primary route still requires the same audit. |
| MYP atlas | RED | Phase 57 registers all ten Year 1–5 Standard/Extended pathways and 142 legacy candidate placements. Phase 58 now enforces separate verified source alignment and mathematics-educator sign-off, but no authorized guide or reviewer is registered and no placement is approved. |
| DP atlas | RED | Phase 57 registers AA SL/HL and AI SL/HL and 296 legacy candidate placements, with current-2021 and upcoming-2029 briefs separated. Phase 58 adds the auditable two-person review gate, but exact guide alignment and approval remain at zero. |
| Practice depth | RED | Phase 58b proves one automated candidate skill across five families and 2,500 distinct variants with independent answer checks and zero duplicates. It remains blocked pending curriculum/human review, and every other skill still lacks equivalent evidence. |
| Diagnostic validity | RED | Adaptive placement and misconception detection validated against reviewed cases. |
| Mastery validity | RED | Explainable mastery and spaced review calibrated against reviewed learning histories. |
| Teaching AI | RED | Tutor ladder, safety evaluation, misconception repair, and learning-gain evaluation pass. |
| Student loop | RED | Diagnostic → learn → practise → feedback → correction → mastery passes in real browser and data tests. |
| Teacher loop | RED | Class → insight → generate → audit → publish → review → report passes with role isolation. |
| Parent loop | RED | Linked-child summaries pass and prohibited/private data are proven inaccessible. |
| Mathematical QA | RED | Phase 58b establishes deterministic fixed-point, independent-answer, duplicate and regression-digest checks for one place-value candidate; symbolic, unit, notation and full-atlas suites remain incomplete. |
| Accessibility | RED | WCAG 2.2 AA evidence across role-critical flows, devices, zoom, keyboard, and screen readers. |
| Reliability/operations | RED | Monitoring, rate/cost limits, backup/restore drill, incident response, provider outage, and rollback tested. |
| Privacy/compliance | RED | Approved privacy, terms, retention, consent, child-data, export, deletion, and breach procedures. |
| Controlled pilot | RED | Representative students, teachers, and parents complete the pilot with zero release blocker. |
| Final handover | RED | Phase 58 handover records the current fail-closed curriculum state; final architecture, schema, curriculum, AI, environments, deployment, rollback, operations, limitations, and launch decision remain incomplete. |

## Launch rule

Project Z reaches 100% only when every row is `GREEN`, evidence links are recorded, production is reverified after the final release, and the launch decision is signed. Until then, work continues in the risk-first order in `PROJECT_Z_COMPLETION_MASTER_PLAN.md`.
