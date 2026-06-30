-- Project Z Phase 5 Teacher Roster and Class Analytics
-- Safe to run more than once after Phase 4.

create or replace function public.project_z_teacher_class_roster(
  p_class_id uuid
)
returns table (
  student_id uuid,
  email text,
  display_name text,
  joined_at timestamptz,
  attempts bigint,
  correct bigint,
  average_mastery numeric
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as student_id,
    p.email,
    coalesce(p.display_name, split_part(p.email, '@', 1)) as display_name,
    cm.created_at as joined_at,
    coalesce(sum(sm.attempts), 0)::bigint as attempts,
    coalesce(sum(sm.correct), 0)::bigint as correct,
    coalesce(round(avg(sm.mastery_score), 2), 0) as average_mastery
  from public.project_z_classes c
  join public.project_z_class_members cm
    on cm.class_id = c.id
   and cm.status = 'active'
  join public.project_z_profiles p
    on p.id = cm.student_id
  left join public.project_z_skill_mastery sm
    on sm.user_id = p.id
  where c.id = p_class_id
    and c.teacher_id = auth.uid()
  group by p.id, p.email, p.display_name, cm.created_at
  order by p.display_name nulls last, p.email;
$$;

create or replace function public.project_z_teacher_class_mastery(
  p_class_id uuid
)
returns table (
  skill_id text,
  total_attempts bigint,
  total_correct bigint,
  average_mastery numeric
)
language sql
security definer
set search_path = public
as $$
  select
    sm.skill_id,
    coalesce(sum(sm.attempts), 0)::bigint as total_attempts,
    coalesce(sum(sm.correct), 0)::bigint as total_correct,
    coalesce(round(avg(sm.mastery_score), 2), 0) as average_mastery
  from public.project_z_classes c
  join public.project_z_class_members cm
    on cm.class_id = c.id
   and cm.status = 'active'
  join public.project_z_skill_mastery sm
    on sm.user_id = cm.student_id
  where c.id = p_class_id
    and c.teacher_id = auth.uid()
  group by sm.skill_id
  order by average_mastery asc, total_attempts desc;
$$;

grant execute on function public.project_z_teacher_class_roster(uuid) to authenticated;
grant execute on function public.project_z_teacher_class_mastery(uuid) to authenticated;

select
  'Project Z Phase 5 teacher roster and analytics schema applied successfully' as status,
  now() as applied_at;
