#!/usr/bin/env python3
"""One-shot migration: rewrite all lab-project YAML references from our
descriptive dataset filenames to the exact Kaggle canonical filenames,
so learners who download the file from Kaggle can drop it straight
into the lab without renaming.

Run from the repo root:
    python3 scripts/rename_kaggle_datasets.py
"""
from __future__ import annotations
import pathlib

SUBSTITUTIONS = [
    ("/datasets/creditcard_fraud.csv", "/datasets/creditcard.csv"),
    ("/datasets/telco_churn.csv", "/datasets/WA_Fn-UseC_-Telco-Customer-Churn.csv"),
    ("/datasets/sales_forecasting.csv", "/datasets/train.csv"),
    ("/datasets/crop_yield.csv", "/datasets/yield_df.csv"),
    ("/datasets/spotify_tracks.csv", "/datasets/dataset.csv"),
    ("/datasets/stock_prices.csv", "/datasets/all_stocks_2006-01-01_to_2018-01-01.csv"),
    # 2024-11: align with canonical Kaggle filenames verified via API.
    ("/datasets/esg_scores.csv", "/datasets/company_esg_financial_dataset.csv"),
    ("/datasets/transport_delays.csv", "/datasets/public_transport_delays.csv"),
    ("/datasets/ghg_emissions.csv", "/datasets/greenhouse_gas_inventory_data_data.csv"),
]

ROOT = pathlib.Path("packages/frontend/lab-projects")

def main() -> None:
    if not ROOT.exists():
        raise SystemExit(f"Lab projects folder not found: {ROOT}")
    files_changed = 0
    total_replacements = 0
    for yaml_path in ROOT.rglob("*.yaml"):
        text = yaml_path.read_text(encoding="utf-8")
        original = text
        for old, new in SUBSTITUTIONS:
            count = text.count(old)
            if count:
                text = text.replace(old, new)
                total_replacements += count
        if text != original:
            yaml_path.write_text(text, encoding="utf-8")
            files_changed += 1
            print(f"  updated {yaml_path}")
    print(f"\n{files_changed} files updated, {total_replacements} replacements made.")

if __name__ == "__main__":
    main()
