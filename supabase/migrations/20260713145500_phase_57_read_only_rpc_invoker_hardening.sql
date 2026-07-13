-- Phase 57a: the curriculum evidence RPCs are read-only and can safely execute
-- with the signed-in caller's RLS context. Keep only the two ownership-changing
-- course-selection RPCs as SECURITY DEFINER.

alter function public.project_z_curriculum_pathways() security invoker;
alter function public.project_z_atlas_skill_coverage(text) security invoker;
alter function public.project_z_course_release_ready(text) security invoker;

revoke execute on function public.project_z_curriculum_pathways() from public, anon;
revoke execute on function public.project_z_atlas_skill_coverage(text) from public, anon;
revoke execute on function public.project_z_course_release_ready(text) from public, anon;
grant execute on function public.project_z_curriculum_pathways() to authenticated, service_role;
grant execute on function public.project_z_atlas_skill_coverage(text) to authenticated, service_role;
grant execute on function public.project_z_course_release_ready(text) to authenticated, service_role;
