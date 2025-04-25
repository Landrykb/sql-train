#!/usr/bin/env python3
# scripts/full_join_setup.py

"""
1) Patch dataset_registry.yaml with stub entries for all join tables.
2) Generate dummy CSVs for returns, suspects, soil_data, fraud_alerts,
   treatments, users, payloads and players under datasets/.
3) Overwrite the join‐case YAML stubs to point to those tables
   with the correct solutionQuery blocks.
"""

import yaml, random
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).parent.parent
REG_PATH = ROOT / "dataset_registry.yaml"
DATA_DIR = ROOT / "datasets"
CASES_DIR = ROOT / "packages/frontend/cases"

def patch_registry():
    stub_defs = {
        "returns": {
            "url": "file://./datasets/returns.csv",
            "format": "csv",
            "primary_key": "invoice_id",
            "narrative_goal": "Stub returns data",
            "transforms": []
        },
        "suspects": {
            "url": "file://./datasets/suspects.csv",
            "format": "csv",
            "primary_key": "suspect_id",
            "narrative_goal": "Stub suspects list",
            "transforms": []
        },
        "soil_data": {
            "url": "file://./datasets/soil_data.csv",
            "format": "csv",
            "primary_key": "id",
            "narrative_goal": "Stub soil measurements",
            "transforms": []
        },
        "fraud_alerts": {
            "url": "file://./datasets/fraud_alerts.csv",
            "format": "csv",
            "primary_key": "alert_id",
            "narrative_goal": "Stub fraud alerts",
            "transforms": []
        },
        "treatments": {
            "url": "file://./datasets/treatments.csv",
            "format": "csv",
            "primary_key": "treatment_id",
            "narrative_goal": "Stub patient treatments",
            "transforms": []
        },
        "users": {
            "url": "file://./datasets/users.csv",
            "format": "csv",
            "primary_key": "user_id",
            "narrative_goal": "Stub social users",
            "transforms": []
        },
        "payloads": {
            "url": "file://./datasets/payloads.csv",
            "format": "csv",
            "primary_key": "payload_id",
            "narrative_goal": "Stub mission payload metadata",
            "transforms": []
        },
        "players": {
            "url": "file://./datasets/players.csv",
            "format": "csv",
            "primary_key": "player_id",
            "narrative_goal": "Stub per-match player scores",
            "transforms": []
        }
    }

    reg = yaml.safe_load(REG_PATH.read_text())
    ds = reg.setdefault("datasets", {})
    changed = False
    for key, meta in stub_defs.items():
        if key not in ds:
            ds[key] = meta
            changed = True

    if changed:
        REG_PATH.write_text(yaml.safe_dump(reg, sort_keys=False), encoding="utf-8")
        print("✅ dataset_registry.yaml patched with auxiliary tables")
    else:
        print("⚑ dataset_registry.yaml already contains all auxiliary tables")

def generate_dummy_csvs():
    DATA_DIR.mkdir(exist_ok=True)
    # 1) returns.csv
    sales = pd.read_csv(DATA_DIR / "business_retail.csv")
    inv = sales["invoice_id"].dropna().unique().tolist()
    pick = random.sample(inv, min(20, len(inv)))
    df = pd.DataFrame({
        "invoice_id": pick,
        "return_date": (pd.to_datetime("2021-01-01")
                        + pd.to_timedelta(np.random.randint(1,60,len(pick)), unit="D")),
        "return_reason": random.choices(
            ["Damaged","Wrong Item","Changed Mind","Late Delivery"], k=len(pick))
    })
    df.to_csv(DATA_DIR / "returns.csv", index=False)

    # 2) suspects.csv
    crime = pd.read_csv(DATA_DIR / "crime_chicago.csv")
    cids = crime["id"].dropna().unique().tolist()
    pick = random.sample(cids, min(20, len(cids)))
    df = pd.DataFrame({
        "suspect_id": range(1,len(pick)+1),
        "crime_id": pick,
        "suspect_name": [f"Suspect_{i}" for i in range(1,len(pick)+1)]
    })
    df.to_csv(DATA_DIR / "suspects.csv", index=False)

    # 3) soil_data.csv
    farm = pd.read_csv(DATA_DIR / "farming_ndvi.csv")
    fids = farm["id"].dropna().unique().tolist()
    df = pd.DataFrame({
        "id": fids,
        "soil_ph": np.round(np.random.uniform(5.5,7.5,len(fids)),2),
        "soil_type": random.choices(["Loamy","Sandy","Clay","Silty"],k=len(fids))
    })
    df.to_csv(DATA_DIR / "soil_data.csv", index=False)

    # 4) fraud_alerts.csv
    stocks = pd.read_csv(DATA_DIR / "finance_stocks.csv")
    dates = stocks["date"].dropna().unique().tolist()
    pick = random.sample(dates, min(20, len(dates)))
    df = pd.DataFrame({
        "alert_id": range(1,len(pick)+1),
        "transaction_id": pick,
        "amount": np.round(np.random.uniform(100,1000,len(pick)),2),
        "alert_type": random.choices(
            ["Large Withdrawal","Suspicious Transfer","Overseas Charge"],k=len(pick))
    })
    df.to_csv(DATA_DIR / "fraud_alerts.csv", index=False)

    # 5) treatments.csv
    covid = pd.read_csv(DATA_DIR / "healthcare_covid.csv")
    codes = covid["iso_code"].dropna().unique().tolist()
    pick = random.sample(codes, min(20, len(codes)))
    df = pd.DataFrame({
        "treatment_id": range(1,len(pick)+1),
        "patient_id": pick,
        "diagnosis": random.choices(
            ["Flu","Covid","Pneumonia","Bronchitis"],k=len(pick)),
        "treatment_date": (pd.to_datetime("2021-01-01")
                           + pd.to_timedelta(np.random.randint(1,365,len(pick)), unit="D"))
    })
    df.to_csv(DATA_DIR / "treatments.csv", index=False)

    # 6) users.csv
    tw = pd.read_csv(DATA_DIR / "social_twitter.csv")
    uids = tw["user_id"].dropna().unique().tolist()
    pick = random.sample(uids, min(20, len(uids)))
    df = pd.DataFrame({
        "user_id": pick,
        "user_name": [f"user_{uid}" for uid in pick],
        "signup_date": (pd.to_datetime("2020-01-01")
                        + pd.to_timedelta(np.random.randint(1,365,len(pick)), unit="D"))
    })
    df.to_csv(DATA_DIR / "users.csv", index=False)

    # 7) payloads.csv
    space = pd.read_csv(DATA_DIR / "space_neo.csv")
    neos = space["des"].dropna().unique().tolist()
    pick = random.sample(neos, min(20, len(neos)))
    df = pd.DataFrame({
        "payload_id": range(1,len(pick)+1),
        "mission_id": pick,
        "orbit_type": random.choices(["LEO","GEO","MEO","HEO"],k=len(pick)),
        "altitude": np.round(np.random.uniform(200,36000,len(pick)),1)
    })
    df.to_csv(DATA_DIR / "payloads.csv", index=False)

    # 8) players.csv
    nba = pd.read_csv(DATA_DIR / "sports_nba.csv")
    pls = nba["player"].dropna().unique().tolist()
    pick = random.sample(pls, min(20, len(pls)))
    df = pd.DataFrame({
        "player_id": pick,
        "match_id": np.random.randint(1,50,len(pick)),
        "score": np.random.randint(0,40,len(pick)),
        "match_date": (pd.to_datetime("2021-10-01")
                       + pd.to_timedelta(np.random.randint(1,200,len(pick)), unit="D"))
    })
    df.to_csv(DATA_DIR / "players.csv", index=False)

    print("✅ Generated all auxiliary CSVs in datasets/")

