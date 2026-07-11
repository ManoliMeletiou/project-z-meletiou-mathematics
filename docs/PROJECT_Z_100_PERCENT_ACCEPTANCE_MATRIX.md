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
| Anonymous RPC containment | GREEN | Zero anonymously executable `SECURITY DEFINER` functions. |
| Least-privilege data security | RED | Role matrix tests pass; no unresolved high/critical advisor issue; privileged RPCs minimized; RLS policy gaps resolved. |
| Identity lifecycle | RED | Signup, verification, reset, session expiry, logout, invitation, role approval, export, and deletion pass end to end. |
| Calm product shell | AMBER | Home and role navigation simplified in Phase 53; every primary route still requires the same audit. |
| MYP atlas | RED | Years 1–5 Standard and Extended fully mapped, reviewed, versioned, and audited. |
| DP atlas | RED | AA SL/HL and AI SL/HL fully mapped, reviewed, versioned, and audited. |
| Practice depth | RED | Every active skill proves at least 2,000 distinct verified instances and blueprint diversity. |
| Diagnostic validity | RED | Adaptive placement and misconception detection validated against reviewed cases. |
| Mastery validity | RED | Explainable mastery and spaced review calibrated against reviewed learning histories. |
| Teaching AI | RED | Tutor ladder, safety evaluation, misconception repair, and learning-gain evaluation pass. |
| Student loop | RED | Diagnostic → learn → practise → feedback → correction → mastery passes in real browser and data tests. |
| Teacher loop | RED | Class → insight → generate → audit → publish → review → report passes with role isolation. |
| Parent loop | RED | Linked-child summaries pass and prohibited/private data are proven inaccessible. |
| Mathematical QA | RED | Generator, solver, equivalence, unit, notation, duplicate, and regression suites pass. |
| Accessibility | RED | WCAG 2.2 AA evidence across role-critical flows, devices, zoom, keyboard, and screen readers. |
| Reliability/operations | RED | Monitoring, rate/cost limits, backup/restore drill, incident response, provider outage, and rollback tested. |
| Privacy/compliance | RED | Approved privacy, terms, retention, consent, child-data, export, deletion, and breach procedures. |
| Controlled pilot | RED | Representative students, teachers, and parents complete the pilot with zero release blocker. |
| Final handover | RED | Architecture, schema, curriculum, AI, environments, deployment, rollback, operations, and limitations are current. |

## Launch rule

Project Z reaches 100% only when every row is `GREEN`, evidence links are recorded, production is reverified after the final release, and the launch decision is signed. Until then, work continues in the risk-first order in `PROJECT_Z_COMPLETION_MASTER_PLAN.md`.

