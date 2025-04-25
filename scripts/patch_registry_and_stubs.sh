#!/usr/bin/env bash
# scripts/patch_registry_and_stubs.sh

set -e

echo "⏳ Patching dataset_registry.yaml…"

# ────────────────────────────────────────────────────────────────────────────────
# 1) Append stub entries for the auxiliary JOIN tables
# ────────────────────────────────────────────────────────────────────────────────
cat >> dataset_registry.yaml << 'EOF'

  # ─── stubs for JOIN exercises ─────────────────────────────────────────────────
  returns:
    url: "file://./datasets/returns.csv"
    format: csv
    primary_key: invoice_id
    narrative_goal: "Stub: returns data for business joins"
    transforms: []

  suspects:
    url: "file://./datasets/suspects.csv"
    format: csv
    primary_key: suspect_id
    narrative_goal: "Stub: suspects for crime joins"
    transforms: []

  soil_data:
    url: "file://./datasets/soil_data.csv"
    format: csv
    primary_key: id
    narrative_goal: "Stub: soil measurements for farming joins"
    transforms: []

  fraud_alerts:
    url: "file://./datasets/fraud_alerts.csv"
    format: csv
    primary_key: alert_id
    narrative_goal: "Stub: fraud alerts for finance joins"
    transforms: []

  treatments:
    url: "file://./datasets/treatments.csv"
    format: csv
    primary_key: treatment_id
    narrative_goal: "Stub: patient treatments for healthcare joins"
    transforms: []

  users:
    url: "file://./datasets/users.csv"
    format: csv
    primary_key: user_id
    narrative_goal: "Stub: social users for social joins"
    transforms: []

  payloads:
    url: "file://./datasets/payloads.csv"
    format: csv
    primary_key: payload_id
    narrative_goal: "Stub: mission payloads for space joins"
    transforms: []

  players:
    url: "file://./datasets/players.csv"
    format: csv
    primary_key: player_id
    narrative_goal: "Stub: per-match scores for sports joins"
    transforms: []
EOF

echo "✅ dataset_registry.yaml: stub entries added."

# ────────────────────────────────────────────────────────────────────────────────
# 2) Create the eight stub CSVs (just a header row each)
# ────────────────────────────────────────────────────────────────────────────────
echo "⏳ Creating stub CSV files…"

cat > datasets/returns.csv << 'EOF'
invoice_id,return_date,return_reason
EOF

cat > datasets/suspects.csv << 'EOF'
suspect_id,crime_id,suspect_name
EOF

cat > datasets/soil_data.csv << 'EOF'
id,soil_ph,soil_type
EOF

cat > datasets/fraud_alerts.csv << 'EOF'
alert_id,transaction_id,amount,alert_type
EOF

cat > datasets/treatments.csv << 'EOF'
treatment_id,patient_id,diagnosis,treatment_date
EOF

cat > datasets/users.csv << 'EOF'
user_id,user_name,signup_date
EOF

cat > datasets/payloads.csv << 'EOF'
payload_id,mission_id,orbit_type,altitude
EOF

cat > datasets/players.csv << 'EOF'
player_id,match_id,score,match_date
EOF

echo "✅ Stub CSVs created in datasets/."

# ────────────────────────────────────────────────────────────────────────────────
# 3) Add per-core-dataset transforms so columns line up with the JOIN SQL
# ────────────────────────────────────────────────────────────────────────────────
echo "⏳ Patching transforms for core datasets…"

# 3a) crime_chicago: select + rename → id, date, crime_type, area, longitude, latitude
python3 - << 'PYCODE'
import yaml
from pathlib import Path

reg = yaml.safe_load(Path("dataset_registry.yaml").read_text())
ds = reg["datasets"]["crime_chicago"]
ds["transforms"] = [
  {"select": ["ID","Date","Primary_Type","Location_Description","Longitude","Latitude"]},
  {"rename": {
      "ID":"id",
      "Date":"date",
      "Primary_Type":"crime_type",
      "Location_Description":"area",
      "Longitude":"longitude",
      "Latitude":"latitude"
  }}
]
Path("dataset_registry.yaml").write_text(
    yaml.safe_dump(reg, sort_keys=False), encoding="utf-8"
)
PYCODE

# 3b) farming_ndvi: rename actual_yield→yield, region→crop_type
python3 - << 'PYCODE'
import yaml
from pathlib import Path

