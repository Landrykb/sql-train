include .env            # ← loads DATABASE_URL etc.

.PHONY: setup curriculum browser stack data seed cases fly clean docs

setup:                  ## install JS deps
	corepack enable && pnpm i -r

curriculum:             ## generate 200 YAMLs + docs
	python3 scripts/gen_curriculum.py && \
	python3 scripts/build_docs.py

docs: curriculum        ## regenerate docs only

browser: setup curriculum
	pnpm --filter frontend dev        # DuckDB‑WASM → http://localhost:3000

stack: curriculum                   ## full Docker stack (FE + BE + DB + nginx)
	docker compose -f infra/docker-compose.full.yml up --build

data:                               ## download & clean open datasets
	python3 scripts/fetch_real_data.py

seed: data                          ## load CSVs into Postgres
	python3 scripts/seed_db.py --pg_url $(DATABASE_URL)

cases: curriculum                   ## (re)generate YAMLs idempotently

fly:                                ## deploy to Fly.io (needs FLY_API_TOKEN)
	fly deploy

clean:
	docker compose -f infra/docker-compose.full.yml down -v
