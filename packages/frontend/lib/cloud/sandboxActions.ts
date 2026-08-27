// ─── BleepxCloud Sandbox actions — deterministic, client-side AWS mutations ─────

import type {
  CloudSandboxState,
  S3Bucket,
  S3Object,
  S3BucketPolicy,
  IAMUser,
  IAMRole,
  IAMPolicy,
  IAMPolicyStatement,
  EC2Instance,
  EC2InstanceFamily,
  VPC,
  Subnet,
  SecurityGroup,
  SecurityGroupRule,
  RouteTable,
  Route,
  InternetGateway,
  CloudEvent,
  CloudService,
} from './sandbox';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function event(
  state: CloudSandboxState,
  service: CloudService,
  action: string,
  resource: string,
  status: CloudEvent['status'],
  message: string
): CloudSandboxState {
  return {
    ...state,
    events: [
      ...state.events,
      { timestamp: now(), service, action, resource, status, message },
    ].slice(-200),
  };
}

// ─── S3 actions ──────────────────────────────────────────────────────────────

export function createS3Bucket(
  state: CloudSandboxState,
  bucketName: string,
  region: string = state.activeRegion
): CloudSandboxState {
  if (state.s3.buckets[bucketName]) {
    return event(state, 's3', 'CreateBucket', bucketName, 'failure', `Bucket already exists: ${bucketName}`);
  }
  const bucket: S3Bucket = {
    name: bucketName,
    region,
    createdAt: now(),
    versioning: false,
    defaultEncryption: 'none',
    publicAccessBlock: true,
    blockPublicAcls: true,
    ignorePublicAcls: true,
    blockPublicPolicy: true,
    restrictPublicBuckets: true,
    acl: 'private',
    bucketPolicy: '',
    objects: [],
  };
  return event(
    { ...state, s3: { ...state.s3, buckets: { ...state.s3.buckets, [bucketName]: bucket } } },
    's3',
    'CreateBucket',
    bucketName,
    'success',
    `Created bucket ${bucketName} in ${region}`
  );
}

export function deleteS3Bucket(state: CloudSandboxState, bucketName: string): CloudSandboxState {
  if (!state.s3.buckets[bucketName]) {
    return event(state, 's3', 'DeleteBucket', bucketName, 'failure', `Bucket does not exist: ${bucketName}`);
  }
  const { [bucketName]: _removed, ...buckets } = state.s3.buckets;
  return event(
    { ...state, s3: { ...state.s3, buckets } },
    's3',
    'DeleteBucket',
    bucketName,
    'success',
    `Deleted bucket ${bucketName}`
  );
}

export function putS3Object(
  state: CloudSandboxState,
  bucketName: string,
  key: string,
  body: string,
  contentType: string = 'text/csv',
  owner: string = `arn:aws:iam::${state.accountId}:user/admin`
): CloudSandboxState {
  const bucket = state.s3.buckets[bucketName];
  if (!bucket) {
    return event(state, 's3', 'PutObject', `${bucketName}/${key}`, 'failure', `Bucket not found: ${bucketName}`);
  }
  const existing = bucket.objects.find((o) => o.key === key);
  const obj: S3Object = {
    key,
    size: new Blob([body]).size,
    contentType,
    lastModified: now(),
    body,
    owner,
  };
  const objects = existing
    ? bucket.objects.map((o) => (o.key === key ? obj : o))
    : [...bucket.objects, obj];
  return event(
    {
      ...state,
      s3: { ...state.s3, buckets: { ...state.s3.buckets, [bucketName]: { ...bucket, objects } } },
    },
    's3',
    'PutObject',
    `${bucketName}/${key}`,
    'success',
    `Uploaded object ${key} to ${bucketName} (${obj.size} bytes)`
  );
}

export function deleteS3Object(state: CloudSandboxState, bucketName: string, key: string): CloudSandboxState {
  const bucket = state.s3.buckets[bucketName];
  if (!bucket) return event(state, 's3', 'DeleteObject', `${bucketName}/${key}`, 'failure', `Bucket not found`);
  const objects = bucket.objects.filter((o) => o.key !== key);
  return event(
    {
      ...state,
      s3: { ...state.s3, buckets: { ...state.s3.buckets, [bucketName]: { ...bucket, objects } } },
    },
    's3',
    'DeleteObject',
    `${bucketName}/${key}`,
    'success',
    `Deleted object ${key} from ${bucketName}`
  );
}

