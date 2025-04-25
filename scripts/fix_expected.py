#!/usr/bin/env python3
"""
scripts/fix_expected.py  —  fast, cached loader + progress tracking

1) Reads dataset_registry.yaml, expects every url to be "file://./datasets/<key>.csv"
2) Loads & applies all transforms once (with progress).
3) Iterates through every case in solutions.yaml, runs its solutionQuery
   in an in-memory SQLite, fills in expected:[…], and writes back.
4) Prints [data i/N] and [case i/M] so you can watch it go.
"""

import sys
import sqlite3
import yaml
import pandas as pd
from pathlib import Path

ROOT     = Path(__file__).resolve().parent.parent
REG_PATH = ROOT / "dataset_registry.yaml"
SOL_PATH = ROOT / "packages/frontend/cases/solutions.yaml"

def load_all():
    print("🔁 Loading & transforming all datasets…", flush=True)
    reg = yaml.safe_load(REG_PATH.read_text())["datasets"]
    dfs = {}
    total = len(reg)
    for i, (key, meta) in enumerate(reg.items(), start=1):
        print(f"  [data {i}/{total}] {key} …", end="", flush=True)
        url = meta.get("url","")
        if not url.startswith("file://"):
            print(f"\n    ❌ Non-local URL for {key}: {url}", file=sys.stderr)
            sys.exit(1)

        path = ROOT / url[7:]
        # skip comments
        df = pd.read_csv(path, comment="#")

        for t in meta.get("transforms", []):
            if "rename" in t:
                df = df.rename(columns=t["rename"])
            if "select" in t:
                df = df[t["select"]]
            if "filter" in t:
                cond = t["filter"]
                if isinstance(cond, str):
                    df = df.query(cond)
                else:
                    for c,v in cond.items():
                        df = df[df[c] == v]

        dfs[key] = df
        print(" done")

    return dfs

def main():
    # 1) load everything
    try:
        dfs = load_all()
    except Exception as e:
        print(f"\n❌ Failed to load datasets: {e}", file=sys.stderr)
        sys.exit(1)

    # 2) load central solutions
    central = yaml.safe_load(SOL_PATH.read_text()) or {}

    # 3) collect all (domain, case, sql)
    tasks = []
    for domain, cases in central.items():
        for case_id, entry in cases.items():
            sql = (entry.get("solutionQuery") or "").strip()
            if sql:
                tasks.append((domain, case_id, sql))
    total = len(tasks)
    print(f"\n🔁 Executing {total} SQL tasks…", flush=True)

    # 4) run each
    for idx, (domain, case_id, sql) in enumerate(tasks, start=1):
        print(f"\n[{idx}/{total}] {domain}/{case_id} …", end="", flush=True)

        stub_path = ROOT / "packages/frontend/cases" / domain / f"{case_id}.yaml"
        if not stub_path.exists():
            print(" ❌ stub missing")
            continue

        stub = yaml.safe_load(stub_path.read_text()) or {}
        ds_list = stub.get("datasets") or []
        if not ds_list and stub.get("dataset_key"):
            ds_list = [{"name":"main","file":f"{stub['dataset_key']}.csv"}]

        con = sqlite3.connect(":memory:")
        cur = con.cursor()
        fail = False

        # load tables
        for ds in ds_list:
            key   = Path(ds["file"]).stem
            tbl   = ds.get("name") or key
            if key not in dfs:
                print(f"\n    ❌ no dataset '{key}'", flush=True)
                fail = True
                break
            try:
                dfs[key].to_sql(tbl, con, index=False, if_exists="replace")
            except Exception as e:
                print(f"\n    ❌ to_sql('{tbl}'): {e}", flush=True)
                fail = True
                break

        if fail:
            con.close()
            continue

        # execute SQL
        try:
            cur.execute(sql)
            rows = cur.fetchall()
        except Exception as e:
            print(f"\n    ❌ SQL error: {e}", flush=True)
            con.close()
            continue

        con.close()
        central[domain][case_id]["expected"] = [list(r) for r in rows]
        print(f" ✔️ {len(rows)} rows", flush=True)

    # 5) write back
    SOL_PATH.write_text(
        yaml.safe_dump(central, sort_keys=True, width=120),
        encoding="utf-8"
    )
    print("\n✅ solutions.yaml updated with all expected blocks.")

if __name__ == "__main__":
    main()