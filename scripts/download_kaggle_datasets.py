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
DATASETS = [
    ("khushikyad001/public-transport-delays-with-weather-and-events", "transport_delays.csv", 5000),
    ("mlg-ulb/creditcardfraud", "creditcard_fraud.csv", 5000),
    ("maharshipandya/-spotify-tracks-dataset", "spotify_tracks.csv", 5000),
    ("blastchar/telco-customer-churn", "telco_churn.csv", None),  # small dataset, keep all
    ("rohitsahoo/sales-forecasting", "sales_forecasting.csv", None),
    ("shriyashjagtap/esg-and-financial-performance-dataset", "esg_scores.csv", 5000),
    ("unitednations/international-greenhouse-gas-emissions", "ghg_emissions.csv", 5000),
    ("patelris/crop-yield-prediction-dataset", "crop_yield.csv", None),
    ("szrlee/stock-time-series-20050101-to-20171231", "stock_prices.csv", 5000),
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
        
        # For stock dataset, merge multiple files; for others, use largest CSV
        if "stock-time-series" in slug:
            # Merge first 5 stock files into one
            dfs = []
            for csv_file in sorted(csv_files)[:10]:
                df = pd.read_csv(csv_file)
                name = df['Name'].iloc[0] if 'Name' in df.columns else os.path.basename(csv_file).split('_')[0]
                df['ticker'] = name
                df = df.head(1000)
                dfs.append(df)
                if len(dfs) >= 5:
                    break
            combined = pd.concat(dfs, ignore_index=True)
            output_path = os.path.join(OUTPUT_DIR, output_name)
            combined.to_csv(output_path, index=False)
            print(f"  Merged {len(dfs)} stock files -> {output_name} ({len(combined)} rows)")
        else:
            # Use the largest CSV file
            largest = max(csv_files, key=os.path.getsize)
            print(f"  Using: {os.path.basename(largest)} ({os.path.getsize(largest) / 1024 / 1024:.1f} MB)")
            
            df = pd.read_csv(largest)
            print(f"  Shape: {df.shape}")
            print(f"  Columns: {df.columns.tolist()}")
            
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
