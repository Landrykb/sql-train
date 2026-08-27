// ─── BleepxCloud Sandbox — in-memory AWS simulator for the browser ─────────────
//
// This module provides a client-side state engine for cloud learning scenarios.
// No real AWS credentials or network calls are required: everything runs in
// memory using a deterministic simulator so learners can create, break, and
// fix resources safely.
//
// Supported services: S3, IAM, EC2, VPC, Lambda (simplified), DynamoDB (basic)

export type CloudService = 's3' | 'iam' | 'ec2' | 'vpc' | 'lambda' | 'dynamodb';

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
