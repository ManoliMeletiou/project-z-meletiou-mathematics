-- Project Z Phase 41 Student Quest Integration into Main Dashboard
-- Purpose: marker and server health for deeply integrated quest dashboard.
-- Design rule: the dashboard may show XP/streak/identity, but rewards remain separate from formal assessment.

create or replace function public.project_z_student_dashboard_quest_integration_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-41-student-dashboard-quest-integration',
    'student_dashboard_quest_panel', true,
    'companion_identity_on_dashboard', true,
    'daily_checkin_on_dashboard', true,
    'xp_level_streak_visible', true,
    'achievements_preview', true,
    'quest_studio_linked', true,
    'quest_separate_from_assessment', true,
    'age_12_to_19_premium_design', true,
    'generated_at', now()
  );
$$;

grant execute on function public.project_z_student_dashboard_quest_integration_status() to authenticated;

select
  'Project Z Phase 41 student dashboard quest integration schema applied successfully' as status,
  now() as applied_at;
