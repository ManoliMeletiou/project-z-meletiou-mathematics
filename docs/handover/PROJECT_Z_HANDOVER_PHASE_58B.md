# Project Z Handover — Phase 58b Golden Generator Foundation

## Authoritative targets

- GitHub: `ManoliMeletiou/project-z-meletiou-mathematics`
- Vercel: `project-z-meletiou-mathematics.vercel.app`
- Supabase: `jlesueqjdvmxkqaqmnke`

The Meletiou Mathematics system remains read-only reference. Phase 58b changes Project Z only.

## Outcome

Phase 58b creates Project Z's first reproducible high-depth generator candidate for `number.place-value.round-order`. It covers five different mathematical purposes rather than superficial number swaps:

1. identify digit value by place;
2. round integers to tens, hundreds and thousands;
3. round fixed-point decimals to tenths and hundredths;
4. order decimals;
5. compare signed decimals.

Every output includes a canonical answer, worked teaching solution, two staged hints, misconception tags, difficulty, calculator boundary and complete parameters for independent recalculation.

## Applied migration

```text
supabase/migrations/20260713160000_phase_58b_golden_generator_foundation.sql
```

## Reproducible evidence

```text
Generator version:         place-value-v1.0.0
Families:                  5
Sample per family:         500
Tested variants:           2,500
Distinct variants:         2,500
Duplicate variants:        0
Independent answer checks: 2,500
Digest: cfc6b83b2e6eee891fbe5110d5cadf16ffbf9ce232432f743cc0733ca4246b2f
```

The repository command `npm run verify:generator` reproduces this evidence. The digest test makes accidental prompt/answer drift explicit.

## Database boundary

- family and verification evidence are stored in the `private` schema;
- direct `anon` and `authenticated` reads are denied;
- automated status is `passed` for five families;
- human mathematics review status is `pending` for all five;
- release state is `blocked` for all five;
- a database constraint prevents release without automated pass, human approval, reviewer identity/time and zero duplicates;
- no question-bank row, curriculum approval or pathway release is created.

## Verification

- 46 Node contract/property tests passed;
- generator verifier passed 2,500 exact fixed-point samples;
- TypeScript passed;
- Supabase migration applied successfully;
- post-apply probe returned 5 automated passes, 0 human approvals, 0 released families and 0 released pathways;
- Supabase security-advisor count remained 213; no new security warning;
- two new informational unused-index notices are expected on the new review-pending private tables.

## Honest state

Project Z is not 100% complete. This proves the pattern for one candidate skill only. It does not certify IB placement, educator quality, accessibility, age appropriateness across contexts, or any other skill. The first generator remains unavailable to learners.

## Next risk-first work

1. Provide the authorized guide through an approved private connector.
2. Register a verified curriculum mapper and a different verified mathematics educator.
3. Review the `number.place-value.round-order` placement and all five generator families.
4. After approval, add controlled serving and student-response equivalence tests.
5. Repeat the verified pattern in prerequisite order for every approved MYP and DP skill.

## Remaining owner/connector switches

- Authorized IB guide access through a private source such as connected Google Drive.
- Two real qualified reviewers with stable verified teacher accounts.
- Supabase Auth leaked-password protection dashboard setting.
- Disposable role accounts for authenticated browser E2E fixtures.
