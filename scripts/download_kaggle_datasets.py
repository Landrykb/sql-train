#!/usr/bin/env python3
"""
Download Kaggle datasets for BleepxLab and save subsets to public/datasets/.

Usage:
  KAGGLE_API_TOKEN=your_token python3 scripts/download_kaggle_datasets.py

Requires: pip install kagglehub pandas
"""
import kagglehub
import pandas as pd
import os
import shutil

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'packages', 'frontend', 'public', 'datasets')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Dataset configs: (slug, output_filename, max_rows)
# Output filenames must match the canonical Kaggle CSV filenames verified via
# `https://www.kaggle.com/api/v1/datasets/list/<slug>` — keep this list in
# sync with packages/frontend/lib/kaggleDatasets.ts.
DATASETS = [
    ("khushikyad001/public-transport-delays-with-weather-and-events", "public_transport_delays.csv", 5000),
    ("mlg-ulb/creditcardfraud", "creditcard.csv", 5000),
    ("maharshipandya/-spotify-tracks-dataset", "dataset.csv", 5000),
    ("blastchar/telco-customer-churn", "WA_Fn-UseC_-Telco-Customer-Churn.csv", None),  # small dataset, keep all
    ("rohitsahoo/sales-forecasting", "train.csv", None),
    ("shriyashjagtap/esg-and-financial-performance-dataset", "company_esg_financial_dataset.csv", 5000),
    ("unitednations/international-greenhouse-gas-emissions", "greenhouse_gas_inventory_data_data.csv", 5000),
    ("patelris/crop-yield-prediction-dataset", "yield_df.csv", None),
    ("szrlee/stock-time-series-20050101-to-20171231", "all_stocks_2006-01-01_to_2018-01-01.csv", 5000),
]

def find_csv_files(path):
    """Find all CSV files in a directory (recursively)."""
    csvs = []
    for root, dirs, files in os.walk(path):
        for f in files:
            if f.endswith('.csv'):
                csvs.append(os.path.join(root, f))
    return csvs

def download_and_save(slug, output_name, max_rows):
    print(f"\n{'='*60}")
    print(f"Downloading: {slug}")
    print(f"{'='*60}")
    
    try:
        path = kagglehub.dataset_download(slug)
        print(f"  Downloaded to: {path}")
        
        csv_files = find_csv_files(path)
        if not csv_files:
            print(f"  WARNING: No CSV files found in {path}")
            return False
        
        print(f"  Found CSV files: {[os.path.basename(f) for f in csv_files]}")
        
        # 1. Prefer the CSV whose basename exactly matches `output_name` — this
        #    is the canonical Kaggle filename and always the right choice when
        #    present (e.g. Kaggle ships both `yield.csv` and `yield_df.csv`
        #    for patelris and we want the pre-joined `yield_df.csv`).
        # 2. Otherwise fall back to the largest CSV (useful for mono-file
        #    datasets whose file is not named identically to our target).
        exact_match = next(
            (f for f in csv_files if os.path.basename(f) == output_name),
            None,
        )
        chosen = exact_match or max(csv_files, key=os.path.getsize)
        print(f"  Using: {os.path.basename(chosen)} "
              f"({os.path.getsize(chosen) / 1024 / 1024:.1f} MB)"
              f"{' [exact match]' if exact_match else ' [largest]'}")

        df = pd.read_csv(chosen)
        print(f"  Shape: {df.shape}")
        print(f"  Columns: {df.columns.tolist()}")

        # For the stock dataset, if the pre-merged all_stocks*.csv is not
        # present, fall back to concatenating a handful of per-ticker files.
        if "stock-time-series" in slug and not exact_match:
            dfs = []
            for csv_file in sorted(csv_files)[:10]:
                if os.path.basename(csv_file).startswith('all_stocks'):
                    continue
                sub = pd.read_csv(csv_file)
                name = sub['Name'].iloc[0] if 'Name' in sub.columns else os.path.basename(csv_file).split('_')[0]
                sub['ticker'] = name
                dfs.append(sub.head(1000))
                if len(dfs) >= 5:
                    break
            df = pd.concat(dfs, ignore_index=True)
            print(f"  Merged {len(dfs)} per-ticker files ({len(df)} rows)")

        if max_rows and len(df) > max_rows:
            df = df.sample(n=max_rows, random_state=42).reset_index(drop=True)
            print(f"  Sampled to {max_rows} rows")

        output_path = os.path.join(OUTPUT_DIR, output_name)
        df.to_csv(output_path, index=False)
        
        size_mb = os.path.getsize(output_path) / 1024 / 1024
        print(f"  Saved: {output_path} ({size_mb:.1f} MB)")
        return True
        
    except Exception as e:
        print(f"  ERROR: {e}")
        return False

if __name__ == "__main__":
    print("BleepxLab Dataset Downloader")
    print(f"Output directory: {os.path.abspath(OUTPUT_DIR)}")
    
    success = 0
    failed = 0
    
    for slug, output_name, max_rows in DATASETS:
        if download_and_save(slug, output_name, max_rows):
            success += 1
        else:
            failed += 1
    
    print(f"\n{'='*60}")
    print(f"Done! {success} succeeded, {failed} failed")
    print(f"Files saved to: {os.path.abspath(OUTPUT_DIR)}")
    print(f"{'='*60}")
