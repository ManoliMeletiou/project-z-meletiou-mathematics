-- Phase 58d fail-closed rollback.
--
-- This rollback intentionally preserves prologue, delivery, evidence and review
-- rows. Restoring the pre-58d browser-only/answer-leaking/gameplay grants would
-- recreate the defect, so rollback disables the phase surfaces and requires a
-- corrected forward migration before any re-release.

begin;

update private.project_z_diagnostic_pathway_configs
set calibration_status = 'quarantined',
    updated_at = now();

update public.project_z_diagnostic_sessions
set status = 'paused',
    pause_reason = 'Phase 58d fail-closed rollback',
    paused_at = now(),
    updated_at = now()
where status = 'active';

update public.project_z_diagnostic_item_deliveries
set status = 'expired'
where status = 'served';

revoke all on function public.project_z_prepare_diagnostic_prologue(
  text, text, text, numeric, boolean, boolean, boolean, text, boolean
) from public, anon, authenticated;
revoke all on function public.project_z_my_game_entry_state()
from public, anon, authenticated;
revoke all on function public.project_z_start_diagnostic(text)
from public, anon, authenticated;
revoke all on function public.project_z_set_diagnostic_session_state(uuid, text)
from public, anon, authenticated;
revoke all on function public.project_z_diagnostic_next_question(uuid)
from public, anon, authenticated;
revoke all on function public.project_z_submit_diagnostic_answer(uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.project_z_my_diagnostic_summary()
from public, anon, authenticated;

commit;
