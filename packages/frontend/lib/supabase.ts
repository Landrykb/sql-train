import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase **browser** client — configured for PKCE OAuth with cookie-backed
 * session storage via `@supabase/ssr`.
 *
 * Why cookies instead of localStorage?
 *   The PKCE `code_verifier` must be readable by *both* the page that
 *   started the OAuth flow and the callback handler. In a Next.js App
 *   Router app the callback can be handled by a server route, which has
 *   zero access to the browser's localStorage — but it *does* receive
 *   cookies. Cookie storage also survives:
 *     - Next.js module re-exec between client navigations
 *     - React strict-mode double-mount
 *     - Browser storage partitioning / ITP clears that target localStorage
 *
 *   See: https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * The default `@supabase/ssr` cookie strategy handles access tokens,
 * refresh tokens, and the PKCE code_verifier — so we no longer need the
 * manual `flowType: 'pkce'` / `detectSessionInUrl` / `persistSession`
 * flags used with the legacy `createClient`.
 *
 * IMPORTANT: The client is created lazily to avoid React hydration
 * mismatches. `createBrowserClient` must only run on the client side.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (supabaseClient) return supabaseClient;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

// Legacy export for backward compatibility — returns null on server, client on browser
// Uses a getter to defer creation until first access
export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    const client = getSupabaseBrowserClient();
    return client ? client[prop as keyof typeof client] : null;
  },
  has(_target, prop) {
    const client = getSupabaseBrowserClient();
    return client ? prop in client : false;
  },
});
