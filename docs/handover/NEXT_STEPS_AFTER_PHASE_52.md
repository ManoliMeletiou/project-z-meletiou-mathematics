# Next Steps After Phase 52

## Finish the Phase 52 release

1. Install/authenticate GitHub CLI in the publishing environment.
2. Publish the prepared Phase 52 branch and open a draft PR.
3. Wait for the frontend and Python CI jobs.
4. Run signed-in smoke tests for student, teacher, and parent RPC flows.
5. Merge after review and confirm the Vercel deployment.
6. Confirm `/api/health` reports `phase-52-security-release-foundation`.
7. Recheck Vercel runtime errors and Supabase advisors.

## Then begin Phase 53

Build the Assignment Factory Command Centre across:

- `/assignment-recommendations`
- `/generated-assignments`
- `/assignment-audit`

Keep generation evidence visible, block publication on unresolved audit flags, preserve teacher control, and make every failure/retry state explicit.
