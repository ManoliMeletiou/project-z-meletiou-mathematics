-- Phase 58d follow-up: cover every foreign key introduced by the diagnostic
-- prologue migration. This keeps the production missing-FK-index count at its
-- pre-phase baseline while retaining the fail-closed evidence model.

create index if not exists project_z_diagnostic_config_reviewer_idx
on private.project_z_diagnostic_pathway_configs(reviewed_by)
where reviewed_by is not null;

create index if not exists project_z_prologue_profile_course_idx
on public.project_z_student_prologue_profiles(course_code);

create index if not exists project_z_diagnostic_session_first_mission_idx
on public.project_z_diagnostic_sessions(first_mission_skill_code)
where first_mission_skill_code is not null;

create index if not exists project_z_diagnostic_question_human_reviewer_idx
on public.project_z_diagnostic_question_bank(human_mathematics_reviewed_by)
where human_mathematics_reviewed_by is not null;

create index if not exists project_z_diagnostic_delivery_question_idx
on public.project_z_diagnostic_item_deliveries(question_id);

create index if not exists project_z_diagnostic_delivery_skill_idx
on public.project_z_diagnostic_item_deliveries(course_skill_code);
