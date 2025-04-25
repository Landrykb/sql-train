#!/usr/bin/env python3
import pandas as pd
import pathlib

# Directory containing CSVs
DATA_DIR = pathlib.Path("datasets")
OUT_DIR = DATA_DIR

OUT_DIR.mkdir(parents=True, exist_ok=True)

for file in DATA_DIR.glob("*.csv"):
    print(f"\n🔍 Processing: {file.name}")
    df = pd.read_csv(file)

    # Clean column names
    cleaned_columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(' ', '_')
        .str.replace(r'[^\w_]', '', regex=True)
    )

    # Show changes
    for orig, new in zip(df.columns, cleaned_columns):
        print(f"  {orig} -> {new}")

    # Apply cleaning
    df.columns = cleaned_columns
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].str.strip()
    df.to_csv(OUT_DIR / file.name, index=False)
    print(f"✅ Saved cleaned: {file.name}")