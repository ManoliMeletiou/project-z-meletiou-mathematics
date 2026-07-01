# AI Agent Continuation Prompt — Project Z After Phase 46

You are continuing Project Z / Meletiou Mathematics.

Current verified production milestone:

```text
Phase 46 — Student Cosmic Quest Dashboard Redesign
```

Expected health version:

```text
phase-46-student-cosmic-redesign
```

Production URL:

```text
https://project-z-meletiou-mathematics.vercel.app/
```

GitHub repo:

```text
ManoliMeletiou/project-z-meletiou-mathematics
```

Local user path:

```text
~/Downloads/project-z-meletiou-mathematics
```

Supabase project ID:

```text
jlesueqjdvmxkqaqmnke
```

The platform already includes:

- AI question generation
- Teacher assignment recommendations
- 30-question generated assignments
- Assignment quality audit and regeneration
- Student assignment completion
- Teacher submission review
- Memorandum release
- Student corrections
- Teacher correction review
- Tutor memory and learning evidence
- Parent-safe learning reports
- Teacher engagement insights
- Student Quest gamification
- Quest Studio identity customization
- Role-based navigation
- Global visual design system
- Student cosmic dashboard redesign

Important product rules:

1. Use MYP Standard and MYP Extended.
2. Do not use “Core” for MYP levels.
3. The system should support auto-marking for Criteria A, B, C, and D.
4. Criterion A can use normal answer checking.
5. Criteria B, C, and D should use structured, plausible best-answer/ranking/matching/error-analysis/rubric-choice tasks.
6. Correct options must not be obviously different.
7. Criterion C correct options must contain correct terminology, notation, units, structure, and communication.
8. XP, streaks, levels, achievements, companion status, and cosmetics are motivation signals only.
9. Parents must not see raw tutor chats, private teacher notes, or other students’ data.
10. Navigation is not security. Security must stay in Supabase RLS and role-checking RPCs.

Current next recommended phase:

```text
Phase 47 — Teacher Analytics Command Centre Redesign
```

Primary teacher routes:

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

Design direction:

```text
Professional analytics command centre.
Dark navy and teal.
Glass data cards.
Heatmaps.
Support signal panels.
Assignment lifecycle pipeline.
Review queues.
Quick action cards.
```

Development process:

1. Do not rewrite the whole app.
2. Work phase by phase.
3. Preserve existing Supabase RPCs and data flows unless intentionally changing them.
4. Run the frontend build.
5. Commit and push.
6. Provide Supabase SQL separately for the user to run.
7. Verify `/api/health` and changed routes on Vercel.
8. Update health version for each phase.
9. Add or update handover docs after major milestones.

Never weaken RLS.
Never present motivation signals as grades.
Never expose parent-unsafe data.