export function setS3BucketPolicy(
  state: CloudSandboxState,
  bucketName: string,
  policy: S3BucketPolicy | null
): CloudSandboxState {
  const bucket = state.s3.buckets[bucketName];
  if (!bucket) return event(state, 's3', 'PutBucketPolicy', bucketName, 'failure', `Bucket not found`);
  const policyString = policy ? JSON.stringify(policy, null, 2) : '';
  return event(
    {
      ...state,
      s3: { ...state.s3, buckets: { ...state.s3.buckets, [bucketName]: { ...bucket, bucketPolicy: policyString } } },
    },
    's3',
    'PutBucketPolicy',
    bucketName,
    'success',
    policy ? `Set bucket policy for ${bucketName}` : `Removed bucket policy for ${bucketName}`
  );
}

export function setS3PublicAccess(
  state: CloudSandboxState,
  bucketName: string,
  block: boolean
): CloudSandboxState {
  const bucket = state.s3.buckets[bucketName];
  if (!bucket) return event(state, 's3', 'PutPublicAccessBlock', bucketName, 'failure', `Bucket not found`);
  return event(
    {
      ...state,
      s3: {
        ...state.s3,
        buckets: {
          ...state.s3.buckets,
          [bucketName]: {
            ...bucket,
            publicAccessBlock: block,
            blockPublicAcls: block,
            ignorePublicAcls: block,
            blockPublicPolicy: block,
            restrictPublicBuckets: block,
          },
        },
      },
    },
    's3',
    'PutPublicAccessBlock',
    bucketName,
    'success',
    `Public access block ${block ? 'enabled' : 'disabled'} for ${bucketName}`
  );
}

export function setS3Encryption(
  state: CloudSandboxState,
  bucketName: string,
  encryption: S3Bucket['defaultEncryption']
): CloudSandboxState {
  const bucket = state.s3.buckets[bucketName];
  if (!bucket) return event(state, 's3', 'PutBucketEncryption', bucketName, 'failure', `Bucket not found`);
  return event(
    {
      ...state,
      s3: { ...state.s3, buckets: { ...state.s3.buckets, [bucketName]: { ...bucket, defaultEncryption: encryption } } },
    },
    's3',
    'PutBucketEncryption',
    bucketName,
    'success',
    `Default encryption set to ${encryption} for ${bucketName}`
  );
}

// ─── IAM actions ─────────────────────────────────────────────────────────────

export function createIAMUser(state: CloudSandboxState, userName: string): CloudSandboxState {
  if (state.iam.users[userName]) {
    return event(state, 'iam', 'CreateUser', userName, 'failure', `User already exists: ${userName}`);
  }
  const user: IAMUser = {
    name: userName,
    arn: `arn:aws:iam::${state.accountId}:user/${userName}`,
    createdAt: now(),
    attachedPolicies: [],
    accessKeys: [],
    groups: [],
    tags: {},
  };
  return event(
    { ...state, iam: { ...state.iam, users: { ...state.iam.users, [userName]: user } } },
    'iam',
    'CreateUser',
    userName,
    'success',
    `Created IAM user ${userName}`
  );
}

export function createIAMPolicy(
  state: CloudSandboxState,
  policyName: string,
  statements: IAMPolicyStatement[],
  description: string = ''
): CloudSandboxState {
  if (state.iam.policies[policyName]) {
    return event(state, 'iam', 'CreatePolicy', policyName, 'failure', `Policy already exists: ${policyName}`);
  }
  const policy: IAMPolicy = {
    name: policyName,
    version: '2012-10-17',
    description,
    statements,
    attachedTo: [],
  };
  return event(
    { ...state, iam: { ...state.iam, policies: { ...state.iam.policies, [policyName]: policy } } },
    'iam',
    'CreatePolicy',
    policyName,
    'success',
    `Created IAM policy ${policyName}`
  );
}

export function attachIAMPolicy(
  state: CloudSandboxState,
  userName: string,
  policyName: string
): CloudSandboxState {
  const user = state.iam.users[userName];
  const policy = state.iam.policies[policyName];
  if (!user || !policy) {
    return event(state, 'iam', 'AttachUserPolicy', `${userName}/${policyName}`, 'failure', `User or policy not found`);
  }
  if (user.attachedPolicies.includes(policyName)) {
    return event(state, 'iam', 'AttachUserPolicy', `${userName}/${policyName}`, 'info', `Policy already attached`);
  }
  return event(
    {
      ...state,
      iam: {
        ...state.iam,
        users: {
          ...state.iam.users,
          [userName]: { ...user, attachedPolicies: [...user.attachedPolicies, policyName] },
        },
        policies: {
          ...state.iam.policies,
          [policyName]: { ...policy, attachedTo: [...policy.attachedTo, user.arn] },
        },
      },
    },
    'iam',
    'AttachUserPolicy',
    `${userName}/${policyName}`,
    'success',
    `Attached ${policyName} to ${userName}`
  );
}

// ─── EC2 actions ─────────────────────────────────────────────────────────────

