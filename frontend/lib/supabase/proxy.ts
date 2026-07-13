import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  projectZRouteDecision,
  projectZRouteRuleForPath,
  type ProjectZDatabaseRole
} from '../projectZRouteAccess';

function copySessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => to.cookies.set(name, value));
  return to;
}

export async function updateProjectZSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || '';
  const routeRule = projectZRouteRuleForPath(request.nextUrl.pathname);

  if (!url || !key) {
    if (!routeRule) return response;
    const destination = request.nextUrl.clone();
    destination.pathname = '/auth';
    destination.search = '?reason=configuration';
    return NextResponse.redirect(destination);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet = {}) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headersToSet).forEach(([name, value]) => response.headers.set(name, value));
      }
    }
  });

  // Current Supabase guidance requires verified claims before trusting a cookie.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === 'string' ? claimsData.claims.sub : null;

  if (!routeRule) return response;

  let role: ProjectZDatabaseRole | null = null;
  if (userId) {
    const { data: profile } = await supabase
      .from('project_z_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    role = ['student', 'teacher', 'parent'].includes(profile?.role)
      ? profile.role as ProjectZDatabaseRole
      : null;
  }

  const decision = projectZRouteDecision(request.nextUrl.pathname, Boolean(userId), role);
  if (decision.allowed || !decision.redirectTo) return response;

  const destination = new URL(decision.redirectTo, request.url);
  return copySessionCookies(response, NextResponse.redirect(destination));
}
