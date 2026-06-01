// ─── Bleepx Glossary: Easy-to-understand analogies for technical terms ───
// Human-friendly explanations with real-world analogies by Bleepx character.

export interface GlossaryEntry {
  term: string;
  /** What it is, in plain English */
  definition: string;
  /** Bleepx analogy using everyday concepts (PC, MacBook, physical world) */
  analogy: string;
  /** Simple example or use case */
  example?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ── Compute ───────────────────────────────────────────────────────
  ec2: {
    term: 'EC2',
    definition: 'Elastic Compute Cloud - virtual computers you can rent in the cloud.',
    analogy: 'Think of it like renting a computer in a data center instead of buying one. You can turn it on/off, change its specs, and pay only for what you use. Like having a MacBook that lives in Amazon\'s building.',
    example: 'Run a web server, database, or any application that needs a full operating system.',
  },
  lambda: {
    term: 'Lambda',
    definition: 'Serverless compute that runs your code in response to events, billed per millisecond.',
    analogy: 'Like a tiny worker who wakes up only when there\'s a task, does it instantly, then goes back to sleep. You don\'t rent the worker\'s desk - you pay only when they\'re actually working.',
    example: 'Process an uploaded image, respond to an API call, or send a notification when something happens.',
  },
  fargate: {
    term: 'Fargate',
    definition: 'Serverless containers - run Docker containers without managing servers.',
    analogy: 'Imagine shipping containers that automatically appear when you need them, hold your stuff, and disappear when done. You don\'t worry about the truck or warehouse - Amazon handles that.',
    example: 'Run microservices or web applications packaged as containers.',
  },
  'auto-scaling': {
    term: 'Auto Scaling Group',
    definition: 'Automatically adds or removes EC2 instances based on demand.',
    analogy: 'Like a restaurant that calls in more waiters when customers arrive, and sends them home when it\'s quiet. No manager needed - it adjusts automatically.',
    example: 'Handle traffic spikes during Black Friday or product launches.',
  },

  // ── Networking ───────────────────────────────────────────────────
  vpc: {
    term: 'VPC',
    definition: 'Virtual Private Cloud - your isolated network in the cloud.',
    analogy: 'Think of it as your private office building in a shared coworking space. Your team has its own walls, doors, and security, even though you\'re in a larger facility.',
    example: 'Isolate your databases, applications, and services from other AWS customers.',
  },
  subnet: {
    term: 'Subnet',
    definition: 'A subdivision of a VPC - groups of IP addresses in one Availability Zone.',
    analogy: 'Like rooms in your office building. The kitchen, conference room, and workspace are all subnets of the same building (VPC), each with different access rules.',
    example: 'Put public-facing web servers in public subnets, databases in private subnets.',
  },
  alb: {
    term: 'ALB',
    definition: 'Application Load Balancer - distributes traffic across multiple targets at Layer 7 (HTTP/HTTPS).',
    analogy: 'Like a receptionist who directs visitors to the right department. Instead of everyone going to one desk, the receptionist routes them to accounting, sales, or support based on what they need.',
    example: 'Distribute web traffic across multiple servers for high availability.',
  },
  nat: {
    term: 'NAT Gateway',
    definition: 'Network Address Translation - lets private resources access the internet while staying private.',
    analogy: 'Like a secure mailbox that lets your private office send packages out, but nobody can send packages in. Your team can download updates without exposing your office to the public.',
    example: 'Allow private instances to download packages or access APIs without being reachable from the internet.',
  },
  cloudfront: {
    term: 'CloudFront',
    definition: 'Content Delivery Network - caches content globally near users.',
    analogy: 'Like having warehouses of your product in cities worldwide. Instead of shipping from one central location, customers get their order from the nearest warehouse for faster delivery.',
    example: 'Serve static websites, images, and videos with low latency globally.',
  },
  ssh: {
    term: 'SSH',
    definition: 'Secure Shell - a protocol to securely connect to remote computers.',
    analogy: 'Like a secure phone line to a remote computer. Instead of physically sitting at the machine, you type commands over an encrypted connection as if you were there.',
    example: 'Log into an EC2 instance to troubleshoot issues or configure software.',
  },

  // ── Storage ───────────────────────────────────────────────────────
  s3: {
    term: 'S3',
    definition: 'Simple Storage Service - object storage for files, images, backups.',
    analogy: 'Like an infinite cloud drive where you can store any type of file. Think of it as Dropbox on steroids - incredibly reliable, cheap, and accessible from anywhere.',
    example: 'Store user uploads, website assets, backups, and data lake files.',
  },
  ebs: {
    term: 'EBS',
    definition: 'Elastic Block Store - block storage volumes for EC2 instances.',
    analogy: 'Like an external hard drive that you plug into your cloud computer. It stays attached even if you turn the computer off, and you can make it bigger whenever you need.',
    example: 'Store the operating system and data for an EC2 instance.',
  },

