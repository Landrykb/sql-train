/**
 * URL sanitization — strips OAuth/auth tokens and other sensitive parameters
 * from URL strings before they are logged, sent to analytics, or kept in
 * browser history.
 *
 * We redact (not drop) values so analytics aggregates still reflect that
 * a page was visited, without leaking the secret payload.
 */

/** Query / hash param names that may carry a credential. Matched case-insensitively. */
export const SENSITIVE_URL_PARAMS = [
  // OAuth / OIDC
  'access_token',
  'refresh_token',
  'provider_token',
  'provider_refresh_token',
  'id_token',
  'token',
  'code',
  'state',
  'expires_in',
  'expires_at',
  'token_type',
  'type',
  // GitHub personal access tokens sometimes pasted into URLs
  'pat',
  // Supabase-specific
  'sb-access-token',
  'sb-refresh-token',
  // Generic API keys
  'api_key',
  'apikey',
  'key',
  'secret',
  'session',
  'auth',
];

const REDACTED = 'REDACTED';

function scrubSearchParams(input: string): string {
  // input may be "", "?foo=bar", or the raw search string.
  if (!input) return input;
  const raw = input.startsWith('?') ? input.slice(1) : input;
  if (!raw) return input.startsWith('?') ? '?' : '';
  const params = new URLSearchParams(raw);
  let mutated = false;
  for (const name of Array.from(params.keys())) {
    if (SENSITIVE_URL_PARAMS.some((p) => p.toLowerCase() === name.toLowerCase())) {
      params.set(name, REDACTED);
      mutated = true;
    }
  }
  if (!mutated) return input;
  const out = params.toString();
  return input.startsWith('?') ? (out ? `?${out}` : '') : out;
}

function scrubHash(hash: string): string {
  // Supabase implicit flow returns tokens in the URL hash as
  // "#access_token=...&refresh_token=...&...". Treat the hash as querystring-like.
  if (!hash) return hash;
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!body || !body.includes('=')) return hash;
  // Some hashes are routes (e.g. "#/foo"); skip those.
  if (body.startsWith('/')) return hash;
  const params = new URLSearchParams(body);
  let mutated = false;
  for (const name of Array.from(params.keys())) {
    if (SENSITIVE_URL_PARAMS.some((p) => p.toLowerCase() === name.toLowerCase())) {
      params.set(name, REDACTED);
      mutated = true;
    }
  }
  if (!mutated) return hash;
  return `#${params.toString()}`;
}

/** Sanitize an arbitrary URL string by redacting sensitive query/hash params. */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return url || '';
  try {
    // Relative URLs: URL constructor needs a base.
    const isAbsolute = /^https?:\/\//i.test(url);
    const u = new URL(url, isAbsolute ? undefined : 'http://local');
    u.search = scrubSearchParams(u.search);
    u.hash = scrubHash(u.hash);
    if (isAbsolute) return u.toString();
    // Reconstruct relative form
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    // Fallback: regex-scrub common tokens
    return url
      .replace(/([?&#](?:access_token|refresh_token|provider_token|provider_refresh_token|id_token|token|code|state)=)[^&#]*/gi, `$1${REDACTED}`);
  }
}

/** Strip sensitive params from the *current* browser URL via history.replaceState.
 *  Returns true if the URL was modified. Safe to call in any browser context. */
export function scrubCurrentUrl(): boolean {
  if (typeof window === 'undefined' || !window.history?.replaceState) return false;
  try {
    const { pathname, search, hash } = window.location;
    const cleanSearch = scrubSearchParams(search);
    const cleanHash = scrubHash(hash);
    if (cleanSearch === search && cleanHash === hash) return false;
    window.history.replaceState(null, '', `${pathname}${cleanSearch}${cleanHash}`);
    return true;
  } catch {
    return false;
  }
}
