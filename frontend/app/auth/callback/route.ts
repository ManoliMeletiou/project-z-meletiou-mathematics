import { NextResponse } from 'next/server';
import { safeProjectZNextPath } from '../../../lib/projectZAuthRedirect';
import { createProjectZServerClient } from '../../../lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeProjectZNextPath(requestUrl.searchParams.get('next'));
  const supabase = await createProjectZServerClient();

  if (!supabase || !code) {
    return NextResponse.redirect(new URL('/auth?reason=callback-invalid', request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/auth?reason=callback-failed', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
