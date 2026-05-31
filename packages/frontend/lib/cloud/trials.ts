import type { CloudProvider } from './types';

export type TrialDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface CloudTrialQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  provider: CloudProvider | 'multi';
  difficulty: TrialDifficulty;
  topic: string;
}

export const cloudTrials: CloudTrialQuestion[] = [
  // ── AWS ──────────────────────────────────────────────────────────
  {
    id: 'ct-001',
    question:
      'An application needs storage for log files accessed frequently for 30 days, then rarely. Which S3 storage class minimizes cost without manual lifecycle tuning?',
    options: ['S3 Standard', 'S3 Intelligent-Tiering', 'S3 Standard-IA', 'S3 Glacier Deep Archive'],
    answer: 'S3 Intelligent-Tiering',
    explanation:
      'Intelligent-Tiering automatically moves objects between access tiers based on usage, ideal when access patterns change or are unknown.',
    provider: 'aws',
    difficulty: 'easy',
    topic: 's3-fundamentals',
  },
  {
    id: 'ct-002',
    question:
      'A stateless web app must scale to zero when idle and bill only for execution time. Which service fits best?',
    options: ['EC2 Auto Scaling', 'ECS Fargate', 'Lambda', 'Elastic Beanstalk'],
    answer: 'Lambda',
    explanation:
      'Lambda is serverless and event-driven: it scales to zero and you pay only per invocation and duration.',
    provider: 'aws',
    difficulty: 'easy',
    topic: 'lambda-serverless',
  },
  {
    id: 'ct-003',
    question:
      'You need private-subnet EC2 instances to download OS patches from the internet without being reachable from it. What do you add?',
    options: ['Internet Gateway', 'NAT Gateway', 'VPC Peering', 'Transit Gateway'],
    answer: 'NAT Gateway',
    explanation:
      'A NAT Gateway lets instances in private subnets initiate outbound internet traffic while remaining unreachable from the internet.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'vpc-advanced',
  },
  {
    id: 'ct-004',
    question: 'Which feature gives an RDS database synchronous, automatic failover for high availability?',
    options: ['Read Replicas', 'Multi-AZ deployment', 'DynamoDB Global Tables', 'ElastiCache'],
    answer: 'Multi-AZ deployment',
    explanation:
      'Multi-AZ maintains a synchronous standby in another AZ and fails over automatically. Read replicas are asynchronous and for read scaling.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'rds-basics',
  },
  {
    id: 'ct-005',
    question: 'A workload is fault-tolerant and can be interrupted. Which EC2 purchasing option is cheapest?',
    options: ['On-Demand', 'Reserved Instances', 'Spot Instances', 'Dedicated Hosts'],
    answer: 'Spot Instances',
    explanation:
      'Spot uses spare capacity at up to ~90% discount but can be reclaimed with a 2-minute warning — perfect for fault-tolerant batch jobs.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'cost-optimization',
  },

  // ── AZURE ────────────────────────────────────────────────────────
  {
    id: 'ct-010',
    question: 'Which Azure service is the closest equivalent to AWS IAM?',
    options: ['Azure Policy', 'Microsoft Entra ID', 'Azure Key Vault', 'Azure RBAC alone'],
    answer: 'Microsoft Entra ID',
    explanation:
      'Entra ID (formerly Azure AD) is the identity provider; RBAC is the authorization layer built on top of it.',
    provider: 'azure',
    difficulty: 'easy',
    topic: 'azure-iam',
  },
  {
    id: 'ct-011',
    question: 'What is the correct Azure resource hierarchy from broadest to narrowest?',
    options: [
      'Subscription → Management Group → Resource Group → Resource',
      'Management Group → Subscription → Resource Group → Resource',
      'Resource Group → Subscription → Management Group → Resource',
      'Tenant → Resource → Subscription → Resource Group',
    ],
    answer: 'Management Group → Subscription → Resource Group → Resource',
    explanation:
      'Policies and RBAC can be applied at each level and inherit downward through this hierarchy.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'azure-fundamentals',
  },
  {
    id: 'ct-012',
    question: 'Which Azure offering provides Layer-7 load balancing with a built-in Web Application Firewall?',
    options: ['Azure Load Balancer', 'Application Gateway', 'Traffic Manager', 'ExpressRoute'],
    answer: 'Application Gateway',
    explanation:
      'Application Gateway is an L7 load balancer with optional WAF. Azure Load Balancer is L4; Traffic Manager is DNS-based.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'azure-networking',
  },

  // ── GCP ──────────────────────────────────────────────────────────
  {
    id: 'ct-020',
    question: 'A GCP workload needs fully managed Kubernetes with zero node management. Which option?',
    options: ['GKE Standard', 'GKE Autopilot', 'Cloud Run', 'App Engine Flexible'],
    answer: 'GKE Autopilot',
    explanation:
      'Autopilot manages node provisioning, scaling and security; you only define workloads.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'gke',
  },
  {
    id: 'ct-021',
    question: 'Which GCP service offers serverless, petabyte-scale SQL analytics with no infrastructure to manage?',
    options: ['Cloud SQL', 'BigQuery', 'Bigtable', 'Dataproc'],
    answer: 'BigQuery',
    explanation:
      'BigQuery is a serverless data warehouse; you pay for storage and bytes scanned, with partitioning/clustering to control cost.',
    provider: 'gcp',
    difficulty: 'easy',
    topic: 'bigquery',
  },
  {
    id: 'ct-022',
    question: 'What is the unit of isolation and billing in Google Cloud?',
    options: ['Folder', 'Project', 'Subscription', 'Resource Group'],
    answer: 'Project',
    explanation:
      'Projects isolate resources, IAM, billing and quotas. Folders and the Organization sit above projects.',
    provider: 'gcp',
    difficulty: 'easy',
    topic: 'gcp-fundamentals',
  },

  // ── ESG ──────────────────────────────────────────────────────────
  {
    id: 'ct-030',
    question: 'What does one carbon credit represent?',
    options: [
      'A tax deduction for renewable energy',
      'Permission to emit 1 tonne of CO2-equivalent',
      'A bond issued by a central bank',
      'A subsidy for electric vehicles',
    ],
    answer: 'Permission to emit 1 tonne of CO2-equivalent',
    explanation:
      'One credit = the right to emit one metric tonne of CO2e. Credits can be bought, sold, and retired.',
    provider: 'esg',
    difficulty: 'easy',
    topic: 'carbon-credits-explained',
  },
  {
    id: 'ct-031',
    question:
      'A farmer in Benin installs a soil CO2 sensor sending hourly readings. Which AWS service best ingests this IoT data at scale?',
    options: ['SQS', 'AWS IoT Core', 'Kinesis Data Firehose', 'SNS'],
    answer: 'AWS IoT Core',
    explanation:
      'IoT Core handles device authentication, MQTT messaging, and routing of device data to downstream services.',
    provider: 'esg',
    difficulty: 'medium',
    topic: 'farmer-iot-platform',
  },
  {
    id: 'ct-032',
    question: 'Emissions from a company’s purchased electricity fall under which scope?',
    options: ['Scope 1', 'Scope 2', 'Scope 3', 'Scope 0'],
    answer: 'Scope 2',
    explanation:
      'Scope 1 = direct, Scope 2 = indirect from purchased energy, Scope 3 = all other value-chain emissions.',
    provider: 'esg',
    difficulty: 'medium',
    topic: 'net-zero-roadmap',
  },
  {
    id: 'ct-033',
    question:
      'You must store carbon-credit transactions so they are immutable and cryptographically verifiable. Which AWS database fits best?',
    options: ['DynamoDB', 'Amazon QLDB', 'RDS MySQL', 'ElastiCache'],
    answer: 'Amazon QLDB',
    explanation:
      'QLDB is a ledger database with an immutable, append-only journal and cryptographic verification — ideal for audit trails.',
    provider: 'esg',
    difficulty: 'hard',
    topic: 'carbon-ledger',
  },

  // ── FINANCE / TRANSVERSAL ────────────────────────────────────────
  {
    id: 'ct-040',
    question: 'In the FinOps lifecycle, which phase comes first?',
    options: ['Optimize', 'Operate', 'Inform', 'Automate'],
    answer: 'Inform',
    explanation:
      'FinOps follows Inform → Optimize → Operate. You cannot optimize what you cannot see, so visibility and allocation come first.',
    provider: 'finance',
    difficulty: 'easy',
    topic: 'finops-foundations',
  },
  {
    id: 'ct-041',
    question:
      'A payments platform must score card transactions for fraud in milliseconds. Which combination fits a real-time architecture?',
    options: [
      'S3 + Glue + Athena (batch)',
      'Kinesis + Lambda + SageMaker real-time endpoint',
      'EMR + nightly Spark job',
      'RDS triggers + cron',
    ],
    answer: 'Kinesis + Lambda + SageMaker real-time endpoint',
    explanation:
      'Streaming ingestion (Kinesis), low-latency enrichment (Lambda), and an online model endpoint (SageMaker) deliver millisecond scoring.',
    provider: 'finance',
    difficulty: 'hard',
    topic: 'realtime-fraud-arch',
  },
  {
    id: 'ct-042',
    question:
      'A media company is shocked by its monthly bill. Which cost is most often the "silent killer" for streaming workloads?',
    options: ['Compute (EC2)', 'Data transfer / egress', 'S3 storage', 'CloudWatch logs'],
    answer: 'Data transfer / egress',
    explanation:
      'Outbound data transfer (egress) dominates streaming costs; CDN caching and right-sized delivery are essential.',
    provider: 'finance',
    difficulty: 'medium',
    topic: 'media-streaming',
  },
  {
    id: 'ct-043',
    question: 'For a HIPAA-regulated patient data platform, which practice is required?',
    options: [
      'Store PHI in public S3 buckets for easy access',
      'Encrypt PHI at rest and in transit with strict access controls',
      'Disable logging to save cost',
      'Use the root account for all operations',
    ],
    answer: 'Encrypt PHI at rest and in transit with strict access controls',
    explanation:
      'PHI must be encrypted, access-controlled, and auditable, using BAA-eligible services.',
    provider: 'finance',
    difficulty: 'medium',
    topic: 'healthcare-hipaa',
  },

  // ── MULTI-CLOUD ──────────────────────────────────────────────────
  {
    id: 'ct-050',
    question: 'RTO and RPO respectively measure:',
    options: [
      'Request timeout and response payload',
      'Recovery time objective and recovery point objective',
      'Read throughput and replication offset',
      'Region tolerance and provider outage',
    ],
    answer: 'Recovery time objective and recovery point objective',
    explanation:
      'RTO = how quickly you must recover; RPO = how much data loss (time) is acceptable. They drive DR strategy choice.',
    provider: 'multi',
    difficulty: 'medium',
    topic: 'ha-patterns',
  },
  {
    id: 'ct-051',
    question: 'Which statement about IaC (Infrastructure as Code) is correct?',
    options: [
      'It applies only to AWS CloudFormation',
      'It lets you version, review and reproduce infrastructure like application code',
      'It is slower than clicking in the console',
      'Terraform state is unnecessary',
    ],
    answer: 'It lets you version, review and reproduce infrastructure like application code',
    explanation:
      'IaC (CloudFormation, Bicep, Terraform, CDK) makes infra declarative, reviewable, repeatable and auditable.',
    provider: 'multi',
    difficulty: 'easy',
    topic: 'iac',
  },
];

export const TRIAL_PROVIDERS: (CloudProvider | 'multi')[] = [
  'aws',
  'azure',
  'gcp',
  'esg',
  'finance',
  'multi',
];
