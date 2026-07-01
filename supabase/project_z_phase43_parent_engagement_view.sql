-- Project Z Phase 43 Parent Engagement View
-- Purpose: parent-safe summary of motivation, learning habits, quest progress, corrections, and assignments.
-- Parent boundary: no raw tutor chats, no teacher-only notes, no private analytics, no formal grading from XP/streaks.

create or replace function public.project_z_parent_engagement_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'phase', 'phase-43-parent-engagement-view',
    'parent_engagement_page', true,
    'parent_safe_quest_summary', true,
    'learning_habits_visible', true,
    'assignment_follow_through_visible', true,
    'correction_effort_visible', true,
    'xp_streak_level_as_motivation_only', true,
    'no_raw_tutor_chats', true,
    'no_teacher_private_notes', true,
    'generated_at', now()
  );
$$;

create or replace function public.project_z_parent_engagement_children()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_children jsonb := '[]'::jsonb;
begin
  if not exists (
    select 1
    from public.project_z_profiles p
    where p.id = auth.uid()
      and p.role = 'parent'
  ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'Parent account required.',
      'children', '[]'::jsonb
    );
  end if;

  begin
    execute $dynamic$
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'student_id', coalesce((to_jsonb(child)->>'student_id')::text, to_jsonb(child)->>'id'),
            'student_email', coalesce(to_jsonb(child)->>'student_email', to_jsonb(child)->>'email', 'student'),
            'display_name', coalesce(to_jsonb(child)->>'display_name', to_jsonb(child)->>'student_email', to_jsonb(child)->>'email', 'Student')
          )
        ),
        '[]'::jsonb
      )
      from public.project_z_parent_learning_children() child
    $dynamic$
    into v_children;
  exception
    when others then
      v_children := '[]'::jsonb;
  end;

  return jsonb_build_object(
    'ok', true,
    'children', v_children
  );
end;
$$;

