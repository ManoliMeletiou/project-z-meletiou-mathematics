# Phase 56 — Identity and Role Hardening Report

## Critical finding

The previous signup screen allowed a user to select `teacher` or `parent`. The profile RPC accepted that value, the new-user trigger trusted role metadata, and authenticated users retained direct profile UPDATE permission. A user could therefore self-promote without verification.

## Database controls

The Phase 56 migration:

- assigns every new account the `student` role regardless of browser metadata;
- preserves an existing approved role when profile information is refreshed;
- makes the profile upsert RPC update email/display name only;
- removes authenticated INSERT/UPDATE privileges and policies on profile rows;
- adds teacher/parent access requests with `pending`, `approved`, `rejected`, and `cancelled` states;
- allows users to read only their own request history;
- grants request RPCs to authenticated users and explicitly denies anonymous execution.

The migration does not silently demote existing approved roles. At application time the two existing Project Z profiles were both students.

## Product changes

- signup no longer offers a role selector;
- new-account copy explains that teacher/parent access is verified;
- Account reads the protected database role and no longer syncs a browser-selected role;
- students can submit a teacher or parent access request without gaining that role;
- the old `project-z-role` local-storage authority is removed;
- the legacy dashboard now labels sessions from the protected profile;
- forgot-password and secure password-update flows are available.

## Verified production database state

- no profile INSERT/UPDATE policy remains for authenticated browser clients;
- authenticated table INSERT/UPDATE privileges on profiles are false;
- new role-request RPCs are anonymous-denied and authenticated-enabled;
- existing profile roles: two students, zero teacher/parent at verification time.

## Remaining identity work

Authorized role-request approval tooling, server-readable cookie sessions/route guards, email-verification UX, session-expiry UX, account export/deletion, admin MFA policy, and authenticated browser/RLS fixtures remain. The identity acceptance gate is therefore AMBER, not GREEN.