def overwrite_stub(path, content):
    path.write_text(content.strip() + "\n", encoding="utf-8")
    print(f"✏️  Updated stub: {path.relative_to(ROOT)}")

def patch_stubs():
    # mapping stub‐YAML relative path → file content
    stubs = {
        "business/joins_returns.yaml": """
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
  - "Use a JOIN between the sales table (main) and the returns table on invoice_id."
""",
        "crime/suspect_joins.yaml": """
id: suspect_joins
dataset_key: crime_chicago
datasets:
  - name: main
    file: crime_chicago.csv
  - name: suspects
    file: suspects.csv
solutionQuery: |
  SELECT
    main.primary_type    AS crime_type,
    COUNT(s.suspect_id)  AS num_suspects
  FROM main
  LEFT JOIN suspects AS s
    ON main.id = s.crime_id
  GROUP BY 1
expected: []
hints:
  - "LEFT JOIN to include crimes even if they have no suspects."
""",
        "farming/soil_joins.yaml": """
id: soil_joins
dataset_key: farming_ndvi
datasets:
  - name: main
    file: farming_ndvi.csv
  - name: soil
    file: soil_data.csv
solutionQuery: |
  SELECT
    main.region,
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
        "finance/fraud_joins.yaml": """
id: fraud_joins
dataset_key: finance_stocks
datasets:
  - name: main
    file: finance_stocks.csv
  - name: fraud
    file: fraud_alerts.csv
solutionQuery: |
  SELECT
    main.date                AS transaction_date,
    COUNT(f.alert_id)        AS num_alerts
  FROM main
  LEFT JOIN fraud AS fraud_alerts
    ON main.date = fraud_alerts.transaction_id
  GROUP BY 1
expected: []
hints:
  - "LEFT JOIN to count alerts per transaction."
""",
        "healthcare/treatment_joins.yaml": """
id: treatment_joins
dataset_key: healthcare_covid
datasets:
  - name: main
    file: healthcare_covid.csv
  - name: treatments
    file: treatments.csv
solutionQuery: |
  SELECT
    main.date           AS admission_date,
    COUNT(t.treatment_id) AS num_treatments
  FROM main
  LEFT JOIN treatments AS t
    ON main.iso_code = t.patient_id
  GROUP BY 1
expected: []
hints:
  - "JOIN vaccine data to treatment records by patient_id."
""",
        "social/user_joins.yaml": """
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
  - "LEFT JOIN tweets to users to get tweet counts per user."
""",
        "space/mission_joins.yaml": """
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
  - "MATCH NEO approaches to payloads by mission_id."
""",
        "sports/player_joins.yaml": """
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
  - "JOIN the aggregated NBA stats to the per-match scores by player_id."
"""
    }

    for relpath, content in stubs.items():
        f = CASES_DIR / relpath
        overwrite_stub(f, content)

def main():
    patch_registry()
    generate_dummy_csvs()
    patch_stubs()
    print("\n✅ All auxiliary datasets and join-case stubs are in place.")
    print("   Now run `./scripts/full_sync.py` to regenerate expected results.")

if __name__ == "__main__":
    main()