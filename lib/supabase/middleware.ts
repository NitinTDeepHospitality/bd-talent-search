// Middleware-only Supabase helper. Reads cookies from the request,
// refreshes the session, and writes any new cookies back to the response.

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Prototype escape hatch — when set, every route is accessible without
  // signing in. Anthropic/Whisper API routes go from gated to open, which
  // means anyone with the URL can spend our API credit. Use only for a
  // short, link-shared test window. Remove the env var to restore the gate.
  if (process.env.BYPASS_AUTH === 'true') {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Must run getUser() right after createServerClient — anything in between
  // races the auth refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/auth') ||
    // Cron endpoints carry their own Bearer auth via CRON_SECRET — letting
    // them through here delegates auth to the route handler itself.
    path.startsWith('/api/cron') ||
    path === '/favicon.ico';

  if (!user && !isPublic) {
    // API routes get a 401 JSON; redirecting a fetch() to /login produces an
    // HTML response the caller can't parse.
    if (path.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}
