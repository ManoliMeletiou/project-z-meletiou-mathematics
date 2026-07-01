# Project Z / Meletiou Mathematics — Full Handover After Phase 46

## Current Status

Project Z is a live AI-powered mathematics learning platform for students, teachers, and parents.

Production URL:

```text
https://project-z-meletiou-mathematics.vercel.app/
```

Expected current health endpoint:

```text
https://project-z-meletiou-mathematics.vercel.app/api/health
```

Expected current health version:

```text
phase-46-student-cosmic-redesign
```

This document is a handover for any developer, AI coding agent, product designer, or future assistant that needs to understand what has been built and how to continue safely.

---

## Product Vision

Project Z / Meletiou Mathematics is intended to become a complete AI mathematics learning ecosystem for:

- IB MYP mathematics
- IB DP Mathematics AA and AI
- Future GCSE/IGCSE support
- Students
- Teachers
- Parents

The platform should feel premium, intelligent, trustworthy, and user-friendly.

It must not feel like a random worksheet generator. It must feel like a complete learning world.

---

## Roles

### Student

Students should be able to:

- Sign in
- See a clear student dashboard
- Complete generated assignments
- View released memorandums
- Submit corrections
- Ask the AI tutor for help
- Build mastery
- See learning evidence
- Track XP, streaks, levels, and achievements
- Customize a Math Companion / Quest identity
- Understand what to do next

Important boundary:

```text
XP, streaks, levels, achievements, cosmetics, and companion progress are motivation signals only. They are not formal marks, grades, or IB criteria scores.
```

### Teacher

Teachers should be able to:

- See assignment lifecycle status
- See engagement insights
- Generate 30-question assignments
- Audit generated assignments
- Regenerate weak questions
- Publish assignments
- Review student submissions
- Release memorandums
- Review student corrections
- Review tutor learning evidence
- Export reports
- Identify students needing support

### Parent

Parents should be able to:

- See a calm parent dashboard
- Understand their child’s learning habits
- See safe engagement summaries
- See parent-friendly reports
- Understand how to support at home

Parent pages must not show:

- Raw tutor conversations
- Private teacher notes
- Other students’ information
- Teacher-only analytics
- Formal IB marks unless intentionally released
- Sensitive diagnostic details beyond parent-safe summaries

### Guest

Guests should see:

- A premium landing experience
- Clear sign-in route
- Role navigation explanation
- Help page
- Mobile preview
- Design preview

---

## Key Assessment Rules

Use these labels:

```text
MYP Standard
MYP Extended
```

Do not use “Core” as the product’s MYP level label.

The system should support auto-marking for MYP Criteria A, B, C, and D, but the marking style must differ by criterion.

### Criterion A

Criterion A can include:

- Calculation questions
- Multiple choice
- Short answer
- Numerical input
- Algebraic input
- Verified final answers
- Deterministic checking where possible

### Criteria B, C, and D

For B/C/D, the system should use carefully designed structured items, such as:

- Best answer A/B/C/D
- Ranking
- Matching
- Rubric-choice
- Explanation selection
- Error analysis
- Communication-quality selection
- Terminology-quality selection
- Reasoning-quality selection

Important rule:

```text
The correct option must not be obviously different from the distractors.
```

For Criterion C specifically:

```text
The correct option must contain correct mathematical terminology, notation, units, structure, and communication.
```

Long open B/C/D tasks may use AI feedback and suggested marks, but teacher review should remain possible.

---

## Technical Stack

Frontend:

- Next.js 15
- TypeScript
- App Router
- Global CSS design system
- Role-specific pages

Backend:

- Supabase
- PostgreSQL
- RLS policies
- RPC functions
- Supabase Edge Functions

Hosting:

- Vercel

Known question engine environment:

```text
PYTHON_ENGINE_URL=https://jlesueqjdvmxkqaqmnke.supabase.co/functions/v1/project-z-generate-question
```

Known AI generation environment names:

```text
AI_GENERATOR_ENDPOINT
AI_GENERATOR_API_KEY
AI_GENERATOR_MODEL=gpt-4.1-mini
AI_GENERATOR_PROVIDER=OpenAI
```

---

## Known Project Identifiers

GitHub repository:

```text
ManoliMeletiou/project-z-meletiou-mathematics
```

Local expected path:

```text
~/Downloads/project-z-meletiou-mathematics
```

Vercel production URL:

```text
https://project-z-meletiou-mathematics.vercel.app/
```

