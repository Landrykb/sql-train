#!/usr/bin/env python3
"""
Read each case YAML in cases/<domain>/*.yaml, look up its `dataset_key`
in dataset_registry.yaml under the repo root, and inject a `datasetInfo:`
block into each case file.
"""
import pathlib
import yaml

# Paths
SCRIPT_DIR = pathlib.Path(__file__).parent.resolve()
REPO_ROOT  = SCRIPT_DIR.parent
REG_PATH   = REPO_ROOT / "dataset_registry.yaml"
CASES_DIR  = REPO_ROOT / "cases"

# Load the dataset registry
with open(REG_PATH, 'r') as f:
    registry = yaml.safe_load(f).get("datasets", {})

for case_file in sorted(CASES_DIR.rglob("*.yaml")):
    data = yaml.safe_load(case_file.read_text())
    key  = data.get("dataset_key")
    if not key:
        print(f"– Skipped {case_file.relative_to(REPO_ROOT)} (no dataset_key)")
        continue
    info = registry.get(key)
    if not info:
        print(f"– Skipped {case_file.relative_to(REPO_ROOT)} (no registry entry for '{key}')")
        continue

    # Inject datasetInfo
    data["datasetInfo"] = {
        "key":            key,
        "url":            info.get("url"),
        "format":         info.get("format"),
        "primary_key":    info.get("primary_key"),
        "narrative_goal": info.get("narrative_goal"),
        "transforms":     info.get("transforms", []),
    }

    # Write back
    with open(case_file, 'w') as f:
        yaml.safe_dump(data, f, sort_keys=False)
    print(f"✔ Enriched {case_file.relative_to(REPO_ROOT)}")
