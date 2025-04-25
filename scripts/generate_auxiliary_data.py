#!/usr/bin/env python3
# scripts/generate_auxiliary_data.py

import pandas as pd
import numpy as np
import random
from pathlib import Path

def main():
    project_root = Path.cwd()
    datasets = project_root / "datasets"
    if not datasets.exists():
        raise RuntimeError(f"datasets/ directory not found at {datasets}")

    # 1) RETURNS
    sales = pd.read_csv(datasets / "business_retail.csv")
    invoice_ids = sales["invoice_id"].dropna().unique().tolist()
    sample_ids = random.sample(invoice_ids, min(20, len(invoice_ids)))
    df_returns = pd.DataFrame({
        "invoice_id": sample_ids,
        "return_date": (
            pd.to_datetime("2021-01-01")
            + pd.to_timedelta(np.random.randint(1,100,size=len(sample_ids)), unit="D")
        ),
        "return_reason": random.choices(
            ["Damaged", "Wrong Item", "Customer Changed Mind", "Late Delivery"],
            k=len(sample_ids)
        )
    })
    df_returns.to_csv(datasets / "returns.csv", index=False)

    # 2) SUSPECTS
    crime = pd.read_csv(datasets / "crime_chicago.csv")
    crime_ids = crime["id"].dropna().unique().tolist()
    sample_crime_ids = random.sample(crime_ids, min(20, len(crime_ids)))
    df_suspects = pd.DataFrame({
        "suspect_id": range(1, len(sample_crime_ids)+1),
        "crime_id": sample_crime_ids,
        "suspect_name": [f"Suspect_{i}" for i in range(1, len(sample_crime_ids)+1)]
    })
    df_suspects.to_csv(datasets / "suspects.csv", index=False)

    # 3) SOIL_DATA
    farm = pd.read_csv(datasets / "farming_ndvi.csv")
    farm_ids = farm["id"].dropna().unique().tolist()
    df_soil = pd.DataFrame({
        "id": farm_ids,
        "soil_ph": np.round(np.random.uniform(5.5, 7.5, size=len(farm_ids)), 2),
        "soil_type": random.choices(["Loamy","Sandy","Clay","Silty"], k=len(farm_ids))
    })
    df_soil.to_csv(datasets / "soil_data.csv", index=False)

    # 4) FRAUD_ALERTS
    stocks = pd.read_csv(datasets / "finance_stocks.csv")
    dates = stocks["date"].dropna().unique().tolist()
    sample_dates = random.sample(dates, min(20, len(dates)))
    df_fraud = pd.DataFrame({
        "alert_id": range(1, len(sample_dates)+1),
        "transaction_id": sample_dates,
        "amount": np.round(np.random.uniform(100,1000,size=len(sample_dates)),2),
        "alert_type": random.choices(
            ["Large Withdrawal","Suspicious Transfer","Overseas Charge"],
            k=len(sample_dates)
        )
    })
    df_fraud.to_csv(datasets / "fraud_alerts.csv", index=False)

    # 5) TREATMENTS
    covid = pd.read_csv(datasets / "healthcare_covid.csv")
    iso_codes = covid["iso_code"].dropna().unique().tolist()
    sample_iso = random.sample(iso_codes, min(20, len(iso_codes)))
    df_treat = pd.DataFrame({
        "treatment_id": range(1, len(sample_iso)+1),
        "patient_id": sample_iso,
        "diagnosis": random.choices(
            ["Flu","Covid","Pneumonia","Bronchitis"], k=len(sample_iso)
        ),
        "treatment_date": (
            pd.to_datetime("2021-01-01")
            + pd.to_timedelta(np.random.randint(1,365,size=len(sample_iso)), unit="D")
        )
    })
    df_treat.to_csv(datasets / "treatments.csv", index=False)

    # 6) USERS
    twitter = pd.read_csv(datasets / "social_twitter.csv")
    user_ids = twitter["user_id"].dropna().unique().tolist()
    sample_users = random.sample(user_ids, min(20, len(user_ids)))
    df_users = pd.DataFrame({
        "user_id": sample_users,
        "user_name": [f"user_{uid}" for uid in sample_users],
        "signup_date": (
            pd.to_datetime("2020-01-01")
            + pd.to_timedelta(np.random.randint(1,365,size=len(sample_users)), unit="D")
        )
    })
    df_users.to_csv(datasets / "users.csv", index=False)

    # 7) PAYLOADS
    space = pd.read_csv(datasets / "space_neo.csv")
    neo_ids = space["des"].dropna().unique().tolist()
    sample_neos = random.sample(neo_ids, min(20, len(neo_ids)))
    df_payloads = pd.DataFrame({
        "payload_id": range(1, len(sample_neos)+1),
        "mission_id": sample_neos,
        "orbit_type": random.choices(["LEO","GEO","MEO","HEO"], k=len(sample_neos)),
        "altitude": np.round(np.random.uniform(200,36000,size=len(sample_neos)),1)
    })
    df_payloads.to_csv(datasets / "payloads.csv", index=False)

    # 8) PLAYERS
    nba = pd.read_csv(datasets / "sports_nba.csv")
    players = nba["player"].dropna().unique().tolist()
    sample_players = random.sample(players, min(20, len(players)))
    df_players = pd.DataFrame({
        "player_id": sample_players,
        "match_id": np.random.randint(1,50,size=len(sample_players)),
        "score": np.random.randint(0,40,size=len(sample_players)),
        "match_date": (
            pd.to_datetime("2021-10-01")
            + pd.to_timedelta(np.random.randint(1,200,size=len(sample_players)), unit="D")
        )
    })
    df_players.to_csv(datasets / "players.csv", index=False)

    print("✅ All auxiliary datasets written to datasets/*.csv")

if __name__ == "__main__":
    main()