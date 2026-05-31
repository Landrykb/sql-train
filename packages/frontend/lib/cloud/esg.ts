import type { CloudMission } from './types';

// ESG / Decarbonization / Green Tech cloud track.
// Bridges the BleepxLab ESG + farming projects with real cloud architecture.
export const esgMissions: CloudMission[] = [
  // ── FOUNDATIONS (no-code, explanatory) ───────────────────────────
  {
    slug: 'esg-what-is',
    title: 'What Is ESG? E, S and G Explained',
    section: 'Foundations',
    level: 'Beginner',
    stars: 1,
    skills: ['esg-literacy', 'definitions'],
    description:
      'ESG stands for Environmental, Social, and Governance.\n\n- **Environmental:** carbon emissions, water use, deforestation, biodiversity.\n- **Social:** labor rights, community impact, supply-chain ethics.\n- **Governance:** board diversity, corruption risk, transparency.\n\nCompanies are rated by agencies (MSCI, Sustainalytics) and investors use those scores to allocate capital. Learn the vocabulary before touching any cloud service.',
    prerequisites: [],
    labType: 'quiz',
  },
  {
    slug: 'carbon-credits-explained',
    title: 'Carbon Credits, Offsets & Cap-and-Trade',
    section: 'Foundations',
    level: 'Beginner',
    stars: 1,
    skills: ['carbon-market', 'offsets', 'cap-and-trade'],
    description:
      'A carbon credit = permission to emit 1 tonne of CO2-equivalent.\n\n**Cap-and-trade:** governments cap total emissions; companies buy/sell credits. **Voluntary markets:** companies buy offsets to compensate.\n\n*Farming connection:* farmers using regenerative practices (no-till, cover crops, agroforestry) sequester carbon in soil and can SELL credits. Registries like Verra, Gold Standard and Pachama verify and tokenize them — from a West African farmer to a European corporate buyer.',
    prerequisites: ['esg-what-is'],
    labType: 'diagram',
  },
  {
    slug: 'net-zero-roadmap',
    title: 'Net-Zero, Carbon Neutral & Science-Based Targets',
    section: 'Foundations',
    level: 'Beginner',
    stars: 1,
    skills: ['net-zero', 'sbti', 'scope-1-2-3'],
    description:
      'Net-Zero is not the same as Carbon Neutral.\n\n- **Scope 1:** direct emissions (your factory, fleet).\n- **Scope 2:** indirect from purchased electricity.\n- **Scope 3:** everything else (supply chain, travel, customers).\n\nThe Science-Based Targets initiative (SBTi) certifies corporate net-zero plans. Learn what a real roadmap looks like so you can architect the systems that track it.',
    prerequisites: ['carbon-credits-explained'],
    labType: 'quiz',
  },

  // ── CLOUD ARCHITECTURE FOR ESG ───────────────────────────────────
  {
    slug: 'esg-data-pipeline-aws',
    title: 'ESG Data Pipeline on AWS',
    section: 'Cloud Architecture',
    level: 'Intermediate',
    stars: 2,
    skills: ['s3', 'glue', 'athena', 'quicksight'],
    description:
      'Architecture: farm IoT sensors → S3 raw zone → Glue ETL → Athena query → QuickSight dashboard.\n\n*Scenario:* a cooperative of 200 smallholder farmers in Benin, each with a soil-moisture + CO2 sensor. Data lands hourly in S3; Glue transforms it; Athena queries it; QuickSight visualizes carbon sequestration per hectare per month.',
    prerequisites: ['carbon-credits-explained'],
    labType: 'iac',
    crossDomain: 'aws',
  },
  {
    slug: 'carbon-ledger',
    title: 'Carbon Credit Ledger: Database or Blockchain?',
    section: 'Cloud Architecture',
    level: 'Intermediate',
    stars: 2,
    skills: ['dynamodb', 'qldb', 'immutability', 'audit-trail'],
    description:
      'Carbon credits need immutable, auditable records. Two AWS options: (1) DynamoDB with strict versioning, or (2) Amazon QLDB — a managed ledger DB with a cryptographically verifiable journal.\n\nBuild the data layer for a marketplace where farmers list verified credits, corporates purchase and retire them, and every transaction is permanently recorded.',
    prerequisites: ['esg-data-pipeline-aws'],
    labType: 'iac',
    crossDomain: 'aws',
  },
  {
    slug: 'esg-reporting-azure',
    title: 'ESG Reporting Platform on Azure',
    section: 'Cloud Architecture',
    level: 'Intermediate',
    stars: 2,
    skills: ['data-factory', 'synapse', 'power-bi'],
    description:
      'Many enterprises report ESG on Microsoft. Architecture: SAP/ERP export → Azure Data Factory → Synapse → Power BI.\n\nDesign the pipeline that ingests Scope 1/2/3 data, applies the GHG Protocol methodology, and outputs a board-ready report. Bonus: connect Microsoft Sustainability Manager.',
    prerequisites: ['net-zero-roadmap'],
    labType: 'diagram',
    crossDomain: 'azure',
  },
  {
    slug: 'bigquery-carbon-analytics',
    title: 'Carbon Analytics at Scale with BigQuery',
    section: 'Cloud Architecture',
    level: 'Advanced',
    stars: 3,
    skills: ['bigquery', 'looker-studio', 'carbon-api'],
    description:
      'GCP exposes emissions via the Carbon Footprint API. Manage 50 GCP projects for a multinational: pull carbon data per project → BigQuery → Looker Studio, then extend with Scope 3 supplier data.',
    prerequisites: ['net-zero-roadmap'],
    labType: 'iac',
    crossDomain: 'gcp',
  },

  // ── FARMING & AGRICULTURE ────────────────────────────────────────
  {
    slug: 'farmer-iot-platform',
    title: 'Farmer IoT Platform: Soil Sensor to Carbon Credit',
    section: 'Farming & Carbon',
    level: 'Advanced',
    stars: 3,
    skills: ['iot-core', 'timestream', 'lambda', 's3'],
    description:
      'End-to-end architecture for smallholder farmers:\n1. ESP32 + LoRa sensor sends soil data over LoRaWAN.\n2. AWS IoT Core receives messages.\n3. Lambda validates + transforms readings.\n4. Timestream stores the time series.\n5. Lambda computes monthly carbon sequestration estimates.\n6. Results become carbon-credit candidates (QLDB).\n7. SNS notifies a verification agent for field audit.',
    prerequisites: ['esg-data-pipeline-aws', 'carbon-ledger'],
    labType: 'iac',
    crossDomain: 'aws',
  },
  {
    slug: 'ndvi-satellite-pipeline',
    title: 'Satellite NDVI Processing Pipeline',
    section: 'Farming & Carbon',
    level: 'Advanced',
    stars: 3,
    skills: ['s3', 'lambda', 'batch', 'earth-observation'],
    description:
      'NDVI measures plant health from satellite imagery — high NDVI means healthy vegetation and more carbon sequestered.\n\nArchitecture: Sentinel-2 images land in S3 → Lambda queues jobs → AWS Batch runs NDVI compute (Python + rasterio) → results in S3 + metadata in DynamoDB → API Gateway exposes per-plot scores. Same NDVI data as the BleepxQuery farming domain — now you build the cloud that produces it.',
    prerequisites: ['farmer-iot-platform'],
    labType: 'iac',
    crossDomain: 'aws',
  },

  // ── GREEN ENERGY ─────────────────────────────────────────────────
  {
    slug: 'renewable-energy-grid',
    title: 'Renewable Energy Grid Monitoring on AWS',
    section: 'Green Energy',
    level: 'Advanced',
    stars: 3,
    skills: ['kinesis', 'timestream', 'grafana', 'iot'],
    description:
      'A solar + wind operator needs real-time monitoring. Power sensors → Kinesis Data Streams → Lambda aggregates into 5-min windows → Timestream → Managed Grafana dashboards, with EventBridge alarms on SLA breaches. Bonus: compute CO2-equivalent avoided per kWh and feed the carbon pipeline.',
    prerequisites: ['farmer-iot-platform'],
    labType: 'diagram',
    crossDomain: 'aws',
  },
  {
    slug: 'ev-charging-network',
    title: 'EV Charging Network: Multi-Region Architecture',
    section: 'Green Energy',
    level: 'Advanced',
    stars: 3,
    skills: ['global-accelerator', 'dynamodb-global', 'lambda', 'ocpp'],
    description:
      'EV charging backends need low-latency global availability. OCPP chargers → API Gateway → Lambda → DynamoDB Global Tables for multi-region session state, with Global Accelerator routing, CloudWatch charger health, and weekly carbon-avoided reports via Athena.',
    prerequisites: ['renewable-energy-grid', 'esg-reporting-azure'],
    labType: 'iac',
    crossDomain: 'aws',
  },

  // ── CAPSTONE ─────────────────────────────────────────────────────
  {
    slug: 'esg-capstone',
    title: 'ESG Capstone: Full Carbon Market Platform',
    section: 'Capstone',
    level: 'Master',
    stars: 5,
    skills: ['everything'],
    description:
      'Build a complete carbon-credit marketplace. Actors: smallholder farmers (IoT → credit candidates), verifiers (NDVI + soil APIs), corporate buyers (web app), and an immutable QLDB registry.\n\nServices: IoT Core, Kinesis, S3, Glue, Athena, QLDB, Lambda, API Gateway, CloudFront, Cognito, WAF, CloudFormation, CloudWatch. Multi-region (eu-west-1 primary, us-east-1 DR), full IaC, per-actor IAM roles.',
    prerequisites: ['ndvi-satellite-pipeline', 'ev-charging-network'],
    labType: 'iac',
  },

  // ── BONUS ────────────────────────────────────────────────────────
  {
    slug: 'esg-ai-analyst',
    title: 'AI-Powered ESG Report Analyzer',
    section: 'Bonus',
    level: 'Expert',
    stars: 4,
    skills: ['bedrock', 'rag', 'claude'],
    description:
      'Use Amazon Bedrock + Claude to extract Scope 1/2/3 numbers from PDF sustainability reports. Build the RAG pipeline: S3 → text extraction → embeddings → vector store → LLM extraction with citations.',
    prerequisites: ['esg-capstone'],
    labType: 'iac',
    isBonus: true,
  },
  {
    slug: 'deforestation-detector',
    title: 'Deforestation Detection with SageMaker',
    section: 'Bonus',
    level: 'Expert',
    stars: 4,
    skills: ['sagemaker', 'cnn', 'sentinel-2'],
    description:
      'Train a CNN on Sentinel-2 imagery to detect deforestation events. Deploy on a SageMaker endpoint and alert via SNS when new clearing is detected.',
    prerequisites: ['esg-capstone'],
    labType: 'iac',
    isBonus: true,
  },
];
