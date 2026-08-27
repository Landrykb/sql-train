// ─── BleepxCloud Sandbox — in-memory AWS simulator for the browser ─────────────
//
// This module provides a client-side state engine for cloud learning scenarios.
// No real AWS credentials or network calls are required: everything runs in
// memory using a deterministic simulator so learners can create, break, and
// fix resources safely.
//
// Supported services: S3, IAM, EC2, VPC, Lambda (simplified), DynamoDB (basic)

export type CloudService = 's3' | 'iam' | 'ec2' | 'vpc' | 'lambda' | 'dynamodb' | 'terraform' | 'security';

// ─── S3 ──────────────────────────────────────────────────────────────────────

export type S3Permission = 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';

export interface S3Object {
  key: string;
  size: number;
  contentType: string;
  lastModified: string;
  body: string; // base64 or CSV text
  owner: string;
}

export interface S3Bucket {
  name: string;
  region: string;
  createdAt: string;
  versioning: boolean;
  defaultEncryption: 'none' | 'AES256' | 'aws:kms';
  publicAccessBlock: boolean;
  blockPublicAcls: boolean;
  ignorePublicAcls: boolean;
  blockPublicPolicy: boolean;
  restrictPublicBuckets: boolean;
  acl: S3Permission;
  bucketPolicy: string; // JSON string
  objects: S3Object[];
}

export interface S3BucketPolicyStatement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Principal: string | { AWS: string } | string[];
  Action: string | string[];
  Resource: string | string[];
  Condition?: Record<string, any>;
}

export interface S3BucketPolicy {
  Version: string;
  Statement: S3BucketPolicyStatement[];
}

// ─── IAM ─────────────────────────────────────────────────────────────────────

export interface IAMPolicy {
  name: string;
  version: string;
  statements: IAMPolicyStatement[];
  description?: string;
  attachedTo: string[]; // user or role ARNs
}

export interface IAMPolicyStatement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Action: string | string[];
  Resource: string | string[];
  Condition?: Record<string, any>;
}

export interface IAMUser {
  name: string;
  arn: string;
  createdAt: string;
  attachedPolicies: string[];
  accessKeys: { keyId: string; active: boolean }[];
  groups: string[];
  tags: Record<string, string>;
}

export interface IAMRole {
  name: string;
  arn: string;
  assumeRolePolicy: string;
  attachedPolicies: string[];
}

// ─── EC2 ─────────────────────────────────────────────────────────────────────

export type EC2InstanceState = 'pending' | 'running' | 'stopping' | 'stopped' | 'terminated';
export type EC2InstanceFamily = 't3' | 'm5' | 'c6g' | 'r6g' | 'm6i' | 't4g';

export interface EC2Instance {
  instanceId: string;
  name: string;
  ami: string;
  family: EC2InstanceFamily;
  size: string; // e.g. t3.micro
  vCpu: number;
  ramGiB: number;
  region: string;
  state: EC2InstanceState;
  subnetId?: string;
  securityGroups: string[];
  keyPair: string;
  userData: string;
  tags: Record<string, string>;
  launchTime: string;
  hourlyRate: number;
  storageGiB: number;
}

// ─── VPC / Networking ────────────────────────────────────────────────────────

export interface VPC {
  vpcId: string;
  cidr: string;
  region: string;
  name: string;
  isDefault: boolean;
  enableDnsHostnames: boolean;
  enableDnsSupport: boolean;
}

export interface Subnet {
  subnetId: string;
  vpcId: string;
  cidr: string;
  availabilityZone: string;
  mapPublicIpOnLaunch: boolean;
  name: string;
  isPublic: boolean;
}

export interface SecurityGroup {
  groupId: string;
  vpcId: string;
  name: string;
  description: string;
  inbound: SecurityGroupRule[];
  outbound: SecurityGroupRule[];
}

export interface SecurityGroupRule {
  protocol: 'tcp' | 'udp' | 'icmp' | '-1';
  fromPort: number;
  toPort: number;
  source: string; // CIDR or SG id or '0.0.0.0/0'
  description?: string;
}

export interface RouteTable {
  routeTableId: string;
  vpcId: string;
  name: string;
  routes: Route[];
  associatedSubnets: string[];
}

export interface Route {
  destinationCidr: string;
  target: string; // 'local', 'igw-xxx', 'nat-xxx', 'pcx-xxx'
}

