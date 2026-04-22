# Bleepx — Learn SQL &amp; Data Science by Solving Cases

> Bleepx is a browser-native learning platform where you master **SQL** (BleepxQuery) and **Python/R data science** (BleepxLab) by solving realistic case studies. Everything runs client-side on WebAssembly — your code never leaves your device.

Live: **[bleepx.dev](https://bleepx.dev)** &nbsp;•&nbsp; Source: [github.com/Landrykb/sql-train](https://github.com/Landrykb/sql-train)

![License: MIT](https://img.shields.io/badge/license-MIT-teal)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Pyodide](https://img.shields.io/badge/Pyodide-browser%20Python-yellow)
![sql.js](https://img.shields.io/badge/sql.js-browser%20SQL-orange)

---

## Table of contents

1. [What is Bleepx?](#what-is-bleepx)
2. [Features](#features)
3. [The two verses](#the-two-verses)
4. [Architecture](#architecture)
5. [Tech stack](#tech-stack)
6. [Getting started (local dev)](#getting-started-local-dev)
7. [Environment variables](#environment-variables)
8. [Deployment](#deployment)
9. [Supabase setup](#supabase-setup)
10. [Analytics](#analytics)
11. [Project structure](#project-structure)
12. [Contributing](#contributing)
13. [Privacy & Terms](#privacy--terms)
14. [License](#license)

---

## What is Bleepx?

Bleepx turns "another SQL tutorial" into **narrative case studies** you actually want to finish. Each case drops you into a believable scenario — a missing-data investigation, a supply-chain mystery, a telecom-churn prediction — and hands you the tools to crack it.

**Why it's different:**

- 🧠 **Built-in guide, Bleepx** — a pixelated mascot who gives hints, reacts to mistakes, and celebrates wins with *bleep*y commentary.
- 💻 **Zero setup** — SQL runs via `sql.js`, Python runs via Pyodide, R snippets are reference-only. No server, no Docker, no install.
- 🎯 **Progression with teeth** — points, streaks, achievements, a shop (skip-a-case, unlock trial), leaderboards of one.
- 📦 **Portfolio-ready** — one click pushes your solved work to a GitHub repo (`sql-portfolio`, `ds-portfolio`).
- 🧪 **Quizzes everywhere** — every case has a "Test your knowledge" quiz; every Lab domain has a topic quiz.
- ⏱ **Test mode** — flip a switch in Profile → timed challenges on all cases &amp; projects.

---

## Features

### For learners

| Area                     | What you get                                                                 |
|--------------------------|------------------------------------------------------------------------------|
| **SQL cases**            | 100+ real-world cases across 9 domains (finance, healthcare, space, etc.)    |
| **Data-science projects**| 38 guided projects in 9 domains (transport, churn, fraud, ESG, more)         |
| **Interactive editors**  | CodeMirror with syntax highlighting, autocomplete, keyboard shortcuts        |
| **Live execution**       | sql.js for SQL, Pyodide for Python — all in your browser                     |
| **Smart error help**     | Contextual hints when queries fail ("did you mean `JOIN`?")                  |
| **Result diff**          | Side-by-side diff when your answer is close but not quite right              |
| **Visualizations**       | Auto-charts (Plotly) for completed cases; Python/R viz guides in Lab         |
| **Hints &amp; solutions**| Progressive hints (first 3 free), thought-process walkthroughs, full solutions |
| **Points &amp; shop**    | Earn points for solving; spend on skips, trial unlocks, cosmetic titles      |
| **Quizzes**              | Per-case &amp; per-topic quizzes for both SQL and data science               |
| **Test mode**            | Optional timed challenges with tier-based limits                             |
| **GitHub export**        | Push solved work to your own portfolio repo with one click                   |
| **Cross-device sync**    | Sign in with GitHub → progress syncs via Supabase                            |
| **Mobile-friendly**      | Redesigned toolbars that work on phones (wrapping buttons, sticky Run)       |

### For admins (you)

- 📊 **Anonymous PostHog analytics** — see which cases are popular, where users drop off, conversion rates.
- 🔒 **GitHub sign-in gate** — browse-without-account, sign-in-to-solve. No abuse, clean analytics.
- 🤖 **Supabase daily keep-alive** — GitHub Actions cron prevents free-tier pause.
- 🛡 **Security overrides** — pnpm/npm overrides pin patched versions of every flagged CVE.
- ⚙️ **YAML-driven curriculum** — add a case by dropping a `.yaml` file. No code changes needed.

---

## The two verses

### 🔍 BleepxQuery — SQL cases

- Routes: `/cases`, `/cases/[domain]`, `/cases/[domain]/[caseId]`
- 9 domains: `business`, `crime`, `healthcare`, `farming`, `space`, `finance`, `sports`, `social`, + `trials` (timed challenges)
- Each case: dataset (CSV), story, instructions, hints, thought-process, expected output, solution, viz configs
- Color scheme: blue/indigo

### 🧪 BleepxLab — Python/R data science projects

- Routes: `/lab`, `/lab/[domain]`, `/lab/[domain]/[projectId]`
- 9 domains: transport, forecasting, churn, music, fraud, esg_climate, decarb, agri_econ, fin_risk
- Each project: Kaggle dataset link, step-by-step tutorial, runnable Python (Pyodide), R reference, solution code, hints
- Color scheme: teal/emerald

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
│      ├─► Plotly.js          ── visualizations                   │
│      └─► localStorage       ── offline-first progress           │
│                                                                 │
└───────────┬──────────────────────────────────────┬──────────────┘
            │                                      │
            │ (optional, if signed in)             │ (optional, if enabled)
            ▼                                      ▼
  ┌────────────────────┐                 ┌──────────────────────┐
  │    Supabase        │                 │      PostHog         │
  │  ───────────────   │                 │  ─────────────────   │
  │  • GitHub OAuth    │                 │  • Page views        │
  │  • user_progress   │                 │  • Event tracking    │
  │  • ping() keepalive│                 │  • Admin dashboard   │
  └────────────────────┘                 └──────────────────────┘
            ▲
            │ GitHub Actions cron (daily)
            │
  ┌────────────────────┐
  │ .github/workflows/ │
  │ ping-supabase.yml  │
  └────────────────────┘
```

**Key decisions:**

- **SSG everywhere.** `generateStaticParams` pre-renders all case/project pages at build time. No per-request cost.
- **Everything client-side.** No Node runtime needed — cheap to host on Vercel or any static host.
- **Progressive sign-in.** Browsing = free. Running code / submitting answers = GitHub sign-in required (gate modal).
- **YAML curriculum.** Cases and Lab projects are YAML files; a build step (`make curriculum`) validates and copies them.

---

## Tech stack

- **Frontend:** Next.js 15 (App Router, SSG), React 18, TypeScript 5, Tailwind CSS 3
- **Editor:** CodeMirror 6 (`@uiw/react-codemirror`) with SQL + Python language packs
- **SQL runtime:** [sql.js](https://sql.js.org/) (SQLite compiled to WebAssembly)
- **Python runtime:** [Pyodide](https://pyodide.org/) (CPython + pandas + numpy in the browser)
- **Charts:** Plotly.js
- **Auth &amp; sync:** Supabase (GitHub OAuth provider + Postgres)
- **Analytics:** PostHog (optional, opt-out banner)
- **Content:** YAML (`js-yaml` parsed at build time)
- **Testing:** Node-based validation scripts (`scripts/test_cases.mjs`)
- **Package manager:** pnpm 8 (monorepo workspaces via `packages/frontend` + `packages/backend`)
- **CI/CD:** GitHub Actions (daily Supabase ping); Vercel auto-deploys from `main`

---

## Getting started (local dev)

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 8 (installed globally: `npm i -g pnpm`)
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

This runs `make curriculum` (validates YAML) then builds the frontend and backend.

---

## Environment variables

| Variable                          | Required | Purpose                                           |
|-----------------------------------|----------|---------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | ✅       | Supabase project URL                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | ✅       | Supabase anon/public key                          |
| `NEXT_PUBLIC_API_URL`             | ⚠️ fallback | Legacy Render backend (only if no Supabase)    |
| `NEXT_PUBLIC_POSTHOG_KEY`         | optional | PostHog project key — omit to disable analytics   |
| `NEXT_PUBLIC_POSTHOG_HOST`        | optional | Defaults to `https://us.i.posthog.com`            |

---

## Deployment

### Vercel (recommended)

1. Import the repo on [vercel.com/new](https://vercel.com/new).
2. Set the **Root Directory** to `packages/frontend`.
3. Framework preset: **Next.js** (auto-detected).
4. Build command: `pnpm build` (defaults work too).
5. Add the env vars from `.env.local` in **Project Settings → Environment Variables**:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (optionally) `NEXT_PUBLIC_POSTHOG_KEY`.
6. In **GitHub repo → Settings → Secrets and variables → Actions → Repository secrets**, add
   `SUPABASE_URL` and `SUPABASE_ANON_KEY` so the daily keep-alive workflow can call Supabase.

---

## Supabase setup

### 1. Tables

Run this once in the Supabase SQL Editor:

```sql
-- Progress sync
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

-- Keep-alive ping (used by GitHub Actions)
CREATE OR REPLACE FUNCTION ping()
RETURNS text LANGUAGE sql SECURITY DEFINER
AS $$ SELECT 'pong'::text; $$;
```

### 2. GitHub OAuth

Supabase Dashboard → **Authentication** → **Providers** → **GitHub** → enable, paste client ID + secret from GitHub OAuth app.

### 3. Keep-alive workflow

`.github/workflows/ping-supabase.yml` runs **daily** and calls `ping()` to prevent free-tier pause.

Add to **GitHub repo → Settings → Secrets and variables → Actions → Repository secrets**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Manual trigger: **Actions → Ping Supabase → Run workflow**.

See `.github/SUPABASE_PING_SETUP.md` for details.

---

## Analytics

Bleepx ships with optional **PostHog** analytics — admin-only, privacy-first.

- **Free tier:** 1M events/month (plenty for this project).
- **Consent banner** appears on first visit; users can accept or decline.
- **No PII:** events contain only anonymous event names + case IDs. No IP logging, no session recording.
- **Explicit events:** `page_view`, `case_run_sql`, `lab_run_python`, `quiz_started`, `quiz_completed`, `github_export_*`, etc. See `packages/frontend/lib/analytics.ts`.

To enable: create a free PostHog project → copy the project key into `NEXT_PUBLIC_POSTHOG_KEY`.

To disable entirely: leave the key blank. The app will no-op cleanly.

---

## Project structure

```
besa-sqlverse/
├── .github/
│   ├── workflows/
│   │   └── ping-supabase.yml        Daily Supabase keep-alive
│   └── SUPABASE_PING_SETUP.md       Setup instructions
│
├── cases/                           YAML curriculum (BleepxQuery)
│   ├── business/
│   ├── crime/
│   ├── healthcare/
│   └── ... (9 domains)
│
├── lab-projects/                    YAML curriculum (BleepxLab)
│   ├── transport/
│   ├── forecasting/
│   └── ... (9 domains, 38 projects)
│
├── packages/
│   ├── frontend/                    Next.js app
│   │   ├── app/                     App Router pages
│   │   │   ├── cases/[domain]/[caseId]/
│   │   │   ├── lab/[domain]/[projectId]/
│   │   │   ├── profile/
│   │   │   ├── privacy/             Privacy Policy
│   │   │   ├── terms/               Terms of Service
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── SQLPlayground.tsx    Main SQL case component
│   │   │   ├── LabProjectViewer.tsx Main Lab project component
│   │   │   ├── PythonTerminal.tsx   Pyodide editor + runner
│   │   │   ├── SignInGate.tsx       GitHub sign-in modal + useAuthGate hook
│   │   │   ├── AnalyticsProvider.tsx PostHog init + consent banner
│   │   │   ├── TrialQuiz.tsx        SQL quizzes
│   │   │   ├── LabQuiz.tsx          Data science quizzes
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── analytics.ts         PostHog wrapper + event names
│   │   │   ├── authClient.ts        GitHub OAuth via Supabase
│   │   │   ├── useProgress.ts       Progress hook (localStorage + sync)
│   │   │   ├── supabase.ts          Supabase client
│   │   │   ├── labConstants.ts      Lab domains, tiers, time limits
│   │   │   ├── constants.ts         Query domains, case order, time limits
│   │   │   └── githubPush.ts        Portfolio export to GitHub
│   │   └── package.json
│   │
│   └── backend/                     Optional Render backend (legacy)
│
├── scripts/
│   ├── test_cases.mjs               Validates all YAML cases
│   └── ...
│
├── package.json                     Root monorepo config + overrides
├── pnpm-lock.yaml
├── Makefile                         curriculum build target
└── README.md                        you are here
```

---

## Contributing

### Add a new SQL case

1. Create `cases/[domain]/my_case.yaml` following the schema in existing files.
2. Add the case id to `caseOrder[domain]` in `packages/frontend/lib/constants.ts`.
3. Drop the CSV into `packages/frontend/public/datasets/`.
4. `pnpm test` — validates the YAML.
5. `pnpm --filter frontend dev` — check it renders.

### Add a new Lab project

1. Create `lab-projects/[domain]/my_project.yaml`.
2. Add the id to `LAB_CASE_ORDER[domain]` and the tier to `LAB_CASE_TIERS` in `packages/frontend/lib/labConstants.ts`.
3. Reference a Kaggle dataset slug in `dataset_url`.

### Submitting changes

- Open a PR against `main`.
- CI will run the curriculum validator + Next.js build.

---

## Privacy &amp; Terms

- **[Privacy Policy](https://bleepx.dev/privacy)** — what we collect, what we don't, your rights.
- **[Terms of Service](https://bleepx.dev/terms)** — acceptable use, warranties, your content.

Short version: we collect the minimum, never sell, you can opt out of analytics, and your code stays yours.

---

## Security

- `pnpm audit`: **0 vulnerabilities** (as of April 2026)
- Explicit `overrides` block pins patched versions of every flagged transitive CVE
- All 3rd-party code (Pyodide, sql.js) loaded from known CDNs with SRI where possible
- No user-supplied code ever runs on our servers — only in the user's own browser sandbox

Report security issues privately by opening a private security advisory on the [GitHub repository](https://github.com/Landrykb/sql-train/security/advisories/new).

---

## License

MIT — see [LICENSE](LICENSE) for details.

Curriculum content (exercises, case stories, solutions) is &copy; Bleepx and licensed for personal learning use only. You're welcome to reference cases in your portfolio with attribution.

---

*Built with *bleep*s and curiosity.* 🤖
