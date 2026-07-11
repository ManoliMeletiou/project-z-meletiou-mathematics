# Project Z Handover — Phase 56 Identity and Role Hardening

## Authoritative targets

- GitHub: `ManoliMeletiou/project-z-meletiou-mathematics`
- Vercel: `project-z-meletiou-mathematics.vercel.app`
- Supabase: `jlesueqjdvmxkqaqmnke`

## Migration

Applied to Project Z only:

```text
supabase/migrations/20260711103500_phase_56_identity_role_hardening.sql
```

## Release contents

- new accounts always begin as students;
- browser/local storage cannot assign Project Z roles;
- profile refresh cannot change an approved role;
- protected teacher/parent request workflow;
- database-authoritative Account screen;
- password reset/update flow;
- automated identity migration contract test;
- health version `phase-56-identity-role-hardening`.

## Next risk-first work

Complete the remaining Phase 56 identity items, then consolidate/retire duplicate schemas and privileged RPCs before beginning the authoritative IB curriculum atlas.