export interface InternetGateway {
  igwId: string;
  vpcId: string;
  name: string;
}

// ─── DynamoDB ────────────────────────────────────────────────────────────────

export interface DynamoDBAttribute {
  name: string;
  type: 'S' | 'N' | 'B' | 'BOOL' | 'NULL' | 'L' | 'M';
}

export interface DynamoDBItem {
  pk: string;
  attributes: Record<string, any>;
}

export interface DynamoDBTable {
  tableName: string;
  partitionKey: string;
  sortKey?: string;
  billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
  readCapacity?: number;
  writeCapacity?: number;
  items: DynamoDBItem[];
  streamEnabled: boolean;
  pointInTimeRecovery: boolean;
  encrypted: boolean;
}

// ─── Lambda ──────────────────────────────────────────────────────────────────

export interface LambdaFunction {
  functionName: string;
  runtime: string;
  handler: string;
  roleArn: string;
  code: string;
  memoryMb: number;
  timeout: number;
  environment: Record<string, string>;
  vpcConfig?: { subnetIds: string[]; securityGroupIds: string[] };
}

// ─── Sandbox Root State ──────────────────────────────────────────────────────

export interface CloudSandboxState {
  activeRegion: string;
  accountId: string;
  s3: {
    buckets: Record<string, S3Bucket>;
  };
  iam: {
    users: Record<string, IAMUser>;
    roles: Record<string, IAMRole>;
    policies: Record<string, IAMPolicy>;
    groups: Record<string, { name: string; attachedPolicies: string[]; users: string[] }>;
  };
  ec2: {
    instances: Record<string, EC2Instance>;
    keyPairs: Record<string, { name: string; fingerprint: string }>;
    amis: Record<string, { amiId: string; name: string; os: string; rootVolumeGiB: number }>;
  };
  vpc: {
    vpcs: Record<string, VPC>;
    subnets: Record<string, Subnet>;
    securityGroups: Record<string, SecurityGroup>;
    routeTables: Record<string, RouteTable>;
    internetGateways: Record<string, InternetGateway>;
  };
  lambda: {
    functions: Record<string, LambdaFunction>;
  };
  dynamodb: {
    tables: Record<string, DynamoDBTable>;
  };
  events: CloudEvent[];
}

export interface CloudEvent {
  timestamp: string;
  service: CloudService;
  action: string;
  resource: string;
  status: 'success' | 'failure' | 'info';
  message: string;
}

// ─── Scenario Configuration ──────────────────────────────────────────────────

export interface CloudScenarioGoal {
  id: string;
  description: string;
  check: (state: CloudSandboxState) => boolean;
  explanation?: string; // shown when achieved
}

export interface CloudScenarioCheck {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error';
  check: (state: CloudSandboxState) => boolean;
}

// ─── Default / Preset State ──────────────────────────────────────────────────

export function createEmptySandboxState(): CloudSandboxState {
  return {
    activeRegion: 'us-east-1',
    accountId: '123456789012',
    s3: { buckets: {} },
    iam: { users: {}, roles: {}, policies: {}, groups: {} },
    ec2: { instances: {}, keyPairs: {}, amis: defaultAMIs() },
    vpc: { vpcs: {}, subnets: {}, securityGroups: {}, routeTables: {}, internetGateways: {} },
    lambda: { functions: {} },
    dynamodb: { tables: {} },
    events: [],
  };
}

export function defaultAMIs() {
  return {
    'ami-amazon-linux-2023': {
      amiId: 'ami-amazon-linux-2023',
      name: 'Amazon Linux 2023',
      os: 'linux',
      rootVolumeGiB: 8,
    },
    'ami-ubuntu-22-lts': {
      amiId: 'ami-ubuntu-22-lts',
      name: 'Ubuntu Server 22.04 LTS',
      os: 'linux',
      rootVolumeGiB: 8,
    },
    'ami-windows-2022': {
      amiId: 'ami-windows-2022',
      name: 'Windows Server 2022 Base',
      os: 'windows',
      rootVolumeGiB: 30,
    },
  };
}

// ─── Persistent Storage in the Browser ───────────────────────────────────────

const SANDBOX_STORAGE_KEY = 'bleepx-cloud-sandbox-v1';

export function saveSandboxState(state: CloudSandboxState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function loadSandboxState(): CloudSandboxState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CloudSandboxState) : null;
  } catch {
    return null;
  }
}

