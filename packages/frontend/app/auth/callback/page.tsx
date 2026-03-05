'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setGitHubUser } from '@/lib/authClient';
import { BleepxGitHub } from '@/components/BleepxIcons';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-pulse"><BleepxGitHub size={48} /></div></div>}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setStatus('error');
      setErrorMsg(error);
      return;
    }

    // --- Supabase OAuth flow ---
    // Supabase puts the session in the URL hash; the client auto-detects it.
    if (supabase) {
      const handleSupabaseCallback = async () => {
        try {
          const { data: { session }, error: sessionError } = await supabase!.auth.getSession();
          if (sessionError) throw sessionError;
          if (session?.user) {
            const meta = session.user.user_metadata || {};
            // provider_token is the actual GitHub API token; access_token is a Supabase JWT
            const ghToken = session.provider_token || session.access_token;
            setGitHubUser({
              login: meta.user_name || meta.preferred_username || session.user.email || 'user',
              name: meta.full_name || meta.name || meta.user_name || 'User',
              avatar: meta.avatar_url || '',
              email: session.user.email || '',
              token: ghToken,
            });
            // Sync to bleepx_profile
            try {
              const existing = JSON.parse(localStorage.getItem('bleepx_profile') || '{}');
              localStorage.setItem('bleepx_profile', JSON.stringify({
                ...existing,
                authProvider: 'github',
                githubUsername: meta.user_name || meta.preferred_username || '',
                displayName: meta.full_name || meta.name || meta.user_name || 'User',
                email: session.user.email || existing.email || '',
              }));
            } catch { /* ignore */ }
            setStatus('success');
            setTimeout(() => router.push('/profile'), 1200);
            return;
          }
        } catch (err) {
          console.error('[auth/callback] Supabase session error:', err);
        }

        // If Supabase didn't yield a session, fall through to legacy check
        checkLegacyParams();
      };
      handleSupabaseCallback();
      return;
    }

    // --- Legacy Render backend flow ---
    checkLegacyParams();

    function checkLegacyParams() {
      const login = searchParams.get('login');
      const name = searchParams.get('name');
      const avatar = searchParams.get('avatar');
      const email = searchParams.get('email');
      const token = searchParams.get('token');

      if (login && token) {
        setGitHubUser({ login, name: name || login, avatar: avatar || '', email: email || '', token });
        try {
          const existing = JSON.parse(localStorage.getItem('bleepx_profile') || '{}');
          localStorage.setItem('bleepx_profile', JSON.stringify({
            ...existing,
            authProvider: 'github',
            githubUsername: login,
            displayName: name || login,
            email: email || existing.email || '',
          }));
        } catch { /* ignore */ }
        setStatus('success');
        setTimeout(() => router.push('/profile'), 1500);
      } else {
        setStatus('error');
        setErrorMsg('Missing user data from GitHub');
      }
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center p-8 rounded-xl shadow-lg bg-bleepx-white max-w-md mx-4">
        {status === 'loading' && (
          <>
            <div className="mb-4 animate-pulse flex justify-center"><BleepxGitHub size={48} /></div>
            <h2 className="text-lg font-bold text-bleepx-text mb-2">Connecting to GitHub...</h2>
            <p className="text-sm text-bleepx-text-secondary">*bleep* Processing your authentication, human.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-lg font-bold text-green-600 dark:text-green-400 mb-2">Connected!</h2>
            <p className="text-sm text-bleepx-text-secondary">*bleep* Welcome aboard. Redirecting to your profile...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Authentication Failed</h2>
            <p className="text-sm text-bleepx-text-secondary mb-4">*bleep* Something went wrong: {errorMsg}</p>
            <button
              onClick={() => router.push('/profile')}
              className="px-4 py-2 rounded-full bg-bleepx-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}
