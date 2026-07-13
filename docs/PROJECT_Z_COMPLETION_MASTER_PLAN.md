# Project Z Completion Master Plan

## Goal

Move Project Z from a live feature-rich prototype to a secure, tested, pilot-ready mathematics learning platform with objective release gates. "Complete" means the system passes the launch definition below; it does not mean that future curriculum or product improvement stops.

## Current baseline — 11 July 2026

- GitHub source of truth: `ManoliMeletiou/project-z-meletiou-mathematics`, branch `main`.
- Production: `https://project-z-meletiou-mathematics.vercel.app/`.
- Vercel project: `prj_lFXgmOQAiWASZkA0GDFaoWMzg0NH`.
- Supabase production: `jlesueqjdvmxkqaqmnke` (`meletiou-mathematics`).
- Production health: Phase 51, HTTP 200, no Vercel runtime errors in the audited seven-day window.
- All Phase 47–51 branches are already contained in `main`; none has unmerged work.
- Local baseline passes `npm run build`, `npm run typecheck`, and Python compilation.
- Supabase has 122 public tables, 204 public functions, 7 active Edge Functions, and 6,255 question-bank rows.
- Supabase advisor baseline: 327 security notices and 385 performance notices. The urgent issue is default function execution: 145 `SECURITY DEFINER` functions were executable by `anon`.

## Verified progress — 13 July 2026

- Phases 52–56b are merged and live: anonymous function execution is closed, dependencies/CI are pinned, the calm role shell and controlled assignment factory are present, and cookie sessions, database roles, operator separation, export, and delayed deletion are implemented.
- Phase 57 foundation is applied to Project Z Supabase: exactly 14 pathways, 438 legacy candidate pathway-skill placements, official-source/version records, and a hard 2,000-distinct-variant release floor.
- All 14 pathways remain blocked and advertise no completion. The old 18 blueprint and 22 diagnostic `verified` flags were preserved in quarantine history and cleared because they do not satisfy the new evidence contract.
- Current security advisor baseline is 206 notices: 14 informational RLS-with-no-policy notices on sealed legacy tables, 191 intentional/legacy authenticated `SECURITY DEFINER` warnings, and leaked-password protection disabled. Phase 57's new read-only evidence RPCs use caller RLS and add no advisor warning.

## Definition of done

Project Z is launch-complete only when every gate is met:

| Gate | Required evidence |
|---|---|
| Security | No anonymous `SECURITY DEFINER` RPC exposure; no critical/high advisor finding; role-isolation tests pass. |
| Identity | Signup, login, logout, password reset, profile creation, and role assignment work without role escalation. |
| Student | Diagnostic → recommendation → practice/assignment → submission → feedback/correction → mastery works end to end. |
| Teacher | Class → roster → recommendation → generation → audit → publish → review → memorandum → correction review → report works end to end. |
| Parent | Secure link → child overview → released parent-safe reports works without tutor chat, private notes, or other-student exposure. |
| Mathematics | Generated/served questions are skill-aligned, verified, non-duplicative, age-appropriate, and correctly marked. |
| Curriculum | Supported MYP/DP courses have an audited skill map, prerequisites, diagnostics, and sufficient verified question coverage. |
| Reliability | CI, build, typecheck, API tests, database tests, E2E tests, monitoring, backup, restore, and rollback checks pass. |
| Accessibility | Keyboard, screen reader, reduced motion, contrast, responsive layouts, and error states meet WCAG 2.2 AA targets. |
| Operations | Privacy/legal documents, retention, deletion/export requests, support workflow, rate/cost limits, and incident runbooks are approved. |
| Pilot | A controlled pilot with real student, teacher, and parent accounts completes with no release-blocking defect. |
| Handover | Architecture, environment inventory, migrations, deployment, rollback, test evidence, and known limitations are current. |

## Execution sequence

### Phase 52 — Security and release foundation

1. Revoke anonymous execution on public functions and harden future default privileges.
2. Remove direct RPC access to trigger functions.
3. Fix mutable function search paths.
4. Pin all frontend dependency versions.
5. Add typecheck/build/Python CI gates.
6. Re-run Supabase advisors, production health, logs, and signed-in smoke tests.
7. Record remaining authenticated `SECURITY DEFINER` functions for least-privilege conversion.

Exit gate: anonymous executable `SECURITY DEFINER` count is zero and existing signed-in workflows still operate.

### Phase 53 — Product constitution and calm shell

1. Freeze the Project Z writable/reference boundary.
2. Define the complete IB coverage, learning, AI, role, and acceptance contracts.
3. Replace duplicated home navigation with one primary action, at most two secondary actions, and progressive disclosure.
4. Remove design, preview, test, and system routes from the primary user path without deleting capabilities.
5. Add reduced-motion and role-appropriate visual handling.

