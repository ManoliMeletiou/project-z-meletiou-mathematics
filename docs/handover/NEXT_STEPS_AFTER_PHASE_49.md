# Next Steps After Phase 49

## Immediate verification

Check these routes after deployment:

```text
/api/health
/teacher-engagement-insights
/assignment-lifecycle
/generated-assignments
/assignment-audit
/teacher-submission-review
/teacher-corrections-review
```

## Expected health version

```text
phase-49-teacher-command-centre
```

## Supabase check

Phase 49 does not require a new Supabase migration. Verify that the existing teacher engagement RPCs still exist:

- `project_z_teacher_engagement_classes()`
- `project_z_teacher_engagement_summary(uuid)`
- `project_z_teacher_engagement_insights(uuid)`

## Recommended Phase 50

Build the Teacher Operations Suite by redesigning the wider teacher workflow pages around the same command-centre visual language.

Suggested focus:

1. Assignment Lifecycle Command Flow.
2. Generated Assignment Operations page.
3. Assignment Audit / Quality Control page.
4. Submission Review Queue.
5. Corrections Review Queue.
6. Tutor Evidence Review.
7. Export Reports Centre.

Do not rewrite the app. Continue phase by phase.

