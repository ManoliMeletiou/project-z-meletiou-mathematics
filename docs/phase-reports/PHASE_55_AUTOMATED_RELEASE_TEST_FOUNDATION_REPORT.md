# Phase 55 — Automated Release Test Foundation Report

## Outcome

Project Z now fails CI when core navigation, quality, release-flow, API-boundary, database-migration, or production-server contracts regress.

## Automated checks

The Node test suite covers:

- one primary and no more than two secondary home actions for every role;
- preservation of every role capability under progressive disclosure;
- exclusion of design/test routes from the visible primary path;
- structurally valid and invalid question cases;
- minimum 30-question assignment threshold and deterministic distributions;
- every release-state transition: select, audit, repair, approval, rights, publish, published;
- malformed generation/regeneration payloads;
- fail-closed behavior when server configuration is absent;
- the Project Z-only writable boundary;
- compensating cleanup for partial assignment creation;
- SQL invariants for teacher-only answers, no direct assignment update, controlled transition trigger, server-run audit, rights confirmation, and anonymous revocation.

The production smoke script starts the built Next.js server and verifies:

- Project Z health/version;
- calm Home content;
- guided Role Navigation content;
- guest-safe Assignment Factory content.

## CI changes

The GitHub release gate now runs tests before typecheck/build, executes the post-build production smoke, and has an independent release-contract job.

## Evidence

- 26 Node tests pass locally.
- TypeScript checking passes.
- all 54 routes build.
- the production-server smoke passes.
- Python engine compilation passes.

## Remaining test work

This is a test foundation, not the final automated evidence gate. Authenticated browser fixtures for student, teacher, parent, and admin; live RLS denial tests; provider-failure tests; and complete learning-loop E2E tests remain required. The acceptance matrix therefore remains AMBER/RED for those gates.

