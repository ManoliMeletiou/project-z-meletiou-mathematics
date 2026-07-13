import type { NextRequest } from 'next/server';
import { updateProjectZSession } from './lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateProjectZSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?)$).*)'
  ]
};