export const EC2_INSTANCE_SIZES: Record<EC2InstanceFamily, string[]> = {
  t3: ['t3.nano', 't3.micro', 't3.small', 't3.medium', 't3.large'],
  m5: ['m5.large', 'm5.xlarge', 'm5.2xlarge'],
  c6g: ['c6g.medium', 'c6g.large', 'c6g.xlarge'],
  r6g: ['r6g.large', 'r6g.xlarge', 'r6g.2xlarge'],
  m6i: ['m6i.large', 'm6i.xlarge', 'm6i.2xlarge'],
  t4g: ['t4g.nano', 't4g.micro', 't4g.small'],
};

export const EC2_SIZE_SPECS: Record<string, { vCpu: number; ramGiB: number; hourlyRate: number }> = {
  't3.nano': { vCpu: 2, ramGiB: 0.5, hourlyRate: 0.0052 },
  't3.micro': { vCpu: 2, ramGiB: 1, hourlyRate: 0.0104 },
  't3.small': { vCpu: 2, ramGiB: 2, hourlyRate: 0.0208 },
  't3.medium': { vCpu: 2, ramGiB: 4, hourlyRate: 0.0416 },
  't3.large': { vCpu: 2, ramGiB: 8, hourlyRate: 0.0832 },
  'm5.large': { vCpu: 2, ramGiB: 8, hourlyRate: 0.096 },
  'm5.xlarge': { vCpu: 4, ramGiB: 16, hourlyRate: 0.192 },
  'm5.2xlarge': { vCpu: 8, ramGiB: 32, hourlyRate: 0.384 },
  'c6g.medium': { vCpu: 1, ramGiB: 2, hourlyRate: 0.034 },
  'c6g.large': { vCpu: 2, ramGiB: 4, hourlyRate: 0.068 },
  'c6g.xlarge': { vCpu: 4, ramGiB: 8, hourlyRate: 0.136 },
  'r6g.large': { vCpu: 2, ramGiB: 16, hourlyRate: 0.1008 },
  'r6g.xlarge': { vCpu: 4, ramGiB: 32, hourlyRate: 0.2016 },
  'r6g.2xlarge': { vCpu: 8, ramGiB: 64, hourlyRate: 0.4032 },
  'm6i.large': { vCpu: 2, ramGiB: 8, hourlyRate: 0.0864 },
  'm6i.xlarge': { vCpu: 4, ramGiB: 16, hourlyRate: 0.1728 },
  'm6i.2xlarge': { vCpu: 8, ramGiB: 32, hourlyRate: 0.3456 },
  't4g.nano': { vCpu: 2, ramGiB: 0.5, hourlyRate: 0.0042 },
  't4g.micro': { vCpu: 2, ramGiB: 1, hourlyRate: 0.0084 },
  't4g.small': { vCpu: 2, ramGiB: 2, hourlyRate: 0.0168 },
};

export function launchEC2Instance(
  state: CloudSandboxState,
  params: {
    name: string;
    ami: string;
    size: string;
    subnetId?: string;
    securityGroups?: string[];
    keyPair?: string;
    userData?: string;
    storageGiB?: number;
    region?: string;
  }
): CloudSandboxState {
  const ami = state.ec2.amis[params.ami];
  if (!ami) {
    return event(state, 'ec2', 'RunInstances', params.name, 'failure', `AMI not found: ${params.ami}`);
  }
  const specs = EC2_SIZE_SPECS[params.size];
  if (!specs) {
    return event(state, 'ec2', 'RunInstances', params.name, 'failure', `Unknown instance size: ${params.size}`);
  }
  const family = Object.keys(EC2_INSTANCE_SIZES).find((f) => params.size.startsWith(f)) as EC2InstanceFamily;
  const id = makeId('i');
  const instance: EC2Instance = {
    instanceId: id,
    name: params.name,
    ami: params.ami,
    family: family || 't3',
    size: params.size,
    vCpu: specs.vCpu,
    ramGiB: specs.ramGiB,
    region: params.region || state.activeRegion,
    state: 'running',
    subnetId: params.subnetId,
    securityGroups: params.securityGroups || [],
    keyPair: params.keyPair || '',
    userData: params.userData || '',
    tags: { Name: params.name },
    launchTime: now(),
    hourlyRate: specs.hourlyRate,
    storageGiB: params.storageGiB || ami.rootVolumeGiB,
  };
  return event(
    { ...state, ec2: { ...state.ec2, instances: { ...state.ec2.instances, [id]: instance } } },
    'ec2',
    'RunInstances',
    id,
    'success',
    `Launched instance ${id} (${params.size})`
  );
}

