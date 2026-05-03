/**
 * Session-refresh middleware for Supabase Auth (cookie-based PKCE flow).
 *
 * Why this file exists:
 *   - `@supabase/ssr` stores the session + PKCE `code_verifier` in cookies.
 *   - Access tokens are short-lived (~1 hour); refresh tokens are used
 *     silently by the SDK to mint new access tokens.
 *   - Server components can only *read* cookies — they can't refresh them.
 *   - This middleware runs on every matched request, refreshes the session
 *     server-side via `supabase.auth.getUser()`, and propagates updated
 *     `Set-Cookie` headers back to the browser.
 *
 * Without this file, a logged-in user whose access token has expired would
 * hit stale-session errors on pages that read the session server-side.
 *
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function middleware(request: NextRequest) {
  // Short-circuit if Supabase isn't configured — no auth to refresh.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Mirror the cookies onto *both* the request (so downstream handlers
        // see the refreshed values) and the response (so they ship to the
        // browser). This dual write is the documented @supabase/ssr pattern.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: call `getUser()` (not `getSession()`). `getUser()` hits the
  // Supabase Auth server to verify the token, so it's the only safe place
  // to refresh an expiring access token. Do not run other logic between
  // `createServerClient` and `getUser()` — that can cause the user to be
  // logged out randomly.
  await supabase.auth.getUser();

  return response;
}

/**
 * Skip static assets, public images, Pyodide/dataset downloads, and the auth
 * callback — those requests don't need session refresh and running middleware
 * on them would waste latency or interfere with OAuth code exchange.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf|css|js|map)$|datasets/|auth/callback).*)',
  ],
};
