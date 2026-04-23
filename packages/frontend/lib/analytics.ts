/**
 * Analytics — PostHog wrapper (admin-only, privacy-respecting).
 *
 * - Only loads if NEXT_PUBLIC_POSTHOG_KEY is set.
 * - Respects user consent (cookie `bleepx_analytics_consent`).
 * - No PII: we only send anonymous event names + anonymized identifiers.
 * - No-ops safely if PostHog fails to load.
 */
import posthog from 'posthog-js';
import { sanitizeUrl } from './sanitizeUrl';

let initialized = false;
let enabled = false;

const CONSENT_KEY = 'bleepx_analytics_consent';

/** Keys in PostHog event `properties` that can contain a full URL. These are
 *  aggressively scrubbed so OAuth tokens never leave the browser. */
const URL_PROPERTY_KEYS = [
  '$current_url',
  '$referrer',
  '$referring_domain',
  '$pathname',
  '$initial_current_url',
  '$initial_referrer',
  '$initial_pathname',
  'url',
  'path',
  'referrer',
];

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
      // Pageviews are captured manually from AnalyticsProvider *after* we
      // scrub the URL, so OAuth tokens never hit the wire.
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false, // we send explicit events
      disable_session_recording: true, // no recordings for privacy
      // Defense-in-depth: strip sensitive query/hash params from any
      // URL-like property on every event before it is sent.
      sanitize_properties: (properties: Record<string, any>) => {
        if (!properties || typeof properties !== 'object') return properties;
        for (const k of URL_PROPERTY_KEYS) {
          const v = properties[k];
          if (typeof v === 'string' && v) {
            properties[k] = sanitizeUrl(v);
          }
        }
        return properties;
      },
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

/** Capture a pageview with explicit URL sanitization applied. Call from
 *  AnalyticsProvider after `scrubCurrentUrl()` has run on mount. */
export function capturePageview(path?: string): void {
  if (!initialized || !enabled) return;
  try {
    const url = sanitizeUrl(typeof window !== 'undefined' ? window.location.href : '');
    posthog.capture('$pageview', {
      $current_url: url,
      ...(path ? { path: sanitizeUrl(path) } : {}),
    });
  } catch { /* ignore */ }
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
