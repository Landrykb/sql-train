#!/usr/bin/env python3
"""
scripts/populate_stubs.py

Create stub CSVs with realistic sample rows and register them
in dataset_registry.yaml so that fix_expected will have every table it needs.
"""

import csv
import yaml
from pathlib import Path

ROOT           = Path(__file__).resolve().parent.parent
DATASETS_DIR   = ROOT / "datasets"
REGISTRY_PATH  = ROOT / "dataset_registry.yaml"

# ─── YOUR COMPLETE STUB DEFINITION ──────────────────────────────────────────
STUBS = {
    "returns.csv": {
        "headers": ["invoice_id", "return_date", "return_reason"],
        "rows": [
            ["750-67-8428", "2023-01-15", "damaged"],
            ["750-67-8428", "2023-01-20", "wrong size"],
            ["750-67-8429", "2023-02-01", "late delivery"],
        ],
    },
    "suspects.csv": {
        "headers": ["suspect_id", "crime_id", "suspect_name"],
        "rows": [
            ["1001", "5001", "John Doe"],
            ["1002", "5001", "Jane Smith"],
            ["1003", "5002", "Bill Murray"],
        ],
    },
    "soil_data.csv": {
        "headers": ["id", "soil_ph", "soil_type"],
        "rows": [
            ["1", "6.5", "sandy loam"],
            ["2", "7.0", "clay"],
            ["3", "5.8", "peat"],
        ],
    },
    "fraud_alerts.csv": {
        "headers": ["alert_id", "transaction_id", "amount", "alert_type"],
        "rows": [
            ["A1", "T100", "250.00", "unusual_location"],
            ["A2", "T101", "9999.99", "large_amount"],
            ["A3", "T100", "250.00", "repeated_decline"],
        ],
    },
    "treatments.csv": {
        "headers": ["treatment_id", "patient_id", "diagnosis", "treatment_date"],
        "rows": [
            ["TR1", "P1", "flu",   "2023-02-10"],
            ["TR2", "P2", "covid", "2023-03-05"],
            ["TR3", "P1", "cold",  "2023-04-01"],
        ],
    },
    "users.csv": {
        "headers": ["user_id", "user_name", "signup_date"],
        "rows": [
            ["U1", "alice", "2022-11-01"],
            ["U2", "bob",   "2022-12-15"],
            ["U3", "carol", "2023-01-20"],
        ],
    },
    "payloads.csv": {
        "headers": ["payload_id", "mission_id", "orbit_type", "altitude"],
        "rows": [
            ["PL1", "M1", "LEO", "400"],
            ["PL2", "M2", "GEO", "35786"],
            ["PL3", "M1", "LEO", "410"],
        ],
    },
    "players.csv": {
        "headers": ["player_id", "match_id", "score", "match_date"],
        "rows": [
            ["P1", "M1", "24", "2023-05-01"],
            ["P2", "M1", "30", "2023-05-01"],
            ["P1", "M2", "18", "2023-05-03"],
        ],
    },
    "matches.csv": {
        "headers": ["match_id", "team", "opponent", "score", "match_date"],
        "rows": [
            ["M1", "Heat",    "Lakers", "102-99", "2023-05-01"],
            ["M2", "Heat",    "Celtics","95-100", "2023-05-03"],
            ["M3", "Lakers",  "Heat",   "110-108","2023-05-05"],
        ],
    },
    "transactions.csv": {
        "headers": ["transaction_id", "account_id", "transaction_date", "amount"],
        "rows": [
            ["T100", "A1", "2023-04-01", "250.00"],
            ["T101", "A2", "2023-04-02", "9999.99"],
            ["T102", "A1", "2023-04-03",   "13.50"],
        ],
    },
    "finance_stocks.csv": {
        "headers": ["date","open","high","low","close"],
        "rows": [
            ["2023-05-01","100","105","99","104"],
            ["2023-05-02","104","108","102","107"],
            ["2023-05-03","107","110","106","109"],
        ],
    },
    "admissions.csv": {
        "headers": ["admission_id","admission_date","patient_id","age"],
        "rows": [
            ["AD1","2023-01-10","P1","34"],
            ["AD2","2023-02-20","P2","29"],
            ["AD3","2023-03-15","P3","42"],
        ],
    },
    "diagnoses.csv": {
        "headers": ["diagnosis_id","patient_id","diagnosis"],
        "rows": [
            ["D1","P1","flu"],
            ["D2","P2","covid"],
            ["D3","P3","allergy"],
        ],
    },
    "posts.csv": {
        "headers": ["post_id","user_id","post_type","post_date","likes"],
        "rows": [
            ["PS1","U1","text","2023-04-01","10"],
            ["PS2","U2","image","2023-04-02","25"],
            ["PS3","U1","text","2023-04-03","7"],
        ],
    },
    "patients.csv": {
        "headers": ["patient_id","age"],
        "rows": [
            ["P1","34"], ["P2","29"], ["P3","42"]
        ],
    },
}

# ─── 1) Load the registry ──────────────────────────────────────────────────
with open(REGISTRY_PATH, encoding="utf-8") as f:
    reg = yaml.safe_load(f)
datasets = reg.setdefault("datasets", {})

# ─── 2) Ensure the data folder exists ──────────────────────────────────────
DATASETS_DIR.mkdir(parents=True, exist_ok=True)

# ─── 3) Write each stub CSV + register it ─────────────────────────────────
for fname, spec in STUBS.items():
    key = Path(fname).stem
    csv_path = DATASETS_DIR / fname

    # 3a) Create the CSV with headers + example rows
    if not csv_path.exists():
        with open(csv_path, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(spec["headers"])
            for row in spec["rows"]:
                w.writerow(row)
        print(f"🟢 Created   {fname}")
    else:
        print(f"⚪️  Exists    {fname}")

    # 3b) Add a registry entry if missing
    if key not in datasets:
        datasets[key] = {
            "url":           f"file://./datasets/{fname}",
            "format":        "csv",
            "primary_key":   spec["headers"][0],
            "narrative_goal": f"Stub data for {key}",
            "transforms":    []  # CSV is already lower_snake
        }
        print(f"✅ Registered {key}")
    else:
        print(f"⚪️  In registry {key}")

# ─── 4) Persist changes ───────────────────────────────────────────────────
with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
    yaml.safe_dump(reg, f, sort_keys=False)

print("\n🎉 populate_stubs.py complete — now all your auxiliary CSVs are live in both `datasets/` and `dataset_registry.yaml`.")