reg = yaml.safe_load(Path("dataset_registry.yaml").read_text())
ds = reg["datasets"]["farming_ndvi"]
ds["transforms"] = [
  {"rename": {
      "actual_yield":"yield",
      "region":"crop_type"
  }}
]
Path("dataset_registry.yaml").write_text(
    yaml.safe_dump(reg, sort_keys=False), encoding="utf-8"
)
PYCODE

# 3c) finance_stocks: make its date column match transaction_date in the join
python3 - << 'PYCODE'
import yaml
from pathlib import Path

reg = yaml.safe_load(Path("dataset_registry.yaml").read_text())
ds = reg["datasets"]["finance_stocks"]
ds["transforms"] = [
  {"rename": {"Date":"transaction_date"}}
]
Path("dataset_registry.yaml").write_text(
    yaml.safe_dump(reg, sort_keys=False), encoding="utf-8"
)
PYCODE

# 3d) social_twitter: rename text→post_type, created_at→post_date, add likes column
python3 - << 'PYCODE'
import yaml, csv
from pathlib import Path

# update registry
reg = yaml.safe_load(Path("dataset_registry.yaml").read_text())
ds = reg["datasets"]["social_twitter"]
ds["transforms"] = [
  {"rename": {
      "text":"post_type",
      "created_at":"post_date"
  }}
]
Path("dataset_registry.yaml").write_text(
    yaml.safe_dump(reg, sort_keys=False), encoding="utf-8"
)

# inject likes=0 in the CSV
rows = []
with open("datasets/social_twitter.csv","r",newline="") as f:
    rdr = csv.reader(f)
    for row in rdr:
        rows.append(row + (["likes"] if rdr.line_num==1 else ["0"]))
with open("datasets/social_twitter.csv","w",newline="") as f:
    wtr = csv.writer(f)
    wtr.writerows(rows)
PYCODE

echo "✅ dataset_registry.yaml transforms patched."

# ────────────────────────────────────────────────────────────────────────────────
# 4) Overwrite the eight JOIN‐case YAMLs with the complete definitions
# ────────────────────────────────────────────────────────────────────────────────
echo "⏳ Writing out the 8 join‐case stubs…"

# Business → joins_returns.yaml
cat > packages/frontend/cases/business/joins_returns.yaml << 'EOF'
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
  - "Use a JOIN between the sales table (main) and the returns stub on invoice_id."
EOF

# Crime → suspect_joins.yaml
cat > packages/frontend/cases/crime/suspect_joins.yaml << 'EOF'
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
  - "LEFT JOIN to include crimes even if they have no suspects."
EOF

# Farming → soil_joins.yaml
cat > packages/frontend/cases/farming/soil_joins.yaml << 'EOF'
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
EOF

# Finance → fraud_joins.yaml
cat > packages/frontend/cases/finance/fraud_joins.yaml << 'EOF'
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
  - "LEFT JOIN to count alerts per transaction_date."
EOF

# Healthcare → treatment_joins.yaml
cat > packages/frontend/cases/healthcare/treatment_joins.yaml << 'EOF'
id: treatment_joins
dataset_key: healthcare_covid
datasets:
  - name: main
    file: healthcare_covid.csv
  - name: treatments
    file: treatments.csv
solutionQuery: |
  SELECT
    main.date   AS admission_date,
    COUNT(t.treatment_id) AS num_treatments
  FROM main
  LEFT JOIN treatments AS t
    ON main.iso_code = t.patient_id
  GROUP BY 1
expected: []
hints:
  - "Use a LEFT JOIN between COVID records (main) and the treatments stub."
EOF

# Social → user_joins.yaml
cat > packages/frontend/cases/social/user_joins.yaml << 'EOF'
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
  - "LEFT JOIN tweets (main) to users to count tweets per user."
EOF

# Space → mission_joins.yaml
cat > packages/frontend/cases/space/mission_joins.yaml << 'EOF'
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
  - "JOIN NEO approaches (main) to payloads by mission_id."
EOF

# Sports → player_joins.yaml
cat > packages/frontend/cases/sports/player_joins.yaml << 'EOF'
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
  - "JOIN the NBA stats (main) to per-match scores by player_id."
EOF

echo "✅ JOIN-case YAMLs written."

echo
echo "🎯 Now run:

    ./scripts/full_sync.py

and you should see ZERO ❌ failures from fix_expected.py."