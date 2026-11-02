'use client';

/**
 * Bring-your-own-brain for the Arena — seamless OAuth (OpenRouter PKCE).
 *
 * The user taps "Connect", signs in on openrouter.ai, and comes back with a
 * scoped key stored ONLY in this browser's localStorage. Champion solves then
 * go browser → OpenRouter directly; our server never sees the key and the
 * caller never pays us anything (free models included).
 *
 * Scope: the key is used solely inside arena solves (sql + quiz rounds).
 * Everything else keeps its normal behavior.
 */

import type { Champion, StrategyCard } from './champions';

const KEY_KEY = 'bleepxByokKey';
const MODEL_KEY = 'bleepxByokModel';
const VERIFIER_KEY = 'bleepxByokVerifier';

/** Always-available OpenRouter router that picks a live free model. */
export const DEFAULT_BYOK_MODEL = 'openrouter/free';

// OpenRouter retires model ids regularly (dead ids answer 400/404), so the
// picker is pruned against the live catalog at runtime — see liveByokModels.
export const BYOK_MODELS: { id: string; label: string }[] = [
  { id: DEFAULT_BYOK_MODEL, label: 'Auto — best free model' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free)' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra (free)' },
  { id: 'thinkingmachines/inkling:free', label: 'Inkling (free)' },
  { id: 'deepseek/deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash' },
  { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna' },
  { id: 'anthropic/claude-haiku-5.5', label: 'Claude Haiku 5.5' },
  { id: 'x-ai/grok-4.7', label: 'Grok 4.7' },
];

type ByokModel = { id: string; label: string };

interface CatalogModel {
  id: string;
  name?: string;
  created?: number;
  architecture?: { output_modalities?: string[] };
}

let catalog: Promise<CatalogModel[] | null> | null = null;

function fetchCatalog(): Promise<CatalogModel[] | null> {
  catalog ??= fetch('https://openrouter.ai/api/v1/models', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (Array.isArray(d?.data) ? (d.data as CatalogModel[]) : null))
    .catch(() => null);
  return catalog;
}

/** true/false from the live catalog; null when the catalog is unreachable. */
async function isModelLive(id: string): Promise<boolean | null> {
  if (id === DEFAULT_BYOK_MODEL) return true;
  const models = await fetchCatalog();
  return models ? models.some((m) => m.id === id) : null;
}

/**
 * Picker options built from OpenRouter's live catalog on every arena load:
 * the free router, every live chat-capable `:free` model (newest first),
 * then the curated paid models that still exist. Falls back to the static
 * list offline. Also resets a stored model that was retired.
 */
export async function liveByokModels(): Promise<{ models: ByokModel[]; model: string }> {
  const live = await fetchCatalog();
  let model = getByokModel();
  if (!live) return { models: BYOK_MODELS, model };
  const ids = new Set(live.map((m) => m.id));
  const free: ByokModel[] = live
    .filter((m) => m.id.endsWith(':free') && !/safety|guard/i.test(m.id))
    .filter((m) => m.architecture?.output_modalities?.includes('text') ?? true)
    .sort((x, y) => (y.created ?? 0) - (x.created ?? 0))
    .map((m) => ({ id: m.id, label: (m.name ?? m.id).replace(/^[^:]+:\s*/, '').replace(/\s+/g, ' ') }));
  const paid = BYOK_MODELS.filter((m) => !m.id.endsWith(':free') && m.id !== DEFAULT_BYOK_MODEL && ids.has(m.id));
  const models = [BYOK_MODELS[0], ...free, ...paid];
  if (!models.some((m) => m.id === model)) {
    model = DEFAULT_BYOK_MODEL;
    setByokModel(model);
  }
  return { models, model };
}

export interface Byok {
  key: string;
  model: string;
}

