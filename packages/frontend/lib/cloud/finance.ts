import type { CloudMission } from './types';

// Transversal track: FinOps + Financial-Services cloud + cross-industry
// reference architectures (healthcare, retail, media, gaming, public sector).
// This is the "everything else" domain so learners aren't boxed into ESG.
export const financeMissions: CloudMission[] = [
  // ── FINOPS ───────────────────────────────────────────────────────
  {
    slug: 'finops-foundations',
    title: 'FinOps Foundations: Cloud Cost as a Team Sport',
    section: 'FinOps',
    level: 'Beginner',
    stars: 1,
    skills: ['finops', 'tagging', 'showback', 'unit-economics'],
    description:
      'FinOps brings finance, engineering and product together to govern cloud spend. Learn the Inform → Optimize → Operate lifecycle, mandatory cost-allocation tags, showback vs chargeback, and unit economics (cost per customer / per transaction).',
    prerequisites: [],
    labType: 'diagram',
  },
  {
    slug: 'cost-anomaly-detection',
    title: 'Cost Anomaly Detection & Budgets',
    section: 'FinOps',
    level: 'Intermediate',
    stars: 2,
    skills: ['cost-anomaly', 'budgets', 'cur', 'alerts'],
    description:
      'Catch runaway spend before the invoice. Wire up AWS Cost Anomaly Detection (or Azure/GCP budgets), export the Cost & Usage Report to a data lake, and build alerts that page the right team.',
    prerequisites: ['finops-foundations'],
    labType: 'iac',
  },

  // ── FINANCIAL SERVICES ───────────────────────────────────────────
  {
    slug: 'fsi-compliance',
    title: 'Financial-Services Compliance & Data Residency',
    section: 'Financial Services',
    level: 'Intermediate',
    stars: 2,
    skills: ['pci-dss', 'data-residency', 'kms', 'audit'],
    description:
      'Regulated workloads have hard rules. Design for PCI-DSS, SOC 2 and regional data residency: encryption with customer-managed keys, network isolation, immutable audit logs, and least-privilege access.',
    prerequisites: ['finops-foundations'],
    labType: 'diagram',
  },
  {
    slug: 'realtime-fraud-arch',
    title: 'Real-Time Fraud Detection Architecture',
    section: 'Financial Services',
    level: 'Advanced',
    stars: 3,
    skills: ['kinesis', 'lambda', 'sagemaker', 'dynamodb'],
    description:
      'Score transactions in milliseconds: card events → Kinesis → Lambda feature enrichment → SageMaker real-time endpoint → decision in DynamoDB, with async case management via SQS. Mirrors the BleepxLab fraud project — now as production cloud infra.',
    prerequisites: ['fsi-compliance'],
    labType: 'iac',
    crossDomain: 'aws',
  },
  {
    slug: 'trading-risk-platform',
    title: 'Market Risk & VaR Compute Grid',
    section: 'Financial Services',
    level: 'Advanced',
    stars: 3,
    skills: ['batch', 'spot', 'step-functions', 's3'],
    description:
      'Run nightly Value-at-Risk and stress tests across thousands of scenarios on an elastic Spot compute grid (AWS Batch / Step Functions), storing results in S3 + a query layer. Connects to the BleepxLab financial-risk project.',
    prerequisites: ['realtime-fraud-arch'],
    labType: 'iac',
    crossDomain: 'aws',
  },

  // ── CROSS-INDUSTRY TRANSVERSAL ───────────────────────────────────
  {
    slug: 'retail-ecommerce-scale',
    title: 'Retail: E-Commerce That Survives Black Friday',
    section: 'Industry Blueprints',
    level: 'Intermediate',
    stars: 2,
    skills: ['cloudfront', 'autoscaling', 'dynamodb', 'sqs'],
    description:
      'Design a storefront for spiky traffic: CloudFront + S3 for static assets, autoscaling stateless services, DynamoDB for carts, SQS to absorb order bursts, and a read-replica strategy for the catalog.',
    prerequisites: ['finops-foundations'],
    labType: 'diagram',
  },
  {
    slug: 'healthcare-hipaa',
    title: 'Healthcare: HIPAA-Compliant Patient Data Platform',
    section: 'Industry Blueprints',
    level: 'Advanced',
    stars: 3,
    skills: ['hipaa', 'phi', 'encryption', 'vpc'],
    description:
      'Store and process PHI safely: private subnets, encryption everywhere, fine-grained access, de-identification pipelines, and a BAA-eligible service list. Echoes the BleepxQuery healthcare domain at infrastructure scale.',
    prerequisites: ['fsi-compliance'],
    labType: 'diagram',
  },
  {
    slug: 'media-streaming',
    title: 'Media: Global Video Streaming & Transcoding',
    section: 'Industry Blueprints',
    level: 'Advanced',
    stars: 3,
    skills: ['mediaconvert', 'cloudfront', 's3', 'edge'],
    description:
      'Ingest, transcode (MediaConvert), and deliver video globally via CloudFront with signed URLs, adaptive bitrate, and edge caching. Optimize egress cost — the silent killer of media budgets.',
    prerequisites: ['retail-ecommerce-scale'],
    labType: 'diagram',
  },
  {
    slug: 'gaming-realtime',
    title: 'Gaming: Real-Time Multiplayer Backend',
    section: 'Industry Blueprints',
    level: 'Advanced',
    stars: 3,
    skills: ['gamelift', 'dynamodb-global', 'websockets', 'latency'],
    description:
      'Build a low-latency multiplayer backend: session placement (GameLift), global state (DynamoDB Global Tables), WebSocket APIs, and matchmaking — all tuned for sub-50ms player experience.',
    prerequisites: ['retail-ecommerce-scale'],
    labType: 'diagram',
  },
  {
    slug: 'public-sector-data',
    title: 'Public Sector: Open Data & Smart-City Platform',
    section: 'Industry Blueprints',
    level: 'Intermediate',
    stars: 2,
    skills: ['open-data', 'iot', 'data-lake', 'api-gateway'],
    description:
      'Architect a smart-city / open-data platform: IoT sensors (traffic, air quality) → data lake → public APIs + dashboards, with strong governance and cost transparency for taxpayers.',
    prerequisites: ['finops-foundations'],
    labType: 'diagram',
  },

  // ── CAPSTONE ─────────────────────────────────────────────────────
  {
    slug: 'finance-capstone',
    title: 'Transversal Capstone: Multi-Industry Platform Review',
    section: 'Capstone',
    level: 'Master',
    stars: 5,
    skills: ['everything'],
    description:
      'Act as a cloud architect consultancy: take three of the industry blueprints (e.g. fintech, healthcare, media), produce a Well-Architected review across all 6 pillars, a FinOps optimization plan, and a compliance matrix. Deliver an executive-ready recommendation.',
    prerequisites: ['trading-risk-platform', 'media-streaming', 'healthcare-hipaa'],
    labType: 'diagram',
  },
  {
    slug: 'finops-certification-prep',
    title: 'FinOps Certified Practitioner Prep',
    section: 'Bonus',
    level: 'Expert',
    stars: 4,
    skills: ['exam-prep', 'finops'],
    description:
      'Timed practice exam covering the FinOps Framework: principles, personas, capabilities, and the lifecycle — with explanations to close knowledge gaps.',
    prerequisites: ['finance-capstone'],
    labType: 'quiz',
    isBonus: true,
  },
];
