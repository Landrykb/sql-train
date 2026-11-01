# AGENTS.md — Bleepx Academy rules & best practices

## Product identity
- Canonical domain: **https://bleepx.dev** (`bleepxacademy.vercel.app` 308-redirects — never hardcode it).
- Three verses: Query (blue), Lab (emerald), Cloud (sky/blue). Arena categories must mirror the training registries — SQL domains, Lab topics, Cloud providers.
- "Arena" means only `/arena` — never call other features "arena" (e.g. it's "Trials", not "Trials Arena").

## UI rules
- **No emojis** in visible UI — use AppIcons/BleepxIcons, Tabler, Lucide, or inline SVG. NOTE: `lucide-react` has NO brand icons (Instagram etc. don't exist) — use inline SVG glyphs.
- Buttons must feel responsive: `active:scale-95`/`[0.98]` press feedback + a spinner busy-state while awaiting (see `SpinnerIcon` in `components/SignInGate.tsx`). Never ship a click that has no visible result.
- Social buttons on `/links`: full-width stacked, brand-colored, never a row that clips on mobile.

## Auth rules (critical — do not bypass)
- `components/SignInGate.tsx` is the ONLY sign-in surface. New gated actions must use `const { requireAuth, GateComponent } = useAuthGate()` → `requireAuth('action')` + render `<GateComponent />`. **Never** call `startGitHubLogin()` directly from buttons.
- Providers: GitHub OAuth (needed for repo export — `public_repo`) + email (password via `signInWithPassword`/`signUp`, OTP via `signInWithOtp` 6-digit code, magic link fallback). GitHub export is legitimately GitHub-only.
- `app_metadata.provider` distinguishes `github` vs `email` — never treat `ghUser.login` as a GitHub handle for email users (it's the email prefix).
- Magic/reset links must work on ANY device → use `token_hash` flows: `/auth/confirm` and `/auth/reset` verify via `verifyOtp` — PKCE links are bound to the requesting browser.
- Supabase email: Resend SMTP, sender `noreply@bleepx.dev`. Email templates must include `{{ .Token }}` code.

## Progress & accounts
- Guest progress lives in localStorage (`completed`, `completedCases`, `bleepxPoints`, `bleepxAchievements`, `bleepx_store`).
- `bleepx_progress_owner` = account uid. A *different* uid signing in wipes local residue (cloud re-syncs); a missing owner = guest progress that merges into the account (local ∪ remote via `syncProgress`). Don't touch this logic — it prevents account-bleed on shared devices.
- `logoutUser()` wipes all local keys + reloads (state must not persist signed-out).
- Player tag-team solves ARE real case progress via `markComplete` — don't double-count (it dedupes).
- First guest solve fires `bleepx:signup_nudge` once per session (`lib/guestNudge.ts` → `SignupNudge` in layout).

## Analytics (PostHog)
- `lib/analytics.ts` holds the `Events` enum — new tracked actions go there + `track(Events.X)`.
- Identify by Supabase **UUID only** — NO email/name in PostHog (privacy rule). `provider` + `signed_in` super-props split guest vs member.
- UTM: `?utm_source=instagram` etc. on external links → `$initial_utm_source` breakdowns.

## Security
- No secrets in the repo — tokens/keys live in `~/.env` files (`*.env` gitignored) or Vercel env vars.
- `arena_brain_results` writes are ticket-gated via `ARENA_RESULT_SECRET`; BYOK keys are browser-local → OpenRouter direct, never the server.
- Supabase writes through parameterized SDK only; Zod on API route bodies.

## Cost discipline (Vercel — learned the hard way)
- **Every push to `main` = a full ~7-min production build = billed CPU.** Batch commits; don't push single-line fixes one at a time.
- `packages/frontend/vercel.json` has `ignoreCommand` skipping builds when the frontend dir is unchanged — keep it.
- Debug logs must be dev-only: wrap in `process.env.NODE_ENV !== 'production'` — repeated logs during static gen become observability events = $$.
- `'use client'` must be the FIRST line of a file — imports above it break the build.
- Next.js is pinned `^16.4.3` — do NOT downgrade (16.4.0 has a security advisory; `next build` hard-stops).

## Verification
- `npx tsc --noEmit -p tsconfig.json` in `packages/frontend` before every commit; `pnpm --filter frontend build` before any release-y push.
- Lockfile must match `package.json` specifiers exactly — Vercel runs `--frozen-lockfile`.
- Honesty rule: no fake scarcity, countdowns, user counts, or reviews — Verified is a free preview until real checkout exists.
