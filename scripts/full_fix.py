#!/usr/bin/env python3
"""
scripts/full_fix.py

1) Download business_retail & healthcare_covid CSVs locally (skipping SSL cert checks)
2) Patch dataset_registry.yaml:
     • point those two at file://
     • add transforms for crime_chicago, social_twitter, farming_ndvi, space_neo, sports_nba
3) Clean only the downloaded/tabular CSVs to snake_case headers (skip any stub CSVs)
4) Overwrite a handful of stub-YAMLs whose SQL/schema was still wrong
"""
import ssl
import urllib.request
import yaml
import re
import pandas as pd
from pathlib import Path

# ────────────────────────────────────────────────────────────────────────────────
# 1) Bypass SSL certificate verification (macOS/python3 SSL errors)
# ────────────────────────────────────────────────────────────────────────────────
ssl._create_default_https_context = ssl._create_unverified_context

# ────────────────────────────────────────────────────────────────────────────────
# Paths & URLs
# ────────────────────────────────────────────────────────────────────────────────
ROOT          = Path(__file__).resolve().parent.parent
DATASETS_DIR  = ROOT / "datasets"
REGISTRY_PATH = ROOT / "dataset_registry.yaml"
CASES_DIR     = ROOT / "packages" / "frontend" / "cases"

DOWNLOADS = {
    "business_retail.csv":  "https://raw.githubusercontent.com/vnaumq/supermarket_sales/main/supermarket_sales.csv",
    "healthcare_covid.csv": "https://covid.ourworldindata.org/data/owid-covid-data.csv",
}

# ────────────────────────────────────────────────────────────────────────────────
# 2) Download the two big CSVs
# ────────────────────────────────────────────────────────────────────────────────
DATASETS_DIR.mkdir(exist_ok=True)
for fname, url in DOWNLOADS.items():
    out_path = DATASETS_DIR / fname
    print(f"Downloading {fname}…")
    urllib.request.urlretrieve(url, out_path)

# ────────────────────────────────────────────────────────────────────────────────
# 3) Patch dataset_registry.yaml
# ────────────────────────────────────────────────────────────────────────────────
print("Patching dataset_registry.yaml…")
registry = yaml.safe_load(REGISTRY_PATH.read_text(encoding="utf-8"))
ds = registry.setdefault("datasets", {})

# 3a) Redirect the two big remotes to our local copies:
ds["business_retail"]["url"]  = "file://./datasets/business_retail.csv"
ds["healthcare_covid"]["url"] = "file://./datasets/healthcare_covid.csv"

# 3b) Inject the missing transforms for the other built-in datasets:
ds["crime_chicago"]["transforms"] = [
    {"rename": {
        "ID": "id",
        "Date": "date",
        "Primary_Type": "primary_type",
        "Location_Description": "location_description",
        "Longitude": "longitude",
        "Latitude": "latitude",
    }}
]
ds["social_twitter"]["transforms"] = [
    {"rename": {
        "Tweet_ID":   "tweet_id",
        "User_ID":    "user_id",
        "Created_At": "created_at",
        "Text":       "text",
    }}
]
ds["farming_ndvi"]["transforms"] = [
    {"rename": {"actual_yield": "yield"}}
]
ds["space_neo"]["transforms"] = [
    {"rename": {
        "close_approach_date":       "close_approach_date",
        "dist_km":                   "dist_km",
        "relative_velocity_km_s":    "relative_velocity_km_s",
        "is_potentially_hazardous":  "is_potentially_hazardous",
    }}
]
ds["sports_nba"]["transforms"] = [
    {"rename": {
        "Player":  "player",
        "Team":    "team",
        "Games":   "games",
        "Minutes": "minutes",
        "Points":  "points",
    }}
]

# write back
REGISTRY_PATH.write_text(
    yaml.safe_dump(registry, sort_keys=False),
    encoding="utf-8"
)
print("✅ dataset_registry.yaml patched")

# ────────────────────────────────────────────────────────────────────────────────
# 4) Clean only the “real” CSVs to snake_case (skip any stub CSVs)
# ────────────────────────────────────────────────────────────────────────────────
def snake_case(s: str) -> str:
    s = re.sub(r"[^\w\s]", "", s)    # drop punctuation
    s = s.strip().lower().replace(" ", "_")
    s = re.sub(r"__+", "_", s)
    return s

print("🧹 Cleaning CSV headers to snake_case…")
for csv_path in DATASETS_DIR.glob("*.csv"):
    text = csv_path.read_text(encoding="utf-8")
    # find first non-blank line
    first = ""
    for L in text.splitlines():
        if L.strip():
            first = L.strip()
            break
    # if there's no comma, it's just a stub → skip it
    if "," not in first:
        print(f"  • skipping stub: {csv_path.name}")
        continue

    df   = pd.read_csv(csv_path, dtype=str)
    orig = list(df.columns)
    newc = [snake_case(c) for c in orig]
    df.columns = newc
    # strip whitespace from all string columns
    for c in df.select_dtypes(include="object"):
        df[c] = df[c].str.strip()
    df.to_csv(csv_path, index=False)

    print(f"  • cleaned {csv_path.name}")
    for o, n in zip(orig, newc):
        if o != n:
            print(f"      {o!r} → {n!r}")

