'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { CloudSandboxState, S3BucketPolicy } from '@/lib/cloud/sandbox';
import { createBleepxBankScenario } from '@/lib/cloud/sandbox';
import { CheckBadge, SchoolIcon, BuildingBankIcon, RefreshIcon, ToolsIcon } from '@/components/AppIcons';
import {
  createEmptySandboxState,
  loadSandboxState,
  saveSandboxState,
  clearSandboxState,
} from '@/lib/cloud/sandbox';
import {
  createS3Bucket,
  deleteS3Bucket,
  putS3Object,
  setS3BucketPolicy,
  setS3PublicAccess,
  setS3Encryption,
  setS3ObjectStorageClass,
  restoreS3Object,
  createIAMUser,
  createIAMPolicy,
  attachIAMPolicy,
  launchEC2Instance,
  stopEC2Instance,
  terminateEC2Instance,
  createVPC,
  createSubnet,
  createSecurityGroup,
  addSecurityGroupRule,
  createInternetGateway,
  createRouteTable,
  associateRouteTable,
  createDynamoDBTable,
  putDynamoDBItem,
  queryDynamoDB,
  createDAXCluster,
  deleteDAXCluster,
  createLambdaFunction,
  invokeLambda,
  createRDSInstance,
  createRDSSnapshot,
  modifyRDSInstance,
  deleteRDSInstance,
  restoreRDSInstanceFromSnapshot,
  scanSecurityPosture,
  generateTerraformFromState,
  EC2_INSTANCE_SIZES,
  EC2_SIZE_SPECS,
} from '@/lib/cloud/sandboxActions';
import type { CloudScenarioStep, CloudMission } from '@/lib/cloud/types';
import { BleepxFace } from '@/components/BleepxIcons';
import ELBPanel from '@/components/ELBPanel';
import ASGPanel from '@/components/ASGPanel';
import KMSPanel from '@/components/KMSPanel';
import CloudWatchPanel from '@/components/CloudWatchPanel';
import Route53Panel from '@/components/Route53Panel';
import CloudFrontPanel from '@/components/CloudFrontPanel';
import SecretsManagerPanel from '@/components/SecretsManagerPanel';
import ElastiCachePanel from '@/components/ElastiCachePanel';
import MessagingPanel from '@/components/MessagingPanel';
import StepFunctionsPanel from '@/components/StepFunctionsPanel';
import StoragePanel from '@/components/StoragePanel';

interface CloudSandboxProps {
  mission?: CloudMission;
  onComplete?: () => void;
  freePlay?: boolean;
  initialState?: CloudSandboxState;
  onStateChange?: (state: CloudSandboxState) => void;
  persist?: boolean;
  openTab?: { tab: string; id: number };
}

