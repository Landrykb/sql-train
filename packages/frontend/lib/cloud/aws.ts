import type { CloudMission } from './types';

// AWS Certified Solutions Architect – Associate (SAA-C03) track.
export const awsMissions: CloudMission[] = [
  // ── COMPUTE ──────────────────────────────────────────────────────
  {
    slug: 'ec2-basics',
    title: 'Launch Your First EC2 Instance',
    section: 'Compute',
    level: 'Beginner',
    stars: 1,
    skills: ['ec2', 'regions', 'ami'],
    description:
      "*bleep* Congratulations, trainee — you're about to rent a server you've never touched, in a building you've never seen.\n\nAn EC2 instance is a virtual machine on AWS hardware. You choose its size (CPU + RAM), its AMI (operating system image), a key pair for SSH, and how long to run it. You pay by the second; stop it and you stop paying.\n\nIn this mission you understand instance types (t3.micro vs m5.large), AMIs, key pairs, and security groups, then launch your first EC2 in the console.",
    prerequisites: [],
    labType: 'diagram',
    realWorld:
      'A startup needs a server for their MVP this afternoon — no datacenter, no procurement. You spin up an EC2 instance in minutes and tear it down tonight to stop the bill.',
    objectives: [
      'Choose the right instance family/size for a workload',
      'Explain what an AMI is and why it is Region-specific',
      'Control inbound access with a security group',
      'Predict what you are billed for when an instance is stopped vs terminated',
    ],
    architecture: [
      { icon: '👤', label: 'You (SSH)', note: 'key pair' },
      { icon: '🔥', label: 'Security Group', note: 'stateful firewall' },
      { icon: '🖥️', label: 'EC2 Instance', note: 'from an AMI' },
      { icon: '💾', label: 'EBS Volume', note: 'root disk' },
    ],
  },
  {
    slug: 'ec2-auto-scaling',
    title: 'Auto Scaling Groups & Load Balancers',
    section: 'Compute',
    level: 'Intermediate',
    stars: 2,
    skills: ['asg', 'alb', 'elb'],
    description:
      'One server is a single point of failure. Configure an Auto Scaling Group (ASG) behind an Application Load Balancer (ALB). Understand scaling policies (target tracking vs step), health checks, and how the ALB distributes traffic across Availability Zones.',
    prerequisites: ['ec2-basics'],
    labType: 'iac',
    realWorld:
      'Your app goes viral overnight. A single EC2 melts under load. With an ASG behind an ALB, traffic spreads across AZs and the fleet grows from 2 to 6 instances automatically — then shrinks back when the spike passes.',
    objectives: [
      'Distribute traffic across AZs with an ALB',
      'Configure target-tracking auto scaling on CPU',
      'Use health checks so unhealthy instances are replaced',
      'Explain why the app tier must be stateless',
    ],
    architecture: [
      { icon: '🌐', label: 'Users' },
      { icon: '⚖️', label: 'ALB', note: 'across 2 AZs' },
      { icon: '📈', label: 'Auto Scaling Group', note: '2–6 instances' },
      { icon: '🖥️', label: 'EC2 fleet', note: 'stateless' },
    ],
  },
  {
    slug: 'lambda-serverless',
    title: 'Serverless with Lambda',
    section: 'Compute',
    level: 'Intermediate',
    stars: 2,
    skills: ['lambda', 'api-gateway', 'event-driven'],
    description:
      'Deploy a Lambda function triggered by API Gateway. Compare the serverless cost model (pay per invocation + duration, scales to zero) against always-on EC2. Learn cold starts, memory/CPU coupling, and the 15-minute timeout limit.',
    prerequisites: ['ec2-basics'],
    labType: 'iac',
  },
  {
    slug: 'containers-ecs',
    title: 'Containers on ECS & Fargate',
    section: 'Compute',
    level: 'Advanced',
    stars: 3,
    skills: ['ecs', 'fargate', 'ecr', 'docker'],
    description:
      'Build a Docker image, push it to ECR, and run it on ECS Fargate. Understand task definitions, services, and why Fargate removes the need to manage EC2 hosts.',
    prerequisites: ['lambda-serverless'],
    labType: 'iac',
  },

  // ── STORAGE ──────────────────────────────────────────────────────
  {
    slug: 's3-fundamentals',
    title: 'S3 Buckets & Storage Classes',
    section: 'Storage',
    level: 'Beginner',
    stars: 1,
    skills: ['s3', 'storage-classes', 'lifecycle'],
    description:
      'S3 is your infinite filing cabinet. Create buckets, understand Standard vs Standard-IA vs Glacier vs Intelligent-Tiering, and set up lifecycle policies that automatically move objects to cheaper tiers over time.',
    prerequisites: [],
    labType: 'diagram',
    realWorld:
      'A media company stores 50 TB of video. Recent uploads are hot; footage older than 90 days is rarely touched. A lifecycle policy quietly moves cold objects to Glacier and cuts the storage bill ~70% — with zero code changes.',
    objectives: [
      'Create a bucket and reason about the global namespace',
      'Match an access pattern to the right storage class',
      'Automate tiering and expiry with a lifecycle policy',
      'Explain why S3 is private by default',
    ],
    architecture: [
      { icon: '📤', label: 'Upload', note: 'Standard' },
      { icon: '♻️', label: 'Lifecycle rule', note: 'age-based' },
      { icon: '🧊', label: 'Glacier', note: 'after 90d' },
      { icon: '🗑️', label: 'Expire', note: 'after 1y' },
    ],
  },
  {
    slug: 's3-security',
    title: 'S3 Security: Policies, ACLs & Encryption',
    section: 'Storage',
    level: 'Intermediate',
    stars: 2,
    skills: ['s3', 'bucket-policy', 'sse', 'kms'],
    description:
      'Lock down a bucket with a resource policy, enable SSE-KMS encryption, and turn on Block Public Access. Understand the difference between bucket policies, IAM policies, and (legacy) ACLs.',
    prerequisites: ['s3-fundamentals'],
    labType: 'iac',
  },
  {
    slug: 'ebs-efs',
    title: 'Block & File Storage: EBS and EFS',
    section: 'Storage',
    level: 'Intermediate',
    stars: 2,
    skills: ['ebs', 'efs', 'snapshots'],
    description:
      'Attach EBS volumes to a single EC2, mount EFS across many EC2s simultaneously, and understand the trade-offs between IOPS and throughput. Learn snapshots for backup and migration.',
    prerequisites: ['ec2-basics'],
    labType: 'diagram',
  },

  // ── NETWORKING ───────────────────────────────────────────────────
  {
    slug: 'vpc-foundations',
    title: 'VPC: Subnets, Route Tables & IGW',
    section: 'Networking',
    level: 'Beginner',
    stars: 1,
    skills: ['vpc', 'subnets', 'igw', 'cidr'],
    description:
      'A VPC is your private slice of AWS. Build one from scratch: choose a CIDR block, carve out public vs private subnets across AZs, attach an Internet Gateway, and wire up route tables.',
    prerequisites: [],
    labType: 'diagram',
    realWorld:
      'A bank must keep its database unreachable from the internet but let a public web tier serve customers. You design a VPC where load balancers sit in public subnets and the database hides in private subnets across two AZs.',
    objectives: [
      'Plan a non-overlapping CIDR range',
      'Separate public vs private subnets and explain the difference',
      'Route internet traffic through an Internet Gateway',
      'Spread subnets across AZs for high availability',
    ],
    architecture: [
      { icon: '🌐', label: 'Internet' },
      { icon: '🚪', label: 'Internet Gateway' },
      { icon: '🟢', label: 'Public subnets', note: 'ALB' },
      { icon: '🔒', label: 'Private subnets', note: 'app + DB' },
    ],
  },
  {
    slug: 'vpc-advanced',
    title: 'NAT Gateway, Peering & VPN',
    section: 'Networking',
    level: 'Advanced',
    stars: 3,
    skills: ['nat', 'vpc-peering', 'vpn', 'direct-connect'],
    description:
      'Your private EC2s want to download updates but stay invisible to the internet — enter the NAT Gateway. Then peer two VPCs and compare Direct Connect vs Site-to-Site VPN for hybrid connectivity.',
    prerequisites: ['vpc-foundations'],
    labType: 'iac',
  },
  {
    slug: 'cloudfront-route53',
    title: 'CDN & DNS: CloudFront + Route 53',
    section: 'Networking',
    level: 'Intermediate',
    stars: 2,
    skills: ['cloudfront', 'route53', 'dns', 'cdn'],
    description:
      'Serve an S3 static site worldwide through CloudFront, and set up Route 53 (AWS\'s phone book) with health checks and DNS failover routing.',
    prerequisites: ['s3-fundamentals', 'vpc-foundations'],
    labType: 'diagram',
  },

  // ── DATABASES ────────────────────────────────────────────────────
  {
    slug: 'rds-basics',
    title: 'Managed Databases with RDS',
    section: 'Databases',
    level: 'Beginner',
    stars: 1,
    skills: ['rds', 'multi-az', 'read-replicas'],
    description:
      'Launch an RDS instance with no patching headaches. Configure Multi-AZ for high availability (synchronous standby) and add read replicas (asynchronous) for read scaling.',
    prerequisites: ['vpc-foundations'],
    labType: 'diagram',
    realWorld:
      'An e-commerce site cannot afford downtime during a sale, and its product pages hammer the database with reads. Multi-AZ gives automatic failover; read replicas absorb the read traffic so checkout stays fast.',
    objectives: [
      'Launch a managed relational database in private subnets',
      'Distinguish Multi-AZ (availability) from read replicas (read scaling)',
      'Enable encryption and automated backups',
      'Decide when RDS fits vs DynamoDB',
    ],
    architecture: [
      { icon: '🖥️', label: 'App tier' },
      { icon: '🛢️', label: 'RDS primary', note: 'AZ-a' },
      { icon: '🔁', label: 'Standby', note: 'AZ-b, failover' },
      { icon: '📖', label: 'Read replica', note: 'read scaling' },
    ],
  },
  {
    slug: 'dynamodb',
    title: 'DynamoDB: NoSQL at Scale',
    section: 'Databases',
    level: 'Intermediate',
    stars: 2,
    skills: ['dynamodb', 'partition-key', 'gsi', 'dax'],
    description:
      'Design a DynamoDB table. Choose partition keys that avoid hot partitions, add Global Secondary Indexes for new access patterns, and use DAX for microsecond caching.',
    prerequisites: ['rds-basics'],
    labType: 'iac',
  },
  {
    slug: 'elasticache',
    title: 'Caching with ElastiCache',
    section: 'Databases',
    level: 'Intermediate',
    stars: 2,
    skills: ['elasticache', 'redis', 'memcached', 'caching-patterns'],
    description:
      'Put Redis in front of RDS to cut latency and database load. Compare lazy-loading vs write-through caching patterns and understand TTL/eviction.',
    prerequisites: ['rds-basics'],
    labType: 'diagram',
  },

  // ── SECURITY & IAM ───────────────────────────────────────────────
  {
    slug: 'iam-basics',
    title: 'IAM: Users, Groups, Roles & Policies',
    section: 'Security & IAM',
    level: 'Beginner',
    stars: 1,
    skills: ['iam', 'policies', 'roles', 'least-privilege'],
    description:
      'IAM answers "who can do what". Create users, groups and roles, write a least-privilege JSON policy, never use the root account, and enable MFA.',
    prerequisites: [],
    labType: 'diagram',
  },
  {
    slug: 'iam-advanced',
    title: 'Advanced IAM: SCP, Boundaries & Cross-Account',
    section: 'Security & IAM',
    level: 'Advanced',
    stars: 3,
    skills: ['scp', 'organizations', 'permission-boundary', 'sts'],
    description:
      'Use AWS Organizations Service Control Policies to cap what whole accounts can do, apply permission boundaries to delegate safely, and assume cross-account roles with STS.',
    prerequisites: ['iam-basics'],
    labType: 'iac',
  },
  {
    slug: 'security-services',
    title: 'WAF, Shield, GuardDuty & Security Hub',
    section: 'Security & IAM',
    level: 'Advanced',
    stars: 3,
    skills: ['waf', 'shield', 'guardduty', 'security-hub'],
    description:
      'Protect an ALB with WAF rules, understand Shield Standard vs Advanced for DDoS, enable GuardDuty threat detection, and centralize findings in Security Hub.',
    prerequisites: ['iam-basics', 'vpc-advanced'],
    labType: 'diagram',
  },

  // ── MONITORING & COST ────────────────────────────────────────────
  {
    slug: 'cloudwatch',
    title: 'Monitoring with CloudWatch',
    section: 'Monitoring & Cost',
    level: 'Intermediate',
    stars: 2,
    skills: ['cloudwatch', 'alarms', 'logs', 'dashboards'],
    description:
      'CloudWatch is your cloud alarm system. Create alarms for CPU and billing, build a custom dashboard, and query logs with Logs Insights.',
    prerequisites: ['ec2-basics'],
    labType: 'diagram',
  },
  {
    slug: 'cost-optimization',
    title: 'Cost Optimization: Reserved, Spot & Savings Plans',
    section: 'Monitoring & Cost',
    level: 'Intermediate',
    stars: 2,
    skills: ['spot', 'reserved', 'savings-plans', 'cost-explorer'],
    description:
      'Compare On-Demand vs Reserved vs Spot pricing, pick Savings Plans for steady workloads, and use Cost Explorer to hunt down waste.',
    prerequisites: ['ec2-basics', 'cloudwatch'],
    labType: 'diagram',
  },

  // ── APP INTEGRATION ──────────────────────────────────────────────
  {
    slug: 'sqs-sns',
    title: 'Decoupling with SQS & SNS',
    section: 'App Integration',
    level: 'Intermediate',
    stars: 2,
    skills: ['sqs', 'sns', 'pub-sub', 'dead-letter-queue'],
    description:
      'Build a fan-out pattern with SNS → SQS so producers and consumers scale independently. Add a Dead Letter Queue to catch poison messages.',
    prerequisites: ['lambda-serverless'],
    labType: 'iac',
  },
  {
    slug: 'step-functions',
    title: 'Orchestration with Step Functions',
    section: 'App Integration',
    level: 'Advanced',
    stars: 3,
    skills: ['step-functions', 'state-machines', 'workflows'],
    description:
      'Build a multi-step workflow as a state machine. Handle retries, catch error states, and choose between Standard and Express workflows.',
    prerequisites: ['sqs-sns'],
    labType: 'iac',
  },

  // ── IaC ──────────────────────────────────────────────────────────
  {
    slug: 'cloudformation-basics',
    title: 'CloudFormation: IaC from Zero',
    section: 'IaC',
    level: 'Beginner',
    stars: 1,
    skills: ['cloudformation', 'yaml', 'stacks', 'outputs'],
    description:
      'Write a CloudFormation template that deploys EC2 + S3 declaratively. Understand stacks, parameters, outputs, and drift detection.',
    prerequisites: ['ec2-basics', 's3-fundamentals'],
    labType: 'iac',
  },
  {
    slug: 'cdk-terraform',
    title: 'CDK & Terraform: Modern IaC',
    section: 'IaC',
    level: 'Advanced',
    stars: 3,
    skills: ['cdk', 'terraform', 'constructs'],
    description:
      'Deploy the same 3-tier app with AWS CDK (TypeScript) and Terraform (HCL). Compare imperative constructs vs declarative providers and state management.',
    prerequisites: ['cloudformation-basics'],
    labType: 'iac',
  },

  // ── HA & DR ──────────────────────────────────────────────────────
  {
    slug: 'ha-patterns',
    title: 'High Availability: Multi-AZ & Multi-Region',
    section: 'HA & Disaster Recovery',
    level: 'Advanced',
    stars: 3,
    skills: ['multi-az', 'multi-region', 'rto', 'rpo'],
    description:
      'Design an active-passive multi-region architecture. Define RTO (how fast you recover) vs RPO (how much data you can lose) targets and pick the right strategy.',
    prerequisites: ['rds-basics', 'cloudfront-route53'],
    labType: 'diagram',
  },
  {
    slug: 'backup-recovery',
    title: 'Backup, Snapshots & Disaster Recovery',
    section: 'HA & Disaster Recovery',
    level: 'Intermediate',
    stars: 2,
    skills: ['aws-backup', 'snapshots', 'dr-strategies'],
    description:
      'Configure AWS Backup for RDS and EBS, then choose between Backup & Restore, Pilot Light, Warm Standby, and Multi-Site Active/Active.',
    prerequisites: ['ha-patterns'],
    labType: 'diagram',
  },

  // ── WELL-ARCHITECTED ─────────────────────────────────────────────
  {
    slug: 'well-architected',
    title: 'The 6 Pillars of Well-Architected',
    section: 'Well-Architected',
    level: 'Intermediate',
    stars: 2,
    skills: ['waf-pillars', 'operational-excellence', 'reliability'],
    description:
      'Review the 6 pillars — Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability — and apply the Well-Architected Tool to a sample workload.',
    prerequisites: ['ha-patterns', 'cost-optimization', 'security-services'],
    labType: 'diagram',
  },

  // ── CAPSTONE ─────────────────────────────────────────────────────
  {
    slug: 'aws-capstone',
    title: 'AWS Capstone: Full 3-Tier App',
    section: 'Capstone',
    level: 'Master',
    stars: 5,
    skills: ['everything'],
    description:
      'Deploy a production-grade web app: ALB → EC2 ASG → RDS Multi-AZ, secured with IAM + WAF, monitored with CloudWatch, deployed via CloudFormation, with S3 + CloudFront for static assets.',
    prerequisites: ['well-architected', 'cdk-terraform', 'step-functions'],
    labType: 'iac',
  },

  // ── BONUS ────────────────────────────────────────────────────────
  {
    slug: 'aws-saa-exam-simulator',
    title: 'SAA-C03 Exam Simulator',
    section: 'Bonus',
    level: 'Expert',
    stars: 4,
    skills: ['exam-prep'],
    description:
      'A timed mock exam in SAA-C03 format with scenario questions, instant scoring, and per-question explanations. Find your weak domains before exam day.',
    prerequisites: ['aws-capstone'],
    labType: 'quiz',
    isBonus: true,
  },
  {
    slug: 'aws-green-architecture',
    title: 'Green Cloud: Carbon-Aware AWS Architecture',
    section: 'Bonus',
    level: 'Expert',
    stars: 4,
    skills: ['sustainability-pillar', 'carbon-footprint', 'green-regions'],
    description:
      'Architect a carbon-minimizing workload: choose low-carbon regions, right-size relentlessly, shift batch jobs to greener hours, and use the AWS Customer Carbon Footprint Tool.',
    prerequisites: ['aws-capstone'],
    labType: 'diagram',
    isBonus: true,
    crossDomain: 'esg',
  },
];