export function getByok(): Byok | null {
  try {
    const key = localStorage.getItem(KEY_KEY);
    const model = localStorage.getItem(MODEL_KEY) || DEFAULT_BYOK_MODEL;
    return key ? { key, model } : null;
  } catch {
    return null;
  }
}

export function getByokModel(): string {
  try {
    return localStorage.getItem(MODEL_KEY) || DEFAULT_BYOK_MODEL;
  } catch {
    return DEFAULT_BYOK_MODEL;
  }
}

export function setByokModel(id: string) {
  try {
    localStorage.setItem(MODEL_KEY, id);
    localStorage.removeItem(RESOLVED_KEY); // resolved id belonged to the old pick
    localStorage.removeItem(RESOLVED_TS_KEY);
  } catch { /* ignore */ }
}

const RESOLVED_KEY = 'bleepxByokResolved';
const RESOLVED_TS_KEY = 'bleepxByokResolvedT';

/** The concrete model OpenRouter routed the last call to (e.g. under openrouter/free). */
export function getByokResolved(): string | null {
  try {
    return localStorage.getItem(RESOLVED_KEY);
  } catch {
    return null;
  }
}

/** Timestamp of the last resolved-model write (0 = never) — match attribution. */
export function getByokResolvedAt(): number {
  try {
    return Number(localStorage.getItem(RESOLVED_TS_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Display label for a model id — appends what "Auto" last picked when known. */
export function byokDisplayLabel(
  models: { id: string; label: string }[],
  modelId: string,
  resolved?: string | null,
): string {
  const label = models.find((m) => m.id === modelId)?.label ?? modelId;
  if (modelId === DEFAULT_BYOK_MODEL && resolved) {
    const rl = models.find((m) => m.id === resolved)?.label ?? resolved;
    return `${label} · ${rl}`;
  }
  return label;
}

export function setByokKey(key: string) {
  try {
    localStorage.setItem(KEY_KEY, key);
  } catch { /* ignore */ }
}

/** Fallback when OAuth fails: validate a pasted OpenRouter key, then store it locally. */
export async function connectByokWithKey(raw: string): Promise<ByokConnectResult> {
  const key = raw.trim();
  if (!/^sk-or-/.test(key)) return { ok: false, error: 'that does not look like an OpenRouter key (sk-or-…)' };
  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { ok: false, status: res.status, error: data?.error?.message ?? 'key rejected' };
    }
    setByokKey(key);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' };
  }
}

export function clearByok() {
  try {
    localStorage.removeItem(KEY_KEY);
    localStorage.removeItem(RESOLVED_KEY);
    localStorage.removeItem(RESOLVED_TS_KEY);
  } catch { /* ignore */ }
}

// ─── Brains scoreboard — which model wins most (local, per browser) ─────────

const BRAINS_KEY = 'bleepxBrains';

export interface BrainRecord {
  model: string;
  w: number;
  l: number;
}

export function recordBrainResult(model: string, won: boolean) {
  try {
    const store = JSON.parse(localStorage.getItem(BRAINS_KEY) || '{}') as Record<string, { w: number; l: number }>;
    const rec = store[model] ?? { w: 0, l: 0 };
    if (won) rec.w += 1; else rec.l += 1;
    store[model] = rec;
    localStorage.setItem(BRAINS_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

export function getBrains(): BrainRecord[] {
  try {
    const store = JSON.parse(localStorage.getItem(BRAINS_KEY) || '{}') as Record<string, { w: number; l: number }>;
    return Object.entries(store)
      .map(([model, r]) => ({ model, w: r.w, l: r.l }))
      .sort((a, b) => b.w - a.w || a.l - b.l);
  } catch {
    return [];
  }
}

/** Reports a fight outcome to the public board. Fire-and-forget. */
export async function reportBrainResult(model: string, won: boolean, verse?: string, tier?: string) {
  try {
    // Signed mode: fetch a fight ticket first; unsigned mode returns null.
    let ticket: string | null = null;
    try {
      const t = await fetch(`/api/arena/brain-result?ticket=1&model=${encodeURIComponent(model)}`);
      if (t.ok) {
        const d = await t.json();
        ticket = d?.ticket ?? null;
      }
    } catch { /* board offline */ }

    fetch('/api/arena/brain-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, won, verse, tier, ticket }),
    }).catch(() => { /* board offline — local stats still fine */ });
  } catch { /* ignore */ }
}

/** Fetches the global leaderboard; returns [] when the board is offline. */
export async function getGlobalBrains(): Promise<BrainRecord[]> {
  try {
    const res = await fetch('/api/arena/brain-result', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.brains) ? data.brains : [];
  } catch {
    return [];
  }
}

// ─── OpenRouter PKCE connect ────────────────────────────────────────────────

function randomString(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const PENDING_KEY = 'bleepxByokPending';
const USED_CODE_KEY = 'bleepxByokUsedCode';
const PENDING_TTL_MS = 15 * 60_000;

type Pending = Record<string, { v: string; t: number }>;

function readPending(): Pending {
  try {
    // sessionStorage, not localStorage: it survives the same-tab round-trip to
    // OpenRouter and back, but a callback opened in a *different* tab sees no
    // pending attempt, so a crafted link can't attach to one.
    const all = JSON.parse(sessionStorage.getItem(PENDING_KEY) || '{}') as Pending;
    const now = Date.now();
    return Object.fromEntries(Object.entries(all).filter(([, p]) => now - p.t < PENDING_TTL_MS));
  } catch {
    return {};
  }
}

/**
 * Builds the authorization URL. Each attempt gets its own `state` → verifier
 * entry, so a double-click or a second tab can't pair a code with the wrong
 * verifier.
 */
export async function byokConnectUrl(): Promise<string> {
  const verifier = randomString(96);
  const state = randomString(32);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = b64url(digest);
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...readPending(), [state]: { v: verifier, t: Date.now() } }));
    sessionStorage.setItem(VERIFIER_KEY, verifier);
  } catch { /* ignore */ }
  const cb = encodeURIComponent(`${window.location.origin}/arena/byok`);
  return `https://openrouter.ai/auth?callback_url=${cb}&code_challenge=${challenge}&code_challenge_method=S256&state=${state}&key_label=${encodeURIComponent('Bleepx Arena')}`;
}

/**
 * Reads a query param WITHOUT form-decoding: URLSearchParams turns a literal
 * `+` into a space, which corrupts the code (OpenRouter answers "Invalid code").
 */
export function rawQueryParam(search: string, name: string): string | null {
  for (const part of search.replace(/^\?/, '').split('&')) {
    const i = part.indexOf('=');
    const k = i < 0 ? part : part.slice(0, i);
    if (k !== name) continue;
    const v = i < 0 ? '' : part.slice(i + 1);
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

export interface ByokConnectResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Exchanges the OAuth `code` for a key on the callback page. A code is
 * single-use, so a repeat run (reload, back button, remount) is answered from
 * the stored result instead of re-sending a spent code. On failure the result
 * carries OpenRouter's HTTP status and message.
 */
const inflight = new Map<string, Promise<ByokConnectResult>>();

export function finishByokConnect(code: string, state?: string | null): Promise<ByokConnectResult> {
  let p = inflight.get(code);
  if (!p) {
    p = exchangeByokCode(code, state).then((r) => {
      // Don't cache failures — a repeat call should retry the exchange.
      if (!r.ok) inflight.delete(code);
      return r;
    });
    inflight.set(code, p);
  }
  return p;
}

async function exchangeByokCode(code: string, state?: string | null): Promise<ByokConnectResult> {
  let used: string | null = null;
  try {
    used = sessionStorage.getItem(USED_CODE_KEY);
  } catch { /* ignore */ }
  if (used === code) {
    return getByok() ? { ok: true } : { ok: false, error: 'this authorization code was already used — connect again' };
  }

  // The callback must answer an attempt this tab started. OpenRouter does NOT
  // echo `state` back, so a pending attempt in this tab's sessionStorage is
  // the binding — a crafted callback in another tab has none. Verifier
  // candidates: the state-matched entry first, then every pending verifier
  // newest-first (authorizing an older OpenRouter tab must still pair), then
  // the flat legacy keys. Own-property lookup: `pending['__proto__']` would
  // wrongly match Object.prototype.
  const pending = readPending();
  const verifiedAttempt =
    (!!state && Object.prototype.hasOwnProperty.call(pending, state)) || Object.keys(pending).length > 0;
  const candidates: string[] = [];
  const push = (v: string | null | undefined) => {
    if (v && !candidates.includes(v)) candidates.push(v);
  };
  if (state && Object.prototype.hasOwnProperty.call(pending, state)) push(pending[state].v);
  for (const [, p] of Object.entries(pending).sort((a, b) => b[1].t - a[1].t)) push(p.v);
  try {
    push(sessionStorage.getItem(VERIFIER_KEY));
    push(localStorage.getItem(VERIFIER_KEY)); // attempts started before the move to sessionStorage
  } catch { /* storage unavailable */ }
  if (!candidates.length) {
    return { ok: false, error: 'authorization attempt not found — start the connect again' };
  }

  const exchange = async (verifier: string | null) => {
    const res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifier ? { code, code_verifier: verifier, code_challenge_method: 'S256' } : { code }),
    });
    const data = await res.json().catch(() => null);
    const detail: string =
      (typeof data?.error === 'string' ? data.error : data?.error?.message) ??
      (typeof data?.message === 'string' ? data.message : null) ??
      'no key in response';
    return { res, key: typeof data?.key === 'string' ? data.key : null, detail };
  };

  const sleep = (ms: number) => new Promise((r2) => setTimeout(r2, ms));
  try {
    // 403 "Invalid code or code_verifier" can mean the WRONG verifier, so try
    // each candidate. 400 "Invalid code" means the code itself isn't recognized —
    // usually malformed, but a just-issued code can lag a beat, so retry the
    // first candidate briefly before giving up.
    let r = { res: { status: 0 } as Response, key: null as string | null, detail: 'exchange did not run' };
    for (const verifier of candidates.slice(0, 5)) {
      r = await exchange(verifier);
      for (let i = 0; !r.key && r.res.status === 400 && /invalid code/i.test(r.detail) && i < 2; i++) {
        await sleep(900 * (i + 1));
        r = await exchange(verifier);
      }
      if (r.key || r.res.status !== 403) break;
    }
    // A code OpenRouter issued unbound (its sign-in detour can drop the
    // challenge) exchanges with the code alone — that call can't redeem a
    // bound code, so it only helps codes that are genuinely unbound.
    if (!r.key && verifiedAttempt && (r.res.status === 400 || r.res.status === 403)) {
      r = await exchange(null);
    }
    if (r.key) {
      setByokKey(r.key);
      try {
        // Mark used only on success — a failure must leave the code retryable.
        sessionStorage.setItem(USED_CODE_KEY, code);
        sessionStorage.removeItem(PENDING_KEY);
        sessionStorage.removeItem(VERIFIER_KEY);
        localStorage.removeItem(VERIFIER_KEY);
      } catch { /* ignore */ }
      return { ok: true };
    }
    return { ok: false, status: r.res.status, error: r.detail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' };
  }
}

// ─── Model calls (browser → OpenRouter, user key) ───────────────────────────

async function askModel(system: string, user: string, maxTokens = 300): Promise<string> {
  const b = getByok();
  if (!b) throw new Error('no byok key');
  const call = (model: string) =>
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${b.key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Bleepx Arena',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
  let res = await call(b.model);
  // 400/404 → answer this round on the free router; only switch the saved
  // choice when the live catalog confirms the model was retired.
  if ((res.status === 400 || res.status === 404) && b.model !== DEFAULT_BYOK_MODEL) {
    res = await call(DEFAULT_BYOK_MODEL);
    if (res.ok && (await isModelLive(b.model)) === false) setByokModel(DEFAULT_BYOK_MODEL);
  }
  if (!res.ok) throw new Error(`byok ${res.status}`);
  const data = await res.json();
  // OpenRouter echoes the concrete model it routed to — remember it so the UI
  // can show what "Auto — best free model" actually picked.
  try {
    if (typeof data?.model === 'string' && data.model) {
      localStorage.setItem(RESOLVED_KEY, data.model);
      localStorage.setItem(RESOLVED_TS_KEY, String(Date.now()));
    }
  } catch { /* ignore */ }
  return String(data?.choices?.[0]?.message?.content ?? '').trim();
}

/**
 * Quiz round: user's model answers; personality accuracy still applies —
 * if the bug roll triggers we fall back to a random wrong option so the
 * champion keeps its style. Returns { answer, usedLLM }.
 */
export async function byokSolveQuiz(
  question: string,
  options: string[],
  champion: Champion,
  strategy: StrategyCard,
  accuracy: number,
  correctAnswer: string | undefined,
): Promise<{ answer: string; usedLLM: boolean }> {
  try {
    const opts = options.slice(0, 8);
    const text = await askModel(
      `${champion.systemPrompt} You are answering a multiple-choice arena question. Reply with ONLY the exact text of the correct option — no letter, no explanation.`,
      `QUESTION:\n${question}\n\nOPTIONS:\n${opts.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}\n\n${strategy.promptSuffix}\nReply with only the correct option text.`,
      120,
    );
    const match = opts.find((o) => text.toLowerCase().includes(String(o).toLowerCase()));
    const answer = match ?? opts[Math.floor(Math.random() * opts.length)];
    // Personality bug roll — a miss is a wrong option.
    if (Math.random() >= Math.min(0.97, Math.max(0.05, accuracy))) {
      const wrong = opts.filter((o) => o !== (correctAnswer ?? ''));
      return { answer: wrong[Math.floor(Math.random() * wrong.length)] ?? answer, usedLLM: true };
    }
    return { answer, usedLLM: true };
  } catch {
    // Fallback: scripted hit-by-accuracy.
    const acc = Math.min(0.97, Math.max(0.05, accuracy));
    const hit = Math.random() < acc;
    const wrong = options.filter((o) => o !== (correctAnswer ?? ''));
    return {
      answer: hit && correctAnswer ? correctAnswer : (wrong[Math.floor(Math.random() * wrong.length)] ?? options[0] ?? ''),
      usedLLM: false,
    };
  }
}

/**
 * SQL round: user's model writes the query against the real schema.
 * Falls back to the canonical solutionQuery (scripted mode) on any failure.
 */
export async function byokSolveSql(
  round: { name?: string; instructions?: string; schema?: { name: string; columns: { name: string; type: string }[] }[]; solutionQuery?: string },
  champion: Champion,
  strategy: StrategyCard,
): Promise<{ sql: string; usedLLM: boolean }> {
  try {
    const schemaText = (round.schema ?? [])
      .map((t) => `${t.name}(${(t.columns ?? []).map((c) => `${c.name} ${c.type}`).join(', ')})`)
      .join('\n');
    const text = await askModel(
      champion.systemPrompt,
      `CASE: ${round.name ?? ''}\n${round.instructions ?? ''}\n\nSCHEMA:\n${schemaText}\n\n${strategy.promptSuffix}\nReply with ONLY the SQL query. No markdown fences, no explanation.`,
      500,
    );
    const sql = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
    return { sql: sql || (round.solutionQuery ?? 'SELECT 1;'), usedLLM: true };
  } catch {
    return { sql: round.solutionQuery ?? 'SELECT 1;', usedLLM: false };
  }
}
