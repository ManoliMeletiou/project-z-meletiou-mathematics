# Phase 54 — Controlled Assignment Factory Report

## Outcome

Phase 54 turns assignment creation into one calm teacher workflow:

1. choose class evidence and a recommendation;
2. create a skill-locked draft;
3. run a database-controlled release audit;
4. repair detected questions;
5. approve the exact audited version;
6. publish only when every release gate passes.

## Security defects closed

The live audit found two bypasses in the older multi-page workflow:

- `project_z_mark_generated_assignment_status` allowed a teacher to set `assigned` directly, bypassing the controlled publish function;
- class members could directly select answer-bearing generated-question rows while an assignment was `reviewed` or `assigned`.

The Phase 54 migration:

- forbids direct transition to `assigned`;
- restricts answer-bearing question rows and the teacher question RPC to the owning teacher;
- keeps the existing sanitized student-question RPC as the student interface;
- hides assignment metadata from students until the assignment is actually assigned;
- adds a database-run structural audit that a client cannot mark as passed through the generic audit logger;
- requires a current passing audit, zero unresolved flags, and teacher approval after that audit;
- invalidates audit/approval readiness after regeneration;
- enforces the full readiness contract again inside the publish RPC.

## User experience

`/assignment-factory` uses progressive disclosure. The top recommendation, current draft, four release gates, and exactly one next action are visible. Other recommendations, flagged questions, and full answer-bearing review are available only when the teacher opens them.

The legacy recommendation, generated-assignment, and audit pages link back to the factory. The legacy direct-assignment button is removed, and its database bypass is closed independently of the UI.

## Verification requirements

- frontend typecheck and production build;
- GitHub release gate;
- migration applied to Project Z Supabase only;
- anonymous access to new release RPCs denied;
- student roles cannot execute the teacher answer-bearing RPC;
- direct `assigned` status transition is rejected;
- preview and production health report `phase-54-controlled-assignment-factory`;
- no production runtime error cluster.

