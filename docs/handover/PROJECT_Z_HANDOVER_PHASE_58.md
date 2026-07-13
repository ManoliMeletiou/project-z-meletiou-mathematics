# Project Z Handover — Phase 58 Curriculum Review Workbench

## Authoritative targets

- GitHub: `ManoliMeletiou/project-z-meletiou-mathematics`
- Vercel: `project-z-meletiou-mathematics.vercel.app`
- Supabase: `jlesueqjdvmxkqaqmnke`

The Meletiou Mathematics repository, application, database and deployment remain read-only reference. Phase 58 changes only Project Z.

## Outcome

Phase 58 turns the Phase 57 candidate atlas into a controlled review process. An operator can register authorized-source metadata and credential-verified reviewers. A curriculum mapper can align one candidate skill placement to a private source locator. A different verified mathematics educator must independently approve it. The database will not allow a candidate to become approved unless both decisions exist and were made by different people.

## Applied migration

```text
supabase/migrations/20260713150000_phase_58_curriculum_review_workbench.sql
```

## Database controls

- private reviewer roster with `curriculum_mapper` and `mathematics_educator` roles;
- operator self-verification is forbidden;
- verified teacher profile is required before reviewer activation;
- immutable source-alignment and educator-sign-off event ledger with evidence digests;
- separate status, reviewer, timestamp, locator and notes for each decision;
- database constraint requires approved source alignment, approved educator review and two different reviewers;
- source mapper cannot provide the educator sign-off for the same candidate;
- exact educator attestation is required for approval;
- anonymous execution is denied on every Phase 58 RPC;
- authenticated access is restricted to an active operator or the appropriate verified reviewer role;
- sensitive source locators, detailed notes and reviewer identifiers are not directly readable by ordinary authenticated users;
- all pathways and unapproved skills remain blocked.

## Calm application workflow

- `/curriculum-review` is a server-protected restricted route;
- the page shows one pathway and one skill at a time;
- blocker pills state which evidence is missing;
- mapper and educator actions are separated visually and by authorization;
- operator setup is progressively disclosed;
- protected guide text and private links are never displayed or copied;
- health version is `phase-58-curriculum-review-workbench`.

## Verified database state

```text
Pathways:           14
Candidate placements: 438
Released pathways: 0
Authorized guides: 0
Verified reviewers: 0
Approved skills:   0
Review events:     0
```

The empty review state is correct. Phase 58 adds the machinery and does not invent source evidence, reviewer credentials or approvals.

## Security evidence

- operator access and the 438-item queue are available only after signed-in role checks;
- anonymous queue and review execution are denied;
- operator self-registration as a reviewer is rejected;
- unverified reviewer actions are rejected;
- direct authenticated reads of private locator and review-note columns are denied;
- seven new `SECURITY DEFINER` advisor warnings are intentional private-table gateways, not anonymous exposure; each uses exact grants, a fixed search path and in-function identity/role checks;
- no new missing-index advisor finding was introduced;
- newly created audit indexes are reported as unused only because the live review tables are empty.

## Honest completion state

Project Z is not 100% complete. Curriculum coverage remains RED. The app has no authorized guide source, no verified review pair, no approved candidate skill, no verified generator family and no released pathway. Phase 58 prevents those omissions from being hidden behind legacy flags or UI claims.

## Next risk-first work

1. Make the school-authorized MYP and applicable DP subject guides available through an approved private source such as connected Google Drive.
2. Create stable, verified teacher accounts for at least two different qualified people and register one as curriculum mapper and one as mathematics educator.
3. Review all 438 candidate placements, versioning cohort-specific DP decisions and treating MYP Year 1–5 as Project Z/school sequencing.
4. Build one golden generator family for the first approved prerequisite skill and prove mathematical correctness, diversity and at least 2,000 distinct valid variants.
5. Repeat in prerequisite order while every incomplete pathway remains blocked.

## Remaining owner/connector switches

- A connected private source containing the authorized guides is required for exact alignment; public IB briefs are not exhaustive enough.
- Reviewer credentials and decisions must come from real qualified people and cannot be fabricated by the agent.
- Supabase Auth leaked-password protection remains a dashboard setting: `https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection`.
- Stable disposable student, teacher and parent accounts are still required for authenticated browser fixtures.
