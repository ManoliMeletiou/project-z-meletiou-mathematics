# Project Z Handover — Phase 54 Controlled Assignment Factory

## Authoritative targets

- GitHub: `ManoliMeletiou/project-z-meletiou-mathematics`
- Vercel: `project-z-meletiou-mathematics.vercel.app`
- Supabase: `jlesueqjdvmxkqaqmnke`

Every other app, repository, deployment, or database remains read-only.

## Release contents

- single teacher Assignment Factory at `/assignment-factory`;
- database-run structural release audit;
- current-version teacher approval and publish readiness;
- direct assignment-state bypass removed;
- answer-bearing question data restricted to the owning teacher;
- legacy assignment pages routed back to the controlled workflow;
- health version `phase-54-controlled-assignment-factory`.

## Migration

Apply exactly:

```text
supabase/migrations/20260711095500_phase_54_assignment_release_gate.sql
```

The migration is specific to Project Z Supabase `jlesueqjdvmxkqaqmnke`.

## Next milestone

Phase 55 builds automated authorization, database, API, and browser test fixtures. It must turn the now-explicit security and role contracts into CI failures rather than manual assumptions.

