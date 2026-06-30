import { supabase } from './supabaseClient';

const BUCKET = 'project-z-assignment-files';

export type AssignmentFile = {
  id: string;
  assignment_id: string;
  uploader_id: string;
  uploader_name: string;
  uploader_email: string;
  kind: 'teacher_attachment' | 'student_return';
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function safeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120) || 'uploaded-file';
}

async function uploadAndRegister(
  assignmentId: string,
  file: File,
  kind: 'teacher_attachment' | 'student_return'
) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: 'Sign in first' };

  const prefix = kind === 'teacher_attachment' ? 'assignment-documents' : 'student-returns';
  const filePath = `${prefix}/${assignmentId}/${userData.user.id}/${Date.now()}-${safeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type || undefined
    });

  if (uploadError) return { ok: false, reason: uploadError.message };

  const { data, error } = await supabase.rpc('project_z_register_assignment_file', {
    p_assignment_id: assignmentId,
    p_kind: kind,
    p_file_path: filePath,
    p_file_name: file.name,
    p_mime_type: file.type || null,
    p_size_bytes: file.size
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

export async function uploadAssignmentDocument(assignmentId: string, file: File) {
  return uploadAndRegister(assignmentId, file, 'teacher_attachment');
}

export async function uploadStudentReturn(assignmentId: string, file: File) {
  return uploadAndRegister(assignmentId, file, 'student_return');
}

export async function fetchAssignmentFiles(assignmentId: string) {
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase.rpc('project_z_assignment_files_for_user', {
    p_assignment_id: assignmentId
  });

  if (error) return [];
  return data || [];
}

export async function createFileDownloadUrl(filePath: string) {
  if (!supabase) return { ok: false, reason: 'Supabase client unavailable' };

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60 * 10);

  if (error) return { ok: false, reason: error.message };
  return { ok: true, url: data.signedUrl };
}