export function stopEC2Instance(state: CloudSandboxState, instanceId: string): CloudSandboxState {
  const instance = state.ec2.instances[instanceId];
  if (!instance) return event(state, 'ec2', 'StopInstances', instanceId, 'failure', 'Instance not found');
  return event(
    { ...state, ec2: { ...state.ec2, instances: { ...state.ec2.instances, [instanceId]: { ...instance, state: 'stopped' } } } },
    'ec2',
    'StopInstances',
    instanceId,
    'success',
    `Stopped instance ${instanceId}`
  );
}

export function terminateEC2Instance(state: CloudSandboxState, instanceId: string): CloudSandboxState {
  const instance = state.ec2.instances[instanceId];
  if (!instance) return event(state, 'ec2', 'TerminateInstances', instanceId, 'failure', 'Instance not found');
  return event(
    { ...state, ec2: { ...state.ec2, instances: { ...state.ec2.instances, [instanceId]: { ...instance, state: 'terminated' } } } },
    'ec2',
    'TerminateInstances',
    instanceId,
    'success',
    `Terminated instance ${instanceId}`
  );
}

// ─── VPC / Networking actions ────────────────────────────────────────────────

export function createVPC(
  state: CloudSandboxState,
  cidr: string,
  name: string = 'vpc',
  region: string = state.activeRegion
): CloudSandboxState {
  const vpcId = makeId('vpc');
  const vpc: VPC = {
    vpcId,
    cidr,
    region,
    name,
    isDefault: false,
    enableDnsHostnames: true,
    enableDnsSupport: true,
  };
  return event(
    { ...state, vpc: { ...state.vpc, vpcs: { ...state.vpc.vpcs, [vpcId]: vpc } } },
    'vpc',
    'CreateVpc',
    vpcId,
    'success',
    `Created VPC ${vpcId} (${cidr})`
  );
}

export function createSubnet(
  state: CloudSandboxState,
  vpcId: string,
  cidr: string,
  availabilityZone: string,
  isPublic: boolean,
  name: string = 'subnet'
): CloudSandboxState {
  const subnetId = makeId('subnet');
  const subnet: Subnet = {
    subnetId,
    vpcId,
    cidr,
    availabilityZone,
    mapPublicIpOnLaunch: isPublic,
    name,
    isPublic,
  };
  return event(
    { ...state, vpc: { ...state.vpc, subnets: { ...state.vpc.subnets, [subnetId]: subnet } } },
    'vpc',
    'CreateSubnet',
    subnetId,
    'success',
    `Created subnet ${subnetId} (${cidr})`
  );
}

export function createSecurityGroup(
  state: CloudSandboxState,
  vpcId: string,
  name: string,
  description: string
): CloudSandboxState {
  const groupId = makeId('sg');
  const sg: SecurityGroup = {
    groupId,
    vpcId,
    name,
    description,
    inbound: [],
    outbound: [
      { protocol: '-1', fromPort: 0, toPort: 65535, source: '0.0.0.0/0', description: 'Allow all outbound' },
    ],
  };
  return event(
    { ...state, vpc: { ...state.vpc, securityGroups: { ...state.vpc.securityGroups, [groupId]: sg } } },
    'vpc',
    'CreateSecurityGroup',
    groupId,
    'success',
    `Created security group ${groupId}`
  );
}

export function addSecurityGroupRule(
  state: CloudSandboxState,
  groupId: string,
  rule: SecurityGroupRule,
  isIngress: boolean = true
): CloudSandboxState {
  const sg = state.vpc.securityGroups[groupId];
  if (!sg) return event(state, 'vpc', 'AuthorizeSecurityGroupIngress', groupId, 'failure', 'Security group not found');
  return event(
    {
      ...state,
      vpc: {
        ...state.vpc,
        securityGroups: {
          ...state.vpc.securityGroups,
          [groupId]: {
            ...sg,
            [isIngress ? 'inbound' : 'outbound']: [...sg[isIngress ? 'inbound' : 'outbound'], rule],
          },
        },
      },
    },
    'vpc',
    isIngress ? 'AuthorizeSecurityGroupIngress' : 'AuthorizeSecurityGroupEgress',
    groupId,
    'success',
    `Added ${isIngress ? 'inbound' : 'outbound'} rule to ${groupId}`
  );
}

export function createInternetGateway(state: CloudSandboxState, vpcId: string, name: string = 'igw'): CloudSandboxState {
  const igwId = makeId('igw');
  const igw: InternetGateway = { igwId, vpcId, name };
  return event(
    { ...state, vpc: { ...state.vpc, internetGateways: { ...state.vpc.internetGateways, [igwId]: igw } } },
    'vpc',
    'CreateInternetGateway',
    igwId,
    'success',
    `Created and attached internet gateway ${igwId}`
  );
}