# ────────────────────────────────────────────────────────────────────────────────
# 5) Overwrite the stub YAMLs whose SQL/schema was still wrong
# ────────────────────────────────────────────────────────────────────────────────
print("Writing corrected stub YAMLs…")
stubs = {
    # farming
    "farming/cte_soil.yaml": """\
id: cte_soil
dataset_key: farming_ndvi
datasets:
  - name: main
    file: farming_ndvi.csv
  - name: soil
    file: soil_data.csv
solutionQuery: |
  SELECT
    main.id,
    main.region,
    main.year,
    soil.soil_type,
    main.ndvi
  FROM main
  JOIN soil AS soil
    ON main.id = soil.id
expected: []
hints:
  - "JOIN on id to bring in soil properties."
""",
    "farming/yield_by_crop.yaml": """\
id: yield_by_crop
dataset_key: farming_ndvi
datasets:
  - name: main
    file: farming_ndvi.csv
solutionQuery: |
  SELECT
    region,
    SUM(yield) AS total_yield
  FROM main
  GROUP BY 1
expected: []
hints:
  - "GROUP BY region and SUM the yield."
""",
    # finance
    "finance/fraud_joins.yaml": """\
id: fraud_joins
dataset_key: finance_stocks
datasets:
  - name: main
    file: finance_stocks.csv
  - name: fraud
    file: fraud_alerts.csv
solutionQuery: |
  SELECT
    f.transaction_id,
    COUNT(f.alert_id) AS num_alerts
  FROM fraud AS f
  GROUP BY 1
expected: []
hints:
  - "COUNT alerts per transaction_id."
""",
    # social placeholders
    "social/likes_trend.yaml":    'id: likes_trend\nsolutionQuery: "-- FIXME: define once users.csv exists"\nexpected: []\nhints: []\n',
    "social/post_select.yaml":    'id: post_select\nsolutionQuery: "-- FIXME: define once posts.csv exists"\nexpected: []\nhints: []\n',
    "social/cte_engagement.yaml": 'id: cte_engagement\nsolutionQuery: "-- FIXME: define once users.csv exists"\nexpected: []\nhints: []\n',
    # space
    "space/orbit_select.yaml": """\
id: orbit_select
dataset_key: space_neo
datasets:
  - name: payloads
    file: payloads.csv
solutionQuery: |
  SELECT
    orbit_type,
    COUNT(payload_id) AS num_payloads
  FROM payloads
  GROUP BY 1
expected: []
hints:
  - "COUNT payloads by orbit_type."
""",
    "space/orbit_trend.yaml": """\
id: orbit_trend
dataset_key: space_neo
datasets:
  - name: main
    file: space_neo.csv
solutionQuery: |
  SELECT
    close_approach_date,
    COUNT(des) AS num_approaches
  FROM main
  GROUP BY 1
expected: []
hints:
  - "TREND of close approaches over time."
""",
    "space/mission_joins.yaml": """\
id: mission_joins
dataset_key: space_neo
datasets:
  - name: main
    file: space_neo.csv
  - name: payloads
    file: payloads.csv
solutionQuery: |
  SELECT
    p.orbit_type,
    COUNT(m.des) AS num_approaches
  FROM main AS m
  JOIN payloads AS p
    ON m.des = p.payload_id
  GROUP BY 1
expected: []
hints:
  - "JOIN on payload_id → des to count per orbit_type."
""",
    # sports
    "sports/cte_player.yaml": """\
id: cte_player
dataset_key: sports_nba
datasets:
  - name: main
    file: sports_nba.csv
  - name: players
    file: players.csv
solutionQuery: |
  SELECT
    p.player_id,
    AVG(p.score) OVER (PARTITION BY p.player_id) AS avg_score
  FROM players AS p
expected: []
hints:
  - "Window function over player_id."
""",
    "sports/player_joins.yaml": """\
id: player_joins
dataset_key: sports_nba
datasets:
  - name: main
    file: sports_nba.csv
  - name: players
    file: players.csv
solutionQuery: |
  SELECT
    m.team,
    AVG(p.score) AS avg_score
  FROM main AS m
  JOIN players AS p
    ON m.player = p.player_id
  GROUP BY 1
expected: []
hints:
  - "JOIN on player_id to combine per‐match scores with team stats."
""",
}

for rel, txt in stubs.items():
    p = CASES_DIR / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(txt, encoding="utf-8")
    print(f"Wrote stub: {rel}")

print("\n✅ patches applied. Now re-run:\n    ./scripts/full_sync.py")