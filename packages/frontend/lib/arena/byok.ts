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

let liveModels: Promise<Set<string> | null> | null = null;

function fetchLiveModelIds(): Promise<Set<string> | null> {
  liveModels ??= fetch('https://openrouter.ai/api/v1/models')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (Array.isArray(d?.data) ? new Set<string>(d.data.map((m: { id: string }) => m.id)) : null))
    .catch(() => null);
  return liveModels;
}

/**
 * Picker options still live on OpenRouter. Also resets a stored model that
 * was retired to the default so solves stop hitting a dead id.
 */
export async function liveByokModels(): Promise<{ models: typeof BYOK_MODELS; model: string }> {
  const ids = await fetchLiveModelIds();
  const models = ids ? BYOK_MODELS.filter((m) => m.id === DEFAULT_BYOK_MODEL || ids.has(m.id)) : BYOK_MODELS;
  let model = getByokModel();
  if (ids && model !== DEFAULT_BYOK_MODEL && !ids.has(model)) {
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
  } catch { /* ignore */ }
}

export function setByokKey(key: string) {
  try {
    localStorage.setItem(KEY_KEY, key);
  } catch { /* ignore */ }
}

export function clearByok() {
  try {
    localStorage.removeItem(KEY_KEY);
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

/** Builds the authorization URL and stores the verifier for the callback. */
export async function byokConnectUrl(): Promise<string> {
  const verifier = randomString(96);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = b64url(digest);
  try {
    localStorage.setItem(VERIFIER_KEY, verifier);
  } catch { /* ignore */ }
  const cb = encodeURIComponent(`${window.location.origin}/arena/byok`);
  return `https://openrouter.ai/auth?callback_url=${cb}&code_challenge=${challenge}&code_challenge_method=S256`;
}

/** Exchanges the OAuth `code` for a key on the callback page. */
export interface ByokConnectResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Exchanges the OAuth `code` for a key on the callback page.
 * On failure the result carries OpenRouter's HTTP status and error
 * message so the callback page can show WHY, not just THAT, it failed.
 */
export async function finishByokConnect(code: string): Promise<ByokConnectResult> {
  let verifier = '';
  try {
    verifier = localStorage.getItem(VERIFIER_KEY) ?? '';
    localStorage.removeItem(VERIFIER_KEY);
  } catch { /* storage unavailable */ }
  if (!verifier) {
    return { ok: false, error: 'missing code_verifier (connect flow context was lost)' };
  }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
    });
    const data = await res.json().catch(() => null);
    if (data?.key) {
      setByokKey(data.key);
      return { ok: true };
    }
    const detail =
      (typeof data?.error === 'string' ? data.error : data?.error?.message) ??
      (typeof data?.message === 'string' ? data.message : null) ??
      'no key in response';
    return { ok: false, status: res.status, error: detail };
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
  // Retired/unknown model id → retry on the free router and remember it.
  if ((res.status === 400 || res.status === 404) && b.model !== DEFAULT_BYOK_MODEL) {
    res = await call(DEFAULT_BYOK_MODEL);
    if (res.ok) setByokModel(DEFAULT_BYOK_MODEL);
  }
  if (!res.ok) throw new Error(`byok ${res.status}`);
  const data = await res.json();
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
