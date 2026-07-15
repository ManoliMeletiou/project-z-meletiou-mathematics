-- Project Z Phase 58e fail-closed rollback.
--
-- Preserve every teaching/practice/correction/mastery/reward/unlock event for
-- audit and account export. Quarantine release configuration, pause active
-- missions and revoke all Phase 58e learner entry points. The collided legacy
-- practice functions stay revoked.

update private.project_z_learning_slice_configs
set release_state = 'quarantined',
    updated_at = now()
where release_state <> 'quarantined';

update public.project_z_first_learning_missions
set status = 'paused',
    updated_at = now()
where status not in ('mastered', 'quarantined', 'paused');

revoke all on function public.project_z_my_first_learning_mission()
from public, anon, authenticated, service_role;
revoke all on function public.project_z_start_first_learning_mission()
from public, anon, authenticated, service_role;
revoke all on function public.project_z_next_first_mission_teaching_step(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_submit_first_mission_teaching_check(uuid, text, text, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_next_first_mission_practice(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_submit_first_mission_practice(uuid, uuid, text, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_submit_first_mission_correction(uuid, uuid, text, text, uuid)
from public, anon, authenticated, service_role;

revoke all on function public.project_z_recommended_practice()
from public, anon, authenticated, service_role;
revoke all on function public.project_z_start_practice_skill(text)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_practice_next_question(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.project_z_submit_practice_answer(uuid, uuid, text)
from public, anon, authenticated, service_role;

comment on table private.project_z_learning_slice_configs is
  'Phase 58e rollback applied: all slice serving is quarantined; immutable evidence is retained.';
