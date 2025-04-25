import pandas as pd
import pathlib

# Folder where your CSVs are
DATA_DIR = pathlib.Path("datasets")
OUT_DIR = DATA_DIR  # Change to DATA_DIR / "cleaned" if you want to save separately

OUT_DIR.mkdir(parents=True, exist_ok=True)

for file in DATA_DIR.glob("*.csv"):
    df = pd.read_csv(file)

    # Clean headers
    cleaned_columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(' ', '_')
        .str.replace(r'[^\w_]', '', regex=True)
    )
    df.columns = cleaned_columns

    # Clean string values
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].str.strip()

    df.to_csv(OUT_DIR / file.name, index=False)
    print(f"✅ Cleaned: {file.name}")

