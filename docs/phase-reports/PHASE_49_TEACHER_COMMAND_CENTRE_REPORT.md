# Phase 49 — Teacher Analytics Command Centre Redesign

## Status

Phase 49 upgrades the teacher analytics experience into a professional command centre.

Expected health version:

```text
phase-49-teacher-command-centre
```

## Main route upgraded

```text
/teacher-engagement-insights
```

## What this phase adds

- Professional dark navy / teal teacher analytics atmosphere.
- Teacher Command Centre hero panel.
- Class filter preserved from existing data flow.
- Support load and momentum radar cards.
- KPI cards for support, momentum, completion, and correction effort.
- Highest-priority student support queue.
- Signal heatmap for quick class pulse scanning.
- Student signal cards with support priority and momentum meters.
- Navigation to assignment lifecycle, generation, audit, submissions, and corrections.
- Clear assessment boundary message.

## Technical notes

This phase is primarily frontend/design. It uses the existing Supabase RPCs:

- `project_z_teacher_engagement_classes()`
- `project_z_teacher_engagement_summary(uuid)`
- `project_z_teacher_engagement_insights(uuid)`

No new Supabase migration is required for Phase 49.

## Safety rules preserved

- Teacher analytics are support signals, not formal grades.
- XP, streaks, levels, achievements, and companion progress remain motivation signals only.
- No parent-unsafe data is exposed.
- Existing Supabase RLS/RPC permission boundaries are preserved.
- The app is not rewritten; this phase only upgrades the teacher analytics command-centre experience.

