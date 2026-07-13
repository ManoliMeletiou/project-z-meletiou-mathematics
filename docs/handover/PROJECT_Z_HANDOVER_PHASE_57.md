# Project Z Handover — Phase 57 IB Curriculum Evidence Foundation

## Authoritative targets

- GitHub: `ManoliMeletiou/project-z-meletiou-mathematics`
- Vercel: `project-z-meletiou-mathematics.vercel.app`
- Supabase: `jlesueqjdvmxkqaqmnke`

The Meletiou Mathematics repository, application, database and deployment were used as read-only reference only. No reference-system write was made.

## What Project Z is building

Project Z is an evidence-led IB mathematics learning system for:

- MYP Years 1–5, each with Standard and Extended pathways;
- DP Mathematics: Analysis and Approaches SL and HL;
- DP Mathematics: Applications and Interpretation SL and HL.

Each released skill must include teaching support and at least 2,000 mathematically distinct, reproducible and verified practice variants. Row counts, superficial parameter changes and legacy `verified` booleans do not prove coverage.

## Applied migrations

```text
supabase/migrations/20260713143000_phase_57_ib_curriculum_evidence_foundation.sql
supabase/migrations/20260713145500_phase_57_read_only_rpc_invoker_hardening.sql
```

## Database evidence

- exactly 14 pathway evidence rows: 10 MYP and 4 DP;
- 438 useful legacy candidate pathway-skill placements imported without approval claims;
- 8 provenance records, including 7 official IB public sources;
- current DP first-assessment-2021 briefs and upcoming first-assessment-2029 briefs are stored separately;
- all 14 pathways are `blocked`; zero advertise completeness;
- zero skills are educator-approved or release-ready;
- required floor is 2,000 verified distinct variants per approved skill;
- 18 legacy blueprints and 22 legacy diagnostic questions preserved in quarantine history, then changed from `verified=true` to `false`;
- all 462 Project Z curriculum graph rows have diagnostic, practice and game serving disabled;
- direct blueprint/question RLS allows only verified content in a fully released pathway;
- Phase 57 read-only evidence RPCs are `SECURITY INVOKER`, anonymous execution is denied, and authenticated execution is allowed.

## Source interpretation

The official IB MYP public material defines Standard and Extended challenge and broad mathematical areas, but gives schools flexibility over detailed content and sequencing. Project Z therefore labels its Year 1–5 atlas as a Project Z/school sequence until an authorized subject guide and mathematics educator review are recorded.

The official IB DP page currently exposes both the first-assessment-2021 briefs and new first-assessment-2029 briefs. Project Z tracks these versions separately so present and future cohorts are not silently mixed.

## Application change

- the curriculum screen presents one calm choice at a time: MYP year, then Standard/Extended, or one of four DP courses;
- users see candidate skill count, review progress and the 2,000-variant gate without a dense dashboard;
- the candidate atlas is hidden behind progressive disclosure;
- a student may save an intended pathway, but diagnostics remain disabled while the pathway is unreleased;
- health version: `phase-57-ib-curriculum-evidence-foundation`.

## Verification

- 37 Node contract tests passed;
- TypeScript passed;
- Next.js 16 production build passed with 56 routes;
- authenticated/RLS database probes returned 14 pathways, 74 AA SL candidate skills, zero release-ready AA SL skills and `course_release_ready=false`;
- transactional student selection probe selected MYP Year 1 Standard and rolled back cleanly;
- security advisor returned to the pre-Phase-57 baseline of 206 notices after converting the three new read-only RPCs to caller-RLS execution.

## Honest state

Project Z is not 100% complete. Phase 57 makes the gap explicit and prevents false release claims. Curriculum remains RED until authorized-guide alignment, educator approval, verified generator families, independent mathematical sampling and 2,000 distinct valid variants pass for every approved skill.

## Next risk-first work

1. Add an operator-only curriculum review queue with source-by-source alignment and educator sign-off.
2. Reconcile candidate skills against the authorized current MYP guide and both applicable DP cohort versions.
3. Build one golden, fully verified generator family through symbolic/numeric/unit/equivalence/duplicate tests.
4. Prove 2,000 distinct valid seeds for that skill, then repeat by prerequisite order.
5. Keep every unreleased pathway and skill fail-closed throughout expansion.

## Remaining connector/owner switches

- An authorized IB subject guide source available to the school must be supplied through an approved private source such as connected Google Drive; public subject briefs are not exhaustive enough to certify every subskill.
- Supabase Auth leaked-password protection remains a dashboard switch: `https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection`.
- Authenticated browser fixtures still require stable disposable student, teacher and parent test accounts without storing passwords in GitHub.