export function clearSandboxState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SANDBOX_STORAGE_KEY);
}

// ─── Pre-Loaded Real-World Scenario: BleepxBank ──────────────────────────────

export function createBleepxBankScenario(): CloudSandboxState {
  const state = createEmptySandboxState();
  const { accountId } = state;

  // Real-ish anonymized transaction dataset
  const transactionsCsv = [
    'transaction_id,timestamp,account_id,amount_usd,merchant,category,status',
    'txn-1001,2026-01-15T08:23:11Z,acc-4001,9.99,LocalCoffee,Food,completed',
    'txn-1002,2026-01-15T09:01:45Z,acc-4002,129.00,CloudMart,Retail,completed',
    'txn-1003,2026-01-15T09:14:22Z,acc-4003,12.50,CityParking,Transport,completed',
    'txn-1004,2026-01-15T10:05:00Z,acc-4004,2500.00,OffshoreWire,Transfer,flagged',
    'txn-1005,2026-01-15T10:48:19Z,acc-4001,45.67,PetCare,Services,completed',
    'txn-1006,2026-01-15T11:12:03Z,acc-4002,899.00,OnlineElectronics,Retail,completed',
    'txn-1007,2026-01-15T11:30:55Z,acc-4005,3.50,MetroCard,Transport,completed',
    'txn-1008,2026-01-15T12:01:10Z,acc-4006,150.00,PharmaPlus,Healthcare,completed',
    'txn-1009,2026-01-15T12:45:38Z,acc-4007,25000.00,CryptoExchange,Transfer,flagged',
    'txn-1010,2026-01-15T13:22:04Z,acc-4001,23.00,BookStore,Education,completed',
  ].join('\n');

  const customersCsv = [
    'customer_id,region,tier,signup_date,kyc_verified',
    'c-701,us-east-1,standard,2024-03-12,true',
    'c-702,us-east-1,premium,2023-08-01,true',
    'c-703,us-west-2,standard,2025-01-20,false',
    'c-704,eu-west-1,premium,2022-11-05,true',
    'c-705,us-east-1,standard,2025-09-18,false',
  ].join('\n');

  const bucket: S3Bucket = {
    name: 'bleepx-bank-data-lake',
    region: 'us-east-1',
    createdAt: new Date().toISOString(),
    versioning: true,
    defaultEncryption: 'aws:kms',
    publicAccessBlock: true,
    blockPublicAcls: true,
    ignorePublicAcls: true,
    blockPublicPolicy: true,
    restrictPublicBuckets: true,
    acl: 'private',
    bucketPolicy: '',
    objects: [
      {
        key: 'raw/transactions/2026-01-15.csv',
        size: transactionsCsv.length,
        contentType: 'text/csv',
        lastModified: new Date().toISOString(),
        body: transactionsCsv,
        owner: `arn:aws:iam::${accountId}:role/etl-service-role`,
      },
      {
        key: 'raw/customers/2026-01-15.csv',
        size: customersCsv.length,
        contentType: 'text/csv',
        lastModified: new Date().toISOString(),
        body: customersCsv,
        owner: `arn:aws:iam::${accountId}:role/etl-service-role`,
      },
    ],
  };

  const customerTable: DynamoDBTable = {
    tableName: 'BleepxBankCustomers',
    partitionKey: 'customer_id',
    sortKey: 'region',
    billingMode: 'PAY_PER_REQUEST',
    items: [
      { pk: 'c-701', attributes: { customer_id: 'c-701', region: 'us-east-1', tier: 'standard', kyc_verified: true, balance_usd: 1240.5 } },
      { pk: 'c-702', attributes: { customer_id: 'c-702', region: 'us-east-1', tier: 'premium', kyc_verified: true, balance_usd: 45200.0 } },
      { pk: 'c-703', attributes: { customer_id: 'c-703', region: 'us-west-2', tier: 'standard', kyc_verified: false, balance_usd: 85.0 } },
      { pk: 'c-704', attributes: { customer_id: 'c-704', region: 'eu-west-1', tier: 'premium', kyc_verified: true, balance_usd: 18900.0 } },
    ],
    streamEnabled: false,
    pointInTimeRecovery: true,
    encrypted: true,
  };

  const etlRole: IAMRole = {
    name: 'etl-service-role',
    arn: `arn:aws:iam::${accountId}:role/etl-service-role`,
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }],
    }, null, 2),
    attachedPolicies: ['ETLDataLakeAccess'],
  };

  const etlPolicy: IAMPolicy = {
    name: 'ETLDataLakeAccess',
    version: '2012-10-17',
    description: 'Allow ETL service to read transactions and write to customers table',
    statements: [
      {
        Effect: 'Allow',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::bleepx-bank-data-lake/raw/*`],
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:PutItem', 'dynamodb:GetItem', 'dynamodb:Query'],
        Resource: [`arn:aws:dynamodb:us-east-1:${accountId}:table/BleepxBankCustomers`],
      },
    ],
    attachedTo: [etlRole.arn],
  };

  const fraudLambda: LambdaFunction = {
    functionName: 'flag-large-transfers',
    runtime: 'python3.12',
    handler: 'index.handler',
    roleArn: etlRole.arn,
    code: `import json

def handler(event, context):
    records = event.get('Records', [])
    flagged = []
    for r in records:
        amount = float(r.get('amount_usd', 0))
        if amount > 10000:
            flagged.append({
                'transaction_id': r.get('transaction_id'),
                'reason': 'Amount exceeds $10,000 threshold'
            })
    return {
        'statusCode': 200,
        'body': json.dumps({
            'flagged_count': len(flagged),
            'flagged': flagged
        })
    }`,
    memoryMb: 128,
    timeout: 30,
    environment: { THRESHOLD_USD: '10000', LOG_LEVEL: 'INFO' },
  };

  const publicWebsiteBucket: S3Bucket = {
    name: 'bleepx-bank-website',
    region: 'us-east-1',
    createdAt: new Date().toISOString(),
    versioning: false,
    defaultEncryption: 'none',
    publicAccessBlock: false,
    blockPublicAcls: false,
    ignorePublicAcls: false,
    blockPublicPolicy: false,
    restrictPublicBuckets: false,
    acl: 'public-read',
    bucketPolicy: '',
    objects: [{ key: 'index.html', size: 348, contentType: 'text/html', lastModified: new Date().toISOString(), body: '<h1>BleepxBank</h1>', owner: `arn:aws:iam::${accountId}:user/web-admin` }],
  };

  // Intentionally insecure starter user so learners can fix it
  const webAdmin: IAMUser = {
    name: 'web-admin',
    arn: `arn:aws:iam::${accountId}:user/web-admin`,
    createdAt: new Date().toISOString(),
    attachedPolicies: ['PowerUserAccess'],
    accessKeys: [{ keyId: 'AKIAIOSFODNN7EXAMPLE', active: true }],
    groups: [],
    tags: { Department: 'Engineering' },
  };

  const powerUserPolicy: IAMPolicy = {
    name: 'PowerUserAccess',
    version: '2012-10-17',
    description: 'Dangerously broad — learners should replace with least-privilege',
    statements: [{ Effect: 'Allow', Action: ['*'], Resource: ['*'] }],
    attachedTo: [webAdmin.arn],
  };

  const webSg: SecurityGroup = {
    groupId: 'sg-web-01',
    vpcId: 'vpc-default',
    name: 'web-sg',
    description: 'Web server security group',
    inbound: [
      { protocol: 'tcp', fromPort: 80, toPort: 80, source: '0.0.0.0/0', description: 'HTTP from anywhere' },
      { protocol: 'tcp', fromPort: 22, toPort: 22, source: '0.0.0.0/0', description: 'SSH from anywhere' },
    ],
    outbound: [{ protocol: '-1', fromPort: 0, toPort: 65535, source: '0.0.0.0/0', description: 'Allow all outbound' }],
  };

  return {
    ...state,
    s3: { buckets: { 'bleepx-bank-data-lake': bucket, 'bleepx-bank-website': publicWebsiteBucket } },
    dynamodb: { tables: { 'BleepxBankCustomers': customerTable } },
    iam: {
      ...state.iam,
      users: { 'web-admin': webAdmin },
      roles: { 'etl-service-role': etlRole },
      policies: { 'ETLDataLakeAccess': etlPolicy, 'PowerUserAccess': powerUserPolicy },
    },
    vpc: { ...state.vpc, securityGroups: { 'sg-web-01': webSg } },
    lambda: { functions: { 'flag-large-transfers': fraudLambda } },
  };
}
