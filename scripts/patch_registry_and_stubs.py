#!/usr/bin/env python3
"""
scripts/patch_registry_and_stubs.py

1) Patches dataset_registry.yaml: adds stub entries for all JOIN-exercises datasets
2) Emits empty CSV stubs under datasets/
3) Patches transforms on core datasets so their columns match the case YAMLs
4) Writes out the 8 JOIN-case stubs into packages/frontend/cases/…
"""

import yaml
from pathlib import Path
import sys

ROOT = Path(__file__).parent.parent.resolve()

# 1) Update dataset_registry.yaml
reg_path = ROOT / "dataset_registry.yaml"
with reg_path.open() as f:
    reg = yaml.safe_load(f)

datasets = reg.setdefault("datasets", {})

# stub entries
stubs = {
    "returns": {
        "url": "file://./datasets/returns.csv",
        "format": "csv",
        "primary_key": "invoice_id",
        "narrative_goal": "Stub: returns data for business joins",
        "transforms": []
    },
    "suspects": {
        "url": "file://./datasets/suspects.csv",
        "format": "csv",
        "primary_key": "suspect_id",
        "narrative_goal": "Stub: suspects for crime joins",
        "transforms": []
    },
    "soil_data": {
        "url": "file://./datasets/soil_data.csv",
        "format": "csv",
        "primary_key": "id",
        "narrative_goal": "Stub: soil measurements for farming joins",
        "transforms": []
    },
    "fraud_alerts": {
        "url": "file://./datasets/fraud_alerts.csv",
        "format": "csv",
        "primary_key": "alert_id",
        "narrative_goal": "Stub: fraud alerts for finance joins",
        "transforms": []
    },
    "treatments": {
        "url": "file://./datasets/treatments.csv",
        "format": "csv",
        "primary_key": "treatment_id",
        "narrative_goal": "Stub: patient treatments for healthcare joins",
        "transforms": []
    },
    "users": {
        "url": "file://./datasets/users.csv",
        "format": "csv",
        "primary_key": "user_id",
        "narrative_goal": "Stub: social users for social joins",
        "transforms": []
    },
    "payloads": {
        "url": "file://./datasets/payloads.csv",
        "format": "csv",
        "primary_key": "payload_id",
        "narrative_goal": "Stub: mission payloads for space joins",
        "transforms": []
    },
    "players": {
        "url": "file://./datasets/players.csv",
        "format": "csv",
        "primary_key": "player_id",
        "narrative_goal": "Stub: per-match scores for sports joins",
        "transforms": []
    },
}

for key, meta in stubs.items():
    if key not in datasets:
        datasets[key] = meta

# patch core-dataset transforms so the SQL queries will find the right column names
core_transforms = {
    "crime_chicago": [
        {"select": ["ID","Date","Primary_Type","Location_Description","Longitude","Latitude"]},
        {"rename":{
            "ID":"id",
            "Date":"date",
            "Primary_Type":"crime_type",
            "Location_Description":"area",
            "Longitude":"longitude",
            "Latitude":"latitude"
        }}
    ],
    "farming_ndvi": [
        {"rename":{"actual_yield":"yield","region":"crop_type"}}
    ],
    "finance_stocks": [
        {"rename":{"Date":"transaction_date"}}
    ],
    "social_twitter": [
        {"rename":{"text":"post_type","created_at":"post_date"}}
    ],
}

for ds_key, transforms in core_transforms.items():
    if ds_key in datasets:
        datasets[ds_key]["transforms"] = transforms

# write back registry
reg_path.write_text(yaml.safe_dump(reg, sort_keys=False), encoding="utf-8")
print("✅ dataset_registry.yaml updated")

# 2) Create stub CSVs
DATASETS_DIR = ROOT / "datasets"
DATASETS_DIR.mkdir(exist_ok=True)
csv_stubs = {
    "returns.csv":           "invoice_id,return_date,return_reason\n",
    "suspects.csv":          "suspect_id,crime_id,suspect_name\n",
    "soil_data.csv":         "id,soil_ph,soil_type\n",
    "fraud_alerts.csv":      "alert_id,transaction_id,amount,alert_type\n",
    "treatments.csv":        "treatment_id,patient_id,diagnosis,treatment_date\n",
    "users.csv":             "user_id,user_name,signup_date\n",
    "payloads.csv":          "payload_id,mission_id,orbit_type,altitude\n",
    "players.csv":           "player_id,match_id,score,match_date\n",
}