  // ── Databases ─────────────────────────────────────────────────────
  rds: {
    term: 'RDS',
    definition: 'Relational Database Service - managed SQL databases.',
    analogy: 'Like hiring a database administrator who handles backups, updates, and maintenance for you. You just use the database - Amazon handles the boring stuff.',
    example: 'Run PostgreSQL, MySQL, or SQL Server without managing servers.',
  },
  dynamodb: {
    term: 'DynamoDB',
    definition: 'NoSQL key-value database with single-digit millisecond latency at any scale.',
    analogy: 'Like a super-fast lookup table. Instead of searching through rows like in SQL, you ask for a specific key and get the value instantly. Like a dictionary that never slows down.',
    example: 'Store user sessions, shopping carts, or high-traffic application data.',
  },

  // ── Security ───────────────────────────────────────────────────────
  iam: {
    term: 'IAM',
    definition: 'Identity and Access Management - controls who can do what in AWS.',
    analogy: 'Like the security badge system for your office. It defines who can enter which rooms, what they can do there, and revokes access when someone leaves. It\'s the foundation of all security.',
    example: 'Grant developers permission to deploy code, but not to delete databases.',
  },
  kms: {
    term: 'KMS',
    definition: 'Key Management Service - managed encryption keys.',
    analogy: 'Like a secure vault for your encryption keys. Instead of hiding keys under keyboards, you store them in a highly secure vault that only authorized people can access.',
    example: 'Encrypt sensitive data at rest with customer-managed keys.',
  },

  // ── ESG ───────────────────────────────────────────────────────────
  'carbon-credits': {
    term: 'Carbon Credits',
    definition: 'Permits to emit 1 tonne of CO2-equivalent, bought/sold in carbon markets.',
    analogy: 'Like pollution permits. If a factory can\'t reduce emissions, they buy credits from a farmer who planted trees. The farmer gets paid for being green, the factory gets permission to pollute.',
    example: 'Companies buy credits to offset emissions they cannot eliminate.',
  },
  'scope-1': {
    term: 'Scope 1 Emissions',
    definition: 'Direct greenhouse gas emissions from sources you own or control.',
    analogy: 'Like the smoke from your own chimney. If you run a factory with smokestacks, that\'s Scope 1 - directly from your operations.',
    example: 'Emissions from company vehicles, on-site fuel combustion, and manufacturing processes.',
  },
  'scope-2': {
    term: 'Scope 2 Emissions',
    definition: 'Indirect emissions from purchased electricity, steam, heating, and cooling.',
    analogy: 'Like the emissions from the power plant that generates electricity for your office. You don\'t own the plant, but you\'re responsible for the emissions from the energy you buy.',
    example: 'Emissions from purchased electricity to power data centers and offices.',
  },
  'scope-3': {
    term: 'Scope 3 Emissions',
    definition: 'All other indirect emissions in your value chain (suppliers, customers, transportation).',
    analogy: 'Like the carbon footprint of your entire supply chain. The emissions from making your products, shipping them, customer use, and disposal - even if you don\'t own those steps.',
    example: 'Supplier emissions, business travel, product use, and end-of-life disposal.',
  },

  // ── FinOps ───────────────────────────────────────────────────────
  tagging: {
    term: 'Resource Tagging',
    definition: 'Key-value labels attached to cloud resources for cost tracking and organization.',
    analogy: 'Like labeling boxes when you move. You tag each box with "Kitchen", "Office", or "Bedroom" so you know what\'s inside and who owns it. Same for cloud resources.',
    example: 'Tag resources with CostCenter, Environment, and Owner for cost allocation.',
  },
  'finops': {
    term: 'FinOps',
    definition: 'Financial Operations - practice of managing cloud costs through collaboration between finance, engineering, and business.',
    analogy: 'Like having the finance team, engineers, and business leaders at the same table to decide cloud spending. Instead of a surprise bill each month, everyone plans and optimizes together.',
    example: 'Implement cost visibility, optimization, and governance practices across the organization.',
  },

