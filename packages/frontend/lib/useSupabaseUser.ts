'use client';

/**
 * Hook: read the current user from Supabase session (HttpOnly cookies).
 * 
 * This is the secure way to read user data - it uses HttpOnly cookies as the
 * single source of truth, protecting against XSS attacks. No sensitive data
 * is stored in localStorage.
 * 
 * Only non-sensitive UI data (display name, avatar) is synced to state for
 * rendering convenience.
 */
import { useEffect, useState } from 'react';
import type { GitHubUser } from './authClient';

export function useSupabaseUser(): GitHubUser | null {
  const [user, setUser] = useState<GitHubUser | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const loadUser = async () => {
      const { getSupabaseBrowserClient } = await import('./supabase');
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      
      if (session?.user) {
        const u = session.user;
        const ghUser: GitHubUser = {
          login: u.user_metadata?.user_name || u.user_metadata?.name || u.email?.split('@')[0] || '',
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || '',
          avatar: u.user_metadata?.avatar_url || '',
          email: u.email || '',
        };
        setUser(ghUser);
      } else {
        setUser(null);
      }
    };

    loadUser();

    // Listen for auth state changes
    const { getSupabaseBrowserClient } = require('./supabase');
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          const u = session.user;
          const ghUser: GitHubUser = {
            login: u.user_metadata?.user_name || u.user_metadata?.name || u.email?.split('@')[0] || '',
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || '',
            avatar: u.user_metadata?.avatar_url || '',
            email: u.email || '',
          };
          setUser(ghUser);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  return user;
}
