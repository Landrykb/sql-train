import type { CloudProvider } from './types';

export type TrialDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ExamLevel = 'Practitioner' | 'Associate' | 'Professional' | 'Specialty' | 'None';

export interface CloudTrialQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  provider: CloudProvider | 'multi';
  difficulty: TrialDifficulty;
  topic: string;
  examLevel: ExamLevel;
  hint?: string; // Hint for struggling users
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
    examLevel: 'Associate',
    hint: 'Look for a storage class that automatically moves data between tiers based on access patterns.',
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
    examLevel: 'Associate',
    hint: 'Serverless means no servers to manage - you only pay when code runs.',
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
    examLevel: 'Professional',
    hint: 'Think about what allows outbound traffic but blocks inbound traffic from the internet.',
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
    examLevel: 'Associate',
    hint: 'Synchronous means the standby is always up-to-date - automatic failover requires this.',
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
    examLevel: 'Professional',
    hint: 'The cheapest option has a catch - your instances can be interrupted.',
  },
  {
    id: 'ct-006',
    question: 'Which AWS service provides a managed message queue for decoupling distributed systems?',
    options: ['SNS', 'SQS', 'Kinesis', 'EventBridge'],
    answer: 'SQS',
    explanation:
      'SQS is a fully managed message queuing service that decouples and scales microservices, distributed systems, and serverless apps.',
    provider: 'aws',
    difficulty: 'easy',
    topic: 'messaging',
    examLevel: 'Associate',
    hint: 'Queue = store messages for later processing. Pub/Sub = broadcast to multiple subscribers.',
  },
  {
    id: 'ct-007',
    question: 'You need to route traffic based on URL paths across multiple services. Which AWS service provides this at Layer 7?',
    options: ['Classic Load Balancer', 'Network Load Balancer', 'Application Load Balancer', 'Gateway Load Balancer'],
    answer: 'Application Load Balancer',
    explanation:
      'ALB operates at Layer 7 and supports content-based routing, path-based routing, and host-based routing.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'elb',
    examLevel: 'Professional',
    hint: 'Layer 7 = HTTP/HTTPS - can inspect URLs and headers. Layer 4 = TCP/UDP.',
  },
  {
    id: 'ct-008',
    question: 'Which AWS service provides a globally distributed key management service?',
    options: ['Secrets Manager', 'Parameter Store', 'AWS KMS', 'CloudHSM'],
    answer: 'AWS KMS',
    explanation:
      'AWS KMS is a managed service that makes it easy for you to create and control the encryption keys used to encrypt your data.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'security',
    examLevel: 'Professional',
    hint: 'The service for managing encryption keys at a global scale.',
  },
  {
    id: 'ct-009',
    question: 'Which database option is best for storing user sessions with millisecond latency requirements?',
    options: ['RDS', 'DynamoDB', 'Redshift', 'Aurora Serverless'],
    answer: 'DynamoDB',
    explanation:
      'DynamoDB provides single-digit millisecond latency at any scale, making it ideal for session storage and real-time use cases.',
    provider: 'aws',
    difficulty: 'medium',
    topic: 'database-selection',
    examLevel: 'Professional',
    hint: 'Think about which database offers the fastest read/write latency for key-value lookups.',
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
    examLevel: 'Associate',
    hint: 'IAM is about identity - authentication and authorization of users.',
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
    examLevel: 'Associate',
    hint: 'Management groups organize subscriptions. Subscriptions contain resource groups. Resource groups contain resources.',
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
    examLevel: 'Professional',
    hint: 'WAF (Web Application Firewall) operates at Layer 7 - HTTP/HTTPS level.',
  },
  {
    id: 'ct-013',
    question: 'Which Azure service provides serverless compute for event-driven applications?',
    options: ['Azure Functions', 'Azure App Service', 'Azure Container Instances', 'Azure Virtual Machine Scale Sets'],
    answer: 'Azure Functions',
    explanation:
      'Azure Functions is a serverless compute service that enables you to run event-triggered code without having to provision or manage infrastructure.',
    provider: 'azure',
    difficulty: 'easy',
    topic: 'azure-serverless',
    examLevel: 'Associate',
    hint: 'Serverless = no infrastructure management, pay per execution.',
  },
  {
    id: 'ct-014',
    question: 'Which Azure database service is a fully managed PostgreSQL and MySQL database?',
    options: ['Azure SQL Database', 'Azure Cosmos DB', 'Azure Database for PostgreSQL/MySQL', 'SQL Server on Azure VM'],
    answer: 'Azure Database for PostgreSQL/MySQL',
    explanation:
      'Azure Database for PostgreSQL and MySQL are fully managed database services for open-source databases.',
    provider: 'azure',
    difficulty: 'easy',
    topic: 'azure-databases',
    examLevel: 'Associate',
    hint: 'The service specifically for PostgreSQL and MySQL open-source databases.',
  },
  {
    id: 'ct-015',
    question: 'Which Azure service provides a globally distributed, multi-model database?',
    options: ['Azure SQL Database', 'Azure Cosmos DB', 'Azure Table Storage', 'Azure Cache for Redis'],
    answer: 'Azure Cosmos DB',
    explanation:
      'Azure Cosmos DB is a globally distributed, multi-model database service that supports multiple data models and APIs.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'cosmosdb',
    examLevel: 'Professional',
    hint: 'Globally distributed + multiple data models (document, key-value, graph, table).',
  },
  {
    id: 'ct-016',
    question: 'Which Azure service provides private connectivity between Azure resources and on-premises networks?',
    options: ['VPN Gateway', 'ExpressRoute', 'Virtual Network Peering', 'Azure Firewall'],
    answer: 'ExpressRoute',
    explanation:
      'ExpressRoute provides a private, dedicated fiber connection between your on-premises infrastructure and Azure datacenters.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'azure-hybrid',
    examLevel: 'Professional',
    hint: 'Private, dedicated connection - not over the public internet.',
  },
  {
    id: 'ct-017',
    question: 'Which Azure service provides container orchestration with Kubernetes?',
    options: ['Azure Container Instances', 'Azure Kubernetes Service (AKS)', 'Azure App Service', 'Azure Service Fabric'],
    answer: 'Azure Kubernetes Service (AKS)',
    explanation:
      'AKS is a managed Kubernetes service that simplifies deploying, managing, and operating containerized applications.',
    provider: 'azure',
    difficulty: 'medium',
    topic: 'azure-containers',
    examLevel: 'Professional',
    hint: 'Kubernetes = container orchestration. The Azure managed version is AKS.',
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
    examLevel: 'Professional',
    hint: 'Zero node management means you don\'t even see or manage the nodes.',
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
    examLevel: 'Associate',
    hint: 'Serverless SQL analytics at petabyte scale - think data warehouse.',
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
    examLevel: 'Associate',
    hint: 'In GCP, everything belongs to a Project - it\'s the fundamental unit of organization.',
  },
  {
    id: 'ct-023',
    question: 'Which GCP service provides a fully managed relational database compatible with MySQL and PostgreSQL?',
    options: ['Cloud Spanner', 'Cloud SQL', 'Bigtable', 'Firestore'],
    answer: 'Cloud SQL',
    explanation:
      'Cloud SQL is a fully managed relational database service for MySQL, PostgreSQL, and SQL Server.',
    provider: 'gcp',
    difficulty: 'easy',
    topic: 'gcp-databases',
    examLevel: 'Associate',
    hint: 'The service specifically for relational databases (MySQL, PostgreSQL, SQL Server).',
  },
  {
    id: 'ct-024',
    question: 'Which GCP service provides serverless containers that automatically scale to zero?',
    options: ['GKE', 'Cloud Run', 'App Engine', 'Compute Engine'],
    answer: 'Cloud Run',
    explanation:
      'Cloud Run is a fully managed compute platform that automatically scales your stateless containers. It scales to zero when not in use.',
    provider: 'gcp',
    difficulty: 'easy',
    topic: 'cloud-run',
    examLevel: 'Associate',
    hint: 'Serverless containers - runs containers, scales to zero, no infrastructure management.',
  },
  {
    id: 'ct-025',
    question: 'Which GCP service provides a globally distributed, strongly consistent database?',
    options: ['BigQuery', 'Cloud Spanner', 'Bigtable', 'Firestore'],
    answer: 'Cloud Spanner',
    explanation:
      'Cloud Spanner is a fully managed, mission-critical, relational database that offers global consistency and horizontal scalability.',
    provider: 'gcp',
    difficulty: 'hard',
    topic: 'spanner',
    examLevel: 'Professional',
    hint: 'The only database that offers both global distribution AND strong consistency (CAP theorem trade-off).',
  },
  {
    id: 'ct-026',
    question: 'Which GCP service provides managed Hadoop and Spark for big data processing?',
    options: ['BigQuery', 'Dataproc', 'Dataflow', 'Pub/Sub'],
    answer: 'Dataproc',
    explanation:
      'Dataproc is a managed service for running Apache Spark and Hadoop clusters on Google Cloud Platform.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'dataproc',
    examLevel: 'Professional',
    hint: 'The GCP equivalent of EMR (Elastic MapReduce) - managed Hadoop/Spark.',
  },
  {
    id: 'ct-027',
    question: 'Which GCP service provides a fully managed, real-time messaging service?',
    options: ['Cloud Pub/Sub', 'Cloud Tasks', 'Cloud Scheduler', 'Eventarc'],
    answer: 'Cloud Pub/Sub',
    explanation:
      'Cloud Pub/Sub is a fully-managed real-time messaging service that allows you to send and receive messages between independent applications.',
    provider: 'gcp',
    difficulty: 'medium',
    topic: 'pubsub',
    examLevel: 'Professional',
    hint: 'Pub/Sub = publish/subscribe messaging pattern for asynchronous communication.',
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
    examLevel: 'None',
    hint: 'Carbon credits are about the right to emit - think "permission" or "allowance".',
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
    examLevel: 'Specialty',
    hint: 'IoT = Internet of Things - the service specifically for device connectivity and messaging.',
  },
  {
    id: 'ct-032',
    question: 'Emissions from a company\'s purchased electricity fall under which scope?',
    options: ['Scope 1', 'Scope 2', 'Scope 3', 'Scope 0'],
    answer: 'Scope 2',
    explanation:
      'Scope 1 = direct, Scope 2 = indirect from purchased energy, Scope 3 = all other value-chain emissions.',
    provider: 'esg',
    difficulty: 'medium',
    topic: 'net-zero-roadmap',
    examLevel: 'None',
    hint: 'Scope 1 = what you burn directly. Scope 2 = what you buy (electricity). Scope 3 = everything else.',
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
    examLevel: 'Specialty',
    hint: 'Ledger database = immutable transactions with cryptographic verification.',
  },
  {
    id: 'ct-034',
    question: 'Which AWS service helps calculate and report carbon emissions for cloud usage?',
    options: ['CloudWatch', 'AWS Cost Explorer', 'AWS Customer Carbon Footprint Tool', 'AWS Trusted Advisor'],
    answer: 'AWS Customer Carbon Footprint Tool',
    explanation:
      'The Carbon Footprint Tool provides estimates of the carbon emissions associated with your AWS usage.',
    provider: 'esg',
    difficulty: 'easy',
    topic: 'carbon-footprint',
    examLevel: 'Specialty',
    hint: 'The tool specifically designed for carbon emissions reporting.',
  },
  {
    id: 'ct-035',
    question: 'What is the main goal of the Science Based Targets initiative (SBTi)?',
    options: [
      'To certify companies as carbon neutral',
      'To help companies set emission reduction targets aligned with climate science',
      'To trade carbon credits globally',
      'To regulate carbon pricing',
    ],
    answer: 'To help companies set emission reduction targets aligned with climate science',
    explanation:
      'SBTi provides companies with a clearly-defined path to reduce emissions in line with the Paris Agreement goals.',
    provider: 'esg',
    difficulty: 'medium',
    topic: 'sbti',
    examLevel: 'None',
    hint: 'SBTi is about setting targets based on science (climate science, not arbitrary goals).',
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
    examLevel: 'None',
    hint: 'You need visibility (information) before you can optimize anything.',
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
    examLevel: 'Professional',
    hint: 'Real-time = streaming + low-latency processing + online model inference.',
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
    examLevel: 'Professional',
    hint: 'Streaming means sending data OUT to users - think about what costs money when data leaves the cloud.',
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
    examLevel: 'Specialty',
    hint: 'HIPAA is about protecting patient health information - encryption and access control are key.',
  },
  {
    id: 'ct-044',
    question: 'Which AWS service helps implement resource tagging for cost allocation?',
    options: ['AWS Cost Explorer', 'AWS Budgets', 'AWS Tag Editor', 'AWS Trusted Advisor'],
    answer: 'AWS Tag Editor',
    explanation:
      'Tag Editor allows you to bulk manage tags on resources, which is essential for cost allocation and organization.',
    provider: 'finance',
    difficulty: 'medium',
    topic: 'cost-allocation',
    examLevel: 'Professional',
    hint: 'Tagging is about labeling resources - the tool for bulk tag management.',
  },
  {
    id: 'ct-045',
    question: 'What is the primary purpose of a showback in FinOps?',
    options: [
      'To charge departments for their cloud usage',
      'To show teams their cloud costs without actually charging them',
      'To reduce overall cloud spending',
      'To negotiate better pricing with cloud providers',
    ],
    answer: 'To show teams their cloud costs without actually charging them',
    explanation:
      'Showback is about visibility - showing teams their costs to encourage cost-conscious behavior without actual billing.',
    provider: 'finance',
    difficulty: 'easy',
    topic: 'finops-showback',
    examLevel: 'None',
    hint: 'Show vs Charge - showback is about showing, not charging.',
  },
  {
    id: 'ct-046',
    question: 'Which compliance framework is specifically for payment card industry security?',
    options: ['HIPAA', 'PCI-DSS', 'SOC 2', 'GDPR'],
    answer: 'PCI-DSS',
    explanation:
      'PCI-DSS (Payment Card Industry Data Security Standard) is specifically for protecting payment card data.',
    provider: 'finance',
    difficulty: 'easy',
    topic: 'pci-dss',
    examLevel: 'Specialty',
    hint: 'PCI = Payment Card Industry - think about payment card security.',
  },
  {
    id: 'ct-047',
    question: 'Which cloud architecture pattern involves deploying resources across multiple geographic regions?',
    options: ['Multi-AZ', 'Multi-region', 'Hybrid cloud', 'Serverless'],
    answer: 'Multi-region',
    explanation:
      'Multi-region architecture deploys resources across multiple geographic regions for disaster recovery and reduced latency.',
    provider: 'finance',
    difficulty: 'medium',
    topic: 'multi-region',
    examLevel: 'Professional',
    hint: 'Multiple geographic regions = multi-region. Multiple availability zones = multi-AZ.',
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
    examLevel: 'Professional',
    hint: 'RTO = Time (how fast). RPO = Data (how much loss).',
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
    examLevel: 'Associate',
    hint: 'IaC treats infrastructure like code - versioning, review, reproduction.',
  },
  {
    id: 'ct-052',
    question: 'Which deployment strategy updates infrastructure with minimal downtime by using blue/green environments?',
    options: ['Rolling update', 'Blue/green deployment', 'Canary deployment', 'In-place update'],
    answer: 'Blue/green deployment',
    explanation:
      'Blue/green deployment maintains two identical environments (blue and green) and switches traffic between them, enabling instant rollback.',
    provider: 'multi',
    difficulty: 'medium',
    topic: 'deployment-strategies',
    examLevel: 'Professional',
    hint: 'Two complete environments - one live, one ready - switch traffic between them.',
  },
  {
    id: 'ct-053',
    question: 'What is the primary benefit of using a CDN (Content Delivery Network)?',
    options: [
      'Reduced storage costs',
      'Improved security',
      'Reduced latency for content delivery',
      'Simplified database management',
    ],
    answer: 'Reduced latency for content delivery',
    explanation:
      'CDNs cache content at edge locations closer to users, reducing latency and improving performance.',
    provider: 'multi',
    difficulty: 'easy',
    topic: 'cdn',
    examLevel: 'Associate',
    hint: 'CDN = Content Delivery Network - delivers content from locations closer to users.',
  },
  {
    id: 'ct-054',
    question: 'Which disaster recovery strategy has the lowest RPO but highest cost?',
    options: ['Backup and restore', 'Pilot light', 'Warm standby', 'Hot standby'],
    answer: 'Hot standby',
    explanation:
      'Hot standby keeps a fully replicated environment running at all times, enabling near-zero RPO but at highest cost.',
    provider: 'multi',
    difficulty: 'hard',
    topic: 'disaster-recovery',
    examLevel: 'Professional',
    hint: 'Lowest RPO = least data loss = everything replicated in real-time = highest cost.',
  },
  {
    id: 'ct-055',
    question: 'Which principle of the Shared Responsibility Model states that customers are responsible for data classification?',
    options: ['Security of the cloud', 'Security in the cloud', 'Both', 'Neither'],
    answer: 'Security in the cloud',
    explanation:
      'Security in the cloud (customer responsibility) includes data classification, IAM, and configuration. Security of the cloud (provider responsibility) includes physical security and network protection.',
    provider: 'multi',
    difficulty: 'medium',
    topic: 'shared-responsibility',
    examLevel: 'Associate',
    hint: 'Security OF the cloud = provider (physical). Security IN the cloud = customer (data, config).',
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