  // ── AWS Services ───────────────────────────────────────────────────
  sqs: {
    term: 'SQS',
    definition: 'Simple Queue Service - fully managed message queuing for decoupling distributed systems.',
    analogy: 'Like a message box where people can leave notes for you. You can check the box whenever you want, process messages in order, and nobody needs to be online at the same time.',
    example: 'Queue background jobs, process orders, or decouple microservices.',
  },
  sns: {
    term: 'SNS',
    definition: 'Simple Notification Service - pub/sub messaging for pushing messages to subscribers.',
    analogy: 'Like a town crier who announces news to everyone listening. When something happens, the crier shouts it out and all subscribers get the message simultaneously.',
    example: 'Send push notifications, SMS, or emails to multiple recipients.',
  },
  kinesis: {
    term: 'Kinesis',
    definition: 'Real-time data streaming service for collecting and processing large streams of data.',
    analogy: 'Like a conveyor belt that never stops, bringing data to your processing line. Data flows continuously and you can process it in real-time as it arrives.',
    example: 'Stream clickstream data, IoT sensor data, or application logs for real-time analysis.',
  },
  'api-gateway': {
    term: 'API Gateway',
    definition: 'Managed API service for creating, publishing, and securing APIs at any scale.',
    analogy: 'Like a receptionist who handles all incoming requests, checks credentials, routes them to the right service, and returns responses. You don\'t need to build your own API infrastructure.',
    example: 'Create REST or WebSocket APIs for your applications with authentication and throttling.',
  },
  cloudwatch: {
    term: 'CloudWatch',
    definition: 'Monitoring and observability service for AWS resources and applications.',
    analogy: 'Like a security camera system and dashboard combined. It watches your resources, collects metrics, logs events, and alerts you when something goes wrong.',
    example: 'Monitor EC2 instances, track application logs, and set up alarms for metrics.',
  },
  route53: {
    term: 'Route 53',
    definition: 'DNS web service - routes internet traffic to your resources.',
    analogy: 'Like a phone book for the internet. When someone types your domain name, Route 53 looks up the IP address and directs them to the right server.',
    example: 'Route traffic to your load balancer, S3 website, or CloudFront distribution.',
  },
  efs: {
    term: 'EFS',
    definition: 'Elastic File System - scalable file storage for Linux workloads.',
    analogy: 'Like a network drive that can be accessed by multiple computers simultaneously. It grows automatically as you add files and can be mounted from many instances.',
    example: 'Shared file storage for web servers, content management systems, or big data analytics.',
  },
  eks: {
    term: 'EKS',
    definition: 'Elastic Kubernetes Service - managed Kubernetes for container orchestration.',
    analogy: 'Like having a Kubernetes expert who manages the control plane for you. You just deploy your containers and EKS handles the master nodes, upgrades, and scaling.',
    example: 'Run Kubernetes clusters without managing the control plane infrastructure.',
  },
  'elastic-cache': {
    term: 'ElastiCache',
    definition: 'Managed in-memory data store service (Redis or Memcached).',
    analogy: 'Like a super-fast scratchpad for frequently accessed data. Instead of reading from a slow disk every time, you keep hot data in memory for instant access.',
    example: 'Cache database queries, session state, or real-time analytics.',
  },

  // ── Azure Services ─────────────────────────────────────────────────
  'azure-functions': {
    term: 'Azure Functions',
    definition: 'Serverless compute service for running event-triggered code.',
    analogy: 'Like Lambda on AWS - tiny workers who wake up when there\'s work, do it, then sleep. You don\'t manage servers, just write code.',
    example: 'Process HTTP requests, timer events, or Azure service triggers.',
  },
  'app-service': {
    term: 'Azure App Service',
    definition: 'Managed web app hosting service for web apps, mobile backends, and REST APIs.',
    analogy: 'Like a fully managed web hosting service where you just upload your code and it runs. Azure handles servers, scaling, and patching.',
    example: 'Host web applications built with .NET, Node.js, Python, or Java.',
  },
  'cosmos-db': {
    term: 'Azure Cosmos DB',
    definition: 'Globally distributed, multi-model database service.',
    analogy: 'Like a database that lives everywhere at once. You can read and write data from any region in the world with single-digit millisecond latency, and it supports multiple data models.',
    example: 'Build global applications with low-latency access from anywhere.',
  },
  'azure-sql': {
    term: 'Azure SQL Database',
    definition: 'Managed SQL database service in the cloud.',
    analogy: 'Like RDS on AWS - a database administrator who manages backups, updates, and high availability for you. Just use your SQL database.',
    example: 'Run SQL Server databases without managing the underlying infrastructure.',
  },
  'blob-storage': {
    term: 'Azure Blob Storage',
    definition: 'Object storage for unstructured data like text, binary, and media files.',
    analogy: 'Like S3 on AWS - an infinite cloud drive for storing any type of file. Highly reliable, scalable, and accessible from anywhere.',
    example: 'Store images, videos, documents, backups, and application data.',
  },
  'azure-kubernetes-service': {
    term: 'Azure Kubernetes Service (AKS)',
    definition: 'Managed Kubernetes service for container orchestration.',
    analogy: 'Like EKS on AWS - managed Kubernetes where Azure handles the control plane. You deploy containers and AKS manages the cluster.',
    example: 'Run Kubernetes clusters without managing the master nodes.',
  },

