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
