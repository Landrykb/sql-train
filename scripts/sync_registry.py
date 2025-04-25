#!/usr/bin/env python3
"""
scripts/sync_registry.py

Syncs dataset_registry.yaml:
 - injects column-rename transforms for business_retail and farming_ndvi
 - creates stub CSVs (+ registry entries) for all join‐case auxiliary tables
"""

import csv
from pathlib import Path
import yaml

ROOT          = Path(__file__).resolve().parent.parent
REGISTRY_PATH = ROOT / "dataset_registry.yaml"
DATASETS_DIR  = ROOT / "datasets"

# ─── Load existing registry ─────────────────────────────────────────────────
with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
    reg = yaml.safe_load(f)
datasets = reg.setdefault("datasets", {})

# ─── 1) business_retail transforms ──────────────────────────────────────────
datasets["business_retail"]["transforms"] = [
    {"rename": {
        "Invoice_ID":                "invoice_id",
        "Product line":              "product_line",
        "Unit price":                "unit_price",
        "Customer type":             "customer_type",
        "gross margin percentage":   "gross_margin_percentage",
        "gross income":              "gross_income",
        "COGS":                      "cogs",
        "Total":                     "total",
        "Rating":                    "rating",
    }},
    {"rename": {
        "Branch": "branch",
        "City":   "city",
        "Gender": "gender",
    }},
]

# ─── 2) farming_ndvi transforms ──────────────────────────────────────────────
datasets["farming_ndvi"]["transforms"] = [
    {"rename": {"actual_yield": "yield"}},
]

# ─── 3) stub definitions for all join/case tables ───────────────────────────
#    (key,           headers,                                      rename_map,                                            narrative)
stub_definitions = [
    ("returns",       ["invoice_id","return_date","return_reason"],
                      {"Invoice_ID":"invoice_id","Return date":"return_date","Return reason":"return_reason"},
                      "Stub returns for business joins"),

    ("suspects",      ["suspect_id","crime_id","suspect_name"],
                      {"Suspect_ID":"suspect_id","Crime_ID":"crime_id"},
                      "Stub suspects for crime joins"),

    ("soil_data",     ["id","soil_ph","soil_type"],
                      {},
                      "Stub soil data for farming joins"),

    ("fraud_alerts",  ["alert_id","transaction_id","amount","alert_type"],
                      {"Alert_ID":"alert_id","Transaction_ID":"transaction_id"},
                      "Stub fraud alerts for finance joins"),

    ("treatments",    ["treatment_id","patient_id","diagnosis","treatment_date"],
                      {"Treatment_ID":"treatment_id","Patient_ID":"patient_id"},
                      "Stub treatments for healthcare joins"),

    ("users",         ["user_id","user_name","signup_date"],
                      {"User_ID":"user_id"},
                      "Stub users for social joins"),

    ("payloads",      ["payload_id","mission_id","orbit_type","altitude"],
                      {"Payload_ID":"payload_id","Mission_ID":"mission_id"},
                      "Stub payloads for space joins"),

    ("players",       ["player_id","match_id","score","match_date"],
                      {"Player_ID":"player_id","Match_ID":"match_id"},
                      "Stub players for sports joins"),

    # ─── newly added auxiliary tables ─────────────────────────────────────
    ("matches",       ["match_id","team","opponent","score","match_date"],
                      {},
                      "Stub matches for sports cases"),

    ("transactions",  ["transaction_id","account_id","transaction_date","amount"],
                      {},
                      "Stub transactions for finance cases"),

    ("finance_stocks",["date","open","high","low","close"],
                      {},
                      "Stub stock prices for finance cases"),

    ("admissions",    ["admission_id","admission_date","patient_id","age"],
                      {},
                      "Stub hospital admissions for healthcare cases"),

    ("diagnoses",     ["diagnosis_id","patient_id","diagnosis"],
                      {},
                      "Stub diagnosis records for healthcare cases"),

    ("posts",         ["post_id","user_id","post_type","post_date","likes"],
                      {},
                      "Stub social posts for social cases"),

    ("patients",      ["patient_id","age"],
                      {},
                      "Stub patient demographics for healthcare cases"),
]

# ─── 4) Create each stub CSV + registry entry if missing ────────────────────
for key, header_row, rename_map, narrative in stub_definitions:
    if key not in datasets:
        # 4a) write stub CSV
        stub_csv = DATASETS_DIR / f"{key}.csv"
        stub_csv.parent.mkdir(parents=True, exist_ok=True)
        if not stub_csv.exists():
            with open(stub_csv, "w", newline="") as csvf:
                csv.writer(csvf).writerow(header_row)

        # 4b) register it
        datasets[key] = {
            "url":            f"file://./datasets/{key}.csv",
            "format":         "csv",
            "primary_key":    header_row[0],
            "narrative_goal": narrative,
            "transforms":     ([{"rename": rename_map}] if rename_map else []),
        }

# ─── 5) Persist changes ─────────────────────────────────────────────────────
with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
    yaml.safe_dump(reg, f, sort_keys=False)

# ─── Confirmation ───────────────────────────────────────────────────────────
print("✅ dataset_registry.yaml synced!")
print("  • business_retail transforms set")
print("  • farming_ndvi transforms set")
for key, *_ in stub_definitions:
    if key in datasets:
        print(f"  • {key} stub and registry entry created (datasets/{key}.csv)")