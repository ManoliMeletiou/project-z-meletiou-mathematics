# AI Agent Continuation Prompt — Project Z Phase 49

You are continuing Project Z / Meletiou Mathematics after Phase 49.

The current expected health version is:

```text
phase-49-teacher-command-centre
```

## What Phase 49 completed

Phase 49 redesigned `/teacher-engagement-insights` into a professional teacher analytics command centre.

The teacher command centre now includes:

- professional navy / teal command-centre atmosphere;
- class filtering;
- support load and momentum signals;
- highest-priority student support queue;
- class signal heatmap;
- student signal cards;
- completion, accuracy, correction, XP, streak, level, and achievement signals;
- explicit assessment boundary text.

## Critical rules

Do not weaken any security boundary.
Do not treat frontend navigation as security.
Do not expose parent-unsafe data.
Do not treat XP, streaks, levels, achievements, cosmetics, or companion progress as marks or grades.
Use MYP Standard and MYP Extended, not Core.
Accuracy and assessment integrity are more important than decoration.

## Existing teacher data flow

Keep using the existing teacher engagement RPCs:

- `project_z_teacher_engagement_classes()`
- `project_z_teacher_engagement_summary(uuid)`
- `project_z_teacher_engagement_insights(uuid)`

Do not replace those RPCs unless a later phase explicitly requires a data model upgrade.

## Recommended next phase

Phase 50 should continue the teacher-side redesign across related teacher workflows:

- `/assignment-lifecycle`
- `/assignment-recommendations`
- `/generated-assignments`
- `/assignment-audit`
- `/teacher-submission-review`
- `/teacher-corrections-review`
- `/teacher-tutor-evidence`
- `/export-reports`

The goal is one coherent Teacher Operations Suite.

