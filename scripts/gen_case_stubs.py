#!/usr/bin/env python3
"""
scripts/gen_case_stubs.py

Generate stub YAML files for any case definitions that exist in
packages/frontend/cases/solutions.yaml but are missing their individual
case YAML under packages/frontend/cases/<domain>/<case_id>.yaml.
"""

import sys
import yaml
from pathlib import Path

# ─── Locate project root, solutions.yaml, and cases directory ─────────────
ROOT = Path(__file__).resolve().parent.parent
SOL_PATH = ROOT / "packages" / "frontend" / "cases" / "solutions.yaml"
CASES_DIR = ROOT / "packages" / "frontend" / "cases"

# ─── Sanity checks ─────────────────────────────────────────────────────────
if not SOL_PATH.exists():
    print(f"❌ Could not find solutions.yaml at {SOL_PATH}")
    sys.exit(1)
if not CASES_DIR.exists():
    print(f"❌ Could not find cases directory at {CASES_DIR}")
    sys.exit(1)

# ─── Load the central solutions.yaml ────────────────────────────────────────
with open(SOL_PATH, encoding="utf-8") as f:
    central = yaml.safe_load(f) or {}

# ─── For each domain & case, emit a stub if missing ────────────────────────
for domain, cases in central.items():
    domain_dir = CASES_DIR / domain
    domain_dir.mkdir(parents=True, exist_ok=True)

    for case_id, entry in cases.items():
        case_file = domain_dir / f"{case_id}.yaml"
        if case_file.exists():
            continue  # already have it

        # Build a minimal stub from the solutions.yaml entry
        stub = {
            "id":          case_id,
            "name":        entry.get("name", case_id).replace("_", " ").title(),
            "domain":      domain,
            "tier":        entry.get("tier", 1),
            # If the central entry has dataset_key, use it; else try datasets→file
            "dataset_key": entry.get("dataset_key")
                            or entry.get("datasets", [{}])[0].get("file", "").split(".", 1)[0],
            # You’ll want to customize these per exercise
            "description": entry.get("description", ""),
            "skills":      entry.get("skills", []),
            "prereq_cases": entry.get("prereq_cases", []),
            "datasets":    entry.get("datasets", [{"name": "main", "file": ""}]),
            "seedQuery":   entry.get("seedQuery", "-- TODO: write seedQuery"),
            "templateQuery": entry.get("templateQuery", "SELECT * FROM main;"),
            "solutionQuery": entry.get("solutionQuery", "-- TODO: write solutionQuery"),
            "expected":    entry.get("expected", []),
            "hints":       entry.get("hints", []),
        }

        # Write the stub YAML
        case_file.write_text(
            yaml.safe_dump(stub, sort_keys=False, width=100),
            encoding="utf-8"
        )
        print(f"➕ Generated stub: {domain}/{case_id}.yaml")

print("✅ gen_case_stubs.py complete.")