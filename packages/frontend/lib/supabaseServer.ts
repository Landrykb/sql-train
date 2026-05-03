/**
 * Supabase **server** client — used from Route Handlers, Server Components,
 * Server Actions, and middleware.
 *
 * Each request gets a fresh client bound to that request's cookie jar so
 * that session refreshes propagate back to the browser via `Set-Cookie`.
 *
 *   - In a Route Handler / Server Action: cookies are read/write.
 *   - In a Server Component: cookies are read-only; the `setAll` callback
 *     throws, which we swallow silently (middleware already refreshes).
 *
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — cookies are read-only there.
          // The accompanying middleware refreshes sessions so this is a safe
          // no-op: the browser's cookies get updated on the next request.
        }
      },
    },
  });
}
