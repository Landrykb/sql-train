export interface GuideEntry {
  term: string;
  category: string;
  provider: string; // 'aws' | 'azure' | 'gcp' | 'esg' | 'general'
  definition: string;
}

// A searchable reference glossary for the BleepxCloud verse.
export const cloudGuide: GuideEntry[] = [
  // General concepts
  { term: 'IaaS / PaaS / SaaS', category: 'Concepts', provider: 'general', definition: 'The three cloud service models. IaaS gives you raw infrastructure (VMs, networks). PaaS gives you a managed platform (you bring code). SaaS gives you finished software (you just use it).' },
  { term: 'Region & Availability Zone', category: 'Concepts', provider: 'general', definition: 'A Region is a geographic location; an Availability Zone (AZ) is an isolated datacenter within it. Spread workloads across AZs for fault tolerance and across regions for disaster recovery.' },
  { term: 'RTO vs RPO', category: 'Concepts', provider: 'general', definition: 'Recovery Time Objective = how fast you must recover after an outage. Recovery Point Objective = how much data (in time) you can afford to lose. Together they drive your DR strategy.' },
  { term: 'Infrastructure as Code (IaC)', category: 'Concepts', provider: 'general', definition: 'Defining infrastructure in version-controlled files instead of clicking in a console. Tools: CloudFormation, Terraform, Bicep, CDK, Pulumi. Enables reviews, repeatability, and audit.' },
  { term: 'Shared Responsibility Model', category: 'Concepts', provider: 'general', definition: 'The cloud provider secures the cloud (hardware, hypervisor); you secure what you put in the cloud (data, access, configuration). Misconfiguration — not provider breaches — causes most incidents.' },
  { term: 'Scaling: Vertical vs Horizontal', category: 'Concepts', provider: 'general', definition: 'Vertical = bigger machine (more CPU/RAM). Horizontal = more machines behind a load balancer. Cloud-native designs prefer horizontal scaling of stateless services.' },

  // AWS
  { term: 'EC2', category: 'Compute', provider: 'aws', definition: 'Elastic Compute Cloud — resizable virtual machines. Choose instance families (t/m/c/r), AMIs, and pay per second. The foundation of IaaS on AWS.' },
  { term: 'S3', category: 'Storage', provider: 'aws', definition: 'Simple Storage Service — object storage with 11 nines of durability. Storage classes (Standard, IA, Glacier, Intelligent-Tiering) trade cost for retrieval speed.' },
  { term: 'VPC', category: 'Networking', provider: 'aws', definition: 'Virtual Private Cloud — your isolated network. Contains subnets (public/private), route tables, Internet Gateway, and NAT Gateway.' },
  { term: 'IAM', category: 'Security', provider: 'aws', definition: 'Identity and Access Management — defines who (users/roles) can do what (policies) to which resources. Follow least privilege; never use the root account day-to-day.' },
  { term: 'Lambda', category: 'Compute', provider: 'aws', definition: 'Serverless functions. Event-driven, scales to zero, billed per invocation + duration. Max 15-minute runtime; mind cold starts.' },
  { term: 'RDS', category: 'Databases', provider: 'aws', definition: 'Managed relational databases (MySQL, Postgres, etc.). Multi-AZ for HA (synchronous standby), read replicas for read scaling (asynchronous).' },
  { term: 'DynamoDB', category: 'Databases', provider: 'aws', definition: 'Managed NoSQL key-value/document DB with single-digit-millisecond latency. Design around access patterns; choose partition keys to avoid hot partitions.' },
  { term: 'CloudFormation', category: 'IaC', provider: 'aws', definition: 'AWS-native IaC using YAML/JSON templates organized into stacks. Supports parameters, outputs, and drift detection.' },

  // Azure
  { term: 'Resource Group', category: 'Core', provider: 'azure', definition: 'A logical container for related Azure resources sharing a lifecycle. Sits under a Subscription, which sits under a Management Group.' },
  { term: 'Microsoft Entra ID', category: 'Security', provider: 'azure', definition: 'Azure\'s cloud identity provider (formerly Azure AD). Combined with RBAC and Conditional Access for authentication and authorization.' },
  { term: 'Blob Storage', category: 'Storage', provider: 'azure', definition: 'Azure object storage within a Storage Account. Access tiers: Hot, Cool, Archive. Redundancy: LRS, ZRS, GRS, GZRS.' },
  { term: 'Bicep', category: 'IaC', provider: 'azure', definition: 'A clean domain-specific language that compiles to ARM templates. Easier to read and write than raw ARM JSON.' },
  { term: 'Cosmos DB', category: 'Databases', provider: 'azure', definition: 'Globally distributed, multi-model NoSQL database with five tunable consistency levels and single-digit-ms latency.' },

  // GCP
  { term: 'Project', category: 'Core', provider: 'gcp', definition: 'The fundamental unit of isolation in GCP — groups resources, IAM, billing and quotas. Organized under Folders and an Organization.' },
  { term: 'BigQuery', category: 'Data', provider: 'gcp', definition: 'Serverless, petabyte-scale data warehouse. Pay for storage + bytes scanned. Use partitioning and clustering to control cost; train models with BigQuery ML.' },
  { term: 'GKE', category: 'Containers', provider: 'gcp', definition: 'Google Kubernetes Engine. Standard mode (you manage nodes) or Autopilot (Google manages nodes; you just deploy workloads).' },
  { term: 'Cloud Run', category: 'Serverless', provider: 'gcp', definition: 'Run any stateless container that listens on a port. Fully managed, scales to zero, request-based billing. Built on Knative.' },
  { term: 'Pub/Sub', category: 'Messaging', provider: 'gcp', definition: 'Global, scalable messaging for event-driven systems and streaming ingestion. Pairs with Dataflow for processing.' },

  // ESG
  { term: 'Carbon Credit', category: 'ESG', provider: 'esg', definition: 'A tradable certificate representing the right to emit one tonne of CO2-equivalent. Verified by registries like Verra and Gold Standard.' },
  { term: 'Scope 1 / 2 / 3', category: 'ESG', provider: 'esg', definition: 'GHG Protocol emission categories. Scope 1 = direct (owned sources). Scope 2 = purchased energy. Scope 3 = value chain (usually the largest and hardest to measure).' },
  { term: 'Net-Zero vs Carbon Neutral', category: 'ESG', provider: 'esg', definition: 'Carbon Neutral typically offsets emissions. Net-Zero means deeply cutting emissions (often via SBTi-validated targets) and only offsetting the unavoidable residual.' },
  { term: 'NDVI', category: 'ESG', provider: 'esg', definition: 'Normalized Difference Vegetation Index — a satellite-derived measure of vegetation health. Used to estimate biomass and carbon sequestration in farming projects.' },
  { term: 'Sustainability Pillar', category: 'ESG', provider: 'esg', definition: 'The 6th pillar of the AWS Well-Architected Framework: minimize the environmental impact of cloud workloads through region choice, right-sizing, and efficient design.' },
  { term: 'Carbon Footprint API', category: 'ESG', provider: 'gcp', definition: 'GCP service that reports gross carbon emissions per project, which can be exported to BigQuery and visualized for decarbonization tracking.' },
];

export const GUIDE_CATEGORIES = Array.from(new Set(cloudGuide.map((g) => g.category)));
export const GUIDE_PROVIDERS = ['general', 'aws', 'azure', 'gcp', 'esg'];