Vercel project:

```text
project-z-meletiou-mathematics
```

Vercel project ID:

```text
prj_lFXgmOQAiWASZkA0GDFaoWMzg0NH
```

Vercel team ID:

```text
team_WuIzIKDn5QMxme6mQpQtgfOU
```

Supabase project ID:

```text
jlesueqjdvmxkqaqmnke
```

Supabase URL:

```text
https://jlesueqjdvmxkqaqmnke.supabase.co
```

---

## Completed Phase Summary

### Phase 22 — AI Usage Dashboard

Route:

```text
/ai-usage
```

Health version:

```text
phase-22-ai-usage-dashboard
```

### Phase 23 — Student AI Tutor Safety and Learning Memory

Route:

```text
/tutor
```

Health version:

```text
phase-23c-student-ai-tutor-safety-memory-nav-fix
```

### Phase 24 — Tutor Evidence to Mastery

Route:

```text
/tutor-evidence
```

Health version:

```text
phase-24-tutor-evidence-to-mastery
```

### Phase 25 — Teacher Review of Tutor Evidence

Route:

```text
/teacher-tutor-evidence
```

Health version:

```text
phase-25-teacher-review-tutor-evidence
```

### Phase 26 — Parent Learning Report Upgrade

Route:

```text
/parent-learning-report
```

Health version:

```text
phase-26-parent-learning-report-upgrade
```

### Phase 27 — Exportable Parent and Teacher PDF Reports

Route:

```text
/export-reports
```

Health version:

```text
phase-27-exportable-pdf-reports
```

### Phase 28 — Smart Assignment Recommendations

Route:

```text
/assignment-recommendations
```

Health version:

```text
phase-28-smart-assignment-recommendations
```

### Phase 29 — One-click 30-question Assignment Creation

Route:

```text
/generated-assignments
```

Health version:

```text
phase-29-one-click-30-question-assignments
```

### Phase 30 — Assignment Quality Audit and Regeneration

Route:

```text
/assignment-audit
```

Health version:

```text
phase-30-assignment-quality-audit-regeneration
```

### Phase 31 — Publish Generated Assignments to Students

Route:

```text
/student-generated-assignments
```

Health version:

```text
phase-31-publish-generated-assignments
```

### Phase 32 — Teacher Review, Feedback, and Memorandum Release

Routes:

```text
/teacher-submission-review
/student-memorandum
```

Health version:

```text
phase-32-review-feedback-memorandum
```

### Phase 33 — Student Corrections and Retry After Memorandum

Routes:

```text
/student-corrections
/teacher-corrections-review
```

Health version:

```text
phase-33-student-corrections-retry
```

### Phase 34 — Teacher Assignment Lifecycle Dashboard

Route:

```text
/assignment-lifecycle
```

Health version:

```text
phase-34-assignment-lifecycle-dashboard
```

### Phase 35 — Student Dashboard

Route:

```text
/student-dashboard
```

Health version:

```text
phase-35-student-dashboard-design
```

### Phase 36 — Parent Dashboard

Route:

```text
/parent-dashboard
```

Health version:

```text
phase-36-parent-dashboard-design
```

### Phase 37 — Navigation and UX Polish

Routes:

```text
/home
/help
```

Health version:

```text
phase-37-navigation-ux-polish
```

### Phase 38 — Mobile Responsiveness and Visual Polish

Route:

```text
/mobile-preview
```

Health version:

```text
phase-38-mobile-visual-polish
```

### Phase 39 — Student Quest Gamification System

Route:

```text
/student-quest
```

Health version:

```text
phase-39-student-quest-gamification
```

### Phase 40 — Quest Design Upgrade and Student Visual Identity

Route:

```text
/quest-studio
```

Health version:

```text
phase-40-quest-design-identity
```

### Phase 41 — Student Quest Integration into Main Dashboard

Route:

```text
/student-dashboard
```

Health version:

```text
phase-41-student-dashboard-quest-integration
```

### Phase 42 — Teacher Engagement Insights

Route:

```text
/teacher-engagement-insights
```

Health version:

```text
phase-42-teacher-engagement-insights
```

### Phase 43 — Parent Engagement View

Route:

```text
/parent-engagement-view
```

Health version:

```text
phase-43-parent-engagement-view
```

### Phase 44 — Full Role-Based Navigation Polish

Routes:

```text
/role-navigation
/home
```

Health version:

```text
phase-44-role-navigation-polish
```

### Phase 45 — Visual Design System and Creative Backgrounds