export function createRouteTable(
  state: CloudSandboxState,
  vpcId: string,
  name: string = 'rtb',
  routes: Route[] = []
): CloudSandboxState {
  const routeTableId = makeId('rtb');
  const rt: RouteTable = {
    routeTableId,
    vpcId,
    name,
    routes,
    associatedSubnets: [],
  };
  return event(
    { ...state, vpc: { ...state.vpc, routeTables: { ...state.vpc.routeTables, [routeTableId]: rt } } },
    'vpc',
    'CreateRouteTable',
    routeTableId,
    'success',
    `Created route table ${routeTableId}`
  );
}

export function associateRouteTable(
  state: CloudSandboxState,
  routeTableId: string,
  subnetId: string
): CloudSandboxState {
  const rt = state.vpc.routeTables[routeTableId];
  if (!rt) return event(state, 'vpc', 'AssociateRouteTable', routeTableId, 'failure', 'Route table not found');
  return event(
    {
      ...state,
      vpc: {
        ...state.vpc,
        routeTables: {
          ...state.vpc.routeTables,
          [routeTableId]: { ...rt, associatedSubnets: [...rt.associatedSubnets, subnetId] },
        },
      },
    },
    'vpc',
    'AssociateRouteTable',
    routeTableId,
    'success',
    `Associated route table ${routeTableId} with subnet ${subnetId}`
  );
}

// ─── Permission Simulation ───────────────────────────────────────────────────

export function canUserAccessS3(
  state: CloudSandboxState,
  userName: string,
  bucketName: string,
  action: string,
  resource: string = `arn:aws:s3:::${bucketName}/*`
): { allowed: boolean; reason: string } {
  const user = state.iam.users[userName];
  if (!user) return { allowed: false, reason: 'User does not exist' };

  const bucket = state.s3.buckets[bucketName];
  if (!bucket) return { allowed: false, reason: 'Bucket does not exist' };

  // 1. Explicit deny in bucket policy?
  try {
    if (bucket.bucketPolicy) {
      const policy: { Statement: { Effect: string; Action: string | string[]; Resource: string | string[]; Principal?: any; Condition?: any }[] } = JSON.parse(bucket.bucketPolicy);
      for (const stmt of policy.Statement) {
        if (stmt.Effect === 'Deny' && matchesAction(action, stmt.Action) && matchesResource(resource, stmt.Resource)) {
          return { allowed: false, reason: 'Denied by bucket policy' };
        }
      }
    }
  } catch {}

  // 2. Check user attached policies for allow
  for (const policyName of user.attachedPolicies) {
    const policy = state.iam.policies[policyName];
    if (!policy) continue;
    for (const stmt of policy.statements) {
      if (stmt.Effect === 'Allow' && matchesAction(action, stmt.Action) && matchesResource(resource, stmt.Resource)) {
        return { allowed: true, reason: `Allowed by IAM policy ${policyName}` };
      }
    }
  }

  return { allowed: false, reason: 'No IAM policy allows this action' };
}

function matchesAction(requested: string, pattern: string | string[]): boolean {
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  return patterns.some((p) => {
    if (p === '*') return true;
    if (p === requested) return true;
    if (p.endsWith(':*')) {
      const prefix = p.slice(0, -2);
      return requested.startsWith(prefix + ':') || requested === prefix;
    }
    return false;
  });
}

