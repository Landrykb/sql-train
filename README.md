# Bleepx — Learn SQL, Data Science &amp; Cloud by Solving Cases

> Bleepx is a browser-native learning platform where you master **SQL** (BleepxQuery), **Python/R data science** (BleepxLab), and **cloud architecture** (BleepxCloud) by solving realistic case studies. Everything runs client-side on WebAssembly — your code never leaves your device. And when you want a fight, the **Bleepx Arena** pits your champion against the house bot in real-code duels.

Live: **[bleepxacademy.vercel.app](https://bleepxacademy.vercel.app)** &nbsp;•&nbsp; Bio hub: [/links](https://bleepxacademy.vercel.app/links) &nbsp;•&nbsp; Source: [github.com/Landrykb/sql-train](https://github.com/Landrykb/sql-train)

![License: MIT](https://img.shields.io/badge/license-MIT-teal)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Pyodide](https://img.shields.io/badge/Pyodide-browser%20Python-yellow)
![sql.js](https://img.shields.io/badge/sql.js-browser%20SQL-orange)

---

## Table of contents

1. [What is Bleepx?](#what-is-bleepx)
2. [Features](#features)
3. [The three verses + the Arena](#the-three-verses--the-arena)
4. [Guest policy](#guest-policy)
5. [Architecture](#architecture)
6. [Tech stack](#tech-stack)
7. [Getting started (local dev)](#getting-started-local-dev)
8. [Environment variables](#environment-variables)
9. [Deployment](#deployment)
10. [Supabase setup](#supabase-setup)
11. [Analytics](#analytics)
12. [Project structure](#project-structure)
13. [Contributing](#contributing)
14. [Privacy &amp; Terms](#privacy--terms)
15. [Security](#security)
16. [License](#license)

---

## What is Bleepx?

Bleepx turns "another SQL tutorial" into **narrative case studies** you actually want to finish. Each case drops you into a believable scenario — a missing-data investigation, a supply-chain mystery, a telecom-churn prediction, an S3 misconfiguration — and hands you the tools to crack it.

**Why it's different:**

- **Built-in guide, Bleepx** — a pixelated mascot who gives hints, reacts to mistakes, and celebrates wins with *bleep*y commentary.
- **Zero setup, zero wall** — SQL runs via `sql.js`, Python runs via Pyodide, cloud missions run in a client-side simulator. Browse *and run* everything as a guest; sign-in is only asked when you want progress saved.
- **The Arena** — coach a champion through real-code duels (live SQL execution, Pyodide duels, sandbox build missions), or tag in and fight the last round yourself. Shareable match cards + replays.
- **Progression with teeth** — points, streaks, achievements, a shop, a daily duel, a rival ladder, champion evolution bridged from training.
- **Portfolio-ready** — one click pushes your solved work to a GitHub repo (`sql-portfolio`, `ds-portfolio`).
- **Honest pricing** — everything is free today; Bleepx Verified is labeled a free preview until real checkout lands.

---

## Features

### For learners

| Area                     | What you get                                                                  |
|--------------------------|-------------------------------------------------------------------------------|
| **SQL cases**            | 100+ real-world cases across 9 domains (finance, healthcare, space, etc.)     |
| **Data-science projects**| 38 guided projects in 9 domains (transport, churn, fraud, ESG, more)          |
| **Cloud missions**       | AWS/Azure/GCP/ESG/FinOps tracks — quizzes, scenarios, build missions, checklist |
| **Interactive editors**  | CodeMirror with syntax highlighting, autocomplete, keyboard shortcuts          |
| **Live execution**       | sql.js for SQL, Pyodide for Python, client-side AWS simulator — all browser   |
| **The Arena**            | Coach or tag-team duels vs the house bot; daily duel, rival ladder, replays    |
| **Smart error help**     | Contextual hints + checkers that say *why* a result is wrong                  |
| **Visualizations**       | Auto-charts (Plotly) for completed cases; Python/R viz guides in Lab           |
| **Hints &amp; solutions**| Progressive hints (first 3 free), thought-process walkthroughs, full solutions |
| **Points &amp; shop**    | Earn points for solving; spend on skips, trial unlocks, cosmetic titles        |
| **Quizzes**              | Per-topic quizzes for SQL trials, Lab, and Cloud                               |
| **Test mode**            | Optional timed challenges with tier-based limits                               |
| **GitHub export**        | Push solved work to your own portfolio repo with one click                     |
| **Cross-device sync**    | Sign in with GitHub → progress syncs via Supabase                              |
| **Mobile-friendly**      | Wrapping toolbars, sticky Run — works on phones                                |

### For admins

- **Anonymous PostHog analytics** — which cases are popular, where users drop off.
- **Save-time sign-in gate** — guests run everything; GitHub sign-in is asked at completion (progress, points, portfolio push).
- **Supabase daily keep-alive** — GitHub Actions cron prevents free-tier pause.
- **Security overrides** — pnpm/npm overrides pin patched versions of flagged CVEs.
- **YAML-driven curriculum** — add a case by dropping a `.yaml` file. No code changes needed.

---

## The three verses + the Arena

### BleepxQuery — SQL cases
- Routes: `/cases`, `/cases/[domain]`, `/cases/[domain]/[caseId]`
- Domains: `business`, `crime`, `farming`, `finance`, `healthcare`, `social`, `space`, `sports` + `trials` (timed challenges + Master Quiz)
- Palette: blue/indigo

### BleepxLab — Python/R data science
- Routes: `/lab`, `/lab/[domain]`, `/lab/[domain]/[projectId]`
- Domains: transport, forecasting, churn, music, fraud, esg_climate, decarb, agri_econ, fin_risk
- Runnable Python via Pyodide, R reference, topic quizzes
- Palette: teal/emerald

### BleepxCloud — cloud missions
- Routes: `/cloud`, `/cloud/[provider]`, `/cloud/[provider]/[slug]`, `/cloud/certifications`
- Tracks: AWS, Azure, GCP, ESG &amp; FinOps, multi-cloud — quizzes, sandbox scenarios, IaC missions, SAA checklist
- Palette: sky/blue

### The Arena
- Routes: `/arena`, `/arena/card` (share card), `/arena/watch` (replay), `/verified`
- `POST /api/arena/match` builds a 3-round card (quiz rounds + a real-code finale); `POST /api/arena/solve` gets a champion's solve — LLM-backed if `LLM_API_KEY` is set, scripted with personality bugs otherwise
- Categories mirror training: SQL case domains, Cloud quiz tracks, Lab quiz topics
- Verified = free-preview perks (auto-rematch, Pro/Boss daily tiers) until real checkout

### The hub
- Route: `/links` — bio-link landing: live product card, per-verse quick links, coming-soon cards, socials

---

## Guest policy

Everything in the browser is **free with no account**: browse cases, run SQL/Python/cloud code, take quizzes, fight in the Arena. **Sign-in (GitHub, via Supabase) is asked at save/completion** — it's what persists progress, awards points, syncs across devices, and pushes to your portfolio repo. The OAuth scope is `read:user public_repo` — used only to create and push to your own portfolio repo.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Your Browser (client)                       │
│                                                                 │
│   Next.js 15 (SSG) ──► React UI                                 │
│      │                                                          │
│      ├─► CodeMirror (SQL / Python editors)                      │
│      ├─► sql.js (WASM)      ── runs SQL queries                 │
│      ├─► Pyodide (WASM)     ── runs Python code                 │
│      ├─► Cloud sandbox      ── simulated AWS actions            │
│      ├─► Plotly.js          ── visualizations                   │
│      └─► localStorage       ── offline-first progress           │
│                                                                 │
└───────────┬──────────────────────────────────────┬──────────────┘
            │                                      │
            │ (optional, if signed in)             │ (optional, if enabled)
            ▼                                      ▼
  ┌────────────────────┐                 ┌──────────────────────┐
  │    Supabase        │                 │      PostHog         │
  │  • GitHub OAuth    │                 │  • Page views        │
  │  • user_progress   │                 │  • Event tracking    │
  │  • ping() keepalive│                 │  • Admin dashboard   │
  └────────────────────┘                 └──────────────────────┘
            ▲
            │ GitHub Actions cron (daily)
            │
  ┌────────────────────┐      ┌──────────────────────────────┐
  │ .github/workflows/ │      │ /api/arena/* (route handlers)│
  │ ping-supabase.yml  │      │  match card + champion solve │
  └────────────────────┘      │  (LLM optional, scripted else)│
                              └──────────────────────────────┘
```

**Key decisions:**

- **SSG everywhere.** `generateStaticParams` pre-renders case/project/mission pages at build time.
- **Everything client-side.** Code execution and the cloud sandbox never touch our servers.
- **Save-time gate, not a run wall.** Guests learn; sign-in is only about persistence.
- **YAML curriculum.** Cases, Lab projects, and Cloud missions are YAML files; `make curriculum` validates and copies them.

---

## Tech stack

- **Frontend:** Next.js 15 (App Router, SSG), React 18, TypeScript 5, Tailwind CSS 3
- **Editor:** CodeMirror 6 with SQL + Python language packs
- **SQL runtime:** sql.js (SQLite on WebAssembly)
- **Python runtime:** Pyodide (CPython + pandas + numpy in the browser)
- **Arena:** route handlers (`/api/arena/*`) + optional OpenRouter-compatible LLM for champion solves
- **Charts:** Plotly.js · **Motion:** framer-motion · **Toasts:** sileo
- **Auth &amp; sync:** Supabase (GitHub OAuth + Postgres)
- **Analytics:** PostHog (optional, consent banner)
- **Content:** YAML (`js-yaml`, validated at build time)
- **Package manager:** pnpm 8 (monorepo: `packages/frontend` + `packages/backend`)
- **CI/CD:** GitHub Actions (daily Supabase ping); Vercel auto-deploys from `main`

---

## Getting started (local dev)

### Prerequisites
- **Node.js** ≥ 18
- **pnpm** ≥ 8 (`npm i -g pnpm`)
- A **Supabase** project (free tier works) — optional, required only for sign-in + sync
- A **GitHub OAuth app** — configured in Supabase Auth settings

### Install
```bash
git clone https://github.com/Landrykb/sql-train.git
cd sql-train
pnpm install
```

### Configure env
```bash
cp packages/frontend/.env.local.example packages/frontend/.env.local
# Edit .env.local with your Supabase keys (see below)
```

### Run
```bash
pnpm --filter frontend dev
# Open http://localhost:3000
```

### Build for production
```bash
pnpm build
```
This runs `make curriculum` (validates YAML) then builds the workspace.

---

## Environment variables

| Variable                        | Required    | Purpose                                            |
|---------------------------------|-------------|----------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | for sign-in | Supabase project URL                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for sign-in | Supabase anon/public key                           |
| `NEXT_PUBLIC_API_URL`           | fallback    | Legacy backend (unused by the frontend OAuth flow) |
| `NEXT_PUBLIC_POSTHOG_KEY`       | optional    | PostHog project key — omit to disable analytics    |
| `NEXT_PUBLIC_POSTHOG_HOST`      | optional    | Defaults to `https://us.i.posthog.com`             |
| `LLM_API_URL`                   | optional    | Arena solve model endpoint (OpenRouter-compatible) |
| `LLM_API_KEY`                   | optional    | Arena solve key — omit for scripted solves         |
| `LLM_MODEL`                     | optional    | Arena solve model id                               |
| `LLM_DISABLED`                  | optional    | `true` forces scripted arena solves                |
| `LLM_ARENA_MAX_TOKENS`          | optional    | Arena solve max tokens (default 800)               |
| `LLM_RATE_LIMIT_PER_MIN`        | optional    | Arena solve rate limit (default 15/min)            |

---

## Deployment

### Vercel (recommended)

1. Import the repo on [vercel.com/new](https://vercel.com/new).
2. Set the **Root Directory** to `packages/frontend`.
3. Framework preset: **Next.js**.
4. Add env vars in **Project Settings → Environment Variables**:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optionally `NEXT_PUBLIC_POSTHOG_KEY` and `LLM_API_KEY`.
5. In **GitHub → Settings → Secrets and variables → Actions**, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the keep-alive workflow.

---

## Supabase setup

### 1. Tables

```sql
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed TEXT[] DEFAULT '{}',
  points INTEGER DEFAULT 0,
  achievements TEXT[] DEFAULT '{}',
  store_state JSONB DEFAULT '{}',
  quiz_scores JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress"   ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION ping()
RETURNS text LANGUAGE sql SECURITY DEFINER
AS $$ SELECT 'pong'::text; $$;
```

### 2. GitHub OAuth
Supabase → **Authentication** → **Providers** → **GitHub** → enable with your OAuth app credentials. The frontend requests `read:user public_repo` — used solely for portfolio pushes.

### 3. Keep-alive
`.github/workflows/ping-supabase.yml` calls `ping()` daily. Add `SUPABASE_URL` + `SUPABASE_ANON_KEY` as repo secrets. See `.github/SUPABASE_PING_SETUP.md`.

---

## Analytics

Optional **PostHog**, privacy-first — consent banner, no PII, no session recording, anonymous event names only (`page_view`, `case_run_sql`, `lab_run_python`, `quiz_started`, `quiz_completed`, `github_export_*` — see `packages/frontend/lib/analytics.ts`). Leave `NEXT_PUBLIC_POSTHOG_KEY` blank to disable cleanly.

---

## Project structure

```
besa-sqlverse/
├── cases/                           YAML curriculum (BleepxQuery, 9 domains)
├── lab-projects/                    YAML curriculum (BleepxLab, 9 domains)
├── packages/
│   ├── frontend/                    Next.js app
│   │   ├── app/
│   │   │   ├── cases/...            BleepxQuery
│   │   │   ├── lab/...              BleepxLab
│   │   │   ├── cloud/...            BleepxCloud + certifications
│   │   │   ├── arena/ + api/arena/  The Arena (battle, card, watch, match, solve)
│   │   │   ├── verified/            Verified preview page
│   │   │   ├── links/               Bio-link hub
│   │   │   ├── privacy/ terms/      Legal
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── SQLPlayground.tsx    SQL case component (guest-run + save gate)
│   │   │   ├── LabProjectViewer.tsx / PythonTerminal.tsx
│   │   │   ├── arena/               ArenaBattle, ArenaCTA, ArenaRunner, MiniFight, MatchCardView
│   │   │   ├── SignInGate.tsx       Sign-in modal + useAuthGate hook
│   │   │   ├── AppIcons / NavIcons / BleepxIcons   Original icon sets
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── arena/               champions, evolution, duels, match card, replay, verified, theme
│   │   │   ├── cloud/               missions, sandbox, sandboxActions, trials, questions
│   │   │   ├── constants.ts         Query domains + case order
│   │   │   ├── labConstants.ts      Lab domains + project order
│   │   │   ├── useProgress.ts / authClient.ts / githubPush.ts
│   │   │   └── analytics.ts
│   │   └── package.json
│   └── backend/                     Legacy backend (OAuth endpoints removed)
├── scripts/                         YAML validators
├── Makefile                         curriculum build target
└── README.md                        you are here
```

---

## Contributing

### Add a new SQL case
1. Create `cases/[domain]/my_case.yaml` following existing schema.
2. Add the case id to `caseOrder[domain]` in `packages/frontend/lib/constants.ts`.
3. Drop the CSV into `packages/frontend/public/datasets/`.
4. `pnpm test` — validates the YAML.

### Add a new Lab project
1. Create `lab-projects/[domain]/my_project.yaml`.
2. Add the id to `LAB_CASE_ORDER[domain]` and tier to `LAB_CASE_TIERS` in `packages/frontend/lib/labConstants.ts`.
3. Reference a Kaggle dataset slug in `dataset_url`.

### Add a cloud mission
Drop a YAML into the cloud curriculum dir and register it in `packages/frontend/lib/cloud/` registries.

### Submitting changes
Open a PR against `main` — CI validates curriculum + builds.

---

## Privacy &amp; Terms

- **[Privacy Policy](https://bleepxacademy.vercel.app/privacy)** — what we collect, what we don't.
- **[Terms of Service](https://bleepxacademy.vercel.app/terms)** — acceptable use, your content, pricing commitments.

Short version: we collect the minimum, never sell, you can opt out of analytics, your code stays yours, and any future paid features are published before anyone is charged.

---

## Security

- `pnpm audit`: **0 vulnerabilities** (as of April 2026)
- `overrides` pins patched versions of every flagged transitive CVE
- The legacy backend OAuth flow (`scope=repo`, token-in-URL) was removed — frontend auth goes through Supabase only, scoped `read:user public_repo`
- No user-supplied code ever runs on our servers — browser sandbox only

Report issues privately: [GitHub security advisories](https://github.com/Landrykb/sql-train/security/advisories/new).

---

## License

MIT — see [LICENSE](LICENSE).

Curriculum content (exercises, case stories, solutions) is © Bleepx and licensed for personal learning use only. You're welcome to reference cases in your portfolio with attribution.

---

*Built with *bleep*s and curiosity.*
