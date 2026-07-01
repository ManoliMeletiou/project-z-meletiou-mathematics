# Next Steps After Phase 46

## Immediate Recommendation

Proceed with:

```text
Phase 47 — Teacher Analytics Command Centre Redesign
```

## Why Phase 47 Comes Next

The student side now has a premium cosmic experience. The teacher side is functionally strong, but should receive the same visual quality and usability upgrade.

## Phase 47 Target Pages

```text
/teacher-engagement-insights
/assignment-lifecycle
/assignment-recommendations
/generated-assignments
/assignment-audit
/teacher-submission-review
/teacher-corrections-review
/teacher-tutor-evidence
/export-reports
```

## Phase 47 Design Direction

```text
Professional analytics command centre
Dark navy and teal
Glass data cards
Support signal panels
Heatmaps
Assignment lifecycle pipeline
Review queues
Quick actions
```

## Must Preserve

- Existing Supabase data flows
- Existing RLS
- Existing teacher-only boundaries
- Existing assignment logic
- Existing audit/regeneration logic
- Existing submission review logic
- Existing correction review logic
- Existing tutor evidence review logic

## Must Not Do

- Do not treat gamification as formal assessment
- Do not expose student private data incorrectly
- Do not remove teacher review steps
- Do not weaken security
- Do not rewrite the full app
- Do not break existing routes

## Suggested Verification

```text
/api/health
/teacher-engagement-insights
/assignment-lifecycle
/assignment-recommendations
/generated-assignments
/assignment-audit
```

Expected health version after completion:

```text
phase-47-teacher-command-centre-redesign
```
