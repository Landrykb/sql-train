'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { startGitHubLogin } from '@/lib/authClient';
import { BleepxGitHub } from '@/components/BleepxIcons';

/** Human-readable copy per `reason` code emitted by `/auth/callback/route.ts`. */
const REASON_COPY: Record<string, string> = {
  missing_code: 'GitHub did not send an authorization code back. Please try signing in again.',
  exchange_failed: 'Your sign-in session expired before it could complete. This usually clears up on retry.',
  access_denied: 'Sign-in was cancelled. Grant access on GitHub to continue.',
  not_configured: 'Authentication is not set up on this deployment. Please contact support.',
};

function AuthErrorInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  const reason = searchParams.get('reason') || '';
  const desc = searchParams.get('desc') || '';
  const message = REASON_COPY[reason] || desc || 'Something went wrong signing in. Please try again.';
  // Every known reason is recoverable except `not_configured` (which needs a fix from the team).
  const canRetry = reason !== 'not_configured';

  // Clean the URL so analytics + browser history don't keep the error code.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', '/auth/error');
    }
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await startGitHubLogin();
    } catch (err) {
      console.error('[auth/error] retry failed:', err);
      setRetrying(false);
      router.push('/profile');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center p-8 rounded-xl shadow-lg bg-bleepx-white max-w-md w-full">
        <div className="mb-4 flex justify-center opacity-60"><BleepxGitHub size={48} /></div>
        <div className="text-4xl mb-2">❌</div>
        <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
          Authentication Failed
        </h2>
        <p className="text-sm text-bleepx-text-secondary mb-6">
          *bleep* {message}
        </p>
        <div className="flex gap-2 justify-center">
          {canRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 rounded-full bg-bleepx-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {retrying ? 'Redirecting to GitHub…' : 'Try Again'}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              canRetry
                ? 'bg-bleepx-gray text-bleepx-text hover:bg-gray-300 dark:hover:bg-gray-700'
                : 'bg-bleepx-blue text-white hover:bg-blue-700'
            }`}
          >
            Back to Profile
          </button>
        </div>
        {desc && reason !== 'not_configured' && (
          <details className="mt-6 text-left">
            <summary className="text-xs text-bleepx-text-secondary cursor-pointer select-none">
              Technical details
            </summary>
            <pre className="mt-2 p-2 rounded bg-bleepx-gray-50 dark:bg-gray-800 text-xs text-bleepx-text-secondary whitespace-pre-wrap break-words">
              {desc}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse"><BleepxGitHub size={48} /></div>
        </div>
      }
    >
      <AuthErrorInner />
    </Suspense>
  );
}
