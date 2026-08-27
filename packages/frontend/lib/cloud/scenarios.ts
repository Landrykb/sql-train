// ─── BleepxCloud Sandbox scenario validators ───────────────────────────────────

import type { CloudSandboxState } from './sandbox';

export interface ScenarioCheck {
  id: string;
  description: string;
  check: (state: CloudSandboxState) => { pass: boolean; message: string };
}

// ─── S3 checks ───────────────────────────────────────────────────────────────

export function hasBucket(state: CloudSandboxState, name: string): boolean {
  return !!state.s3.buckets[name];
}

export function hasObject(state: CloudSandboxState, bucketName: string, key: string): boolean {
  return !!state.s3.buckets[bucketName]?.objects.find((o) => o.key === key);
}

export function bucketIsPrivate(state: CloudSandboxState, bucketName: string): boolean {
  const bucket = state.s3.buckets[bucketName];
  if (!bucket) return false;
  return (
    bucket.publicAccessBlock &&
    bucket.acl === 'private' &&
    (bucket.bucketPolicy === '' || !bucket.bucketPolicy.includes('"Effect": "Allow"'))
  );
}

export function bucketHasPublicObjectAccess(state: CloudSandboxState, bucketName: string): boolean {
  const bucket = state.s3.buckets[bucketName];
  if (!bucket) return false;
  if (bucket.acl !== 'private') return true;
  if (bucket.bucketPolicy) {
    try {
      const p = JSON.parse(bucket.bucketPolicy);
      return p.Statement?.some(
        (s: any) =>
          s.Effect === 'Allow' &&
          (s.Principal === '*' || (Array.isArray(s.Principal) && s.Principal.includes('*')))
      );
    } catch {}
  }
  return false;
}

export function bucketHasEncryption(state: CloudSandboxState, bucketName: string, algorithm: 'AES256' | 'aws:kms'): boolean {
  return state.s3.buckets[bucketName]?.defaultEncryption === algorithm;
}

// ─── IAM checks ──────────────────────────────────────────────────────────────

export function hasUser(state: CloudSandboxState, userName: string): boolean {
  return !!state.iam.users[userName];
}

export function hasPolicy(state: CloudSandboxState, policyName: string): boolean {
  return !!state.iam.policies[policyName];
}

export function userHasPolicy(state: CloudSandboxState, userName: string, policyName: string): boolean {
  return state.iam.users[userName]?.attachedPolicies.includes(policyName) ?? false;
}

export function userCanPerformS3Action(
  state: CloudSandboxState,
  userName: string,
  bucketName: string,
  action: 's3:PutObject' | 's3:GetObject' | 's3:ListBucket' | 's3:DeleteObject'
): boolean {
  const user = state.iam.users[userName];
  if (!user) return false;
  for (const policyName of user.attachedPolicies) {
    const policy = state.iam.policies[policyName];
    if (!policy) continue;
    for (const stmt of policy.statements) {
      if (stmt.Effect !== 'Allow') continue;
      const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
      const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];
      const actionMatches = actions.includes(action) || actions.includes('s3:*') || actions.includes('*');
      const resourceMatch = resources.some((r) =>
        r === '*' ||
        r === `arn:aws:s3:::${bucketName}` ||
        r === `arn:aws:s3:::${bucketName}/*` ||
        r.startsWith(`arn:aws:s3:::${bucketName}`)
      );
      if (actionMatches && resourceMatch) return true;
    }
  }
  return false;
}

// ─── EC2 checks ──────────────────────────────────────────────────────────────

export function hasEC2Instance(state: CloudSandboxState, filter: (i: any) => boolean): boolean {
  return Object.values(state.ec2.instances).some(filter);
}

export function runningEC2WithSizeAndSecurity(state: CloudSandboxState, size: string, securityGroupIds: string[]): boolean {
  return Object.values(state.ec2.instances).some(
    (i) => i.state === 'running' && i.size === size && securityGroupIds.every((sg) => i.securityGroups.includes(sg))
  );
}

// ─── VPC checks ──────────────────────────────────────────────────────────────

export function hasVPCWithCidr(state: CloudSandboxState, cidr: string): boolean {
  return Object.values(state.vpc.vpcs).some((v) => v.cidr === cidr);
}

export function hasSubnetInAZ(state: CloudSandboxState, vpcId: string, az: string, isPublic: boolean): boolean {
  return Object.values(state.vpc.subnets).some((s) => s.vpcId === vpcId && s.availabilityZone === az && s.isPublic === isPublic);
}

export function hasSecurityGroupWithRule(
  state: CloudSandboxState,
  vpcId: string,
  protocol: 'tcp' | 'udp' | 'icmp' | '-1',
  port: number,
  source: string
): boolean {
  return Object.values(state.vpc.securityGroups).some(
    (sg) =>
      sg.vpcId === vpcId &&
      sg.inbound.some((r) => r.protocol === protocol && r.fromPort <= port && r.toPort >= port && r.source === source)
  );
}

export function hasInternetAccess(state: CloudSandboxState, vpcId: string, subnetId: string): boolean {
  const subnet = state.vpc.subnets[subnetId];
  if (!subnet || !subnet.isPublic) return false;
  const rt = Object.values(state.vpc.routeTables).find((rt) => rt.vpcId === vpcId && rt.associatedSubnets.includes(subnetId));
  if (!rt) return false;
  return rt.routes.some((r) => r.destinationCidr === '0.0.0.0/0' && r.target.startsWith('igw-'));
}
