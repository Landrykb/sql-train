#!/usr/bin/env python3
"""
Auto-populate `dataset_registry.yaml` transforms by
reading each local CSV, normalizing its columns to snake_case,
and writing a `transforms:` rename map.
"""

import yaml, re
from pathlib import Path

ROOT     = Path(__file__).parent.resolve()
REG_PATH = ROOT / "dataset_registry.yaml"
DATA_DIR = ROOT / "datasets"

def normalize(col):
    # lower, replace spaces & % & - with underscore, drop other punctuation
    s = col.strip().lower()
    s = re.sub(r"%","_pct", s)
    s = re.sub(r"[ \-]+","_", s)
    s = re.sub(r"[^\w_]", "", s)
    return s

# Load registry
reg = yaml.safe_load(REG_PATH.read_text())
datasets = reg["datasets"]

for key, meta in datasets.items():
    url = meta.get("url","")
    if not url.startswith("file://"):
        print(f"→ {key}: skipping HTTP source")
        continue

    csv_file = ROOT / url.replace("file://","")
    if not csv_file.exists():
        print(f"→ {key}: file not found at {csv_file}")
        continue

    # Read header
    import pandas as pd
    df = pd.read_csv(csv_file, nrows=0)
    orig_cols = list(df.columns)
    norm_cols = [normalize(c) for c in orig_cols]

    # Build rename map original→normalized
    rename_map = {orig: norm for orig, norm in zip(orig_cols, norm_cols) if orig!=norm}

    # Overwrite transforms
    meta["transforms"] = [{"rename": rename_map}]

    print(f"→ {key}: added {len(rename_map)} renames")

# Write back
REG_PATH.write_text(yaml.safe_dump(reg, sort_keys=False), encoding="utf-8")
print("\n✅ dataset_registry.yaml updated with rename transforms.")