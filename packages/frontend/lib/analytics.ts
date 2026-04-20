/**
 * Analytics — PostHog wrapper (admin-only, privacy-respecting).
 *
 * - Only loads if NEXT_PUBLIC_POSTHOG_KEY is set.
 * - Respects user consent (cookie `bleepx_analytics_consent`).
 * - No PII: we only send anonymous event names + anonymized identifiers.
 * - No-ops safely if PostHog fails to load.
 */
import posthog from 'posthog-js';

let initialized = false;
let enabled = false;

const CONSENT_KEY = 'bleepx_analytics_consent';

/** Has the user accepted analytics? Defaults to true (opt-out) for free-tier project,
 * but users can opt out via footer link. Tracks nothing sensitive. */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    // Default: opted-in, unless user explicitly disabled
    return v !== 'denied';
  } catch {
    return false;
  }
}

export function setAnalyticsConsent(granted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
    if (!granted && initialized) {
      posthog.opt_out_capturing();
    } else if (granted && initialized) {
      posthog.opt_in_capturing();
    }
  } catch { /* ignore */ }
}

/** Initialize PostHog once, client-side only. Safe to call multiple times. */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  if (!key) return;

  try {
    posthog.init(key, {
      api_host: host,
      person_profiles: 'identified_only', // anonymous unless we call identify()
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false, // we send explicit events
      disable_session_recording: true, // no recordings for privacy
      loaded: (ph) => {
        if (!hasAnalyticsConsent()) ph.opt_out_capturing();
      },
    });
    initialized = true;
    enabled = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('PostHog init failed (non-fatal):', err);
  }
}

/** Track an event. No-op if disabled. */
export function track(event: string, props?: Record<string, any>): void {
  if (!initialized || !enabled) return;
  try {
    posthog.capture(event, props);
  } catch { /* ignore */ }
}

/** Identify a signed-in user (hashed GitHub login). */
export function identify(githubLogin: string): void {
  if (!initialized) return;
  try {
    // Hash to avoid storing raw logins as user IDs
    const id = `gh_${githubLogin.toLowerCase()}`;
    posthog.identify(id);
  } catch { /* ignore */ }
}

/** Reset on logout. */
export function resetAnalytics(): void {
  if (!initialized) return;
  try { posthog.reset(); } catch { /* ignore */ }
}

/** Common event names */
export const Events = {
  // Navigation
  PAGE_VIEW: 'page_view',
  // SQL challenges
  CASE_VIEWED: 'case_viewed',
  CASE_RUN_SQL: 'case_run_sql',
  CASE_SOLVED: 'case_solved',
  // Lab projects
  LAB_VIEWED: 'lab_viewed',
  LAB_RUN_PYTHON: 'lab_run_python',
  LAB_SOLVED: 'lab_solved',
  // Quizzes
  QUIZ_STARTED: 'quiz_started',
  QUIZ_COMPLETED: 'quiz_completed',
  // Auth
  AUTH_SIGN_IN_START: 'auth_sign_in_start',
  AUTH_SIGN_IN_COMPLETE: 'auth_sign_in_complete',
  AUTH_SIGN_IN_GATE_SHOWN: 'auth_sign_in_gate_shown',
  AUTH_SIGN_OUT: 'auth_sign_out',
  // GitHub export
  GITHUB_EXPORT_QUERY: 'github_export_query',
  GITHUB_EXPORT_LAB: 'github_export_lab',
} as const;
