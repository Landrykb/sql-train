import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Supabase browser client — configured for the **PKCE** OAuth flow.
 *
 * With PKCE, the provider redirects back with `?code=...&state=...` and the
 * tokens are obtained by calling `supabase.auth.exchangeCodeForSession(url)`
 * — tokens never appear in the URL hash, so they cannot be leaked through
 * the browser's `Referer` header, analytics pageview URLs, server logs, or
 * shared links.
 *
 * See: https://supabase.com/docs/guides/auth/sessions/pkce-flow
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;