function matchesResource(requested: string, pattern: string | string[]): boolean {
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  return patterns.some((p) => {
    if (p === '*') return true;
    if (p === requested) return true;
    if (p.endsWith('/*') && requested.startsWith(p.slice(0, -1))) return true;
    if (p.includes('*')) {
      const re = new RegExp('^' + p.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return re.test(requested);
    }
    return false;
  });
}

// ─── DynamoDB actions ────────────────────────────────────────────────────────

export function createDynamoDBTable(
  state: CloudSandboxState,
  tableName: string,
  partitionKey: string,
  sortKey?: string
): CloudSandboxState {
  if (state.dynamodb.tables[tableName]) {
    return event(state, 'dynamodb', 'CreateTable', tableName, 'failure', `Table already exists: ${tableName}`);
  }
  const table = {
    tableName,
    partitionKey,
    sortKey,
    billingMode: 'PAY_PER_REQUEST' as const,
    items: [],
    streamEnabled: false,
    pointInTimeRecovery: false,
    encrypted: true,
  };
  return event(
    { ...state, dynamodb: { ...state.dynamodb, tables: { ...state.dynamodb.tables, [tableName]: table } } },
    'dynamodb',
    'CreateTable',
    tableName,
    'success',
    `Created DynamoDB table ${tableName} with PK ${partitionKey}`
  );
}

export function putDynamoDBItem(
  state: CloudSandboxState,
  tableName: string,
  item: Record<string, any>
): CloudSandboxState {
  const table = state.dynamodb.tables[tableName];
  if (!table) return event(state, 'dynamodb', 'PutItem', tableName, 'failure', `Table not found: ${tableName}`);
  const pk = item[table.partitionKey];
  if (!pk) return event(state, 'dynamodb', 'PutItem', tableName, 'failure', `Missing partition key ${table.partitionKey}`);
  const record = { pk: String(pk), attributes: item };
  const existingIdx = table.items.findIndex((i) => i.pk === String(pk));
  const items = existingIdx >= 0
    ? table.items.map((i, idx) => (idx === existingIdx ? record : i))
    : [...table.items, record];
  return event(
    { ...state, dynamodb: { ...state.dynamodb, tables: { ...state.dynamodb.tables, [tableName]: { ...table, items } } } },
    'dynamodb',
    'PutItem',
    `${tableName}/${pk}`,
    'success',
    `Put item ${pk} into ${tableName}`
  );
}

export function queryDynamoDB(
  state: CloudSandboxState,
  tableName: string,
  pkValue: string
): { items: Record<string, any>[]; message: string } {
  const table = state.dynamodb.tables[tableName];
  if (!table) return { items: [], message: `Table not found: ${tableName}` };
  const items = table.items.filter((i) => i.pk === pkValue).map((i) => i.attributes);
  return { items, message: `Query on ${tableName} returned ${items.length} item(s) for PK ${pkValue}` };
}

// ─── Lambda actions ──────────────────────────────────────────────────────────

export function createLambdaFunction(
  state: CloudSandboxState,
  functionName: string,
  runtime: string,
  handler: string,
  roleArn: string,
  code: string,
  memoryMb: number = 128,
  timeout: number = 30
): CloudSandboxState {
  if (state.lambda.functions[functionName]) {
    return event(state, 'lambda', 'CreateFunction', functionName, 'failure', `Function already exists: ${functionName}`);
  }
  const fn = {
    functionName,
    runtime,
    handler,
    roleArn,
    code,
    memoryMb,
    timeout,
    environment: {},
  };
  return event(
    { ...state, lambda: { ...state.lambda, functions: { ...state.lambda.functions, [functionName]: fn } } },
    'lambda',
    'CreateFunction',
    functionName,
    'success',
    `Created Lambda function ${functionName} (${runtime}, ${memoryMb} MB)`
  );
}

export function invokeLambda(
  state: CloudSandboxState,
  functionName: string,
  payload: Record<string, any>
): { result: string; next: CloudSandboxState } {
  const fn = state.lambda.functions[functionName];
  if (!fn) {
    const next = event(state, 'lambda', 'Invoke', functionName, 'failure', `Function not found: ${functionName}`);
    return { result: JSON.stringify({ error: `Function not found: ${functionName}` }), next };
  }

  // Simple Python-ish simulation: scan for amount_usd and threshold
  const threshold = parseFloat(fn.environment.THRESHOLD_USD || '10000');
  const records = payload.Records || [];
  const flagged: any[] = [];
  for (const r of records) {
    const amount = parseFloat(r.amount_usd || 0);
    if (amount > threshold) {
      flagged.push({ transaction_id: r.transaction_id, amount, reason: `Amount exceeds $${threshold}` });
    }
  }

  const result = JSON.stringify({
    statusCode: 200,
    body: JSON.stringify({ flagged_count: flagged.length, flagged }),
  }, null, 2);

  const next = event(
    state,
    'lambda',
    'Invoke',
    functionName,
    'success',
    `Invoked ${functionName} — ${flagged.length} record(s) flagged`
  );

  return { result, next };
}

// ─── Security & Compliance scanner ───────────────────────────────────────────

export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  service: CloudService;
  resource: string;
  issue: string;
  remediation: string;
  examConcept: string;
}

