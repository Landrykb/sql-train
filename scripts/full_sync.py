#!/usr/bin/env python3
"""
scripts/full_sync_noclean.py

Skips download/clean (you've already done that), and runs:

  1) sync_registry.py
  2) patch the registry with all auxiliary-table transforms
  3) gen_case_stubs.py
  4) fix_stubs.py
  5) fix_expected.py
  6) summarize any remaining failures
"""

import subprocess, sys, ssl
from pathlib import Path
import yaml

# ────────────────────────────────────────────────────────────────────────────────
# SSL workaround on macOS
ssl._create_default_https_context = ssl._create_unverified_context

ROOT        = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT / "scripts"
REGISTRY    = ROOT / "dataset_registry.yaml"
LOG_FIX     = []

def run_script(name):
    path = SCRIPTS_DIR / name
    if not path.exists():
        print(f"❌ Missing {name}", file=sys.stderr)
        sys.exit(1)
    print(f"\n► {name}")
    p = subprocess.run(
        [sys.executable, str(path)],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    print(p.stdout, end="")
    if name == "fix_expected.py":
        LOG_FIX.append(p.stdout)
    if p.returncode != 0:
        print(f"❌ {name} failed → aborting", file=sys.stderr)
        sys.exit(p.returncode)

def patch_registry_aux_transforms():
    """
    Inject the missing 'transforms' entries for all auxiliary tables:
      crime_chicago, social_twitter, farming_ndvi, space_neo, sports_nba
    """
    print("Patching registry with auxiliary-table transforms…")
    data = yaml.safe_load(REGISTRY.read_text(encoding="utf-8"))
    ds   = data.setdefault("datasets", {})

    extras = {
      "crime_chicago": {
        "ID":"id","Date":"date","Primary_Type":"primary_type",
        "Location_Description":"location_description","Longitude":"longitude","Latitude":"latitude"
      },
      "social_twitter": {
        "Tweet_ID":"tweet_id","User_ID":"user_id","Created_At":"created_at","Text":"text"
      },
      "farming_ndvi":      {"actual_yield":"yield"},
      "space_neo": {
        "close_approach_date":"close_approach_date","dist_km":"dist_km",
        "relative_velocity_km_s":"relative_velocity_km_s","is_potentially_hazardous":"is_potentially_hazardous"
      },
      "sports_nba": {
        "Player":"player","Team":"team","Games":"games","Minutes":"minutes","Points":"points"
      }
    }

    for key, ren in extras.items():
        if key not in ds:
            print(f"  ⚠️  registry missing '{key}', skipping")
            continue
        ds[key]["transforms"] = [{"rename": ren}]

    REGISTRY.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    print("✅ dataset_registry.yaml updated")

def summarize():
    """Scan fix_expected output for any remaining ❌ lines."""
    if not LOG_FIX:
        return
    last = LOG_FIX[-1].splitlines()
    errs = [l for l in last if l.strip().startswith("❌")]
    if errs:
        print("\n❗️ fix_expected.py still has failures:")
        for e in errs:
            print("   ", e)
        sys.exit(1)
    else:
        print("\n✅ All expected-blocks are now passing!")

if __name__ == "__main__":
    run_script("sync_registry.py")
    patch_registry_aux_transforms()
    run_script("gen_case_stubs.py")
    run_script("fix_stubs.py")
    run_script("fix_expected.py")
    summarize()