create or replace function public.project_z_parent_engagement_overview(
  p_student_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_children jsonb := '[]'::jsonb;
  v_student_id uuid;
  v_student_email text := 'student';
  v_allowed boolean := false;
  v_game record;
  v_assignments_to_do integer := 0;
  v_submitted_responses integer := 0;
  v_total_questions integer := 0;
  v_corrections_needed integer := 0;
  v_corrections_submitted integer := 0;
  v_corrections_accepted integer := 0;
  v_achievements_unlocked integer := 0;
  v_completion_percent numeric := 0;
  v_correction_effort_percent numeric := 100;
  v_learning_habit_status text := 'No activity yet';
  v_parent_next_step text := 'Encourage your child to open Project Z and complete one small learning task.';
begin
  if not exists (
    select 1
    from public.project_z_profiles p
    where p.id = auth.uid()
      and p.role = 'parent'
  ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'Parent account required.'
    );
  end if;

  begin
    execute $dynamic$
      select coalesce(jsonb_agg(to_jsonb(child)), '[]'::jsonb)
      from public.project_z_parent_learning_children() child
    $dynamic$
    into v_children;
  exception
    when others then
      v_children := '[]'::jsonb;
  end;

  if p_student_id is not null then
    v_student_id := p_student_id;
  else
    select coalesce(
      (item->>'student_id')::uuid,
      (item->>'id')::uuid
    )
    into v_student_id
    from jsonb_array_elements(v_children) item
    where (item ? 'student_id' and nullif(item->>'student_id', '') is not null)
       or (item ? 'id' and nullif(item->>'id', '') is not null)
    limit 1;
  end if;

  if v_student_id is null then
    return jsonb_build_object(
      'ok', true,
      'has_child', false,
      'children', '[]'::jsonb,
      'message', 'No linked children were found for this parent account.'
    );
  end if;

  begin
    execute 'select public.project_z_parent_child_report_access_allowed(auth.uid(), $1)'
    using v_student_id
    into v_allowed;
  exception
    when others then
      v_allowed := exists (
        select 1
        from jsonb_array_elements(v_children) item
        where coalesce(nullif(item->>'student_id', ''), nullif(item->>'id', '')) = v_student_id::text
      );
  end;

  if v_allowed is not true then
    return jsonb_build_object(
      'ok', false,
      'reason', 'This parent account is not allowed to view that child.'
    );
  end if;

  select coalesce(p.email, 'student')
  into v_student_email
  from public.project_z_profiles p
  where p.id = v_student_id;

  select *
  into v_game
  from public.project_z_student_game_profiles g
  where g.student_id = v_student_id;

  select count(distinct a.id)::integer
  into v_assignments_to_do
  from public.project_z_generated_assignments a
  join public.project_z_class_members cm
    on cm.class_id = a.class_id
   and cm.student_id = v_student_id
  where a.status = 'assigned';

  select
    count(r.id) filter (where r.is_submitted = true)::integer,
    count(r.id) filter (where r.is_correct = false or r.teacher_review_status = 'needs_revision')::integer
  into
    v_submitted_responses,
    v_corrections_needed
  from public.project_z_generated_assignment_student_responses r
  where r.student_id = v_student_id;

  select count(q.id)::integer
  into v_total_questions
  from public.project_z_generated_assignment_questions q
  join public.project_z_generated_assignments a
    on a.id = q.assignment_id
  join public.project_z_class_members cm
    on cm.class_id = a.class_id
   and cm.student_id = v_student_id
  where a.status = 'assigned';

  select
    count(c.id) filter (where c.status in ('submitted', 'reviewed', 'accepted', 'needs_more_work'))::integer,
    count(c.id) filter (where c.status = 'accepted')::integer
  into
    v_corrections_submitted,
    v_corrections_accepted
  from public.project_z_generated_assignment_corrections c
  where c.student_id = v_student_id;

  select count(u.id)::integer
  into v_achievements_unlocked
  from public.project_z_student_achievement_unlocks u
  where u.student_id = v_student_id;

  if coalesce(v_total_questions, 0) > 0 then
    v_completion_percent := round((coalesce(v_submitted_responses, 0)::numeric / v_total_questions::numeric) * 100, 1);
  end if;

  if coalesce(v_corrections_needed, 0) > 0 then
    v_correction_effort_percent := round((coalesce(v_corrections_submitted, 0)::numeric / v_corrections_needed::numeric) * 100, 1);
  end if;

  v_learning_habit_status :=
    case
      when coalesce(v_submitted_responses, 0) = 0 and coalesce(v_game.total_xp, 0) = 0 then 'Getting started'
      when coalesce(v_corrections_needed, 0) > coalesce(v_corrections_submitted, 0) then 'Feedback to use'
      when coalesce(v_game.current_streak, 0) >= 3 and coalesce(v_game.level, 1) >= 3 then 'Building momentum'
      when coalesce(v_submitted_responses, 0) > 0 or coalesce(v_game.total_xp, 0) > 0 then 'Active learner'
      else 'Monitor gently'
    end;

  v_parent_next_step :=
    case
      when coalesce(v_submitted_responses, 0) = 0 and coalesce(v_game.total_xp, 0) = 0 then
        'Help your child start with one short task. Keep it small and positive.'
      when coalesce(v_corrections_needed, 0) > coalesce(v_corrections_submitted, 0) then
        'Ask your child what feedback they received and encourage one correction attempt.'
      when coalesce(v_game.current_streak, 0) >= 3 and coalesce(v_game.level, 1) >= 3 then
        'Celebrate consistency. Ask your child to explain one idea they improved this week.'
      when coalesce(v_submitted_responses, 0) > 0 or coalesce(v_game.total_xp, 0) > 0 then
        'Encourage steady practice and a calm routine. Praise effort and correction work.'
      else
        'Check in gently and encourage your child to open their dashboard.'
    end;

  return jsonb_build_object(
    'ok', true,
    'has_child', true,
    'children', v_children,
    'student', jsonb_build_object(
      'student_id', v_student_id,
      'student_email', v_student_email
    ),
    'quest', jsonb_build_object(
      'total_xp', coalesce(v_game.total_xp, 0),
      'level', coalesce(v_game.level, 1),
      'current_streak', coalesce(v_game.current_streak, 0),
      'longest_streak', coalesce(v_game.longest_streak, 0),
      'last_checkin_date', v_game.last_checkin_date,
      'checked_in_today', coalesce(v_game.last_checkin_date = current_date, false),
      'companion_stage', coalesce(v_game.companion_stage, 1),
      'selected_companion', coalesce(v_game.selected_companion, 'nova'),
      'achievements_unlocked', coalesce(v_achievements_unlocked, 0)
    ),
    'learning_habits', jsonb_build_object(
      'status', v_learning_habit_status,
      'assignments_to_do', coalesce(v_assignments_to_do, 0),
      'submitted_responses', coalesce(v_submitted_responses, 0),
      'total_questions', coalesce(v_total_questions, 0),
      'completion_percent', v_completion_percent,
      'corrections_needed', coalesce(v_corrections_needed, 0),
      'corrections_submitted', coalesce(v_corrections_submitted, 0),
      'corrections_accepted', coalesce(v_corrections_accepted, 0),
      'correction_effort_percent', v_correction_effort_percent
    ),
    'parent_guidance', jsonb_build_object(
      'next_step', v_parent_next_step,
      'what_to_ask', 'Ask: What is one mistake you corrected or one idea you understand better now?',
      'what_to_avoid', 'Avoid treating XP, streaks, or levels as grades. They are motivation signals only.',
      'boundary', 'This view does not show raw tutor chats, private teacher notes, or formal grading.'
    )
  );
end;
$$;

grant execute on function public.project_z_parent_engagement_status() to authenticated;
grant execute on function public.project_z_parent_engagement_children() to authenticated;
grant execute on function public.project_z_parent_engagement_overview(uuid) to authenticated;

select
  'Project Z Phase 43 parent engagement view schema applied successfully' as status,
  now() as applied_at;