export function scanSecurityPosture(state: CloudSandboxState): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  // S3 checks
  for (const bucket of Object.values(state.s3.buckets)) {
    if (!bucket.publicAccessBlock) {
      findings.push({
        severity: 'critical',
        service: 's3',
        resource: bucket.name,
        issue: 'S3 Block Public Access is disabled.',
        remediation: 'Enable Block Public Access or add an explicit bucket policy.',
        examConcept: 'Block Public Access is the strongest guard against public S3 data leaks.',
      });
    }
    if (bucket.defaultEncryption === 'none') {
      findings.push({
        severity: 'high',
        service: 's3',
        resource: bucket.name,
        issue: 'Default bucket encryption is not enabled.',
        remediation: 'Enable SSE-S3 or SSE-KMS default encryption.',
        examConcept: 'SSE-S3 uses AWS-managed keys; SSE-KMS gives more control and audit trails.',
      });
    }
    if (bucket.acl !== 'private' || !bucket.publicAccessBlock) {
      findings.push({
        severity: 'critical',
        service: 's3',
        resource: bucket.name,
        issue: 'Bucket may allow public access via ACL or policy.',
        remediation: 'Set bucket ACL to private and remove public bucket policies.',
        examConcept: 'S3 ACLs are legacy; use bucket policies and Block Public Access.',
      });
    }
  }

  // IAM checks
  for (const user of Object.values(state.iam.users)) {
    const powerUserPolicy = user.attachedPolicies.some((p) => p === 'PowerUserAccess');
    if (powerUserPolicy) {
      findings.push({
        severity: 'high',
        service: 'iam',
        resource: user.name,
        issue: 'User has PowerUserAccess or an overly permissive policy.',
        remediation: 'Replace with least-privilege policies scoped to specific actions and resources.',
        examConcept: 'Least privilege is the most important IAM best practice.',
      });
    }
    if (user.accessKeys.length) {
      findings.push({
        severity: 'medium',
        service: 'iam',
        resource: user.name,
        issue: 'User has active access keys.',
        remediation: 'Rotate regularly; prefer IAM roles for applications.',
        examConcept: 'Access keys are long-term credentials and should be rotated or avoided.',
      });
    }
  }

  // Security group checks
  for (const sg of Object.values(state.vpc.securityGroups)) {
    for (const rule of sg.inbound) {
      if (rule.source === '0.0.0.0/0') {
        if (rule.fromPort === 22) {
          findings.push({
            severity: 'critical',
            service: 'vpc',
            resource: `${sg.name} (${sg.groupId})`,
            issue: 'SSH (port 22) is open to the entire internet.',
            remediation: 'Restrict SSH to a specific CIDR or use a bastion host.',
            examConcept: 'Security groups are stateful; restrict ingress to least privilege.',
          });
        }
        if (rule.fromPort === 80 || rule.fromPort === 443) {
          findings.push({
            severity: 'info',
            service: 'vpc',
            resource: `${sg.name} (${sg.groupId})`,
            issue: `${rule.fromPort === 80 ? 'HTTP' : 'HTTPS'} is open to the internet.`,
            remediation: rule.fromPort === 80 ? 'Redirect to HTTPS and close port 80.' : 'Ensure this is intentional.',
            examConcept: 'Public web traffic on 443 is normal; 80 should usually redirect to 443.',
          });
        }
      }
    }
  }

  // DynamoDB checks
  for (const table of Object.values(state.dynamodb.tables)) {
    if (!table.encrypted) {
      findings.push({
        severity: 'high',
        service: 'dynamodb',
        resource: table.tableName,
        issue: 'DynamoDB table is not encrypted.',
        remediation: 'Enable DynamoDB encryption at rest (default is AWS owned).',
        examConcept: 'DynamoDB encryption at rest protects table data and backups.',
      });
    }
    if (!table.pointInTimeRecovery) {
      findings.push({
        severity: 'medium',
        service: 'dynamodb',
        resource: table.tableName,
        issue: 'Point-in-time recovery (PITR) is not enabled.',
        remediation: 'Enable PITR for 35 days of continuous backup.',
        examConcept: 'PITR allows table restoration to any point in the last 35 days.',
      });
    }
  }

  return findings.sort((a, b) => {
    const order = ['critical', 'high', 'medium', 'low', 'info'];
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });
}

// ─── Infrastructure as Code — Terraform export ─────────────────────────────────

