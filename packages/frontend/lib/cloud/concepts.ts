// ─── Cloud Concept Knowledge Base ────────────────────────────────────────────
// Every mission "skill" maps to a real teaching unit here. This is what turns
// BleepxCloud from a checklist into progressive learning: each concept explains
// WHAT it is, WHY it matters, WHEN to use it, a realistic EXAMPLE, and the
// GOTCHA that trips people up (and shows up in exams).

export interface CloudConcept {
  /** Human-friendly name */
  name: string;
  icon: string;
  /** One-line plain-English definition */
  what: string;
  /** Why an architect cares */
  why: string;
  /** When to reach for it (and when NOT to) */
  when: string;
  /** A realistic snippet: CLI, config, or code */
  example?: { lang: string; code: string };
  /** The classic mistake / exam trap */
  gotcha?: string;
}

export const CLOUD_CONCEPTS: Record<string, CloudConcept> = {
  // ── AWS Compute ────────────────────────────────────────────────
  ec2: {
    name: 'Amazon EC2',
    icon: '🖥️',
    what: 'Resizable virtual machines running on AWS hardware, billed per second.',
    why: 'It is the raw building block of IaaS — full OS control when managed services are too restrictive.',
    when: 'Use for lift-and-shift, custom runtimes, or stateful workloads. Avoid when a managed service (Lambda, Fargate, RDS) removes the ops burden.',
    example: {
      lang: 'bash',
      code: `aws ec2 run-instances \\
  --image-id ami-0abcd1234 \\
  --instance-type t3.micro \\
  --key-name my-key \\
  --security-group-ids sg-0a1b2c3d \\
  --subnet-id subnet-0e1f2a3b \\
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=web-01}]'`,
    },
    gotcha: 'Stopping an instance still bills for attached EBS volumes and Elastic IPs. Only terminating frees most charges.',
  },
  regions: {
    name: 'Regions & Availability Zones',
    icon: '🌍',
    what: 'A Region is a geographic area; an AZ is one or more isolated datacenters within it.',
    why: 'Spreading across AZs survives a datacenter failure; spreading across Regions survives a regional outage and meets data-residency law.',
    when: 'Always pick a Region close to users / data-residency rules. Use multiple AZs for HA by default; multi-Region only when RTO/RPO demands it.',
    gotcha: 'Not every service or instance type exists in every Region, and cross-Region data transfer costs money.',
  },
  ami: {
    name: 'Amazon Machine Image (AMI)',
    icon: '💿',
    what: 'A template containing the OS, configuration and software used to launch EC2 instances.',
    why: 'Baking a golden AMI makes launches fast, consistent and immutable.',
    when: 'Use custom AMIs for repeatable fleets; use AWS-managed AMIs for quick starts.',
    gotcha: 'AMIs are Region-specific — you must copy them to use in another Region.',
  },
  asg: {
    name: 'Auto Scaling Group',
    icon: '📈',
    what: 'Maintains a desired number of EC2 instances, adding/removing them on demand.',
    why: 'Turns a fragile single server into a self-healing, elastic fleet.',
    when: 'Use for stateless tiers behind a load balancer. Pair target-tracking policies with health checks.',
    example: {
      lang: 'hcl',
      code: `resource "aws_autoscaling_policy" "cpu" {
  name                   = "cpu-target-50"
  autoscaling_group_name = aws_autoscaling_group.web.name
  policy_type            = "TargetTrackingScaling"
  target_tracking_configuration {
    predefined_metric_specification { predefined_metric_type = "ASGAverageCPUUtilization" }
    target_value = 50.0
  }
}`,
    },
    gotcha: 'Scaling cannot fix a stateful app — session data must live in a shared store (ElastiCache/DynamoDB), not on the instance.',
  },
  alb: {
    name: 'Application Load Balancer',
    icon: '⚖️',
    what: 'A Layer-7 (HTTP/HTTPS) load balancer that routes by path, host and headers.',
    why: 'Distributes traffic across healthy targets in multiple AZs and terminates TLS.',
    when: 'Use ALB for HTTP microservices/containers. Use NLB for ultra-low-latency TCP/UDP.',
    gotcha: 'An ALB needs subnets in at least two AZs, even if your targets live in one.',
  },
  lambda: {
    name: 'AWS Lambda',
    icon: '⚡',
    what: 'Run code in response to events without provisioning servers; billed per request + duration.',
    why: 'Scales to zero and to thousands automatically — no idle cost, no patching.',
    when: 'Use for event-driven glue, APIs, and spiky workloads. Avoid for long (>15 min) or very high-throughput steady jobs where Fargate is cheaper.',
    example: {
      lang: 'python',
      code: `def handler(event, context):
    # Triggered by API Gateway / S3 / EventBridge
    name = event.get("queryStringParameters", {}).get("name", "human")
    return {"statusCode": 200, "body": f"*bleep* hello, {name}"}`,
    },
    gotcha: 'Cold starts add latency; memory and CPU are coupled (more memory = more CPU). The 15-minute hard timeout is a frequent exam trap.',
  },
  fargate: {
    name: 'AWS Fargate',
    icon: '📦',
    what: 'Serverless compute for containers — run ECS/EKS tasks without managing EC2 nodes.',
    why: 'You get containers without capacity planning, patching, or cluster scaling.',
    when: 'Use when you want containers but not node ops. Use EC2 launch type when you need GPUs, specific instance types, or maximum cost control at scale.',
    gotcha: 'Fargate has no host to SSH into — debugging is via logs and ECS Exec, not the box.',
  },

  // ── AWS Storage ────────────────────────────────────────────────
  s3: {
    name: 'Amazon S3',
    icon: '🪣',
    what: 'Object storage with 11 nines of durability and effectively unlimited capacity.',
    why: 'The backbone of data lakes, static sites, backups and pipelines.',
    when: 'Use for objects/blobs. Use EBS for block (a disk for one instance) and EFS for shared file systems.',
    example: {
      lang: 'bash',
      code: `aws s3 cp ./report.pdf s3://my-bucket/reports/ \\
  --storage-class INTELLIGENT_TIERING --sse aws:kms`,
    },
    gotcha: 'S3 is private by default — public exposure is almost always a misconfigured policy or disabled Block Public Access, not an S3 flaw.',
  },
  'storage-classes': {
    name: 'S3 Storage Classes',
    icon: '🗄️',
    what: 'Tiers trading retrieval speed/cost: Standard, Standard-IA, Intelligent-Tiering, Glacier, Glacier Deep Archive.',
    why: 'Right-tiering can cut storage bills 60–90% with no app changes.',
    when: 'Frequent access → Standard. Unknown/changing → Intelligent-Tiering. Archive → Glacier tiers.',
    gotcha: 'IA and Glacier add per-GB retrieval fees and minimum storage durations — cheap to keep, not always cheap to read.',
  },
  lifecycle: {
    name: 'S3 Lifecycle Policies',
    icon: '♻️',
    what: 'Rules that automatically transition or expire objects by age.',
    why: 'Automates cost optimization and compliance retention without scripts.',
    when: 'Use to move logs to Glacier after 30 days and delete after 365, for example.',
    example: {
      lang: 'json',
      code: `{
  "Rules": [{
    "ID": "logs-tiering",
    "Filter": { "Prefix": "logs/" },
    "Status": "Enabled",
    "Transitions": [{ "Days": 30, "StorageClass": "GLACIER" }],
    "Expiration": { "Days": 365 }
  }]
}`,
    },
    gotcha: 'Transitions to Glacier have a 30-day minimum before further transition; tiny objects can cost more to transition than to keep.',
  },
  kms: {
    name: 'AWS KMS',
    icon: '🔑',
    what: 'Managed service to create and control encryption keys.',
    why: 'Centralizes key policy, rotation and audit for encryption at rest.',
    when: 'Use customer-managed keys (CMK) when you need control/audit; AWS-managed keys for simple defaults.',
    gotcha: 'Deleting a CMK is irreversible after the waiting period and renders all data encrypted with it unrecoverable.',
  },

  // ── AWS Networking ─────────────────────────────────────────────
  vpc: {
    name: 'Virtual Private Cloud',
    icon: '🏠',
    what: 'Your logically isolated private network inside AWS.',
    why: 'Everything network-facing lives here; it defines your security perimeter.',
    when: 'Always. Design CIDR ranges up front to avoid overlap with on-prem and peers.',
    gotcha: 'CIDR blocks cannot be resized down after creation — plan address space generously.',
  },
  subnets: {
    name: 'Subnets (Public vs Private)',
    icon: '🔀',
    what: 'CIDR subdivisions of a VPC, each tied to one AZ.',
    why: 'Public subnets host internet-facing resources; private subnets protect databases and app servers.',
    when: 'Put load balancers in public subnets, app/DB tiers in private subnets across ≥2 AZs.',
    gotcha: '"Public" only means it has a route to an Internet Gateway — a public subnet with no IGW route is effectively private.',
  },
  nat: {
    name: 'NAT Gateway',
    icon: '🚪',
    what: 'Lets private-subnet resources make outbound internet connections while staying unreachable inbound.',
    why: 'Enables patching/updates for private instances without exposing them.',
    when: 'Use when private resources need egress (e.g. pulling packages). One per AZ for HA.',
    gotcha: 'NAT Gateways bill hourly AND per-GB processed — a common surprise line item. VPC endpoints can bypass it for AWS-service traffic.',
  },
  cloudfront: {
    name: 'Amazon CloudFront',
    icon: '🌐',
    what: 'A global CDN that caches content at edge locations near users.',
    why: 'Cuts latency, offloads origins, and reduces egress cost.',
    when: 'Use in front of S3 static sites and APIs for global audiences.',
    gotcha: 'Cache invalidations cost money and take time — version your asset filenames instead of invalidating constantly.',
  },
  route53: {
    name: 'Amazon Route 53',
    icon: '🧭',
    what: 'Managed DNS with health checks and traffic-routing policies.',
    why: 'Maps names to resources and enables failover/latency/geo routing.',
    when: 'Use for DNS, multi-Region failover, and weighted/blue-green rollouts.',
    gotcha: 'Alias records (free, AWS-target) differ from CNAMEs and can sit at the zone apex where CNAMEs cannot.',
  },

  // ── AWS Databases ──────────────────────────────────────────────
  rds: {
    name: 'Amazon RDS',
    icon: '🛢️',
    what: 'Managed relational databases (PostgreSQL, MySQL, SQL Server, etc.).',
    why: 'Offloads patching, backups and replication so you focus on schema and queries.',
    when: 'Use for relational/transactional workloads. Use DynamoDB for high-scale key-value, Aurora for cloud-native scale.',
    gotcha: 'Multi-AZ is for availability (synchronous standby, no read scaling); read replicas are for read scaling (asynchronous). Mixing them up is a classic exam miss.',
  },
  'multi-az': {
    name: 'Multi-AZ Deployment',
    icon: '🔁',
    what: 'A synchronous standby database in a second AZ with automatic failover.',
    why: 'Survives an AZ failure with no data loss and minimal downtime.',
    when: 'Enable for any production database.',
    gotcha: 'The standby does NOT serve reads — it exists purely for failover. You cannot query it.',
  },
  dynamodb: {
    name: 'Amazon DynamoDB',
    icon: '⚙️',
    what: 'Fully managed serverless NoSQL key-value/document database.',
    why: 'Single-digit-millisecond latency at any scale with no servers.',
    when: 'Use for known access patterns at high scale. Avoid for ad-hoc analytical queries (use Athena/Redshift).',
    example: {
      lang: 'python',
      code: `table.put_item(Item={
    "pk": "USER#42", "sk": "PROFILE",
    "name": "Ada", "plan": "pro"
})  # design around access patterns, not normalized tables`,
    },
    gotcha: 'You model around access patterns, not relations. A poor partition key creates "hot partitions" that throttle.',
  },

  // ── AWS Security ───────────────────────────────────────────────
  iam: {
    name: 'IAM',
    icon: '🛡️',
    what: 'Identity & Access Management — who (principals) can do what (actions) on which resources.',
    why: 'It is the foundation of all AWS security.',
    when: 'Always. Grant least privilege, use roles over long-lived keys, enable MFA.',
    example: {
      lang: 'json',
      code: `{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::reports-bucket/finance/*"
}`,
    },
    gotcha: 'Never use the root account day-to-day, and avoid wildcards (Action:"*", Resource:"*") in production policies.',
  },
  'least-privilege': {
    name: 'Least Privilege',
    icon: '🔒',
    what: 'Grant only the permissions a principal actually needs — nothing more.',
    why: 'Limits blast radius when credentials leak or code misbehaves.',
    when: 'Always. Start denied, add narrowly, and review with IAM Access Analyzer.',
    gotcha: 'Over-broad policies "to make it work" are how breaches escalate — tighten before shipping.',
  },
  waf: {
    name: 'AWS WAF',
    icon: '🧱',
    what: 'A web application firewall filtering HTTP(S) by rules (SQLi, XSS, rate limits, geo).',
    why: 'Protects apps at Layer 7 in front of ALB/CloudFront/API Gateway.',
    when: 'Use for public web apps needing OWASP protection or rate limiting.',
    gotcha: 'WAF is L7 only — it does not stop network-layer (L3/L4) DDoS; that is Shield.',
  },

  // ── Cost / Ops ────────────────────────────────────────────────
  spot: {
    name: 'Spot Instances',
    icon: '🏷️',
    what: 'Spare EC2 capacity at up to ~90% off, reclaimable with a 2-minute warning.',
    why: 'Massive savings for interruption-tolerant work.',
    when: 'Use for batch, CI, big-data, and stateless fleets. Never for stateful single nodes.',
    gotcha: 'Always handle the interruption notice and checkpoint progress, or you lose in-flight work.',
  },
  cloudwatch: {
    name: 'Amazon CloudWatch',
    icon: '📊',
    what: 'Metrics, logs, alarms and dashboards for AWS resources and apps.',
    why: 'You cannot operate or optimize what you cannot observe.',
    when: 'Use for alarms (CPU, billing), centralized logs, and dashboards.',
    gotcha: 'Custom metrics and high-resolution alarms cost money, and logs persist (and bill) until you set retention.',
  },
  'savings-plans': {
    name: 'Savings Plans & Reserved',
    icon: '💸',
    what: 'Commit to steady usage (1 or 3 years) for big discounts vs On-Demand.',
    why: 'Cuts cost 30–70% for predictable baseline workloads.',
    when: 'Cover your steady baseline with commitments; burst on On-Demand/Spot.',
    gotcha: 'Over-committing locks you into spend you may not use — analyze with Cost Explorer first.',
  },

  // ── App integration ───────────────────────────────────────────
  sqs: {
    name: 'Amazon SQS',
    icon: '📨',
    what: 'A managed message queue that decouples producers from consumers.',
    why: 'Absorbs bursts and lets components fail/scale independently.',
    when: 'Use to buffer work between services (e.g. order spikes on Black Friday).',
    gotcha: 'Standard queues are at-least-once and unordered; use FIFO queues when exactly-once ordering matters. Always add a Dead Letter Queue.',
  },
  sns: {
    name: 'Amazon SNS',
    icon: '📢',
    what: 'Pub/sub messaging that fans one message out to many subscribers.',
    why: 'Enables event broadcasting (e.g. SNS → many SQS queues).',
    when: 'Use for fan-out and notifications; pair with SQS for durable fan-out.',
    gotcha: 'SNS does not store messages — a subscriber offline at delivery time may miss them unless backed by SQS.',
  },
  'step-functions': {
    name: 'AWS Step Functions',
    icon: '🔗',
    what: 'A serverless orchestrator that runs workflows as visual state machines.',
    why: 'Adds retries, error handling and branching without custom glue code.',
    when: 'Use for multi-step processes (ETL, approvals, ML pipelines).',
    gotcha: 'Standard workflows bill per state transition; Express workflows suit high-volume, short-duration flows.',
  },

  // ── IaC ───────────────────────────────────────────────────────
  terraform: {
    name: 'Terraform',
    icon: '🏗️',
    what: 'Cloud-agnostic IaC using declarative HCL and a state file.',
    why: 'Version, review and reproduce infrastructure across providers.',
    when: 'Use for multi-cloud or when you want one tool across AWS/Azure/GCP.',
    gotcha: 'The state file is sensitive and authoritative — store it remotely (S3 + DynamoDB lock), never commit it.',
  },
  cloudformation: {
    name: 'AWS CloudFormation',
    icon: '📜',
    what: 'AWS-native IaC in YAML/JSON, organized into stacks.',
    why: 'First-class AWS support with drift detection and rollback.',
    when: 'Use when staying all-in on AWS and wanting native tooling/CDK.',
    gotcha: 'Manual console changes cause "drift" — always change infra through the template, not by hand.',
  },

  // ── HA / DR ───────────────────────────────────────────────────
  rto: {
    name: 'RTO & RPO',
    icon: '⏱️',
    what: 'RTO = how fast you must recover. RPO = how much data (time) you can lose.',
    why: 'They translate business tolerance into an architecture and budget.',
    when: 'Define them first — they decide your DR strategy and cost.',
    gotcha: 'Tighter RTO/RPO costs exponentially more; match the target to the business, do not gold-plate.',
  },

  // ── Azure ─────────────────────────────────────────────────────
  'resource-groups': {
    name: 'Resource Groups',
    icon: '🗂️',
    what: 'Logical containers grouping related Azure resources with a shared lifecycle.',
    why: 'Simplify access control, billing tags, and clean teardown.',
    when: 'Group resources that are deployed and deleted together (per app/per env).',
    gotcha: 'A resource lives in exactly one group; moving resources between groups/subscriptions has limits per service.',
  },
  'entra-id': {
    name: 'Microsoft Entra ID',
    icon: '🪪',
    what: 'Azure’s cloud identity provider (formerly Azure AD).',
    why: 'Central authentication for users, apps and services; basis for RBAC.',
    when: 'Use for SSO, Conditional Access and MFA across Microsoft and SaaS apps.',
    gotcha: 'Entra ID is identity (authn); RBAC roles are authorization (authz) — they are distinct layers.',
  },
  bicep: {
    name: 'Bicep',
    icon: '💪',
    what: 'A clean DSL that compiles to ARM templates for Azure IaC.',
    why: 'Far more readable than raw ARM JSON, with modules and type safety.',
    when: 'Use for Azure-native IaC instead of hand-writing ARM.',
    gotcha: 'Bicep is Azure-only; for multi-cloud you would reach for Terraform.',
  },
  'cosmos-db': {
    name: 'Azure Cosmos DB',
    icon: '🌌',
    what: 'Globally distributed, multi-model NoSQL DB with tunable consistency.',
    why: 'Low-latency global reads/writes with five consistency levels.',
    when: 'Use for planet-scale apps needing multi-region writes.',
    gotcha: 'Strong consistency limits global write distribution and raises cost/latency — pick the weakest level you can tolerate.',
  },

  // ── GCP ───────────────────────────────────────────────────────
  projects: {
    name: 'GCP Projects',
    icon: '📁',
    what: 'The fundamental isolation unit for resources, IAM, billing and quotas.',
    why: 'Everything in GCP lives in a project; it scopes permissions and cost.',
    when: 'Use one project per app/environment; group with Folders under an Org.',
    gotcha: 'Deleting a project schedules ALL its resources for deletion — powerful and dangerous.',
  },
  bigquery: {
    name: 'BigQuery',
    icon: '🔭',
    what: 'Serverless, petabyte-scale SQL data warehouse.',
    why: 'Analyze huge datasets with standard SQL, no infrastructure.',
    when: 'Use for analytics/BI and ML on large data. Not for transactional row-level updates.',
    example: {
      lang: 'sql',
      code: `SELECT region, SUM(co2_tonnes) AS emissions
FROM \`proj.esg.readings\`
WHERE _PARTITIONDATE >= '2025-01-01'
GROUP BY region ORDER BY emissions DESC;`,
    },
    gotcha: 'You pay per byte scanned — SELECT * on an unpartitioned table can be shockingly expensive. Partition and cluster.',
  },
  gke: {
    name: 'Google Kubernetes Engine',
    icon: '☸️',
    what: 'Managed Kubernetes. Standard (you manage nodes) or Autopilot (Google does).',
    why: 'Run portable container workloads with Google operating the control plane.',
    when: 'Use Autopilot to skip node ops; Standard for fine-grained control/GPUs.',
    gotcha: 'Kubernetes is powerful but heavy — for a single container, Cloud Run is far simpler and cheaper.',
  },
  'cloud-run': {
    name: 'Cloud Run',
    icon: '🏃',
    what: 'Serverless containers that scale to zero, billed per request.',
    why: 'Deploy any HTTP container without managing infrastructure.',
    when: 'Use for stateless web services/APIs. Use GKE when you need full Kubernetes features.',
    gotcha: 'Scale-to-zero means cold starts; set min-instances for latency-sensitive endpoints.',
  },

  // ── ESG / Decarbonization ─────────────────────────────────────
  'esg-literacy': {
    name: 'ESG Fundamentals',
    icon: '🌍',
    what: 'Environmental, Social, and Governance — a framework for measuring sustainability and ethical impact.',
    why: 'Investors use ESG scores to allocate capital; companies report it for compliance and reputation.',
    when: 'Understand this before designing any ESG tracking or reporting system.',
    gotcha: 'ESG is not a single standard — different rating agencies (MSCI, Sustainalytics) use different methodologies.',
  },
  'carbon-market': {
    name: 'Carbon Markets',
    icon: '🌱',
    what: 'Systems for buying/selling carbon credits (1 credit = 1 tonne CO₂e).',
    why: 'Price carbon so emitters fund reductions and sequestration projects.',
    when: 'Relevant when architecting MRV (measurement, reporting, verification) platforms.',
    gotcha: 'Credit integrity varies wildly — verification and an immutable audit trail (e.g. QLDB) are the hard part, not storage.',
  },
  offsets: {
    name: 'Carbon Offsets',
    icon: '⚖️',
    what: 'Credits purchased to compensate for emissions you cannot reduce (e.g., tree planting, renewable energy).',
    why: 'Lets companies claim "carbon neutral" while they work on actual reductions.',
    when: 'Use as a bridge strategy, not a permanent substitute for reduction.',
    gotcha: 'Not all offsets are equal — "additionality" (would this project happen without the money?) is the key quality test.',
  },
  'cap-and-trade': {
    name: 'Cap-and-Trade',
    icon: '📊',
    what: 'Government sets an emissions cap; companies buy/sell permits. The cap shrinks over time.',
    why: 'Market mechanism that guarantees total emissions fall while letting the market find the cheapest reductions.',
    when: 'Found in compliance markets (EU ETS, California). Voluntary markets work differently.',
    gotcha: 'Over-allocation of permits can drive prices to zero, defeating the purpose (happened in early EU ETS phases).',
  },
  'net-zero': {
    name: 'Net-Zero',
    icon: '🎯',
    what: 'Balancing emitted greenhouse gases with removed/sequestered gases (typically by 2050).',
    why: 'The global goal to limit warming to 1.5°C requires reaching net-zero.',
    when: 'Distinction: "carbon neutral" often just buys offsets; "net-zero" requires deep decarbonization first.',
    gotcha: 'Net-zero is not zero emissions — residual emissions are offset, but only after cutting 90%+ first.',
  },
  sbti: {
    name: 'Science-Based Targets initiative (SBTi)',
    icon: '🔬',
    what: 'Non-profit that validates corporate net-zero targets against climate science.',
    why: 'SBTi approval adds credibility to corporate climate claims.',
    when: 'Companies seeking verified net-zero status submit targets to SBTi for validation.',
    gotcha: 'SBTi has strict criteria — targets must cover Scope 1+2 (mandatory) and Scope 3 if material, with near-term (5-10 year) and long-term (2050) goals.',
  },
  'scope-1-2-3': {
    name: 'Emission Scopes 1/2/3',
    icon: '📦',
    what: 'GHG Protocol categories: 1 = direct, 2 = purchased energy, 3 = value chain.',
    why: 'Defines what a company must measure and report.',
    when: 'Use when designing ESG data pipelines and dashboards.',
    gotcha: 'Scope 3 is usually the largest and hardest — it depends on supplier data you do not directly control.',
  },
  'iot-core': {
    name: 'AWS IoT Core',
    icon: '📡',
    what: 'Managed service connecting devices via MQTT with auth and rules routing.',
    why: 'Securely ingests sensor data (soil, energy, air) at fleet scale.',
    when: 'Use as the front door for IoT telemetry feeding pipelines.',
    gotcha: 'Per-device certificates and a rules engine matter — do not pipe raw device traffic straight into a database.',
  },
  qldb: {
    name: 'Amazon QLDB',
    icon: '📒',
    what: 'A ledger database with an immutable, cryptographically verifiable journal.',
    why: 'Perfect for tamper-evident records like carbon-credit transactions.',
    when: 'Use when you need a verifiable history of changes, not just current state.',
    gotcha: 'QLDB is not a blockchain (no decentralization) and is being phased toward alternatives — know the trade-off vs DynamoDB + versioning.',
  },

  // ── Finance / FinOps ──────────────────────────────────────────
  finops: {
    name: 'FinOps',
    icon: '💹',
    what: 'A practice uniting finance, engineering and product to govern cloud spend.',
    why: 'Cloud cost is a continuous engineering decision, not a monthly surprise.',
    when: 'Apply the Inform → Optimize → Operate loop continuously.',
    gotcha: 'Without mandatory cost-allocation tags you cannot attribute spend — tagging is step zero.',
  },
  tagging: {
    name: 'Resource Tagging',
    icon: '🏷️',
    what: 'Key-value metadata attached to cloud resources for cost allocation, governance, and automation.',
    why: 'Tags are the foundation of cost attribution and compliance reporting.',
    when: 'Apply tags at creation (mandatory) and enforce via policies. Use standard keys like CostCenter, Environment, Owner.',
    gotcha: 'Tags applied retroactively are painful — build tagging into IaC templates and CI/CD pipelines.',
  },
  showback: {
    name: 'Cost Showback vs Chargeback',
    icon: '📊',
    what: 'Showback = inform teams of their spend. Chargeback = actually bill them.',
    why: 'Showback builds cost awareness; chargeback creates financial accountability.',
    when: 'Start with showback (cultural change). Move to chargeback when teams have autonomy over spend decisions.',
    gotcha: 'Chargeback without budget autonomy causes friction — teams need authority to optimize, not just visibility.',
  },
  'unit-economics': {
    name: 'Unit Economics',
    icon: '💰',
    what: 'Cost per meaningful unit (cost per customer, per transaction, per GB stored).',
    why: 'Translates cloud spend into business metrics engineering teams can optimize.',
    when: 'Use to right-size architectures: if cost per transaction is $5 but revenue is $2, you have a problem.',
    gotcha: 'Unit economics must include ALL costs (compute, storage, network, support), not just the obvious ones.',
  },
  'cost-anomaly': {
    name: 'Cost Anomaly Detection',
    icon: '🚨',
    what: 'ML-powered alerts when spend deviates from expected patterns.',
    why: 'Catches runaway spend before the invoice arrives.',
    when: 'Enable for all production accounts. Set thresholds based on historical baselines.',
    gotcha: 'False positives cause alert fatigue — tune thresholds and add suppression rules for expected spikes (e.g., monthly batch jobs).',
  },
  budgets: {
    name: 'Cloud Budgets',
    icon: '💵',
    what: 'Spend limits with alerts at percentage thresholds (e.g., alert at 80%, block at 100%).',
    why: 'Prevents surprise bills by enforcing guardrails.',
    when: 'Set budgets per account, per team, or per project. Use with anomaly detection for defense-in-depth.',
    gotcha: 'Budgets are reactive, not preventive. They stop overspend but do not optimize it. Combine with FinOps practices.',
  },
  cur: {
    name: 'Commitment Usage Discounts',
    icon: '📋',
    what: 'Discounted pricing in exchange for usage commitments (Savings Plans, Reserved Instances).',
    why: 'Save 30-70% on steady baseline workloads vs On-Demand pricing.',
    when: 'Cover your predictable baseline with commitments; burst on On-Demand/Spot.',
    gotcha: 'Over-committing locks you into spend you may not use — analyze 90-day usage before committing.',
  },
  'pci-dss': {
    name: 'PCI-DSS',
    icon: '💳',
    what: 'Global security standard for handling credit card data.',
    why: 'Required by card networks for any merchant processing payments.',
    when: 'Apply to systems that store, process, or transmit cardholder data (CHD).',
    gotcha: 'PCI scope is defined by data flow — reduce scope by tokenization and using PSPs, not just by adding firewalls.',
  },
  'data-residency': {
    name: 'Data Residency',
    icon: '🌏',
    what: 'Regulatory requirement that data remains within specific geographic borders.',
    why: 'GDPR, China CSL, and other laws mandate data stays in-country.',
    when: 'Choose cloud regions that match residency requirements. Use customer-managed keys for additional control.',
    gotcha: 'Residency ≠ sovereignty — even if data stays in a region, the cloud provider (often US-based) may still have access.',
  },
  hipaa: {
    name: 'HIPAA',
    icon: '🏥',
    what: 'US healthcare law regulating protected health information (PHI) privacy and security.',
    why: 'Non-compliance means massive fines and criminal liability.',
    when: 'Apply to any system handling patient data. Use BAA-eligible services only.',
    gotcha: 'HIPAA is about administrative safeguards too — policies, training, and breach procedures matter as much as encryption.',
  },
  phi: {
    name: 'PHI (Protected Health Information)',
    icon: '🔒',
    what: 'Any health data that can identify an individual (names, dates, medical records, etc.).',
    why: 'PHI breach triggers HIPAA violation reporting and penalties.',
    when: 'Treat PHI as highest-sensitivity data: encrypt at rest and in transit, strict access controls, audit logging.',
    gotcha: 'De-identified data is not PHI, but the de-identification process must meet HIPAA Safe Harbor standards.',
  },
  'mediaconvert': {
    name: 'AWS Elemental MediaConvert',
    icon: '🎬',
    what: 'Managed video transcoding service for file-based and live-to-VOD workflows.',
    why: 'Handles codec conversion, adaptive bitrate, and packaging at scale.',
    when: 'Use for transcoding video uploads into multiple formats for adaptive streaming.',
    gotcha: 'Transcoding is compute-intensive — cost scales with video duration and output quality. Queue jobs to control spend.',
  },
  gamelift: {
    name: 'Amazon GameLift',
    icon: '🎮',
    what: 'Managed service for deploying, operating, and scaling game servers.',
    why: 'Handles session placement, matchmaking, and auto-scaling for multiplayer games.',
    when: 'Use for real-time multiplayer backends requiring low-latency session management.',
    gotcha: 'GameLift Fleets need careful capacity planning — under-provision and players wait; over-provision and you pay for idle servers.',
  },
};

/** Look up a concept, or synthesize a learning prompt for unknown skills. */
export function getConcept(skill: string): CloudConcept {
  const found = CLOUD_CONCEPTS[skill];
  if (found) return found;
  const pretty = skill.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    name: pretty,
    icon: '🔹',
    what: `${pretty} is a key service/concept for this mission.`,
    why: 'Understanding it is part of architecting this solution end to end.',
    when: `Research where ${pretty} fits in the architecture above and how it connects to the other services.`,
  };
}

export function hasConcept(skill: string): boolean {
  return !!CLOUD_CONCEPTS[skill];
}