  // ── GCP Services ───────────────────────────────────────────────────
  'compute-engine': {
    term: 'Compute Engine',
    definition: 'Infrastructure as a Service (IaaS) for running virtual machines.',
    analogy: 'Like EC2 on AWS - virtual computers you can rent in Google\'s data centers. You choose the specs, install software, and pay for what you use.',
    example: 'Run custom VMs with your choice of OS and applications.',
  },
  'cloud-run': {
    term: 'Cloud Run',
    definition: 'Serverless container platform that automatically scales containers.',
    analogy: 'Like a magic container platform where you just upload your container and it runs. Google handles scaling to zero, load balancing, and infrastructure.',
    example: 'Run containerized web applications without managing servers or clusters.',
  },
  bigquery: {
    term: 'BigQuery',
    definition: 'Serverless, highly scalable data warehouse for analytics.',
    analogy: 'Like a super-powered Excel that can analyze billions of rows in seconds. You write SQL queries and Google handles the infrastructure, scaling, and optimization.',
    example: 'Analyze petabytes of data for business intelligence and machine learning.',
  },
  'cloud-sql': {
    term: 'Cloud SQL',
    definition: 'Managed relational database service for MySQL, PostgreSQL, and SQL Server.',
    analogy: 'Like RDS on AWS - a managed database where Google handles backups, replication, and maintenance. You just use the database.',
    example: 'Run relational databases without managing the underlying infrastructure.',
  },
  'cloud-storage': {
    term: 'Cloud Storage',
    definition: 'Unified object storage for data of any size.',
    analogy: 'Like S3 on AWS - an infinite cloud drive for storing any type of file. Highly durable, scalable, and accessible from anywhere.',
    example: 'Store images, videos, backups, and application data.',
  },
  dataflow: {
    term: 'Dataflow',
    definition: 'Managed service for stream and batch data processing.',
    analogy: 'Like a data processing pipeline that can handle both streaming data (real-time) and batch data (historical). Google manages the infrastructure and scaling.',
    example: 'Process streaming data from Pub/Sub or batch data from BigQuery.',
  },
  'cloud-pubsub': {
    term: 'Cloud Pub/Sub',
    definition: 'Real-time messaging service for event-driven systems.',
    analogy: 'Like SNS + SQS combined - you can publish messages and subscribe to them. Great for decoupling services and building event-driven architectures.',
    example: 'Send messages between microservices or process event streams.',
  },

  // ── Additional ESG Terms ───────────────────────────────────────────
  'net-zero': {
    term: 'Net Zero',
    definition: 'Balancing greenhouse gas emissions with removal, resulting in no net emissions.',
    analogy: 'Like your bank account - you can spend money (emit carbon) but if you deposit the same amount (remove carbon), you end up at zero. Companies aim for this by reducing emissions and offsetting the rest.',
    example: 'A company achieves net zero by cutting emissions by 80% and buying carbon credits for the remaining 20%.',
  },
  sbti: {
    term: 'SBTi (Science Based Targets)',
    definition: 'Framework for companies to set emission reduction targets aligned with climate science.',
    analogy: 'Like getting a fitness plan from a doctor based on your health data, not just guessing. SBTi gives companies science-based targets that actually help achieve climate goals.',
    example: 'A company commits to reducing emissions by 50% by 2030, validated by SBTi.',
  },
  'greenhouse-gas': {
    term: 'Greenhouse Gas',
    definition: 'Gases that trap heat in the atmosphere, causing global warming (CO2, methane, nitrous oxide).',
    analogy: 'Like a blanket around the Earth - these gases let sunlight in but trap heat, making the planet warmer. The thicker the blanket, the hotter it gets.',
    example: 'Carbon dioxide from burning fossil fuels is the most common greenhouse gas.',
  },
  'carbon-offset': {
    term: 'Carbon Offset',
    definition: 'Reduction in greenhouse gas emissions used to compensate for emissions elsewhere.',
    analogy: 'Like paying someone else to exercise for you. If you can\'t reduce your own emissions, you pay for a project that reduces emissions elsewhere to balance it out.',
    example: 'A company buys offsets from a wind farm project to compensate for their factory emissions.',
  },
};

/** Get a glossary entry by term (case-insensitive) */
export function getGlossaryEntry(term: string): GlossaryEntry | null {
  const key = Object.keys(GLOSSARY).find(k => k.toLowerCase() === term.toLowerCase());
  return key ? GLOSSARY[key] : null;
}

/** Check if a term has a glossary entry */
export function hasGlossaryEntry(term: string): boolean {
  return !!getGlossaryEntry(term);
}

/** Find all glossary terms present in a text (case-insensitive) */
export function findGlossaryTerms(text: string): string[] {
  const found: string[] = [];
  for (const term of Object.keys(GLOSSARY)) {
    const regex = new RegExp(`\\b${term.replace(/[-_]/g, '[-_]?')}\\b`, 'gi');
    if (regex.test(text)) {
      found.push(term);
    }
  }
  return found;
}