for fname, header in csv_stubs.items():
    path = DATASETS_DIR / fname
    path.write_text(header, encoding="utf-8")
print("✅ stub CSV files created under datasets/")

# 3) Write JOIN-case YAML stubs
CASES_ROOT = ROOT / "packages" / "frontend" / "cases"
for domain in ("business","crime","farming","finance","healthcare","social","space","sports"):
    (CASES_ROOT / domain).mkdir(parents=True, exist_ok=True)

join_cases = {
    "business/joins_returns.yaml": f"""\
id: joins_returns
dataset_key: business_retail
datasets:
  - name: main
    file: business_retail.csv
  - name: returns
    file: returns.csv
solutionQuery: |
  SELECT
    main.product_line,
    COUNT(r.invoice_id) AS num_returns
  FROM main
  JOIN returns AS r
    ON main.invoice_id = r.invoice_id
  GROUP BY 1
expected: []
hints:
  - "JOIN sales to returns stub on invoice_id."
""",
    "crime/suspect_joins.yaml": f"""\
id: suspect_joins
dataset_key: crime_chicago
datasets:
  - name: main
    file: crime_chicago.csv
  - name: suspects
    file: suspects.csv
solutionQuery: |
  SELECT
    main.crime_type,
    COUNT(s.suspect_id) AS num_suspects
  FROM main
  LEFT JOIN suspects AS s
    ON main.id = s.crime_id
  GROUP BY 1
expected: []
hints:
  - "LEFT JOIN include crimes without suspects."
""",
    "farming/soil_joins.yaml": f"""\
id: soil_joins
dataset_key: farming_ndvi
datasets:
  - name: main
    file: farming_ndvi.csv
  - name: soil
    file: soil_data.csv
solutionQuery: |
  SELECT
    main.crop_type,
    soil.soil_type,
    AVG(main.ndvi) AS avg_ndvi
  FROM main
  JOIN soil AS soil_data
    ON main.id = soil_data.id
  GROUP BY 1,2
expected: []
hints:
  - "JOIN on id to bring in soil properties."
""",
    "finance/fraud_joins.yaml": f"""\
id: fraud_joins
dataset_key: finance_stocks
datasets:
  - name: main
    file: finance_stocks.csv
  - name: fraud
    file: fraud_alerts.csv
solutionQuery: |
  SELECT
    main.transaction_date,
    COUNT(f.alert_id) AS num_alerts
  FROM main
  LEFT JOIN fraud AS fraud_alerts
    ON main.transaction_date = fraud_alerts.transaction_id
  GROUP BY 1
expected: []
hints:
  - "LEFT JOIN alerts by transaction_date."
""",
    "healthcare/treatment_joins.yaml": f"""\
id: treatment_joins
dataset_key: healthcare_covid
datasets:
  - name: main
    file: healthcare_covid.csv
  - name: treatments
    file: treatments.csv
solutionQuery: |
  SELECT
    main.date AS admission_date,
    COUNT(t.treatment_id) AS num_treatments
  FROM main
  LEFT JOIN treatments AS t
    ON main.iso_code = t.patient_id
  GROUP BY 1
expected: []
hints:
  - "LEFT JOIN COVID to treatments stub."
""",
    "social/user_joins.yaml": f"""\
id: user_joins
dataset_key: social_twitter
datasets:
  - name: main
    file: social_twitter.csv
  - name: users
    file: users.csv
solutionQuery: |
  SELECT
    u.user_name,
    COUNT(m.tweet_id) AS num_tweets
  FROM users AS u
  LEFT JOIN main AS m
    ON u.user_id = m.user_id
  GROUP BY 1
expected: []
hints:
  - "LEFT JOIN tweets to users stub."
""",
    "space/mission_joins.yaml": f"""\
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
    ON m.des = p.mission_id
  GROUP BY 1
expected: []
hints:
  - "JOIN NEO to payloads stub."
""",
    "sports/player_joins.yaml": f"""\
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
  - "JOIN NBA stats to per-match scores."
""",
}

for rel_path, content in join_cases.items():
    full_path = CASES_ROOT / rel_path
    full_path.write_text(content, encoding="utf-8")

print("✅ JOIN-case YAML stubs written")

print("\n🎉 Done! Now re-run your full_sync (or fix_expected.py) and the load/SQL errors should be gone.\n")