export function generateTerraformFromState(state: CloudSandboxState): string {
  const lines: string[] = [
    '# Auto-generated from BleepxCloud Sandbox state',
    '# Run `terraform init` and `terraform plan` to validate',
    '',
    'provider "aws" {',
    `  region = "${state.activeRegion}"`,
    '  # profile = "default"  # set via AWS_PROFILE or env vars',
    '}',
    '',
  ];

  // S3
  for (const bucket of Object.values(state.s3.buckets)) {
    const bId = bucket.name.replace(/[^a-z0-9_]/g, '_');
    lines.push(`resource "aws_s3_bucket" "${bId}" {`);
    lines.push(`  bucket = "${bucket.name}"`);
    lines.push('}');
    lines.push('');
    lines.push(`resource "aws_s3_bucket_public_access_block" "${bId}" {`);
    lines.push(`  bucket = aws_s3_bucket.${bId}.id`);
    lines.push(`  block_public_acls       = ${bucket.blockPublicAcls}`);
    lines.push(`  ignore_public_acls      = ${bucket.ignorePublicAcls}`);
    lines.push(`  block_public_policy     = ${bucket.blockPublicPolicy}`);
    lines.push(`  restrict_public_buckets = ${bucket.restrictPublicBuckets}`);
    lines.push('}');
    lines.push('');
    if (bucket.defaultEncryption !== 'none') {
      lines.push(`resource "aws_s3_bucket_server_side_encryption_configuration" "${bId}" {`);
      lines.push(`  bucket = aws_s3_bucket.${bId}.id`);
      lines.push('  rule {');
      lines.push('    apply_server_side_encryption_by_default {');
      lines.push(`      sse_algorithm = "${bucket.defaultEncryption}"`);
      lines.push('    }');
      lines.push('  }');
      lines.push('}');
      lines.push('');
    }
  }

  // DynamoDB
  for (const table of Object.values(state.dynamodb.tables)) {
    const tId = table.tableName.replace(/[^a-z0-9_]/g, '_');
    lines.push(`resource "aws_dynamodb_table" "${tId}" {`);
    lines.push(`  name           = "${table.tableName}"`);
    lines.push(`  billing_mode   = "${table.billingMode}"`);
    lines.push(`  hash_key       = "${table.partitionKey}"`);
    if (table.sortKey) lines.push(`  range_key      = "${table.sortKey}"`);
    lines.push(`  point_in_time_recovery { enabled = ${table.pointInTimeRecovery} }`);
    lines.push(`  server_side_encryption { enabled = ${table.encrypted} }`);
    lines.push('');
    lines.push(`  attribute {`);
    lines.push(`    name = "${table.partitionKey}"`);
    lines.push(`    type = "S"`);
    lines.push('  }');
    if (table.sortKey) {
      lines.push(`  attribute {`);
      lines.push(`    name = "${table.sortKey}"`);
      lines.push(`    type = "S"`);
      lines.push('  }');
    }
    lines.push('}');
    lines.push('');
  }

  // IAM
  for (const policy of Object.values(state.iam.policies)) {
    const pId = policy.name.replace(/[^a-z0-9_]/g, '_');
    lines.push(`resource "aws_iam_policy" "${pId}" {`);
    lines.push(`  name        = "${policy.name}"`);
    lines.push(`  description = "${policy.description || ''}"`);
    lines.push(`  policy = jsonencode({`);
    lines.push(`    Version   = "${policy.version}"`);
    lines.push(`    Statement = [`);
    for (const stmt of policy.statements) {
      lines.push('      {');
      lines.push(`        Effect   = "${stmt.Effect}"`);
      lines.push(`        Action   = ${JSON.stringify(stmt.Action)}`);
      lines.push(`        Resource = ${JSON.stringify(stmt.Resource)}`);
      lines.push('      },');
    }
    lines.push('    ]');
    lines.push('  })');
    lines.push('}');
    lines.push('');
  }

  // Lambda
  for (const fn of Object.values(state.lambda.functions)) {
    const fId = fn.functionName.replace(/[^a-z0-9_]/g, '_');
    lines.push(`resource "aws_lambda_function" "${fId}" {`);
    lines.push(`  function_name = "${fn.functionName}"`);
    lines.push(`  role          = "${fn.roleArn}"`);
    lines.push(`  handler       = "${fn.handler}"`);
    lines.push(`  runtime       = "${fn.runtime}"`);
    lines.push(`  memory_size   = ${fn.memoryMb}`);
    lines.push(`  timeout       = ${fn.timeout}`);
    lines.push(`  filename      = "${fn.functionName}.zip"`);
    lines.push('}');
    lines.push('');
  }

  // VPC / Security groups
  for (const vpc of Object.values(state.vpc.vpcs)) {
    const vId = vpc.vpcId.replace(/-/, '_');
    lines.push(`resource "aws_vpc" "${vId}" {`);
    lines.push(`  cidr_block           = "${vpc.cidr}"`);
    lines.push(`  enable_dns_hostnames = ${vpc.enableDnsHostnames}`);
    lines.push(`  enable_dns_support   = ${vpc.enableDnsSupport}`);
    lines.push('}');
    lines.push('');
  }

  for (const sg of Object.values(state.vpc.securityGroups)) {
    const sgId = sg.groupId.replace(/-/, '_');
    lines.push(`resource "aws_security_group" "${sgId}" {`);
    lines.push(`  name        = "${sg.name}"`);
    lines.push(`  description = "${sg.description}"`);
    if (state.vpc.vpcs[sg.vpcId]) {
      const vId = sg.vpcId.replace(/-/, '_');
      lines.push(`  vpc_id      = aws_vpc.${vId}.id`);
    }
    for (const rule of sg.inbound) {
      lines.push('  ingress {');
      lines.push(`    from_port   = ${rule.fromPort}`);
      lines.push(`    to_port     = ${rule.toPort}`);
      lines.push(`    protocol    = "${rule.protocol}"`);
      lines.push(`    cidr_blocks = ["${rule.source}"]`);
      lines.push(`    description = "${rule.description || ''}"`);
      lines.push('  }');
    }
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}
