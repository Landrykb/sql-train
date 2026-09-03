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
      { label: 'You (SSH)', note: 'key pair' },
      { label: 'Security Group', note: 'stateful firewall' },
      { label: 'EC2 Instance', note: 'from an AMI' },
      { label: 'EBS Volume', note: 'root disk' },
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
      { label: 'Users' },
      { label: 'ALB', note: 'across 2 AZs' },
      { label: 'Auto Scaling Group', note: '2–6 instances' },
      { label: 'EC2 fleet', note: 'stateless' },
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
      { label: 'Upload', note: 'Standard' },
      { label: 'Lifecycle rule', note: 'age-based' },
      { label: 'Glacier', note: 'after 90d' },
      { label: 'Expire', note: 'after 1y' },
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
      { label: 'Internet' },
      { label: 'Internet Gateway' },
      { label: 'Public subnets', note: 'ALB' },
      { label: 'Private subnets', note: 'app + DB' },
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
      { label: 'App tier' },
      { label: 'RDS primary', note: 'AZ-a' },
      { label: 'Standby', note: 'AZ-b, failover' },
      { label: 'Read replica', note: 'read scaling' },
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

  // ─── BLEEPXCLOUD SANDBOX SCENARIOS ─────────────────────────────────────────
  // Hands-on, browser-native AWS simulations. No account required.

  // ── S3 ─────────────────────────────────────────────────────────────────────
  {
    slug: 's3-create-bucket',
    title: 'Create Your First S3 Bucket',
    section: 'Storage',
    level: 'Beginner',
    stars: 1,
    skills: ['s3', 'regions'],
    description:
      "Every data lake, backup, and application asset on AWS usually passes through S3 at some point. Start by creating a bucket in a specific region and understand why bucket names must be globally unique.",
    prerequisites: [],
    labType: 'scenario',
    realWorld:
      'A new team needs a place to drop nightly CSV exports. You create an S3 bucket with a clear, globally unique name and a region close to the consumers.',
    objectives: [
      'Create an S3 bucket',
      'Choose a region for the bucket',
      'Understand global namespace uniqueness',
    ],
    architecture: [
      { label: 'You', note: 'console' },
      { label: 'S3', note: 'bucket' },
      { label: 'Region', note: 'us-east-1' },
    ],
    steps: [
      {
        id: 's3-bucket-create',
        title: 'Create the bucket',
        instruction: 'Use the S3 panel to create a bucket named exactly "etl-exports-bleepx" in us-east-1.',
        service: 's3',
        action: 'create-bucket',
        config: { bucketName: 'etl-exports-bleepx' },
        explanation: 'S3 bucket names are globally unique across all AWS accounts and regions.',
        examConcept: 'S3 bucket names must be DNS-compliant and globally unique.',
      },
    ],
    examQuestions: [
      {
        question: 'Which statement about S3 bucket names is true?',
        options: ['Bucket names must be unique per region.', 'Bucket names must be unique across all AWS accounts globally.', 'Bucket names can be reused after deletion.', 'Bucket names are not case sensitive and can contain spaces.'],
        answer: 1,
        explanation: 'S3 bucket names are globally unique across all AWS accounts and all regions.',
      },
    ],
  },
  {
    slug: 's3-upload-csv',
    title: 'Upload a CSV to S3',
    section: 'Storage',
    level: 'Beginner',
    stars: 1,
    skills: ['s3', 'objects'],
    description:
      'Now that the bucket exists, upload a dataset. Learn how S3 stores objects under keys, and why a folder-like prefix is just a naming convention in S3.',
    prerequisites: ['s3-create-bucket'],
    labType: 'scenario',
    realWorld:
      'The first nightly CSV export arrives. You upload it to S3 as an object with a dated key so downstream jobs can find the latest file.',
    objectives: [
      'Upload an object to a bucket',
      'Understand object keys vs folders',
      'See the object size in the console',
    ],
    steps: [
      {
        id: 's3-csv-upload',
        title: 'Upload sales.csv',
        instruction: 'In the "etl-exports-bleepx" bucket, upload an object with the key "sales/2026-01-15.csv" and a few rows of CSV content.',
        service: 's3',
        action: 'put-object',
        config: { bucketName: 'etl-exports-bleepx', key: 'sales/2026-01-15.csv' },
        explanation: 'S3 object keys are flat strings. "sales/" is a prefix, not a real folder.',
        examConcept: 'S3 has a flat object namespace; prefixes mimic folders.',
      },
    ],
    examQuestions: [
      {
        question: 'In S3, what does a key like "sales/2026/01/data.csv" represent?',
        options: ['A folder hierarchy with three nested folders.', 'A single object with a flat key that uses delimiters as a convention.', 'A multi-part upload path.', 'A Glacier archive location.'],
        answer: 1,
        explanation: 'S3 keys are flat. The slashes are conventions for organizing but do not create real directories.',
      },
    ],
  },
  {
    slug: 's3-block-public-access',
    title: 'Block Public Access on S3',
    section: 'Storage',
    level: 'Beginner',
    stars: 1,
    skills: ['s3', 'public-access', 'compliance'],
    description:
      'S3 bucket policies and ACLs can accidentally expose data. AWS provides a safety switch: Block Public Access. Turn it on to prevent public reads.',
    prerequisites: ['s3-create-bucket'],
    labType: 'scenario',
    realWorld:
      'Security audit flags a new bucket. Before any objects arrive, you enable S3 Block Public Access to prevent accidental data leaks.',
    objectives: [
      'Enable S3 Block Public Access',
      'Understand why it is the default best practice',
      'Distinguish bucket ACLs from bucket policies',
    ],
    steps: [
      {
        id: 's3-public-access-block',
        title: 'Enable Block Public Access',
        instruction: 'Enable the S3 Block Public Access setting on the "etl-exports-bleepx" bucket.',
        service: 's3',
        action: 'set-public-access',
        config: { bucketName: 'etl-exports-bleepx', block: true },
        explanation: 'Block Public Access is an account/bucket-level guard that overrules policies and ACLs trying to grant public access.',
        examConcept: 'S3 Block Public Access takes precedence over bucket policies and ACLs.',
      },
    ],
    examQuestions: [
      {
        question: 'Which S3 feature acts as an override to prevent buckets from becoming public, regardless of bucket policies or ACLs?',
        options: ['S3 Object Lock', 'S3 Block Public Access', 'S3 Versioning', 'S3 Transfer Acceleration'],
        answer: 1,
        explanation: 'S3 Block Public Access is designed to prevent accidental or malicious public exposure by overriding policies and ACLs.',
      },
    ],
  },
  {
    slug: 's3-encrypt-bucket',
    title: 'Enable S3 Default Encryption',
    section: 'Storage',
    level: 'Intermediate',
    stars: 2,
    skills: ['s3', 'kms', 'encryption'],
    description:
      'Regulatory requirements often demand encryption at rest. Set the default encryption on a bucket so every object is automatically encrypted without the uploader doing anything.',
    prerequisites: ['s3-create-bucket', 's3-block-public-access'],
    labType: 'scenario',
    realWorld:
      'Compliance requires all customer data to be encrypted at rest. You enable SSE-S3 default encryption so uploads are encrypted automatically.',
    objectives: [
      'Set default bucket encryption to SSE-S3',
      'Compare SSE-S3, SSE-KMS, and DSSE-KMS',
      'Understand automatic server-side encryption',
    ],
    steps: [
      {
        id: 's3-sse-s3',
        title: 'Set default encryption to SSE-S3',
        instruction: 'Set the default encryption on "etl-exports-bleepx" to SSE-S3 (AES256).',
        service: 's3',
        action: 'set-encryption',
        config: { bucketName: 'etl-exports-bleepx', encryption: 'AES256' },
        explanation: 'SSE-S3 encrypts every object with AES-256 using AWS-managed keys. No key management required.',
        examConcept: 'SSE-S3 uses AWS-managed keys and is the simplest encryption option.',
      },
    ],
    examQuestions: [
      {
        question: 'Which S3 encryption option requires no key management by the customer and uses AWS-managed AES-256 keys?',
        options: ['SSE-C', 'SSE-KMS', 'SSE-S3', 'Client-side encryption'],
        answer: 2,
        explanation: 'SSE-S3 (Amazon S3 managed keys) encrypts with AWS-managed AES-256 keys and does not require customer key management.',
      },
    ],
  },

  // ── IAM ────────────────────────────────────────────────────────────────────
  {
    slug: 'iam-create-user',
    title: 'Create an IAM User',
    section: 'Identity',
    level: 'Beginner',
    stars: 1,
    skills: ['iam', 'users'],
    description:
      'IAM users represent humans or applications that interact with AWS. Create a dedicated user for an ETL script instead of using the root account.',
    prerequisites: [],
    labType: 'scenario',
    realWorld:
      'A data engineer writes an ETL script. Instead of embedding root credentials, you create an IAM user named "etl-uploader" with scoped permissions.',
    objectives: [
      'Create an IAM user',
      'Attach a policy later (least privilege)',
      'Never use root credentials for automation',
    ],
    steps: [
      {
        id: 'iam-user-create',
        title: 'Create IAM user',
        instruction: 'Create an IAM user named "etl-uploader".',
        service: 'iam',
        action: 'create-user',
        config: { userName: 'etl-uploader' },
        explanation: 'IAM users are long-term credentials for people or applications.',
        examConcept: 'IAM users are one type of principal; best practice is least privilege.',
      },
    ],
    examQuestions: [
      {
        question: 'Which AWS principal should be used for an automated ETL script?',
        options: ['Root account', 'IAM user with limited permissions', 'Federation token from a social identity provider', 'AWS Marketplace role'],
        answer: 1,
        explanation: 'An IAM user or IAM role with limited permissions is appropriate for an application or script.',
      },
    ],
  },
  {
    slug: 'iam-least-privilege-s3',
    title: 'Least-Privilege S3 Policy',
    section: 'Identity',
    level: 'Intermediate',
    stars: 2,
    skills: ['iam', 'policies', 's3'],
    description:
      'A common exam and interview question: write the smallest IAM policy that lets an ETL uploader put objects into exactly one bucket.',
    prerequisites: ['iam-create-user', 's3-create-bucket'],
    labType: 'scenario',
    realWorld:
      'Security pushes back on a wildcard S3 permission. You craft an IAM policy that only allows s3:PutObject on the ETL bucket.',
    objectives: [
      'Create an IAM policy with a specific action',
      'Scope the resource to one bucket',
      'Attach the policy to the ETL user',
    ],
    steps: [
      {
        id: 'iam-policy-create',
        title: 'Create the PutObject policy',
        instruction: 'Create an IAM policy named "ETLPutOnly" that allows s3:PutObject on arn:aws:s3:::etl-exports-bleepx/*.',
        service: 'iam',
        action: 'create-policy',
        config: { policyName: 'ETLPutOnly' },
        explanation: 'The policy uses a single action and a specific resource ARN for least privilege.',
        examConcept: 'Least privilege means granting only the actions and resources required.',
      },
      {
        id: 'iam-attach-policy',
        title: 'Attach policy to user',
        instruction: 'Attach the "ETLPutOnly" policy to the "etl-uploader" user.',
        service: 'iam',
        action: 'attach-policy',
        config: { userName: 'etl-uploader', policyName: 'ETLPutOnly' },
        explanation: 'User-based permissions are the union of all attached policies.',
        examConcept: 'IAM users can have multiple policies attached; explicit deny always wins.',
      },
    ],
    examQuestions: [
      {
        question: 'Which principle is most important when writing an IAM policy for an ETL uploader?',
        options: ['Grant all S3 actions for flexibility.', 'Use least privilege: only the actions and resources required.', 'Use the root account for simplicity.', 'Share credentials across teams.'],
        answer: 1,
        explanation: 'Least privilege is a core AWS security best practice and a frequent exam topic.',
      },
    ],
  },
  {
    slug: 'iam-deny-vs-allow',
    title: 'Explicit Deny in IAM',
    section: 'Identity',
    level: 'Advanced',
    stars: 3,
    skills: ['iam', 'policies', 'deny'],
    description:
      'In AWS, an explicit Deny always overrides an Allow. Attach a policy that allows broad access but denies a specific bucket, and observe the effective result.',
    prerequisites: ['iam-least-privilege-s3'],
    labType: 'scenario',
    realWorld:
      'A contractor needs broad read access but must never touch the finance-reports bucket. A Deny statement blocks that specific bucket while Allow permits the rest.',
    objectives: [
      'Create a policy with both Allow and Deny',
      'Observe that Deny wins over Allow',
      'Test whether the user can access the denied bucket',
    ],
    steps: [
      {
        id: 'iam-deny-policy',
        title: 'Create deny policy',
        instruction: 'Create a policy named "ContractorReadOnly" that allows s3:GetObject on * but denies s3:GetObject on arn:aws:s3:::finance-reports-bleepx/*.',
        service: 'iam',
        action: 'create-policy',
        config: { policyName: 'ContractorReadOnly' },
        explanation: 'Explicit Deny statements in IAM and bucket policies always override Allow.',
        examConcept: 'Explicit Deny always takes precedence over Allow in AWS authorization.',
      },
    ],
    examQuestions: [
      {
        question: 'What is the final decision when one IAM policy allows an action and another IAM policy explicitly denies it?',
        options: ['Allow wins because it was defined first.', 'Deny wins because explicit Deny overrides Allow.', 'The two policies cancel out and the default is allowed.', 'The user receives a warning but the action succeeds.'],
        answer: 1,
        explanation: 'AWS authorization logic states that an explicit Deny always overrides any Allow.',
      },
    ],
  },

  // ── EC2 ────────────────────────────────────────────────────────────────────
  {
    slug: 'ec2-launch-sandbox',
    title: 'Launch an EC2 Instance',
    section: 'Compute',
    level: 'Beginner',
    stars: 1,
    skills: ['ec2', 'ami', 'instances'],
    description:
      'Launch a real-looking EC2 instance from the browser sandbox. Choose an AMI, instance size, and see the on-demand cost.',
    prerequisites: [],
    labType: 'scenario',
    realWorld:
      'A developer needs a t3.micro web server for a quick prototype. You launch it with Amazon Linux 2023.',
    objectives: [
      'Choose an AMI',
      'Select an instance size',
      'Understand on-demand billing',
    ],
    steps: [
      {
        id: 'ec2-launch',
        title: 'Launch t3.micro',
        instruction: 'Launch an EC2 instance named "web-prototype" using the Amazon Linux 2023 AMI and a t3.micro instance size.',
        service: 'ec2',
        action: 'launch-ec2',
        config: { name: 'web-prototype', ami: 'ami-amazon-linux-2023', size: 't3.micro' },
        explanation: 't3.micro is burstable, cheap, and a common starting point for small workloads.',
        examConcept: 'EC2 on-demand pricing: you pay per hour or per second while the instance runs.',
      },
    ],
    examQuestions: [
      {
        question: 'Which EC2 instance size is best suited for a low-traffic web prototype on a tight budget?',
        options: ['m5.4xlarge', 't3.micro', 'r6g.2xlarge', 'c6g.4xlarge'],
        answer: 1,
        explanation: 't3.micro is burstable, has 1 GiB of RAM, and is part of the AWS Free Tier, making it ideal for prototypes.',
      },
    ],
  },
  {
    slug: 'ec2-right-size',
    title: 'Right-Size an EC2 Instance',
    section: 'Compute',
    level: 'Intermediate',
    stars: 2,
    skills: ['ec2', 'cost', 'resizing'],
    description:
      'A t3.micro is pegged at 100% CPU. Choose the correct general-purpose m6i instance for a memory-bound workload.',
    prerequisites: ['ec2-launch-sandbox'],
    labType: 'scenario',
    realWorld:
      'Monitoring shows 95% CPU and OOM crashes. The app needs more vCPU and memory, but not a GPU. You move to an m6i.large.',
    objectives: [
      'Match instance family to workload type',
      'Estimate cost impact of resizing',
      'Understand when to stop vs terminate',
    ],
    steps: [
      {
        id: 'ec2-right-size',
        title: 'Launch m6i.large',
        instruction: 'Launch an EC2 instance named "web-prod" using the Ubuntu Server 22.04 AMI and an m6i.large size.',
        service: 'ec2',
        action: 'launch-ec2',
        config: { name: 'web-prod', ami: 'ami-ubuntu-22-lts', size: 'm6i.large' },
        explanation: 'm6i is a general-purpose Intel instance family; "large" has 2 vCPU and 8 GiB RAM.',
        examConcept: 'M-family is general-purpose; C-family is compute-optimized; R-family is memory-optimized.',
      },
    ],
    examQuestions: [
      {
        question: 'Which EC2 family is best for a compute-intensive batch processing job?',
        options: ['T family (burstable)', 'M family (general-purpose)', 'C family (compute-optimized)', 'R family (memory-optimized)'],
        answer: 2,
        explanation: 'C-family instances are compute-optimized, making them ideal for CPU-bound batch jobs.',
      },
    ],
  },

  // ── VPC / Networking ───────────────────────────────────────────────────────
  {
    slug: 'vpc-create-subnets',
    title: 'Create a VPC with Public Subnet',
    section: 'Networking',
    level: 'Intermediate',
    stars: 2,
    skills: ['vpc', 'subnets', 'cidr'],
    description:
      'A VPC is your private network in the cloud. Create a VPC, a public subnet, and an internet gateway so an EC2 instance can reach the internet.',
    prerequisites: ['ec2-launch-sandbox'],
    labType: 'scenario',
    realWorld:
      'A web server must be reachable from the internet. You build a VPC with a public subnet, an IGW, and a route table.',
    objectives: [
      'Create a VPC with a CIDR',
      'Create a public subnet',
      'Attach an internet gateway and update routes',
    ],
    steps: [
      {
        id: 'vpc-create',
        title: 'Create VPC',
        instruction: 'Create a VPC with CIDR 10.0.0.0/16.',
        service: 'vpc',
        action: 'create-vpc',
        config: { cidr: '10.0.0.0/16' },
        explanation: 'A VPC spans all AZs in a region and contains one or more subnets.',
        examConcept: 'A VPC is an isolated, virtual network in an AWS region.',
      },
      {
        id: 'subnet-public',
        title: 'Create public subnet',
        instruction: 'In that VPC, create a public subnet (10.0.1.0/24) in us-east-1a.',
        service: 'vpc',
        action: 'create-subnet',
        config: { cidr: '10.0.1.0/24', az: 'us-east-1a', isPublic: true },
        explanation: 'A public subnet has a route to an internet gateway (0.0.0.0/0 → igw).',
        examConcept: 'Subnets are tied to a single availability zone.',
      },
    ],
    examQuestions: [
      {
        question: 'What makes a subnet "public" in AWS?',
        options: ['It contains only public IP addresses.', 'Its route table has a route to an internet gateway.', 'It is located in the default VPC.', 'It has no network ACL rules.'],
        answer: 1,
        explanation: 'A public subnet has a route table with a route to an internet gateway for 0.0.0.0/0.',
      },
    ],
  },
  {
    slug: 'security-group-web',
    title: 'Secure a Web Server with Security Groups',
    section: 'Networking',
    level: 'Intermediate',
    stars: 2,
    skills: ['security-groups', 'firewall', 'ports'],
    description:
      'Security groups are stateful firewalls for EC2. Allow only HTTPS and SSH to a web server, and understand why overly permissive rules are dangerous.',
    prerequisites: ['vpc-create-subnets'],
    labType: 'scenario',
    realWorld:
      'The security team requires the web server to accept HTTPS (443) from anywhere and SSH (22) only from the office IP.',
    objectives: [
      'Create a security group',
      'Add inbound rules for 443 and 22',
      'Understand stateful firewall behavior',
    ],
    steps: [
      {
        id: 'sg-create',
        title: 'Create security group',
        instruction: 'Create a security group in your VPC named "web-sg" that allows TCP 443 from 0.0.0.0/0 and TCP 22 from 203.0.113.0/24.',
        service: 'vpc',
        action: 'create-security-group',
        config: { name: 'web-sg' },
        explanation: 'Security groups are stateful: if inbound is allowed, the matching outbound response is allowed automatically.',
        examConcept: 'Security groups are stateful; NACLs are stateless.',
      },
    ],
    examQuestions: [
      {
        question: 'Which statement about security groups is true?',
        options: ['They are stateless.', 'They are stateful and only support allow rules.', 'They can explicitly deny traffic.', 'They operate at the subnet level.'],
        answer: 1,
        explanation: 'Security groups are stateful and support only allow rules; NACLs are stateless and support allow and deny.',
      },
    ],
  },

  // ── Capstone / Multi-service ───────────────────────────────────────────────
  {
    slug: 'aws-sandbox-capstone',
    title: 'Capstone: Secure Data Lake on S3',
    section: 'Capstone',
    level: 'Advanced',
    stars: 3,
    skills: ['s3', 'iam', 'encryption', 'public-access'],
    description:
      'Build a mini data lake: encrypted S3 bucket, Block Public Access, and a least-privilege IAM user that can only upload to it.',
    prerequisites: ['s3-encrypt-bucket', 'iam-least-privilege-s3', 's3-block-public-access'],
    labType: 'scenario',
    realWorld:
      'A startup needs a data lake for analytics CSVs. The bucket must be private, encrypted, and only a designated IAM user may upload.',
    objectives: [
      'Create and encrypt the data lake bucket',
      'Block all public access',
      'Create a scoped IAM user and attach a least-privilege policy',
    ],
    steps: [
      {
        id: 'cap-bucket',
        title: 'Create data-lake bucket',
        instruction: 'Create an S3 bucket named "data-lake-bleepx" in us-east-1.',
        service: 's3',
        action: 'create-bucket',
        config: { bucketName: 'data-lake-bleepx' },
        explanation: 'Start with the bucket that will hold all analytics data.',
        examConcept: 'Bucket names are globally unique.',
      },
      {
        id: 'cap-encrypt',
        title: 'Enable SSE-S3 encryption',
        instruction: 'Set default encryption to SSE-S3 on "data-lake-bleepx".',
        service: 's3',
        action: 'set-encryption',
        config: { bucketName: 'data-lake-bleepx', encryption: 'AES256' },
        explanation: 'Default encryption ensures every object is protected without user action.',
        examConcept: 'SSE-S3 uses AWS-managed keys for server-side encryption.',
      },
      {
        id: 'cap-block',
        title: 'Block public access',
        instruction: 'Enable S3 Block Public Access on "data-lake-bleepx".',
        service: 's3',
        action: 'set-public-access',
        config: { bucketName: 'data-lake-bleepx', block: true },
        explanation: 'Block Public Access prevents public data leaks from policies or ACLs.',
        examConcept: 'Block Public Access is the strongest public-access guard.',
      },
      {
        id: 'cap-user',
        title: 'Create lake uploader user',
        instruction: 'Create an IAM user named "lake-uploader".',
        service: 'iam',
        action: 'create-user',
        config: { userName: 'lake-uploader' },
        explanation: 'Each application or automation should use its own IAM user or role.',
        examConcept: 'Use IAM users or roles, never the root account.',
      },
      {
        id: 'cap-policy',
        title: 'Create scoped policy',
        instruction: 'Create an IAM policy named "LakePutOnly" and attach it to "lake-uploader" allowing s3:PutObject on arn:aws:s3:::data-lake-bleepx/*.',
        service: 'iam',
        action: 'create-policy',
        config: { policyName: 'LakePutOnly' },
        explanation: 'The uploader can only PutObject; it cannot list, delete, or read.',
        examConcept: 'Least privilege limits blast radius if credentials leak.',
      },
    ],
    examQuestions: [
      {
        question: 'A data lake must be private and encrypted at rest. Which combination is best?',
        options: ['SSE-S3 + S3 Block Public Access', 'No encryption + public-read ACL', 'SSE-KMS with no key rotation + public bucket policy', 'Client-side encryption + public bucket'],
        answer: 0,
        explanation: 'SSE-S3 provides automatic encryption and Block Public Access prevents accidental public exposure.',
      },
    ],
  },

  // ─── BleepxBank Security Audit ──────────────────────────────────────────────
  {
    slug: 'bleepx-bank-security-audit',
    title: 'BleepxBank Security Audit',
    section: 'Security',
    level: 'Advanced',
    stars: 3,
    skills: ['s3', 'iam', 'vpc', 'compliance', 'least-privilege'],
    description:
      'You are the cloud security engineer for BleepxBank. A pre-configured environment is loaded with realistic transaction data, a DynamoDB customer table, an ETL Lambda, and an intentionally insecure public website bucket. Find and fix the critical misconfigurations before the auditor arrives.',
    prerequisites: ['aws-sandbox-capstone'],
    labType: 'scenario',
    preset: 'bleepxbank',
    realWorld:
      'A fintech startup rushes to launch. They leave an S3 website public, an EC2 security group open to 0.0.0.0/0 on SSH, and a PowerUserAccess policy on a human user. You audit and remediate.',
    objectives: [
      'Enable S3 Block Public Access on the website bucket',
      'Restrict the SSH security group rule',
      'Remove the overly permissive PowerUserAccess policy',
      'Export the cleaned architecture as Terraform',
    ],
    architecture: [
      { label: 'BleepxBank', note: 'data + customers' },
      { label: 'S3', note: 'data lake + website' },
      { label: 'IAM', note: 'roles + policies' },
      { label: 'Security', note: 'remediate findings' },
    ],
    steps: [
      {
        id: 'audit-website-public',
        title: 'Block public access on website bucket',
        instruction: 'In the S3 tab, enable S3 Block Public Access on the "bleepx-bank-website" bucket.',
        service: 's3',
        action: 'set-public-access',
        config: { bucketName: 'bleepx-bank-website', block: true },
        explanation: 'Block Public Access overrules any bucket policy or ACL that tries to grant public access.',
        examConcept: 'S3 Block Public Access takes precedence over bucket policies and ACLs.',
      },
      {
        id: 'audit-ssh',
        title: 'Restrict SSH ingress',
        instruction: 'Replace the SSH (port 22) rule on the web-sg security group so it only allows 203.0.113.0/24.',
        service: 'vpc',
        action: 'add-sg-rule',
        config: { groupId: 'sg-web-01', rule: { protocol: 'tcp', fromPort: 22, toPort: 22, source: '203.0.113.0/24' } },
        explanation: 'SSH should never be open to 0.0.0.0/0. Restrict it to a trusted office IP or use SSM Session Manager.',
        examConcept: 'Systems Manager Session Manager removes the need for inbound SSH entirely.',
      },
      {
        id: 'audit-poweruser',
        title: 'Detach PowerUserAccess',
        instruction: 'Create a new scoped policy named "WebAdminReadOnly" and attach it to web-admin, replacing the PowerUserAccess wildcard.',
        service: 'iam',
        action: 'create-policy',
        config: { policyName: 'WebAdminReadOnly' },
        explanation: 'PowerUserAccess allows all actions except IAM; it is far too broad for a web admin.',
        examConcept: 'Least privilege means granting only the actions the role actually needs.',
      },
      {
        id: 'audit-terraform',
        title: 'Export as Terraform',
        instruction: 'Open the Terraform tab and click "Generate & Save Terraform" to export the remediated infrastructure as IaC.',
        service: 'terraform',
        action: 'export-terraform',
        config: {},
        explanation: 'Terraform lets you version, review, and repeatedly deploy the same infrastructure.',
        examConcept: 'Infrastructure as Code (IaC) improves auditability and reduces drift.',
      },
    ],
    examQuestions: [
      {
        question: 'What is the strongest S3 control to prevent accidental public data exposure?',
        options: ['Bucket policy with Deny', 'S3 Block Public Access', 'Object ACLs set to private', 'CloudTrail logging'],
        answer: 1,
        explanation: 'Block Public Access is an account and bucket-level guard that overrides any permissive policy or ACL.',
      },
      {
        question: 'Which AWS service can replace inbound SSH for EC2 administration?',
        options: ['AWS Systems Manager Session Manager', 'AWS Direct Connect', 'Amazon Cognito', 'AWS Certificate Manager'],
        answer: 0,
        explanation: 'Session Manager provides shell access without opening port 22, improving security and auditability.',
      },
    ],
  },

  // ─── DynamoDB Foundations ───────────────────────────────────────────────────
  {
    slug: 'dynamodb-create-and-query',
    title: 'DynamoDB: Create and Query a Table',
    section: 'Database',
    level: 'Intermediate',
    stars: 2,
    skills: ['dynamodb', 'nosql', 'partition-key'],
    description:
      'DynamoDB is AWS\'s fully managed NoSQL key-value and document database. Create a Customers table, insert a few items, and query by partition key to see how it differs from SQL.',
    prerequisites: [],
    labType: 'scenario',
    realWorld:
      'A new mobile app needs a low-latency user profile store. DynamoDB\'s single-digit millisecond reads and pay-per-request billing fit the workload.',
    objectives: [
      'Create a DynamoDB table with a partition key',
      'Put an item',
      'Query the item by partition key',
      'Understand partition key vs sort key',
    ],
    steps: [
      {
        id: 'ddb-create',
        title: 'Create the Customers table',
        instruction: 'Create a DynamoDB table named "Customers" with partition key "customer_id".',
        service: 'dynamodb',
        action: 'create-dynamodb-table',
        config: { tableName: 'Customers', partitionKey: 'customer_id' },
        explanation: 'A partition key uniquely identifies each item and determines how data is distributed across storage.',
        examConcept: 'DynamoDB requires a partition key; a sort key is optional and enables composite access patterns.',
      },
      {
        id: 'ddb-put',
        title: 'Insert an item',
        instruction: 'Put a JSON item: {"customer_id":"c-900","region":"us-east-1","tier":"premium"} into the Customers table.',
        service: 'dynamodb',
        action: 'put-dynamodb-item',
        config: { tableName: 'Customers', pk: 'c-900' },
        explanation: 'DynamoDB stores schemaless items with the attributes you provide.',
        examConcept: 'DynamoDB is schemaless except for the key attributes.',
      },
    ],
    examQuestions: [
      {
        question: 'What is the minimum key required for every DynamoDB table?',
        options: ['Partition key', 'Sort key', 'Global secondary index', 'Local secondary index'],
        answer: 0,
        explanation: 'Every DynamoDB table must have a partition key. A sort key is optional.',
      },
    ],
  },

  // ─── Lambda Fraud Detection ─────────────────────────────────────────────────
  {
    slug: 'lambda-fraud-detection',
    title: 'Lambda: Real-Time Fraud Detection',
    section: 'Serverless',
    level: 'Intermediate',
    stars: 2,
    skills: ['lambda', 'event-driven', 'python'],
    description:
      'Build a serverless function that flags high-value transfers as they arrive. This is the same fraud logic BleepxBank uses on its transaction stream.',
    prerequisites: [],
    labType: 'scenario',
    realWorld:
      'A payment processor streams transactions to Lambda. Functions under 1000 ms detect anomalies without running a 24/7 server.',
    objectives: [
      'Create a Lambda function with a handler',
      'Configure an environment variable threshold',
      'Invoke the function with sample transaction records',
      'See the flagging result',
    ],
    steps: [
      {
        id: 'lambda-create',
        title: 'Create the fraud detector',
        instruction: 'Create a Lambda function named "fraud-detector", runtime python3.12, handler index.handler, role arn:aws:iam::123456789012:role/etl-service-role, with any Python code.',
        service: 'lambda',
        action: 'create-lambda',
        config: { functionName: 'fraud-detector' },
        explanation: 'Lambda functions are triggered by events and run only when called, so you pay only for invocation time.',
        examConcept: 'Lambda is event-driven, pay-per-use serverless compute.',
      },
      {
        id: 'lambda-invoke',
        title: 'Invoke the function',
        instruction: 'Invoke "fraud-detector" with a payload like {"Records":[{"transaction_id":"txn-2001","amount_usd":25000}]}.',
        service: 'lambda',
        action: 'invoke-lambda',
        config: { functionName: 'fraud-detector' },
        explanation: 'If the amount_usd exceeds the THRESHOLD_USD environment variable, the function flags the record.',
        examConcept: 'Lambda can transform and respond to streaming data in real time.',
      },
    ],
    examQuestions: [
      {
        question: 'Which AWS service is best for running short, event-driven code without provisioning servers?',
        options: ['EC2', 'Lambda', 'ECS', 'RDS'],
        answer: 1,
        explanation: 'Lambda is AWS\'s serverless compute service; you pay only for the time the function runs.',
      },
    ],
  },

  // ─── End-to-End: Production 3-Tier App ───────────────────────────────────────
  {
    slug: 'three-tier-production',
    title: 'End-to-End: 3-Tier Production App',
    section: 'Capstone',
    level: 'Master',
    stars: 5,
    skills: ['vpc', 'rds', 'elb', 'asg', 'cloudfront', 'route53', 'secretsmanager', 'elasticache', 'kms'],
    description:
      'Design and build a resilient, secure, and fast production web application. This mission chains together every major service you have learned: DNS, CDN, load balancing, auto scaling, managed databases, caching, and secrets.',
    prerequisites: [],
    labType: 'scenario',
    realWorld:
      'A fintech startup is launching its customer portal. It must survive an AZ failure, serve users in Europe and Asia, never expose database credentials in code, and cache hot data to keep response times low.',
    objectives: [
      'Route users to a healthy origin with Route 53',
      'Cache and terminate SSL at the edge with CloudFront',
      'Distribute traffic across AZs with an ALB and ASG',
      'Run a resilient RDS MySQL database in Multi-AZ',
      'Offload reads with ElastiCache Redis',
      'Store credentials in Secrets Manager and protect them with KMS',
      'Monitor health with CloudWatch',
    ],
    architecture: [
      { label: 'Route 53', note: 'DNS + failover' },
      { label: 'CloudFront', note: 'edge cache' },
      { label: 'ALB', note: 'across AZs' },
      { label: 'ASG', note: '2–6 EC2' },
      { label: 'ElastiCache', note: 'Redis cache' },
      { label: 'RDS MySQL', note: 'Multi-AZ' },
      { label: 'Secrets Manager', note: 'db password' },
    ],
    steps: [
      {
        id: 'tt-vpc',
        title: 'Create the VPC foundation',
        instruction: 'Create a VPC with CIDR 10.0.0.0/16. This is the private network that will host all tiers.',
        service: 'vpc',
        action: 'create-vpc',
        config: { cidr: '10.0.0.0/16' },
        explanation: 'A VPC is the boundary for your network. All subnets, gateways, and security groups live inside it.',
        examConcept: 'VPCs are isolated networks; design public + private subnets across multiple AZs.',
      },
      {
        id: 'tt-rds',
        title: 'Create the database tier',
        instruction: 'Create an RDS MySQL instance named "prod-db" with Multi-AZ enabled. Place it in the database subnet group.',
        service: 'rds',
        action: 'create-rds',
        config: { dbInstanceIdentifier: 'prod-db' },
        explanation: 'The database is the source of truth. Multi-AZ keeps a synchronous standby for automatic failover.',
        examConcept: 'RDS Multi-AZ is for availability; read replicas are for read scaling.',
      },
      {
        id: 'tt-kms',
        title: 'Create a KMS customer key',
        instruction: 'Create a KMS key named "prod-data-key" to encrypt the database and secrets.',
        service: 'kms',
        action: 'create-kms',
        config: { keyId: 'prod-data-key' },
        explanation: 'Customer-managed keys give you full control, audit, and revocation over encryption.',
        examConcept: 'Customer-managed KMS keys are preferred when you need full key lifecycle control.',
      },
      {
        id: 'tt-secret',
        title: 'Store the database password',
        instruction: 'Create a secret in Secrets Manager named "prod/db/password" with any value and rotation disabled for now.',
        service: 'secretsmanager',
        action: 'create-secret',
        config: { secretName: 'prod/db/password' },
        explanation: 'Never hard-code credentials. Secrets Manager lets you rotate secrets automatically and audit access.',
        examConcept: 'Use Secrets Manager for credentials, API keys, and tokens; rotate with Lambda.',
      },
      {
        id: 'tt-cache',
        title: 'Add a Redis cache',
        instruction: 'Create an ElastiCache Redis cluster named "prod-cache" to offload reads from RDS.',
        service: 'elasticache',
        action: 'create-elasticache',
        config: { cacheClusterId: 'prod-cache' },
        explanation: 'Redis caches frequently-read data so the database is not hammered on every request.',
        examConcept: 'ElastiCache Redis supports persistence, replication, and Multi-AZ; Memcached does not.',
      },
      {
        id: 'tt-elb',
        title: 'Create an Application Load Balancer',
        instruction: 'Create an internet-facing application load balancer named "prod-alb".',
        service: 'elb',
        action: 'create-elb',
        config: { loadBalancerName: 'prod-alb' },
        explanation: 'The ALB is the entry point from the public internet. It routes HTTP/HTTPS to healthy targets.',
        examConcept: 'ALBs are Layer 7; NLBs are Layer 4. Internet-facing LBs need public subnets.',
      },
      {
        id: 'tt-asg',
        title: 'Create an Auto Scaling Group',
        instruction: 'Create an ASG named "prod-asg" behind the ALB. Use any launch template and 2 subnets.',
        service: 'asg',
        action: 'create-asg',
        config: { asgName: 'prod-asg' },
        explanation: 'The ASG keeps the web tier at the right size and replaces unhealthy instances across AZs.',
        examConcept: 'ASGs spread across multiple AZs for high availability and use target tracking to scale.',
      },
      {
        id: 'tt-cloudwatch',
        title: 'Add a CloudWatch alarm',
        instruction: 'Create a CloudWatch alarm named "high-cpu" for CPUUtilization above 80%.',
        service: 'cloudwatch',
        action: 'create-cloudwatch-alarm',
        config: { alarmName: 'high-cpu' },
        explanation: 'Alarms let you react to metric thresholds. Pair them with ASG scaling or SNS notifications.',
        examConcept: 'CloudWatch alarms trigger on metrics and can drive Auto Scaling or SNS.',
      },
      {
        id: 'tt-route53',
        title: 'Register DNS',
        instruction: 'Create a Route 53 hosted zone for "bleepxapp.io" so users can reach the app with a friendly name.',
        service: 'route53',
        action: 'create-route53-zone',
        config: { zoneName: 'bleepxapp.io' },
        explanation: 'Route 53 translates domain names to endpoints. Use Alias records for AWS resources to avoid TTL issues.',
        examConcept: 'Alias records in Route 53 map to AWS resources like CloudFront and ALBs.',
      },
      {
        id: 'tt-cloudfront',
        title: 'Add the CDN',
        instruction: 'Create a CloudFront distribution with origin domain name "etl-exports-bleepx". This will cache static assets at the edge.',
        service: 'cloudfront',
        action: 'create-cloudfront',
        config: { originDomainName: 'etl-exports-bleepx' },
        explanation: 'CloudFront caches content at edge locations, reducing latency and origin load for global users.',
        examConcept: 'CloudFront with S3 + OAI is the standard pattern for static content delivery.',
      },
    ],
    examQuestions: [
      {
        question: 'In a 3-tier architecture, which tier should be placed in private subnets?',
        options: ['Web tier', 'Application tier', 'Database tier', 'Load balancer tier'],
        answer: 2,
        explanation: 'The database tier should be in private subnets, unreachable directly from the internet.',
      },
    ],
  },
];
