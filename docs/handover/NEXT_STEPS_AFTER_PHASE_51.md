# Next Steps After Phase 51

## Verify
1. Open `/api/health` and confirm `phase-51-assignment-lifecycle-command-centre`.
2. Open `/assignment-lifecycle` as a teacher.
3. Confirm the command-centre hero, KPI cards, lifecycle runway, priority queue, filters, and assignment command cards render correctly.
4. Confirm assignment links still route to recommendations, generated assignments, audit, submissions, and corrections.
5. Run the Supabase verification SQL.

## Suggested Phase 52
Upgrade the assignment creation/generation experience:
- `/assignment-recommendations`
- `/generated-assignments`
- `/assignment-audit`

Goal: create a trustworthy AI assignment factory where teachers can see why the system recommends work, generate assignments safely, audit quality, and publish only after verification.

## Do not
- Do not let AI-generated work bypass audit.
- Do not hide unresolved quality flags.
- Do not remove memorandum control.
- Do not weaken teacher-only access.

