/**
 * OAuth callback — server-side PKCE code exchange.
 *
 * This route handler is the redirect target set in `startGitHubLogin`
 * (`${origin}/auth/callback`). Running server-side gives us two critical
 * wins over the previous client-side page:
 *
 *   1. The `code_verifier` lives in an HTTP-only cookie (set by
 *      `@supabase/ssr`) that the server can read but client JS cannot.
 *      This makes the verifier immune to localStorage clears, iOS Safari
 *      storage partitioning, and cross-tab races.
 *
 *   2. The `?code=...` is never exposed to client-side JavaScript — we
 *      exchange it server-side and redirect to `/profile` (or an error
 *      page) before the browser ever loads a client bundle.
 *
 * Flow:
 *   GET /auth/callback?code=...&state=...
 *     -> exchangeCodeForSession -> session cookies set on response
 *     -> 302 to /profile
 *
 *   GET /auth/callback?error=access_denied&error_description=...
 *     -> 302 to /auth/error?reason=access_denied&desc=...
 *
 *   GET /auth/callback        (no code, no error)
 *     -> 302 to /auth/error?reason=missing_code
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/profile';

  console.log('[auth/callback] Received request with code:', !!code, 'next:', next);

  // Provider-reported errors (e.g. user declined consent on GitHub).
  const providerError = searchParams.get('error');
  const providerDesc = searchParams.get('error_description');
  if (providerError) {
    console.error('[auth/callback] Provider error:', providerError, providerDesc);
    const target = new URL('/auth/error', origin);
    target.searchParams.set('reason', providerError);
    if (providerDesc) target.searchParams.set('desc', providerDesc);
    return NextResponse.redirect(target);
  }

  if (!code) {
    console.error('[auth/callback] Missing code parameter');
    return NextResponse.redirect(new URL('/auth/error?reason=missing_code', origin));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    console.error('[auth/callback] Supabase not configured');
    return NextResponse.redirect(new URL('/auth/error?reason=not_configured', origin));
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error('[auth/callback] Exchange failed:', exchangeError.message);
    const target = new URL('/auth/error', origin);
    target.searchParams.set('reason', 'exchange_failed');
    target.searchParams.set('desc', exchangeError.message);
    return NextResponse.redirect(target);
  }

  console.log('[auth/callback] Exchange successful, getting user data');
  // Get the user data from Supabase to sync to localStorage
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    console.log('[auth/callback] User authenticated:', user.email);
    // Create a redirect with user data to sync to localStorage on the client
    const target = new URL(next.startsWith('/') ? next : '/profile', origin);
    target.searchParams.set('auth_success', 'true');
    target.searchParams.set('email', user.email || '');
    target.searchParams.set('name', user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '');
    target.searchParams.set('avatar', user.user_metadata?.avatar_url || '');
    target.searchParams.set('login', user.user_metadata?.user_name || user.email?.split('@')[0] || '');
    console.log('[auth/callback] Redirecting with user data to:', target.toString());
    return NextResponse.redirect(target);
  }

  console.log('[auth/callback] Exchange successful, redirecting to:', next);
  // Success — session cookies have been set on the response. Redirect to
  // the original destination. Only allow same-origin relative `next`.
  const redirectTo = next.startsWith('/') ? next : '/profile';
  return NextResponse.redirect(new URL(redirectTo, origin));
}
