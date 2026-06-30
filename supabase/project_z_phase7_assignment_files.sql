-- Project Z Phase 7 Assignment Documents and Student Return Files
-- Safe to run more than once after Phase 6.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-z-assignment-files', 'project-z-assignment-files', false, 52428800)
on conflict (id) do update
set public = false,
    file_size_limit = 52428800;

create table if not exists public.project_z_assignment_files (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.project_z_assignments(id) on delete cascade,
  uploader_id uuid not null references public.project_z_profiles(id) on delete cascade,
  kind text not null check (kind in ('teacher_attachment', 'student_return')),
  file_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.project_z_assignment_files enable row level security;

drop policy if exists "project_z_assignment_files_select_authorized" on public.project_z_assignment_files;
create policy "project_z_assignment_files_select_authorized"
on public.project_z_assignment_files
for select
to authenticated
using (
  exists (
    select 1
    from public.project_z_assignments a
    where a.id = project_z_assignment_files.assignment_id
      and (
        a.teacher_id = auth.uid()
        or exists (
          select 1
          from public.project_z_class_members cm
          where cm.class_id = a.class_id
            and cm.student_id = auth.uid()
            and cm.status = 'active'
        )
      )
  )
);

drop policy if exists "project_z_storage_assignment_files_upload" on storage.objects;
create policy "project_z_storage_assignment_files_upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'project-z-assignment-files');

drop policy if exists "project_z_storage_assignment_files_download" on storage.objects;
create policy "project_z_storage_assignment_files_download"
on storage.objects
for select
to authenticated
using (bucket_id = 'project-z-assignment-files');

drop policy if exists "project_z_storage_assignment_files_update_own" on storage.objects;
create policy "project_z_storage_assignment_files_update_own"
on storage.objects
for update
to authenticated
using (bucket_id = 'project-z-assignment-files' and owner = auth.uid())
with check (bucket_id = 'project-z-assignment-files' and owner = auth.uid());

create or replace function public.project_z_register_assignment_file(
  p_assignment_id uuid,
  p_kind text,
  p_file_path text,
  p_file_name text,
  p_mime_type text default null,
  p_size_bytes bigint default null
)
returns public.project_z_assignment_files
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_row public.project_z_assignments;
  new_file public.project_z_assignment_files;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into assignment_row
  from public.project_z_assignments
  where id = p_assignment_id;

  if assignment_row.id is null then
    raise exception 'Assignment not found';
  end if;

  if p_kind = 'teacher_attachment' then
    if assignment_row.teacher_id <> auth.uid() then
      raise exception 'Only the teacher can attach assignment documents';
    end if;
  elsif p_kind = 'student_return' then
    if not exists (
      select 1
      from public.project_z_class_members cm
      where cm.class_id = assignment_row.class_id
        and cm.student_id = auth.uid()
        and cm.status = 'active'
    ) then
      raise exception 'Only class students can upload return files';
    end if;
  else
    raise exception 'Invalid file kind';
  end if;

  insert into public.project_z_assignment_files (
    assignment_id,
    uploader_id,
    kind,
    file_path,
    file_name,
    mime_type,
    size_bytes
  )
  values (
    p_assignment_id,
    auth.uid(),
    p_kind,
    p_file_path,
    coalesce(nullif(trim(p_file_name), ''), 'uploaded-file'),
    p_mime_type,
    p_size_bytes
  )
  on conflict (file_path) do update
  set file_name = excluded.file_name,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes
  returning * into new_file;

  return new_file;
end;
$$;

create or replace function public.project_z_assignment_files_for_user(
  p_assignment_id uuid
)
returns table (
  id uuid,
  assignment_id uuid,
  uploader_id uuid,
  uploader_name text,
  uploader_email text,
  kind text,
  file_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    f.id,
    f.assignment_id,
    f.uploader_id,
    coalesce(p.display_name, split_part(p.email, '@', 1)) as uploader_name,
    p.email as uploader_email,
    f.kind,
    f.file_path,
    f.file_name,
    f.mime_type,
    f.size_bytes,
    f.created_at
  from public.project_z_assignment_files f
  join public.project_z_assignments a on a.id = f.assignment_id
  join public.project_z_profiles p on p.id = f.uploader_id
  where f.assignment_id = p_assignment_id
    and (
      a.teacher_id = auth.uid()
      or exists (
        select 1
        from public.project_z_class_members cm
        where cm.class_id = a.class_id
          and cm.student_id = auth.uid()
          and cm.status = 'active'
      )
    )
    and (
      a.teacher_id = auth.uid()
      or f.kind = 'teacher_attachment'
      or f.uploader_id = auth.uid()
    )
  order by f.created_at desc;
$$;

grant execute on function public.project_z_register_assignment_file(uuid, text, text, text, text, bigint) to authenticated;
grant execute on function public.project_z_assignment_files_for_user(uuid) to authenticated;

select
  'Project Z Phase 7 assignment documents and student return files schema applied successfully' as status,
  now() as applied_at;

