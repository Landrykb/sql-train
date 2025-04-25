#!/usr/bin/env python3
import subprocess, sys

def run(cmd):
    print("\n►", " ".join(cmd))
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    PY = sys.executable
    # 1) Generate any missing case YAMLs
    run([PY, "scripts/gen_case_stubs.py"])
    # 1a) Auto-fill stub files with dataset_key & datasets entries
    run([PY, "scripts/fix_stubs.py"])
    # 1b) Auto-update registry transforms from CSV headers
    run([PY, "scripts/auto_registry_update.py"])
    # 2) Audit registry → CSV coverage (you'll still paste fixes manually)
    run([PY, "scripts/audit_registry.py"])
    # 3) Finally, re-generate expected rows
    run([PY, "scripts/fix_expected.py"])
    print("\n✅ auto_setup complete. Please:")
    print("   • fill in dataset_registry.yaml transforms for any missing columns")
    print("   • open the newly created stubs under packages/frontend/cases/* and complete them")
    print("   • re-run auto_setup.py or fix_expected.py once those edits are done.")