Exit gate: the binding contracts are tracked and Home/Role Navigation present a calm, unambiguous path on desktop and mobile.

### Phase 54 — Assignment factory command centre

1. Unify `/assignment-recommendations`, `/generated-assignments`, and `/assignment-audit` into one controlled workflow.
2. Show evidence behind each recommendation, target students, skill/prerequisite, difficulty and criterion mix.
3. Require generation status, deterministic checks, duplicate checks, source/rights status, and unresolved audit flags before publish.
4. Make regeneration preserve skill, level, criterion, and teacher intent.
5. Add designed loading, partial-failure, empty, retry, and cancellation states.

Exit gate: a teacher can generate, audit, repair, and publish only verified work without bypassing review.

### Phase 55 — Automated role and API test foundation

1. Add unit tests for answer normalization, assignment validation, role routing, mastery, and spaced repetition.
2. Add API tests for authentication, authorization, malformed input, rate limits, and provider failures.
3. Add database tests for every RLS boundary and privileged RPC.
4. Add browser E2E fixtures for guest, student, teacher, parent, and admin.
5. Block deployment when a release gate fails.

Exit gate: critical workflows and every cross-role denial are automated in CI.

### Phase 56 — Identity, privacy, and account lifecycle

1. Remove local-storage role authority; the database profile is authoritative.
2. Add server-side route protection where private content can render.
3. Verify invite/approval rules for teacher and admin roles.
4. Complete email verification, password reset, session expiry, logout, account export, and deletion.
5. Enable leaked-password protection and document MFA/admin controls.

Exit gate: no user can self-promote or access another role's data.

### Phase 57 — Mathematics and curriculum completeness

1. Define supported launch courses; do not claim unsupported coverage.
2. Audit every canonical skill, prerequisite edge, diagnostic item, and course placement.
3. Set minimum verified-bank coverage per skill and assessment dimension.
4. Expand templates/questions only through verification and human-review gates.
5. Add symbolic, numerical, unit, equivalence, notation, distractor, and duplicate testing.
6. Publish coverage dashboards and block empty/unsafe skills from serving.

Exit gate: every advertised course meets the approved coverage threshold and sampling audit.

### Phase 58 — Learning intelligence and assessment integrity

1. Validate diagnostics, mastery updates, spaced repetition, prerequisite gaps, and recommendations with test cases.
2. Keep Criterion A deterministic where possible.
3. Treat B/C/D structured auto-marking separately from open-response teacher judgement.
4. Calibrate AI feedback and suggested marks against teacher-reviewed examples.
5. Separate motivation signals from formal assessment in schema, UI, exports, and reports.

Exit gate: learning decisions are explainable, reproducible, and do not overstate assessment certainty.

### Phase 59 — UX, accessibility, and performance

1. Run complete responsive checks on phone, tablet, laptop, and desktop.
2. Add keyboard/focus, semantic headings, labels, live regions, reduced motion, contrast, and 3D fallbacks.
3. Measure Core Web Vitals, bundle size, database/RPC latency, and slow routes.
4. Remove duplicated navigation and prevent guests from being sent into private dashboard shells.
5. Test PDFs, uploads, errors, offline/retry states, and slow networks.

Exit gate: WCAG 2.2 AA target checks and agreed performance budgets pass.

### Phase 60 — Production operations and compliance

1. Approve privacy policy, terms, child/student-data position, consent, retention, and deletion rules.
2. Configure production/preview environment separation and secret rotation.
3. Add structured error monitoring, audit review, uptime checks, alerts, cost budgets, and abuse controls.
4. Verify database backups and perform a restore drill.
5. Write incident, rollback, data breach, AI provider outage, and support runbooks.

Exit gate: an operator can detect, contain, restore, and explain a production incident.

### Phase 61 — Controlled pilot and launch

1. Seed clean pilot data and create verified accounts for every role.
2. Run the complete real-user checklist with teachers, students, and parents.
3. Triage all findings; zero release-blocking defects may remain.
4. Freeze migrations, tag the release, record deployment IDs, and confirm rollback.
5. Produce the final handover and launch decision record.

Exit gate: signed pilot acceptance plus a reproducible production release.

## Rules that remain non-negotiable

- Use `MYP Standard` and `MYP Extended`, not `Core`, as product course labels.
- Mathematical accuracy outranks decoration or engagement.
- AI-generated content never bypasses verification and teacher control.
- Parents never receive raw tutor conversations, private teacher notes, or other students' data.
- XP, streaks, levels, achievements, cosmetics, and companion state are motivation only, never grades.
- Navigation is not security; authorization belongs in server checks, RPCs, grants, and RLS.
- Production changes require a migration, verification evidence, and rollback path.