Route:

```text
/design-preview
```

Added:

```text
frontend/app/project-z-theme.css
frontend/lib/projectZDesignSystem.ts
```

Health version:

```text
phase-45-visual-design-system
```

### Phase 46 — Student Cosmic Quest Dashboard Redesign

Routes:

```text
/student-dashboard
/student-quest
/quest-studio
```

Added:

- Cosmic student command centre
- Companion command panel
- XP / streak / level cards
- Visual quest path
- Mission board
- Achievement wall
- Cosmic identity lab
- Studio cosmetic cards
- Assessment boundary warnings

Health version:

```text
phase-46-student-cosmic-redesign
```

---

## Current Important Routes

Shared / Guest:

```text
/
/home
/role-navigation
/design-preview
/help
/mobile-preview
/auth
/account
```

Student:

```text
/student
/student-dashboard
/student-quest
/quest-studio
/student-generated-assignments
/student-memorandum
/student-corrections
/tutor
/tutor-evidence
/diagnostic
/recommended
/path
```

Teacher:

```text
/teacher
/assignment-lifecycle
/teacher-engagement-insights
/assignment-recommendations
/generated-assignments
/assignment-audit
/teacher-submission-review
/teacher-corrections-review
/teacher-tutor-evidence
/export-reports
/reports
/quality
/generate
/ai-test
/ai-usage
/curriculum
/classes
/assignments
```

Parent:

```text
/parent
/parent-dashboard
/parent-engagement-view
/parent-learning-report
/export-reports
```

API:

```text
/api/health
/api/question
/api/generate-quality-question
/api/generation-status
/api/generation-self-test
/api/tutor
/api/create-assignment-from-recommendation
/api/regenerate-assignment-question
```

---

## Visual Design Direction

Phase 45 created the global visual foundation.

Phase 46 applied it deeply to student pages.

Student theme:

```text
Cosmic, adventurous, motivating, game-like, premium, but still academically focused.
```

Teacher theme:

```text
Professional analytics command centre.
```

Parent theme:

```text
Warm, calm, trustworthy, supportive.
```

Guest theme:

```text
Premium futuristic landing experience.
```

---

## Security and Privacy Principles

Never treat frontend navigation as security.

Security must remain in:

- Supabase RLS
- Server-side RPC permissions
- Role-checking functions
- User identity checks
- Parent-safe filtering
- Teacher-only analytics restrictions

Critical privacy rule:

```text
Parents must not see raw tutor chats, private teacher notes, or other students’ data.
```

Critical assessment rule:

```text
Motivation signals must not be presented as formal grades.
```

---

## Recommended Next Phases

### Phase 47 — Teacher Analytics Command Centre Redesign

Main pages:

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

Design goals:

- Premium teacher dashboard
- Analytics command centre
- Heatmaps
- Risk/support signals
- Quick action queues
- Assignment lifecycle flow
- Professional dark navy/teal atmosphere

### Phase 48 — Parent Calm Learning Dashboard Redesign

Main pages:

```text
/parent-dashboard
/parent-engagement-view
/parent-learning-report
/export-reports
```

### Phase 49 — Guest Landing and Login Experience Redesign

Main pages:

```text
/
/home
/role-navigation
/auth
/help
```

### Phase 50 — End-to-End Real User Testing Checklist

Test as:

- Student
- Teacher
- Parent
- Guest

---

## Safe Continuation Instructions

When continuing this project:

1. Do not rewrite the whole app.
2. Work in phases.
3. Create a script that updates files, runs the build, commits, pushes, and copies SQL to clipboard.
4. Keep every phase small enough to verify.
5. After push, verify `/api/health` and the new/changed route.
6. Never run Supabase SQL automatically unless the user explicitly does it.
7. Tell the user exactly what to paste into Terminal and Supabase SQL Editor.
8. Do not weaken RLS.
9. Do not treat XP/streaks as grades.
10. Do not expose parent-unsafe data.
11. Use MYP Standard and MYP Extended, not Core.
12. Keep the visual design premium, creative, and user-friendly.
13. Keep assessment accuracy more important than decoration.
14. Preserve existing data flows and RPCs unless a phase explicitly changes them.

---

## Current Health Check Expected

```json
{
  "ok": true,
  "app": "Project Z",
  "version": "phase-46-student-cosmic-redesign"
}
```

Important student routes should return `200 OK`:

```text
/student-dashboard
/student-quest
/quest-studio
```
