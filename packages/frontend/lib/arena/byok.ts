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

export const BYOK_MODELS: { id: string; label: string }[] = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 (free)' },
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free)' },
  { id: 'moonshotai/kimi-k2:free', label: 'Kimi K2 (free)' },
  { id: 'x-ai/grok-4.1-fast', label: 'Grok 4.1 Fast' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
];

export interface Byok {
  key: string;
  model: string;
}

export function getByok(): Byok | null {
  try {
    const key = localStorage.getItem(KEY_KEY);
    const model = localStorage.getItem(MODEL_KEY) || BYOK_MODELS[0].id;
    return key ? { key, model } : null;
  } catch {
    return null;
  }
}

export function getByokModel(): string {
  try {
    return localStorage.getItem(MODEL_KEY) || BYOK_MODELS[0].id;
  } catch {
    return BYOK_MODELS[0].id;
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
export function reportBrainResult(model: string, won: boolean, verse?: string, tier?: string) {
  try {
    fetch('/api/arena/brain-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, won, verse, tier }),
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
    sessionStorage.setItem(VERIFIER_KEY, verifier);
  } catch { /* ignore */ }
  const cb = encodeURIComponent(`${window.location.origin}/arena/byok`);
  return `https://openrouter.ai/auth?callback_url=${cb}&code_challenge=${challenge}&code_challenge_method=S256`;
}

/** Exchanges the OAuth `code` for a key on the callback page. */
export async function finishByokConnect(code: string): Promise<boolean> {
  try {
    const verifier = sessionStorage.getItem(VERIFIER_KEY) ?? '';
    sessionStorage.removeItem(VERIFIER_KEY);
    const res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
    });
    const data = await res.json();
    if (data?.key) {
      setByokKey(data.key);
      return true;
    }
  } catch { /* fall through */ }
  return false;
}

// ─── Model calls (browser → OpenRouter, user key) ───────────────────────────

async function askModel(system: string, user: string, maxTokens = 300): Promise<string> {
  const b = getByok();
  if (!b) throw new Error('no byok key');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${b.key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Bleepx Arena',
    },
    body: JSON.stringify({
      model: b.model,
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
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
