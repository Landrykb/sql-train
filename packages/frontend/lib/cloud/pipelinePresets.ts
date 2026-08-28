// ─── ETL Pipeline Presets ─────────────────────────────────────────────────────
//
// Pre-baked data, SQL, and Python/ML templates for the CloudPipelineCanvas.
// These are intentionally small sample CSVs that mirror the shape of the real
// Kaggle / data.world / SQLverse datasets, so learners can practice the full
// Extract → SQL → Python/ML → S3 flow without waiting on downloads or auth.

export interface PipelinePreset {
  id: string;
  name: string;
  icon: string;
  tags: string[];
  sourceUrl: string;
  description: string;
  rawCsv: string;
  sqlQuery: string;
  pythonCode: string;
  s3Key: string;
}

const DEFAULT_SQL = `SELECT *
FROM dataset
LIMIT 20;`;

const DEFAULT_PYTHON = `import pandas as pd
from io import StringIO

raw = """{{csv}}"""
df = pd.read_csv(StringIO(raw))
df = df.dropna()

print(df.head())
print(df.describe())
print(df.to_csv(index=False))`;

export const PIPELINE_PRESETS: PipelinePreset[] = [
  // ─── SQLverse / BleepxLab style datasets ────────────────────────────────────
  {
    id: 'sqlverse-churn',
    name: 'Customer Churn',
    icon: '🔄',
    tags: ['SQLverse', 'classification', 'telco'],
    sourceUrl: 'https://www.kaggle.com/datasets/blastchar/telco-customer-churn',
    description: 'Telco customer records — mirror of the BleepxLab churn domain.',
    rawCsv: `customer_id,tenure,monthly_charges,contract,gender,senior_citizen,churn
3668-QPYBK,2,53.85,Month-to-month,Male,0,Yes
9237-HQITU,2,70.70,Month-to-month,Female,0,Yes
9305-CDSKC,8,99.65,Month-to-month,Female,0,Yes
7567-VDGEC,28,104.80,Month-to-month,Male,0,Yes
15795-S invo,49,103.70,Month-to-month,Male,0,No
18925-BPATT,25,105.50,Month-to-month,Female,0,No
8374-BRINF,69,113.25,Two year,Female,0,No
2283-DNXTG,48,27.40,Two year,Male,0,No
4186-MKecp,4,20.65,Month-to-month,Male,1,Yes
4598-XLKNJ,10,20.15,Month-to-month,Female,0,No`,
    sqlQuery: `SELECT contract,
       AVG(monthly_charges) AS avg_monthly,
       COUNT(*) AS customers,
       SUM(CASE WHEN churn = 'Yes' THEN 1 ELSE 0 END) AS churned
FROM dataset
GROUP BY contract
ORDER BY avg_monthly DESC;`,
    pythonCode: DEFAULT_PYTHON.replace('{{csv}}', 'customer_id,tenure,monthly_charges,contract,gender,senior_citizen,churn\n3668-QPYBK,2,53.85,Month-to-month,Male,0,Yes'),
    s3Key: 'sqlverse/churn_prepared.csv',
  },
  {
    id: 'sqlverse-fraud',
    name: 'Credit Card Fraud',
    icon: '🛡️',
    tags: ['SQLverse', 'anomaly', 'fintech'],
    sourceUrl: 'https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud',
    description: 'PCA-anonymized credit card transactions with class imbalance.',
    rawCsv: `time,v1,v2,v3,v4,amount,class
0,-1.359807133,-0.072781173,2.536346738,1.378155224,149.62,0
0,1.191857111,0.266150712,0.166480113,0.448154078,2.69,0
1,-1.358354062,-1.340163075,1.773209342,0.379779593,378.66,1
1,-0.966271712,-0.185226008,1.79299334,-0.863291482,123.5,1
2,-1.158233093,0.877736755,1.548717847,0.403033934,69.99,0
2,-0.425411206,0.960885677,1.141900342,-0.16898611,3.67,0
3,1.229657634,0.141003507,0.37732356,-1.133650177,4.99,0
3,0.176780969,-0.155339211,0.25383081,-0.25518492,40.03,0
4,-0.01568372,-0.005590716,1.31037059,-0.13979968,15.99,0
4,0.21028026,-0.01271419,0.36363755,0.15172587,12.99,0`,
    sqlQuery: `SELECT class,
       COUNT(*) AS n_transactions,
       AVG(amount) AS avg_amount,
       MAX(amount) AS max_amount
FROM dataset
GROUP BY class
ORDER BY class;`,
    pythonCode: `import pandas as pd
from io import StringIO

raw = """time,v1,v2,v3,v4,amount,class
0,-1.359807133,-0.072781173,2.536346738,1.378155224,149.62,0"""
df = pd.read_csv(StringIO(raw))
# Rescale amount and train a quick Isolation Forest on the sample
from sklearn.ensemble import IsolationForest
X = df[['v1','v2','v3','v4','amount']]
model = IsolationForest(random_state=42, contamination=0.1)
df['anomaly'] = model.fit_predict(X)
print(df[['amount','class','anomaly']].to_csv(index=False))`,
    s3Key: 'sqlverse/fraud_scored.csv',
  },
  {
    id: 'sqlverse-transport',
    name: 'Public Transport Delays',
    icon: '🚌',
    tags: ['SQLverse', 'regression', 'transport'],
    sourceUrl: 'https://www.kaggle.com/datasets/khushikyad001/public-transport-delays-with-weather-and-events',
    description: 'Departures, weather, and event context — predict delay minutes.',
    rawCsv: `departure,arrival,line,delay_minutes,temperature,rain_mm,event_nearby
2026-01-01 08:00,2026-01-01 08:32,A,12,4.2,0.0,false
2026-01-01 08:15,2026-01-01 08:46,A,8,5.1,1.2,false
2026-01-01 08:30,2026-01-01 09:10,B,35,3.8,4.5,true
2026-01-01 09:00,2026-01-01 09:22,A,5,7.5,0.0,false
2026-01-01 09:10,2026-01-01 09:58,B,42,2.9,6.0,true
2026-01-01 10:00,2026-01-01 10:25,A,10,8.0,0.0,false`,
    sqlQuery: `SELECT line,
       AVG(delay_minutes) AS avg_delay,
       AVG(CASE WHEN event_nearby = 'true' THEN delay_minutes END) AS event_delay,
       AVG(CASE WHEN event_nearby = 'false' THEN delay_minutes END) AS normal_delay
FROM dataset
GROUP BY line
ORDER BY avg_delay DESC;`,
    pythonCode: DEFAULT_PYTHON.replace('{{csv}}', 'departure,arrival,line,delay_minutes,temperature,rain_mm,event_nearby\n2026-01-01 08:00,2026-01-01 08:32,A,12,4.2,0.0,false'),
    s3Key: 'sqlverse/transport_delays.csv',
  },
  {
    id: 'sqlverse-yield',
    name: 'Crop Yield Panel',
    icon: '🌾',
    tags: ['SQLverse', 'regression', 'agriculture'],
    sourceUrl: 'https://www.kaggle.com/datasets/patelris/crop-yield-prediction-dataset',
    description: 'Country-level crop yield with rainfall, pesticides, and temperature.',
    rawCsv: `country,year,crop,yield_hg_ha,rainfall_mm,pesticides_tonnes,avg_temp
Argentina,1990,Wheat,25635.0,761.0,3351.0,18.1
Brazil,1990,Wheat,24657.0,1392.0,28426.0,23.8
France,1990,Wheat,68517.0,868.0,104343.0,11.2
India,1990,Wheat,26016.0,1162.0,37685.0,24.1
United States,1990,Wheat,28136.0,823.0,173805.0,12.3
Argentina,1991,Wheat,27021.0,650.0,3300.0,18.3
France,1991,Wheat,69012.0,920.0,105000.0,11.5
India,1991,Wheat,26500.0,1190.0,38000.0,24.0`,
    sqlQuery: `SELECT country,
       AVG(yield_hg_ha) AS avg_yield,
       AVG(rainfall_mm) AS avg_rain,
       AVG(avg_temp) AS avg_temp
FROM dataset
WHERE year >= 1990
GROUP BY country
ORDER BY avg_yield DESC;`,
    pythonCode: DEFAULT_PYTHON.replace('{{csv}}', 'country,year,crop,yield_hg_ha,rainfall_mm,pesticides_tonnes,avg_temp\nArgentina,1990,Wheat,25635.0,761.0,3351.0,18.1'),
    s3Key: 'sqlverse/crop_yield.csv',
  },

  // ─── data.world datasets ────────────────────────────────────────────────────
  {
    id: 'dataworld-co2',
    name: 'World Bank CO₂ Emissions',
    icon: '🌍',
    tags: ['data.world', 'climate', 'time-series'],
    sourceUrl: 'https://data.world/worldbank/co2-emissions',
    description: 'CO₂ (kt) by country and year from the World Bank.',
    rawCsv: `country_name,country_code,year,value
United States,USA,2010,5432538.5
United States,USA,2011,5285216.0
United States,USA,2012,5110427.0
China,CHN,2010,8256969.2
China,CHN,2011,9478133.6
China,CHN,2012,9867789.1
India,IND,2010,1666360.5
India,IND,2011,1756224.8
India,IND,2012,1888672.4
Germany,DEU,2010,762621.5
Germany,DEU,2011,734861.4
Germany,DEU,2012,745601.7`,
    sqlQuery: `SELECT country_name,
       MIN(value) AS min_kt,
       MAX(value) AS max_kt,
       (MAX(value) - MIN(value)) AS growth_kt
FROM dataset
WHERE year BETWEEN 2010 AND 2019
GROUP BY country_name
ORDER BY growth_kt DESC;`,
    pythonCode: DEFAULT_PYTHON.replace('{{csv}}', 'country_name,country_code,year,value\nUnited States,USA,2010,5432538.5'),
    s3Key: 'dataworld/co2_by_country.csv',
  },
  {
    id: 'dataworld-crime',
    name: 'Chicago Crime Reports',
    icon: '🚔',
    tags: ['data.world', 'geospatial', 'public-data'],
    sourceUrl: 'https://data.world/cityofchicago/crimes-2001-to-present',
    description: 'Chicago reported crimes with geospatial columns.',
    rawCsv: `id,date,primary_type,description,location_description,arrest,latitude,longitude
12345,2026-01-01,THEFT,POCKET-PICKING,STREET,true,41.8781,-87.6298
12346,2026-01-01,BATTERY,SIMPLE,APARTMENT,false,41.8781,-87.6298
12347,2026-01-02,THEFT,FROM BUILDING,RESTAURANT,true,41.8904,-87.6233
12348,2026-01-02,ASSAULT,SIMPLE,SIDEWALK,false,41.8904,-87.6233
12349,2026-01-03,THEFT,OVER $500,STREET,false,41.8781,-87.6298
12350,2026-01-03,BATTERY,AGGRAVATED,STREET,true,41.8781,-87.6298`,
    sqlQuery: `SELECT primary_type,
       COUNT(*) AS incidents,
       SUM(CASE WHEN arrest = 'true' THEN 1 ELSE 0 END) AS arrests
FROM dataset
GROUP BY primary_type
ORDER BY incidents DESC;`,
    pythonCode: DEFAULT_PYTHON.replace('{{csv}}', 'id,date,primary_type,description,location_description,arrest,latitude,longitude\n12345,2026-01-01,THEFT,POCKET-PICKING,STREET,true,41.8781,-87.6298'),
    s3Key: 'dataworld/chicago_crimes.csv',
  },
  {
    id: 'dataworld-cancer',
    name: 'U.S. Cancer Mortality',
    icon: '🏥',
    tags: ['data.world', 'health', 'geospatial'],
    sourceUrl: 'https://data.world/cdc/us-cancer-mortality',
    description: 'Age-adjusted cancer mortality by county.',
    rawCsv: `county,state,year,deaths,population,mortality_rate
Cook,IL,2020,4100,5150233,79.6
Harris,TX,2020,3200,4732239,67.7
Los Angeles,CA,2020,6800,10039107,67.7
Maricopa,AZ,2020,2100,4481589,46.9
San Diego,CA,2020,1600,3298634,48.5
Miami-Dade,FL,2020,1700,2715658,62.6`,
    sqlQuery: `SELECT state,
       SUM(deaths) AS total_deaths,
       SUM(population) AS total_pop,
       SUM(deaths) * 100000.0 / SUM(population) AS state_rate
FROM dataset
GROUP BY state
ORDER BY state_rate DESC;`,
    pythonCode: DEFAULT_PYTHON.replace('{{csv}}', 'county,state,year,deaths,population,mortality_rate\nCook,IL,2020,4100,5150233,79.6'),
    s3Key: 'dataworld/cancer_mortality.csv',
  },

  // ─── Carbon credit / climate ML projects ────────────────────────────────────
  {
    id: 'carbon-awd',
    name: 'AWD Rice Methane Reduction',
    icon: '🌾',
    tags: ['carbon-credits', 'AWD', 'agriculture'],
    sourceUrl: 'https://data.world/california-chromium/soil-carbon-ratios-for-agricultural-lands',
    description: 'Alternate Wetting and Drying (AWD) water-management field data: estimate methane avoided and carbon credits per hectare.',
    rawCsv: `field_id,country,season,water_depth_cm,method, methane_kg_ha, credits_tco2e_ha
A-01,Vietnam,2024-1,5.2,AWD,120.4,4.8
A-02,Vietnam,2024-1,3.8,AWD,98.7,5.1
A-03,Vietnam,2024-1,15.0,Flooded,245.0,0.0
A-04,India,2024-1,4.5,AWD,110.2,5.3
A-05,India,2024-1,18.0,Flooded,280.5,0.0
A-06,India,2024-1,6.0,AWD,135.6,4.5`,
    sqlQuery: `SELECT method,
       AVG(methane_kg_ha) AS avg_methane,
       AVG(credits_tco2e_ha) AS avg_credits,
       COUNT(*) AS fields
FROM dataset
GROUP BY method
ORDER BY avg_methane;`,
    pythonCode: `import pandas as pd
from io import StringIO

raw = """field_id,country,season,water_depth_cm,method,methane_kg_ha,credits_tco2e_ha
A-01,Vietnam,2024-1,5.2,AWD,120.4,4.8"""
df = pd.read_csv(StringIO(raw))
# Estimate annual avoided methane as a carbon credit opportunity
baseline = df[df['method'] == 'Flooded']['methane_kg_ha'].mean()
df['avoided_methane'] = baseline - df['methane_kg_ha']
df['estimated_usd'] = df['credits_tco2e_ha'] * 25  # $25/tCO2e
print(df[['field_id','method','credits_tco2e_ha','estimated_usd']].to_csv(index=False))`,
    s3Key: 'carbon/awd_credits.csv',
  },
  {
    id: 'carbon-regenerative',
    name: 'Regenerative Agriculture Soil Carbon',
    icon: '🌱',
    tags: ['carbon-credits', 'regenerative', 'soil'],
    sourceUrl: 'https://data.world/california-chromium/soil-carbon-ratios-for-agricultural-lands',
    description: 'Compare conventional and regenerative fields to estimate soil organic carbon increase and the carbon credits it could generate.',
    rawCsv: `farm_id,practice,years_under_practice,soil_carbon_pct,bulk_density_g_cm3,depth_cm,area_ha
F-001,Conventional,0,1.8,1.4,30,50
F-002,Regenerative,3,2.6,1.3,30,50
F-003,Regenerative,5,3.1,1.25,30,50
F-004,Conventional,0,1.7,1.35,30,40
F-005,Regenerative,2,2.4,1.32,30,40
F-006,Regenerative,4,2.9,1.28,30,40`,
    sqlQuery: `SELECT practice,
       AVG(soil_carbon_pct) AS avg_carbon,
       AVG(bulk_density_g_cm3) AS avg_density,
       COUNT(*) AS farms
FROM dataset
GROUP BY practice
ORDER BY avg_carbon DESC;`,
    pythonCode: `import pandas as pd
from io import StringIO

raw = """farm_id,practice,years_under_practice,soil_carbon_pct,bulk_density_g_cm3,depth_cm,area_ha
F-001,Conventional,0,1.8,1.4,30,50"""
df = pd.read_csv(StringIO(raw))
# Soil carbon stock (Mg/ha) ≈ carbon% × bulk_density × depth × 10000 / 100
df['carbon_stock_Mg_ha'] = df['soil_carbon_pct'] * df['bulk_density_g_cm3'] * df['depth_cm'] * 10000 / 100
df['credits_tco2e_ha'] = df['carbon_stock_Mg_ha'] * 3.67  # CO2 mass ratio
print(df[['farm_id','practice','carbon_stock_Mg_ha','credits_tco2e_ha']].to_csv(index=False))`,
    s3Key: 'carbon/regenerative_soil_carbon.csv',
  },
  {
    id: 'carbon-offsets',
    name: 'Voluntary Carbon Offset Market',
    icon: '♻️',
    tags: ['carbon-credits', 'offsets', 'finance'],
    sourceUrl: 'https://data.world/carbonplan/carbon-offsets',
    description: 'Project type, vintage, price, and retirement data for voluntary carbon credits.',
    rawCsv: `project_id,methodology,vintage,issuance_tco2e,retired_tco2e,price_usd,country
P-001,REDD+,2019,50000,42000,8.50,Brazil
P-002,REDD+,2020,120000,98000,9.10,Brazil
P-003,Cookstoves,2020,30000,25000,4.25,Kenya
P-004,Wind,2021,75000,60000,2.80,India
P-005,Forestry,2021,45000,30000,12.00,United States
P-006,Methane Capture,2022,60000,55000,7.40,United States`,
    sqlQuery: `SELECT methodology,
       SUM(issuance_tco2e) AS total_issued,
       SUM(retired_tco2e) AS total_retired,
       AVG(price_usd) AS avg_price
FROM dataset
GROUP BY methodology
ORDER BY total_issued DESC;`,
    pythonCode: DEFAULT_PYTHON.replace('{{csv}}', 'project_id,methodology,vintage,issuance_tco2e,retired_tco2e,price_usd,country\nP-001,REDD+,2019,50000,42000,8.50,Brazil'),
    s3Key: 'carbon/offset_market.csv',
  },
  {
    id: 'carbon-ml-price',
    name: 'Carbon Credit Price ML',
    icon: '🤖',
    tags: ['carbon-credits', 'ML', 'regression'],
    sourceUrl: 'https://data.world/carbonplan/carbon-offsets',
    description: 'Predict carbon credit price from project features — a tiny ML pipeline using scikit-learn.',
    rawCsv: `project_id,issuance_tco2e,vintage,methodology_encoded,price_usd
P-001,50000,2019,1,8.50
P-002,120000,2020,1,9.10
P-003,30000,2020,2,4.25
P-004,75000,2021,3,2.80
P-005,45000,2021,4,12.00
P-006,60000,2022,5,7.40
P-007,85000,2022,3,3.10
P-008,25000,2019,2,5.00`,
    sqlQuery: `SELECT vintage,
       AVG(price_usd) AS avg_price,
       COUNT(*) AS projects
FROM dataset
GROUP BY vintage
ORDER BY vintage;`,
    pythonCode: `import pandas as pd
from io import StringIO
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

raw = """project_id,issuance_tco2e,vintage,methodology_encoded,price_usd
P-001,50000,2019,1,8.50"""
df = pd.read_csv(StringIO(raw))
X = df[['issuance_tco2e','vintage','methodology_encoded']]
y = df['price_usd']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
df['predicted_price'] = model.predict(X)
print(f"Feature importance: {dict(zip(X.columns, model.feature_importances_))}")
print(df[['project_id','price_usd','predicted_price']].to_csv(index=False))`,
    s3Key: 'carbon/carbon_price_ml.csv',
  },
];
