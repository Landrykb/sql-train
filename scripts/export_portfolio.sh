#!/usr/bin/env bash
# Build data, generate cases, docs & tests, then push to a new public GitHub repo + gh‑pages demo.
set -euo pipefail

# Usage: ./export_portfolio.sh [GITHUB_REPO_NAME]
REPO="${1:-besa-sqlverse-portfolio}"

# 1) Ensure GitHub CLI is available
if ! command -v gh &>/dev/null; then
  echo "❌ GitHub CLI (gh) required"
  exit 1
fi

# 2) Fetch or regenerate real datasets (into ./datasets/*.csv)
echo "→ Fetching real data…"
python3 fetch_real_data.py

# 3) Generate YAML cases with real seedQuery, templateQuery & expected
echo "→ Generating cases from data…"
python3 generate_cases_with_data.py

# 4) Seed your Postgres database (if you use one)
if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "→ Seeding Postgres at $DATABASE_URL…"
  python3 seed_db.py --pg_url "$DATABASE_URL"
else
  echo "→ Skipping Postgres seed (DATABASE_URL not set)"
fi

# 5) Rebuild docs/learning-path.md
echo "→ Building docs…"
python3 build_docs.py

# 6) Run smoke‑tests on tier‑1 cases
echo "→ Running test_cases.mjs…"
node test_cases.mjs

# 7) Prepare a clean export directory
echo "→ Staging files for GitHub…"
TMP=$(mktemp -d)
rsync -a --exclude .git --exclude node_modules --exclude packages/frontend/.next \
  ./ "$TMP/$REPO" >/dev/null

# 8) Commit & publish via gh CLI
cd "$TMP/$REPO"
git init -q
git add .
git commit -m "Initial commit – BESA SQL Tutorial Portfolio"

USER=$(gh api user --jq .login)
URL="https://github.com/$USER/$REPO.git"
gh repo create "$REPO" --source=. --remote=origin --push --public

printf "✅ Published ➜ %s\n" "$URL"