export default function CloudSandbox({ mission, onComplete, freePlay, initialState, onStateChange, persist = true, openTab }: CloudSandboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CloudSandboxState>(initialState || createEmptySandboxState());
  const [activeTab, setActiveTab] = useState<'s3' | 'iam' | 'ec2' | 'vpc' | 'dynamodb' | 'rds' | 'elb' | 'asg' | 'kms' | 'cloudwatch' | 'route53' | 'cloudfront' | 'secretsmanager' | 'elasticache' | 'messaging' | 'stepfunctions' | 'storage' | 'lambda' | 'terraform' | 'security' | 'events'>('s3');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!openTab) return;
    setActiveTab(openTab.tab as any);
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [openTab]);

  useEffect(() => {
    if (initialState) return;
    const saved = loadSandboxState();
    if (saved) setState(saved);
  }, [initialState]);

  useEffect(() => {
    if (persist) saveSandboxState(state);
    onStateChange?.(state);
  }, [state, onStateChange, persist]);

  const applyAction = useCallback((next: CloudSandboxState) => {
    setState(next);
    const last = next.events[next.events.length - 1];
    if (last) setMessage({ text: last.message, type: last.status === 'success' ? 'success' : last.status === 'failure' ? 'error' : 'info' });
  }, []);

  const invokeLambdaHandler = useCallback((name: string, payload: any) => {
    const { result, next } = invokeLambda(state, name, payload);
    setState(next);
    setMessage({ text: `Invoked ${name} — see result panel`, type: 'success' });
    return result;
  }, [state]);

  const steps = freePlay ? [] : mission?.steps || [];

  const checkSteps = useCallback(() => {
    const completed: Record<string, boolean> = {};
    steps.forEach((step) => {
      completed[step.id] = evaluateStep(step, state);
    });
    setCompletedSteps(completed);
  }, [state, steps]);

  useEffect(() => {
    if (freePlay) return;
    checkSteps();
    if (steps.length && steps.every((s) => evaluateStep(s, state))) {
      onComplete?.();
    }
  }, [checkSteps, freePlay, steps, onComplete, state]);

  return (
    <div ref={containerRef} className="space-y-4 min-w-0">
      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
          'bg-sky-50 border-sky-200 text-sky-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto max-w-full pb-2 -mx-2 px-2 scroll-smooth snap-x">
        {(['s3', 'iam', 'ec2', 'vpc', 'dynamodb', 'rds', 'elb', 'asg', 'kms', 'cloudwatch', 'route53', 'cloudfront', 'secretsmanager', 'elasticache', 'messaging', 'stepfunctions', 'storage', 'lambda', 'terraform', 'security', 'events'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-1 rounded-full text-xs sm:px-3 sm:py-1.5 sm:text-xs font-bold uppercase tracking-wide transition-colors snap-start whitespace-nowrap min-w-fit ${
              activeTab === tab ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 's3' && <S3Panel state={state} onAction={applyAction} />}
      {activeTab === 'iam' && <IAMPanel state={state} onAction={applyAction} />}
      {activeTab === 'ec2' && <EC2Panel state={state} onAction={applyAction} />}
      {activeTab === 'vpc' && <VPCPanel state={state} onAction={applyAction} />}
      {activeTab === 'dynamodb' && <DynamoDBPanel state={state} onAction={applyAction} />}
      {activeTab === 'rds' && <RDSPanel state={state} onAction={applyAction} />}
      {activeTab === 'elb' && <ELBPanel state={state} onAction={applyAction} />}
      {activeTab === 'asg' && <ASGPanel state={state} onAction={applyAction} />}
      {activeTab === 'kms' && <KMSPanel state={state} onAction={applyAction} />}
      {activeTab === 'cloudwatch' && <CloudWatchPanel state={state} onAction={applyAction} />}
      {activeTab === 'route53' && <Route53Panel state={state} onAction={applyAction} />}
      {activeTab === 'cloudfront' && <CloudFrontPanel state={state} onAction={applyAction} />}
      {activeTab === 'secretsmanager' && <SecretsManagerPanel state={state} onAction={applyAction} />}
      {activeTab === 'elasticache' && <ElastiCachePanel state={state} onAction={applyAction} />}
      {activeTab === 'messaging' && <MessagingPanel state={state} onAction={applyAction} />}
      {activeTab === 'stepfunctions' && <StepFunctionsPanel state={state} onAction={applyAction} />}
      {activeTab === 'storage' && <StoragePanel state={state} onAction={applyAction} />}
      {activeTab === 'lambda' && <LambdaPanel state={state} onAction={applyAction} onInvoke={invokeLambdaHandler} />}
      {activeTab === 'terraform' && <TerraformPanel state={state} onAction={applyAction} />}
      {activeTab === 'security' && <SecurityPanel state={state} />}
      {activeTab === 'events' && <EventsPanel state={state} />}

      <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-900/10 p-4">
        <h4 className="text-sm font-bold text-sky-800 dark:text-sky-200 mb-2 flex flex-wrap items-center gap-2">
          <BleepxFace /> {freePlay ? 'Free Play Console' : 'Mission Steps'}
        </h4>
        {freePlay ? (
          <p className="text-xs text-sky-700 dark:text-sky-300">
            No mission steps — use the tabs above to experiment with S3, IAM, EC2, VPC, DynamoDB, Lambda, Terraform, and the security posture scanner. Everything is simulated in the browser.
          </p>
        ) : (
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div key={step.id} className={`p-2.5 rounded-lg border text-sm ${
              completedSteps[step.id]
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                  completedSteps[step.id] ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {idx + 1}
                </span>
                <span className="font-semibold text-bleepx-text min-w-0 whitespace-normal break-words">{step.title}</span>
                {completedSteps[step.id] && <span className="text-green-600 text-xs font-bold inline-flex flex-wrap items-center gap-1"><CheckBadge size={12} className="text-green-600" /> Done</span>}
              </div>
              <p className="text-xs text-bleepx-text-secondary mt-1 ml-7">{step.instruction}</p>
              {completedSteps[step.id] && step.explanation && (
                <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-7 italic">{step.explanation}</p>
              )}
              {completedSteps[step.id] && step.examConcept && (
                <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 ml-7 inline-flex flex-wrap items-center gap-1"><SchoolIcon size={10} /> {step.examConcept}</p>
              )}
            </div>
          ))}
        </div>
      )}
      </div>

      <div className="flex justify-end gap-2">
        {freePlay && (
          <button
            onClick={() => { setState(createBleepxBankScenario()); setCompletedSteps({}); setMessage({ text: 'Loaded BleepxBank scenario with real-looking transaction data, DynamoDB customers, Lambda, IAM, and a public website bucket to fix.', type: 'success' }); }}
            className="text-xs px-3 py-1.5 rounded-full bg-sky-600 text-white font-bold hover:bg-sky-700 transition-colors"
          >
            <span className="inline-flex flex-wrap items-center gap-1"><BuildingBankIcon size={12} /> Load BleepxBank Scenario</span>
          </button>
        )}
        <button
          onClick={() => { clearSandboxState(); setState(createEmptySandboxState()); setCompletedSteps({}); setMessage(null); }}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="inline-flex flex-wrap items-center gap-1"><RefreshIcon size={12} /> Reset Sandbox</span>
        </button>
      </div>
    </div>
  );
}

// ─── Step Evaluation ─────────────────────────────────────────────────────────

function evaluateStep(step: CloudScenarioStep, state: CloudSandboxState): boolean {
  const cfg = step.config || {};
  switch (step.action) {
    case 'create-bucket':
      return !!state.s3.buckets[cfg.bucketName];
    case 'put-object':
      return !!state.s3.buckets[cfg.bucketName]?.objects.find((o) => o.key === cfg.key);
    case 'set-bucket-policy':
      return cfg.block ? state.s3.buckets[cfg.bucketName]?.bucketPolicy !== '' : true;
    case 'set-public-access':
      return cfg.block ? state.s3.buckets[cfg.bucketName]?.publicAccessBlock === true : true;
    case 'set-encryption':
      return state.s3.buckets[cfg.bucketName]?.defaultEncryption === cfg.encryption;
    case 'create-user':
      return !!state.iam.users[cfg.userName];
    case 'create-policy':
      return !!state.iam.policies[cfg.policyName];
    case 'attach-policy':
      return state.iam.users[cfg.userName]?.attachedPolicies.includes(cfg.policyName) ?? false;
    case 'launch-ec2':
      return Object.values(state.ec2.instances).some(
        (i) => i.state === 'running' && i.size === cfg.size && i.ami === cfg.ami
      );
    case 'create-vpc':
      return Object.values(state.vpc.vpcs).some((v) => v.cidr === cfg.cidr);
    case 'create-subnet':
      return Object.values(state.vpc.subnets).some(
        (s) => s.cidr === cfg.cidr && s.availabilityZone === cfg.az && s.isPublic === cfg.isPublic
      );
    case 'create-security-group':
      return Object.values(state.vpc.securityGroups).some(
        (sg) => sg.name === cfg.name
      );
    case 'add-sg-rule':
      return Object.values(state.vpc.securityGroups).some((sg) =>
        sg.inbound.some((r) =>
          r.protocol === (cfg.rule?.protocol || 'tcp') &&
          r.fromPort === (cfg.rule?.fromPort || 22) &&
          r.toPort === (cfg.rule?.toPort || 22) &&
          r.source === (cfg.rule?.source || '0.0.0.0/0')
        )
      );
    case 'create-dynamodb-table':
      return !!state.dynamodb.tables[cfg.tableName];
    case 'put-dynamodb-item':
      return state.dynamodb.tables[cfg.tableName]?.items.some((i) => i.pk === cfg.pk) ?? false;
    case 'create-lambda':
      return !!state.lambda.functions[cfg.functionName];
    case 'invoke-lambda':
      return state.events.some((e) => e.service === 'lambda' && e.action === 'Invoke' && e.resource === cfg.functionName);
    case 'export-terraform':
      return state.events.some((e) => e.service === 'terraform' && e.action === 'Export' && e.status === 'success');
    case 'create-rds':
      return !!state.rds.instances[cfg.dbInstanceIdentifier];
    case 'create-elb':
      return !!state.elb.loadBalancers[cfg.loadBalancerName];
    case 'create-asg':
      return !!state.asg.autoScalingGroups[cfg.asgName];
    case 'create-kms':
      return !!state.kms.keys[cfg.keyId];
    case 'create-cloudwatch-alarm':
      return !!state.cloudwatch.alarms[cfg.alarmName];
    case 'create-route53-zone':
      return Object.values(state.route53.hostedZones).some((z) => z.name === cfg.zoneName);
    case 'create-route53-record':
      return Object.values(state.route53.hostedZones).some((z) =>
        z.records.some((r) => r.name === cfg.recordName && r.type === cfg.recordType)
      );
    case 'create-cloudfront':
      return Object.values(state.cloudfront.distributions).some((d) =>
        d.origins.some((o) => o.domainName === cfg.originDomainName)
      );
    case 'create-secret':
      return !!state.secretsmanager.secrets[cfg.secretName];
    case 'create-elasticache':
      return !!state.elasticache.clusters[cfg.cacheClusterId];
    case 'manual':
      return false;
    default:
      return false;
  }
}

// ─── S3 Panel ────────────────────────────────────────────────────────────────

function S3Panel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [bucketName, setBucketName] = useState('');
  const [objectKey, setObjectKey] = useState('');
  const [objectBody, setObjectBody] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [editClass, setEditClass] = useState<Record<string, import('@/lib/cloud/sandbox').S3StorageClass>>({});

  const buckets = Object.values(state.s3.buckets);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Create Bucket</h5>
          <input
            value={bucketName}
            onChange={(e) => setBucketName(e.target.value)}
            placeholder="my-unique-bucket"
            className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          />
          <button
            onClick={() => { onAction(createS3Bucket(state, bucketName, state.activeRegion)); setBucketName(''); }}
            className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700"
          >
            Create Bucket
          </button>
        </div>

        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Upload Object</h5>
          <select
            value={selectedBucket || ''}
            onChange={(e) => setSelectedBucket(e.target.value)}
            className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">Select bucket</option>
            {buckets.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
          <input
            value={objectKey}
            onChange={(e) => setObjectKey(e.target.value)}
            placeholder="data.csv"
            className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          />
          <textarea
            value={objectBody}
            onChange={(e) => setObjectBody(e.target.value)}
            placeholder="id,name\n1,Alice\n2,Bob"
            rows={3}
            className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
          />
          <button
            onClick={() => {
              if (selectedBucket) {
                onAction(putS3Object(state, selectedBucket, objectKey || 'data.csv', objectBody));
                setObjectKey('');
                setObjectBody('');
              }
            }}
            className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-50"
            disabled={!selectedBucket}
          >
            Upload
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {buckets.map((b) => (
          <div key={b.name} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between">
              <span className="font-mono text-sm font-bold text-bleepx-text min-w-0 whitespace-normal break-words">{b.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {b.region} · {b.objects.length} objects
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => onAction(setS3PublicAccess(state, b.name, !b.publicAccessBlock))} className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200">
                {b.publicAccessBlock ? 'Disable' : 'Enable'} Public Access Block
              </button>
              <button onClick={() => onAction(setS3Encryption(state, b.name, 'AES256'))} className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                SSE-S3
              </button>
              <button onClick={() => onAction(setS3Encryption(state, b.name, 'aws:kms'))} className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                SSE-KMS
              </button>
              <button onClick={() => onAction(deleteS3Bucket(state, b.name))} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">
                Delete
              </button>
            </div>
            {b.objects.length > 0 && (
              <ul className="mt-2 space-y-2">
                {b.objects.map((o) => {
                  const current = editClass[`${b.name}:${o.key}`] ?? o.storageClass;
                  return (
                    <li key={o.key} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                      <div className="flex flex-wrap items-center justify-between">
                        <span className="font-mono text-bleepx-text min-w-0 whitespace-normal break-words">{o.key}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300">{o.storageClass}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <select
                          value={current}
                          onChange={(e) => setEditClass((prev) => ({ ...prev, [`${b.name}:${o.key}`]: e.target.value as import('@/lib/cloud/sandbox').S3StorageClass }))}
                          className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                        >
                          <option value="STANDARD">STANDARD</option>
                          <option value="INTELLIGENT_TIERING">INTELLIGENT_TIERING</option>
                          <option value="STANDARD_IA">STANDARD_IA</option>
                          <option value="ONEZONE_IA">ONEZONE_IA</option>
                          <option value="GLACIER">GLACIER</option>
                          <option value="GLACIER_DEEP_ARCHIVE">GLACIER_DEEP_ARCHIVE</option>
                          <option value="REDUCED_REDUNDANCY">REDUCED_REDUNDANCY</option>
                        </select>
                        <button
                          onClick={() => onAction(setS3ObjectStorageClass(state, b.name, o.key, current))}
                          className="text-xs px-2 py-1 rounded bg-sky-100 text-sky-700 hover:bg-sky-200 font-bold"
                        >
                          Set Class
                        </button>
                        {['GLACIER', 'GLACIER_DEEP_ARCHIVE'].includes(o.storageClass) && (
                          <button
                            onClick={() => onAction(restoreS3Object(state, b.name, o.key))}
                            className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                      {o.restoreUntil && (
                        <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">Restored until {o.restoreUntil.slice(0, 10)}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── IAM Panel ───────────────────────────────────────────────────────────────

function IAMPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [userName, setUserName] = useState('');
  const [policyName, setPolicyName] = useState('');
  const [policyAction, setPolicyAction] = useState('s3:GetObject');
  const [policyResource, setPolicyResource] = useState('arn:aws:s3:::*');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState('');

  const users = Object.values(state.iam.users);
  const policies = Object.values(state.iam.policies);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Create User</h5>
          <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="etl-uploader" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <button onClick={() => { onAction(createIAMUser(state, userName)); setUserName(''); }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">Create User</button>
        </div>

        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Create Policy</h5>
          <input value={policyName} onChange={(e) => setPolicyName(e.target.value)} placeholder="S3ReadWrite" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input value={policyAction} onChange={(e) => setPolicyAction(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input value={policyResource} onChange={(e) => setPolicyResource(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <button onClick={() => {
            onAction(createIAMPolicy(state, policyName, [{ Effect: 'Allow', Action: [policyAction], Resource: [policyResource] }]));
            setPolicyName('');
          }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">Create Policy</button>
        </div>
      </div>

      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Attach Policy</h5>
        <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
          <option value="">Select user</option>
          {users.map((u) => <option key={u.name} value={u.name}>{u.name}</option>)}
        </select>
        <select value={selectedPolicy} onChange={(e) => setSelectedPolicy(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
          <option value="">Select policy</option>
          {policies.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        <button
          onClick={() => { if (selectedUser && selectedPolicy) onAction(attachIAMPolicy(state, selectedUser, selectedPolicy)); }}
          disabled={!selectedUser || !selectedPolicy}
          className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-50"
        >
          Attach
        </button>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.name} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
            <span className="font-mono font-bold min-w-0 whitespace-normal break-words">{u.name}</span>
            <div className="text-xs text-gray-500 break-words">Attached: {u.attachedPolicies.join(', ') || 'none'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EC2 Panel ───────────────────────────────────────────────────────────────

function EC2Panel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [name, setName] = useState('');
  const [ami, setAmi] = useState('ami-amazon-linux-2023');
  const [size, setSize] = useState('t3.micro');
  const instances = Object.values(state.ec2.instances);

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Launch Instance</h5>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="web-server-01" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <select value={ami} onChange={(e) => setAmi(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
          {Object.values(state.ec2.amis).map((a) => <option key={a.amiId} value={a.amiId}>{a.name}</option>)}
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
          {Object.entries(EC2_INSTANCE_SIZES).flatMap(([family, sizes]) => sizes.map((s) => (
            <option key={s} value={s}>{s} — {EC2_SIZE_SPECS[s].vCpu} vCPU, {EC2_SIZE_SPECS[s].ramGiB} GB (${EC2_SIZE_SPECS[s].hourlyRate}/hr)</option>
          )))}
        </select>
        <button onClick={() => { onAction(launchEC2Instance(state, { name, ami, size })); setName(''); }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">Launch</button>
      </div>

      <div className="space-y-2">
        {instances.map((i) => (
          <div key={i.instanceId} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
            <div className="flex flex-wrap items-center justify-between">
              <span className="font-mono font-bold min-w-0 whitespace-normal break-words">{i.instanceId}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${i.state === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{i.state}</span>
            </div>
            <div className="text-xs text-gray-500 break-words">{i.size} · {i.ami} · {i.vCpu} vCPU · {i.ramGiB} GB</div>
            <div className="mt-1 flex gap-2">
              <button onClick={() => onAction(stopEC2Instance(state, i.instanceId))} className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Stop</button>
              <button onClick={() => onAction(terminateEC2Instance(state, i.instanceId))} className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Terminate</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── VPC Panel ───────────────────────────────────────────────────────────────

function VPCPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [vpcCidr, setVpcCidr] = useState('10.0.0.0/16');
  const [subnetCidr, setSubnetCidr] = useState('10.0.1.0/24');
  const [az, setAz] = useState('us-east-1a');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedVpc, setSelectedVpc] = useState('');
  const [selectedSg, setSelectedSg] = useState('');
  const [protocol, setProtocol] = useState<'tcp' | 'udp' | 'icmp' | '-1'>('tcp');
  const [fromPort, setFromPort] = useState(22);
  const [toPort, setToPort] = useState(22);
  const [source, setSource] = useState('0.0.0.0/0');

  const vpcs = Object.values(state.vpc.vpcs);
  const subnets = Object.values(state.vpc.subnets);
  const securityGroups = Object.values(state.vpc.securityGroups);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Create VPC</h5>
          <input value={vpcCidr} onChange={(e) => setVpcCidr(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <button onClick={() => { onAction(createVPC(state, vpcCidr)); setVpcCidr('10.0.0.0/16'); }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">Create VPC</button>
        </div>

        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Create Subnet</h5>
          <select value={selectedVpc} onChange={(e) => setSelectedVpc(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="">Select VPC</option>
            {vpcs.map((v) => <option key={v.vpcId} value={v.vpcId}>{v.vpcId} ({v.cidr})</option>)}
          </select>
          <input value={subnetCidr} onChange={(e) => setSubnetCidr(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input value={az} onChange={(e) => setAz(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <label className="flex flex-wrap items-center gap-2 text-sm mb-2">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public subnet
          </label>
          <button onClick={() => { if (selectedVpc) onAction(createSubnet(state, selectedVpc, subnetCidr, az, isPublic)); }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-50" disabled={!selectedVpc}>Create Subnet</button>
        </div>

        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Add Security Group Rule</h5>
          <select value={selectedSg} onChange={(e) => setSelectedSg(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="">Select security group</option>
            {securityGroups.map((sg) => <option key={sg.groupId} value={sg.groupId}>{sg.name}</option>)}
          </select>
          <select value={protocol} onChange={(e) => setProtocol(e.target.value as any)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="tcp">tcp</option>
            <option value="udp">udp</option>
            <option value="icmp">icmp</option>
            <option value="-1">all</option>
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <input type="number" value={fromPort} onChange={(e) => setFromPort(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            <input type="number" value={toPort} onChange={(e) => setToPort(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          </div>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="203.0.113.0/24" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <button onClick={() => { if (selectedSg) onAction(addSecurityGroupRule(state, selectedSg, { protocol, fromPort, toPort, source })); }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-50" disabled={!selectedSg}>Add Inbound Rule</button>
        </div>
      </div>

      <div className="space-y-2">
        {securityGroups.map((sg) => (
          <div key={sg.groupId} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
            <div className="font-mono font-bold min-w-0 whitespace-normal break-words">{sg.name}</div>
            <div className="text-xs text-gray-500">{sg.inbound.length} inbound · {sg.outbound.length} outbound</div>
            {sg.inbound.map((r, i) => (
              <div key={i} className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-0.5 break-words">
                {r.protocol} {r.fromPort}-{r.toPort} from {r.source}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {vpcs.map((v) => (
          <div key={v.vpcId} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
            <div className="font-mono font-bold min-w-0 whitespace-normal break-words">{v.vpcId}</div>
            <div className="text-xs text-gray-500 break-words">{v.cidr} · {subnets.filter((s) => s.vpcId === v.vpcId).length} subnets</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Events Panel ────────────────────────────────────────────────────────────

function EventsPanel({ state }: { state: CloudSandboxState }) {
  const reversed = useMemo(() => [...state.events].reverse(), [state.events]);
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {reversed.map((e, i) => (
        <div key={i} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs">
          <div className="flex flex-wrap items-center justify-between">
            <span className="font-bold text-sky-700 dark:text-sky-300 min-w-0 whitespace-normal break-words">{e.service}</span>
            <span className="text-xs text-gray-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="font-mono text-bleepx-text break-words">{e.action} {e.resource}</div>
          <div className={`text-xs break-words ${e.status === 'success' ? 'text-green-600' : e.status === 'failure' ? 'text-red-600' : 'text-gray-500'}`}>{e.message}</div>
        </div>
      ))}
    </div>
  );
}

// ─── DynamoDB Panel ──────────────────────────────────────────────────────────

function DynamoDBPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [tableName, setTableName] = useState('');
  const [pk, setPk] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [queryPk, setQueryPk] = useState('');
  const [queryResult, setQueryResult] = useState('');
  const [newItem, setNewItem] = useState('');
  const [daxName, setDaxName] = useState('');
  const [daxNodes, setDaxNodes] = useState(1);
  const [daxNodeType, setDaxNodeType] = useState('dax.r5.large');

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Create Table</h5>
        <input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="table name" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <input value={pk} onChange={(e) => setPk(e.target.value)} placeholder="partition key" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <input value={sortKey} onChange={(e) => setSortKey(e.target.value)} placeholder="sort key (optional)" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <button onClick={() => { onAction(createDynamoDBTable(state, tableName, pk, sortKey || undefined)); setTableName(''); setPk(''); setSortKey(''); }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">Create Table</button>
      </div>

      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Put Item (JSON)</h5>
        <select onChange={(e) => setTableName(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
          <option value="">Select table</option>
          {Object.values(state.dynamodb.tables).map((t) => <option key={t.tableName} value={t.tableName}>{t.tableName}</option>)}
        </select>
        <textarea value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder='{"customer_id":"c-800","region":"us-east-1","tier":"premium"}' rows={3} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono" />
        <button onClick={() => {
          if (tableName) {
            try {
              const item = JSON.parse(newItem);
              onAction(putDynamoDBItem(state, tableName, item));
              setNewItem('');
            } catch { onAction({ ...state, events: [...state.events, { timestamp: new Date().toISOString(), service: 'dynamodb', action: 'PutItem', resource: tableName, status: 'failure', message: 'Invalid JSON' }] }); }
          }
        }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-50" disabled={!tableName}>Put Item</button>
      </div>

      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Query by Partition Key</h5>
        <input value={queryPk} onChange={(e) => setQueryPk(e.target.value)} placeholder="c-701" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <button onClick={() => {
          if (tableName) {
            const res = queryDynamoDB(state, tableName, queryPk);
            setQueryResult(JSON.stringify(res.items, null, 2) + '\n// ' + res.message);
          }
        }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-50" disabled={!tableName}>Query</button>
        {queryResult && <pre className="mt-2 p-2 rounded-lg bg-gray-900 text-green-400 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-words max-w-full">{queryResult}</pre>}
      </div>

      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">DAX Cluster</h5>
        <input value={daxName} onChange={(e) => setDaxName(e.target.value)} placeholder="cluster name" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <input value={daxNodeType} onChange={(e) => setDaxNodeType(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <input type="number" value={daxNodes} onChange={(e) => setDaxNodes(parseInt(e.target.value || '1'))} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="nodes" />
        <button onClick={() => { onAction(createDAXCluster(state, daxName, daxNodeType, daxNodes)); setDaxName(''); }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">Create DAX Cluster</button>
      </div>

      {Object.keys(state.dynamodb.dax).length > 0 && (
        <div className="space-y-2">
          {Object.values(state.dynamodb.dax).map((c) => (
            <div key={c.clusterName} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
              <div className="font-mono font-bold min-w-0 break-words">{c.clusterName}</div>
              <div className="text-xs text-gray-500 break-words">{c.nodeType} × {c.nodes} nodes · {c.status}</div>
              <button onClick={() => onAction(deleteDAXCluster(state, c.clusterName))} className="mt-2 text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 font-bold">Delete</button>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>DynamoDB DAX on the exam:</strong> DAX is an in-memory cache for DynamoDB that gives microsecond read latency. It is not a standalone database; applications connect to DAX endpoints instead of DynamoDB for reads. Use it for read-heavy, eventually consistent workloads.
      </div>

      <div className="space-y-2">
        {Object.values(state.dynamodb.tables).map((t) => (
          <div key={t.tableName} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
            <div className="font-mono font-bold min-w-0 whitespace-normal break-words">{t.tableName}</div>
            <div className="text-xs text-gray-500 break-words">PK: {t.partitionKey} · {t.items.length} items · {t.billingMode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lambda Panel ────────────────────────────────────────────────────────────

function LambdaPanel({ state, onAction, onInvoke }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void; onInvoke: (name: string, payload: any) => string }) {
  const [name, setName] = useState('');
  const [runtime, setRuntime] = useState('python3.12');
  const [handler, setHandler] = useState('index.handler');
  const [roleArn, setRoleArn] = useState('');
  const [code, setCode] = useState('');
  const [payload, setPayload] = useState('');
  const [invokeResult, setInvokeResult] = useState('');

  const selectedFn = Object.values(state.lambda.functions).find((f) => f.functionName === name);

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Create Function</h5>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="flag-large-transfers" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <input value={runtime} onChange={(e) => setRuntime(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <input value={handler} onChange={(e) => setHandler(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <input value={roleArn} onChange={(e) => setRoleArn(e.target.value)} placeholder="arn:aws:iam::123456789012:role/etl-service-role" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={5} placeholder="# Python code body" className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono" />
        <button onClick={() => { onAction(createLambdaFunction(state, name, runtime, handler, roleArn, code)); setName(''); }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700">Create Function</button>
      </div>

      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Invoke Function</h5>
        <select value={name} onChange={(e) => { setName(e.target.value); const f = state.lambda.functions[e.target.value]; if (f) { setRuntime(f.runtime); setHandler(f.handler); setRoleArn(f.roleArn); setCode(f.code); } }} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
          <option value="">Select function</option>
          {Object.values(state.lambda.functions).map((f) => <option key={f.functionName} value={f.functionName}>{f.functionName}</option>)}
        </select>
        <textarea value={payload} onChange={(e) => setPayload(e.target.value)} rows={4} placeholder='{"Records":[{"transaction_id":"txn-x","amount_usd":25000}]}' className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono" />
        <button onClick={() => {
          if (selectedFn) {
            try {
              const p = JSON.parse(payload || '{}');
              const res = onInvoke(selectedFn.functionName, p);
              setInvokeResult(res);
            } catch { setInvokeResult('Invalid JSON payload'); }
          }
        }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-50" disabled={!selectedFn}>Invoke</button>
        {invokeResult && <pre className="mt-2 p-2 rounded-lg bg-gray-900 text-green-400 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-words max-w-full">{invokeResult}</pre>}
      </div>

      <div className="space-y-2">
        {Object.values(state.lambda.functions).map((f) => (
          <div key={f.functionName} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
            <div className="font-mono font-bold min-w-0 whitespace-normal break-words">{f.functionName}</div>
            <div className="text-xs text-gray-500 break-words">{f.runtime} · {f.memoryMb} MB · {f.timeout}s</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Terraform Panel ─────────────────────────────────────────────────────────

function TerraformPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [exported, setExported] = useState(false);
  const tf = useMemo(() => generateTerraformFromState(state), [state]);
  const handleExport = () => {
    const next: CloudSandboxState = {
      ...state,
      events: [...state.events, { timestamp: new Date().toISOString(), service: 'terraform', action: 'Export', resource: 'terraform.tf', status: 'success', message: 'Generated Terraform IaC from current sandbox state' }],
    };
    onAction(next);
    setExported(true);
  };
  return (
    <div className="space-y-4">
      <p className="text-xs text-bleepx-text-secondary">Export the current sandbox state as Terraform HCL. This is the Infrastructure as Code (IaC) that would recreate these resources in a real AWS account.</p>
      <button onClick={handleExport} className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 inline-flex flex-wrap items-center gap-1">{exported ? <><CheckBadge size={12} /> Terraform Exported</> : 'Generate & Save Terraform'}</button>
      <div className="relative">
        <button onClick={() => navigator.clipboard?.writeText(tf)} className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/10 text-gray-300 hover:bg-white/20">Copy</button>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-96 max-w-full">{tf}</pre>
      </div>
    </div>
  );
}

// ─── Security Panel ──────────────────────────────────────────────────────────

function SecurityPanel({ state }: { state: CloudSandboxState }) {
  const findings = useMemo(() => scanSecurityPosture(state), [state]);
  return (
    <div className="space-y-4">
      <p className="text-xs text-bleepx-text-secondary">Live security posture scan against the current sandbox state. Fix the findings to practice secure-by-default architecture.</p>
      <div className="space-y-2">
        {findings.map((f, i) => (
          <div key={i} className={`p-3 rounded-lg border text-sm ${
            f.severity === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
            f.severity === 'high' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' :
            f.severity === 'medium' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
            'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800'
          }`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold uppercase ${
                f.severity === 'critical' ? 'bg-red-500 text-white' :
                f.severity === 'high' ? 'bg-orange-500 text-white' :
                f.severity === 'medium' ? 'bg-amber-500 text-white' :
                'bg-sky-500 text-white'
              }`}>{f.severity}</span>
              <span className="font-mono font-bold text-bleepx-text min-w-0 whitespace-normal break-words">{f.resource}</span>
            </div>
            <p className="text-xs text-bleepx-text-secondary mt-1 break-words"><strong>{f.issue}</strong></p>
            <p className="text-xs text-bleepx-text mt-1 inline-flex flex-wrap items-center gap-1 min-w-0"><ToolsIcon size={10} /> <span className="break-words min-w-0">{f.remediation}</span></p>
            <p className="text-xs text-sky-700 dark:text-sky-400 mt-1 inline-flex flex-wrap items-center gap-1 min-w-0"><SchoolIcon size={10} /> <span className="break-words min-w-0">{f.examConcept}</span></p>
          </div>
        ))}
        {findings.length === 0 && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">No findings — your sandbox is looking secure.</div>
        )}
      </div>
    </div>
  );
}

function RDSPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [id, setId] = useState('');
  const [engine, setEngine] = useState<'mysql' | 'postgres' | 'mariadb' | 'sqlserver'>('postgres');
  const [instanceClass, setInstanceClass] = useState('db.t3.micro');
  const [storage, setStorage] = useState(20);
  const [user, setUser] = useState('admin');
  const [password, setPassword] = useState('BleepxRDS2026!');
  const [multiAZ, setMultiAZ] = useState(false);
  const [encrypted, setEncrypted] = useState(false);
  const [publicly, setPublicly] = useState(false);

  const engines: Array<'mysql' | 'postgres' | 'mariadb' | 'sqlserver'> = ['mysql', 'postgres', 'mariadb', 'sqlserver'];
  const classes = ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.t3.large', 'db.r5.large'];

  const handleCreate = () => {
    if (!id) return;
    onAction(createRDSInstance(state, id, engine, instanceClass, storage, user, password, multiAZ, encrypted, publicly));
    setId('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Launch a DB Instance</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="DB instance identifier" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <select value={engine} onChange={(e) => setEngine(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            {engines.map((en) => <option key={en} value={en}>{en}</option>)}
          </select>
          <select value={instanceClass} onChange={(e) => setInstanceClass(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" min={5} value={storage} onChange={(e) => setStorage(parseInt(e.target.value || '0'))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Storage GB" />
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Master username" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Master password" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        </div>
        <div className="flex flex-wrap gap-4 mb-3 text-sm">
          <label className="flex flex-wrap items-center gap-2"><input type="checkbox" checked={multiAZ} onChange={(e) => setMultiAZ(e.target.checked)} className="w-4 h-4 text-sky-600" /> Multi-AZ</label>
          <label className="flex flex-wrap items-center gap-2"><input type="checkbox" checked={encrypted} onChange={(e) => setEncrypted(e.target.checked)} className="w-4 h-4 text-sky-600" /> Storage encrypted</label>
          <label className="flex flex-wrap items-center gap-2 text-rose-700 dark:text-rose-300"><input type="checkbox" checked={publicly} onChange={(e) => setPublicly(e.target.checked)} className="w-4 h-4 text-rose-600" /> Publicly accessible</label>
        </div>
        <button onClick={handleCreate} disabled={!id} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 disabled:opacity-50">Create DB Instance</button>
      </div>

      {Object.keys(state.rds.instances).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-bleepx-text">DB Instances</h3>
          {Object.values(state.rds.instances).map((db) => (
            <div key={db.dbInstanceIdentifier} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-bleepx-text min-w-0 whitespace-normal break-words">{db.dbInstanceIdentifier}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${db.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{db.status}</span>
              </div>
              <div className="text-xs text-bleepx-text-secondary grid sm:grid-cols-2 gap-1 break-words">
                <span>Engine: {db.engine} {db.instanceClass}</span>
                <span>Storage: {db.allocatedStorage} GB {db.storageType}</span>
                <span>AZ: {db.availabilityZone} {db.multiAZ && db.secondaryAvailabilityZone ? `↔ ${db.secondaryAvailabilityZone}` : ''}</span>
                <span>Endpoint: <span className="font-mono text-xs">{db.endpoint}</span></span>
                <span>Multi-AZ: {db.multiAZ ? 'Yes' : 'No'} | Encrypted: {db.storageEncrypted ? 'Yes' : 'No'} | Public: {db.publiclyAccessible ? 'Yes' : 'No'}</span>
                <span>Backups: {db.backupRetentionPeriod} days</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={() => onAction(createRDSSnapshot(state, db.dbInstanceIdentifier))} className="text-xs px-2.5 py-1.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-200 transition-colors">Create Snapshot</button>
                <button onClick={() => onAction(modifyRDSInstance(state, db.dbInstanceIdentifier, { multiAZ: !db.multiAZ }))} className="text-xs px-2.5 py-1.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-200 transition-colors">Toggle Multi-AZ</button>
                <button onClick={() => onAction(modifyRDSInstance(state, db.dbInstanceIdentifier, { storageEncrypted: !db.storageEncrypted }))} className="text-xs px-2.5 py-1.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-200 transition-colors">Toggle Encryption</button>
                <button onClick={() => onAction(deleteRDSInstance(state, db.dbInstanceIdentifier))} className="text-xs px-2.5 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-200 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(state.rds.snapshots).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Manual Snapshots</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.values(state.rds.snapshots).map((snap) => (
              <div key={snap.dbSnapshotIdentifier} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                <strong className="text-bleepx-text break-words">{snap.dbSnapshotIdentifier}</strong>
                <p className="text-bleepx-text-secondary break-words">Source: {snap.dbInstanceIdentifier}</p>
                <p className="text-bleepx-text-secondary break-words">Encrypted: {snap.encrypted ? 'Yes' : 'No'} | {new Date(snap.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(state.rds.instances).length === 0 && (
        <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
          <strong>RDS on the exam:</strong> Multi-AZ is for availability, read replicas are for scale, snapshots are for point-in-time recovery, and encryption is for security. Try creating an instance with each combination.
        </div>
      )}
    </div>
  );
}
