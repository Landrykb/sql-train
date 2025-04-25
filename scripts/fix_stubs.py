#!/usr/bin/env python3
"""
scripts/fix_stubs.py

Make sure each case YAML stub has the right keys pulled
from dataset_registry.yaml (for transforms / filenames)
and solutions.yaml (for solutionQuery hints).
"""

import sys
import yaml
from pathlib import Path

# ─── Locate project root and key files ────────────────────────────────────
ROOT       = Path(__file__).resolve().parent.parent
REG_PATH   = ROOT / "dataset_registry.yaml"
SOL_PATH   = ROOT / "packages" / "frontend" / "cases" / "solutions.yaml"
CASES_ROOT = ROOT / "packages" / "frontend" / "cases"

# ─── Sanity checks ─────────────────────────────────────────────────────────
for p, name in ((REG_PATH, "dataset_registry.yaml"), (SOL_PATH, "solutions.yaml")):
    if not p.exists():
        print(f"❌ Missing {name} at {p}")
        sys.exit(1)

# ─── Load registry & central solutions ────────────────────────────────────
registry = yaml.safe_load(REG_PATH.read_text(encoding="utf-8"))["datasets"]
central  = yaml.safe_load(SOL_PATH.read_text(encoding="utf-8")) or {}

# ─── Walk through each stub and inject missing registry info ───────────────
for domain, cases in central.items():
    for case_id, sol_entry in cases.items():
        stub_path = CASES_ROOT / domain / f"{case_id}.yaml"
        if not stub_path.exists():
            continue  # stub not generated yet

        stub = yaml.safe_load(stub_path.read_text(encoding="utf-8")) or {}
        modified = False

        # 1) Ensure dataset_key matches registry entry
        key = stub.get("dataset_key") or sol_entry.get("dataset_key")
        if not key:
            # fallback to first dataset file in central
            key = sol_entry.get("datasets",[{}])[0].get("file","").split(".",1)[0]
        if key and key in registry and stub.get("dataset_key") != key:
            stub["dataset_key"] = key
            modified = True

        # 2) Merge in any transforms from registry
        transforms = registry.get(key, {}).get("transforms", [])
        if transforms and stub.get("transforms") != transforms:
            stub["transforms"] = transforms
            modified = True

        # 3) Propagate solutionQuery & hints if missing
        if "solutionQuery" not in stub and sol_entry.get("solutionQuery"):
            stub["solutionQuery"] = sol_entry["solutionQuery"]
            modified = True
        if "hints" not in stub and sol_entry.get("hints"):
            stub["hints"] = sol_entry["hints"]
            modified = True

        if modified:
            stub_path.write_text(
                yaml.safe_dump(stub, sort_keys=False, width=120),
                encoding="utf-8",
            )
            print(f"✏️  Updated stub: {domain}/{case_id}.yaml")

print("✅ fix_stubs.py complete.")