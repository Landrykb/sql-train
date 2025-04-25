#!/usr/bin/env python3
"""
Audit dataset_registry.yaml → CSVs for missing transforms.

Run from project root:
  python scripts/audit_registry.py

It will print, per registry key, the actual columns and any
column names not yet covered by your transforms.
"""
import yaml
import pandas as pd
from pathlib import Path

ROOT     = Path(__file__).parent.resolve()
REG_PATH = ROOT / "dataset_registry.yaml"
registry = yaml.safe_load(REG_PATH.read_text())["datasets"]

def normalize(col):
    return col.strip().lower().replace(" ", "_").replace("%","pct").replace("-","_")

print("=== Auditing dataset_registry transforms ===\n")
for key, meta in registry.items():
    url = meta.get("url","")
    # only local CSVs for now
    if not url.startswith("file://"):
        print(f"{key}: skipping HTTP source")
        continue

    csv_path = ROOT / url.replace("file://","")
    if not csv_path.exists():
        print(f"{key}: CSV not found at {csv_path}")
        continue

    df = pd.read_csv(csv_path)
    actual = [normalize(c) for c in df.columns]

    # collect all columns already covered by your transforms
    covered = set()
    for t in meta.get("transforms", []):
        if "rename" in t:
            covered.update(normalize(v) for v in t["rename"].values())
        if "select" in t:
            covered.update(normalize(c) for c in t["select"])

    missing = [c for c in actual if c not in covered]
    print(f"{key}:")
    print("  actual columns:  ", actual)
    if missing:
        print("  missing transforms for:", missing)
    else:
        print("  all columns covered ✅")
    print()