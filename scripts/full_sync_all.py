#!/usr/bin/env python3
"""
scripts/full_sync_all.py

1) Populate stub CSVs with examples
2) Patch registry, gen/fix stubs, fix expected (fast, with progress)
"""

import subprocess, sys, ssl
from pathlib import Path

# SSL workaround (macOS)
ssl._create_default_https_context = ssl._create_unverified_context

ROOT        = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT / "scripts"

def run(name):
    print(f"\n► {name}")
    p = subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / name)],
        cwd=ROOT,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    print(p.stdout, end="")
    if p.returncode:
        sys.exit(p.returncode)

def main():
    # 1) bake in all the stub CSVs
    run("populate_stubs.py")

    # 2) patch registry, generate & fix stubs
    run("sync_registry.py")
    run("gen_case_stubs.py")
    run("fix_stubs.py")

    # 3) recompute expected blocks
    run("fix_expected.py")

    print("\n🎉 full_sync_all.py complete!")
    sys.exit(0)

if __name__ == "__main__":
    main()