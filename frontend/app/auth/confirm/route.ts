import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { safeProjectZNextPath } from '../../../lib/projectZAuthRedirect';
import { createProjectZServerClient } from '../../../lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = safeProjectZNextPath(requestUrl.searchParams.get('next'), '/account');
  const supabase = await createProjectZServerClient();

  if (!supabase || !tokenHash || !type) {
    return NextResponse.redirect(new URL('/auth?reason=confirmation-invalid', request.url));
  }

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(new URL('/auth?reason=confirmation-failed', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
