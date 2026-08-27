'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CloudSandboxState, S3BucketPolicy } from '@/lib/cloud/sandbox';
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
  EC2_INSTANCE_SIZES,
  EC2_SIZE_SPECS,
} from '@/lib/cloud/sandboxActions';
import type { CloudScenarioStep, CloudMission } from '@/lib/cloud/types';
import { BleepxFace } from '@/components/BleepxIcons';

interface CloudSandboxProps {
  mission?: CloudMission;
  onComplete?: () => void;
  freePlay?: boolean;
}

export default function CloudSandbox({ mission, onComplete, freePlay }: CloudSandboxProps) {
  const [state, setState] = useState<CloudSandboxState>(createEmptySandboxState());
  const [activeTab, setActiveTab] = useState<'s3' | 'iam' | 'ec2' | 'vpc' | 'events'>('s3');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  useEffect(() => {
    const saved = loadSandboxState();
    if (saved) setState(saved);
  }, []);

  useEffect(() => {
    saveSandboxState(state);
  }, [state]);

  const applyAction = useCallback((next: CloudSandboxState) => {
    setState(next);
    const last = next.events[next.events.length - 1];
    if (last) setMessage({ text: last.message, type: last.status === 'success' ? 'success' : last.status === 'failure' ? 'error' : 'info' });
  }, []);

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
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
          'bg-sky-50 border-sky-200 text-sky-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['s3', 'iam', 'ec2', 'vpc', 'events'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
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
      {activeTab === 'events' && <EventsPanel state={state} />}

      <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-900/10 p-4">
        <h4 className="text-sm font-bold text-sky-800 dark:text-sky-200 mb-2 flex items-center gap-2">
          <BleepxFace /> {freePlay ? 'Free Play Console' : 'Mission Steps'}
        </h4>
        {freePlay ? (
          <p className="text-xs text-sky-700 dark:text-sky-300">
            No mission steps — use the tabs above to experiment with S3, IAM, EC2, VPC, and events. Everything is simulated in the browser.
          </p>
        ) : (
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div key={step.id} className={`p-2.5 rounded-lg border text-sm ${
              completedSteps[step.id]
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                  completedSteps[step.id] ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {idx + 1}
                </span>
                <span className="font-semibold text-bleepx-text">{step.title}</span>
                {completedSteps[step.id] && <span className="text-green-600 text-xs font-bold">✓ Done</span>}
              </div>
              <p className="text-xs text-bleepx-text-secondary mt-1 ml-7">{step.instruction}</p>
              {completedSteps[step.id] && step.explanation && (
                <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-7 italic">{step.explanation}</p>
              )}
              {completedSteps[step.id] && step.examConcept && (
                <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 ml-7">🎓 {step.examConcept}</p>
              )}
            </div>
          ))}
        </div>
      )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => { clearSandboxState(); setState(createEmptySandboxState()); setCompletedSteps({}); setMessage(null); }}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          🔄 Reset Sandbox
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
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-bleepx-text">{b.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {b.region} · {b.objects.length} objects
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => onAction(setS3PublicAccess(state, b.name, !b.publicAccessBlock))} className="text-[10px] px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200">
                {b.publicAccessBlock ? 'Disable' : 'Enable'} Public Access Block
              </button>
              <button onClick={() => onAction(setS3Encryption(state, b.name, 'AES256'))} className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                SSE-S3
              </button>
              <button onClick={() => onAction(setS3Encryption(state, b.name, 'aws:kms'))} className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                SSE-KMS
              </button>
              <button onClick={() => onAction(deleteS3Bucket(state, b.name))} className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">
                Delete
              </button>
            </div>
            {b.objects.length > 0 && (
              <ul className="mt-2 space-y-1">
                {b.objects.map((o) => (
                  <li key={o.key} className="text-[11px] font-mono text-gray-600 dark:text-gray-400 flex justify-between">
                    <span>{o.key}</span>
                    <span>{o.size} bytes</span>
                  </li>
                ))}
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
            <span className="font-mono font-bold">{u.name}</span>
            <div className="text-[10px] text-gray-500">Attached: {u.attachedPolicies.join(', ') || 'none'}</div>
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
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold">{i.instanceId}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${i.state === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{i.state}</span>
            </div>
            <div className="text-[10px] text-gray-500">{i.size} · {i.ami} · {i.vCpu} vCPU · {i.ramGiB} GB</div>
            <div className="mt-1 flex gap-2">
              <button onClick={() => onAction(stopEC2Instance(state, i.instanceId))} className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700">Stop</button>
              <button onClick={() => onAction(terminateEC2Instance(state, i.instanceId))} className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700">Terminate</button>
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

  const vpcs = Object.values(state.vpc.vpcs);
  const subnets = Object.values(state.vpc.subnets);

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
          <label className="flex items-center gap-2 text-sm mb-2">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public subnet
          </label>
          <button onClick={() => { if (selectedVpc) onAction(createSubnet(state, selectedVpc, subnetCidr, az, isPublic)); }} className="w-full px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-50" disabled={!selectedVpc}>Create Subnet</button>
        </div>
      </div>

      <div className="space-y-2">
        {vpcs.map((v) => (
          <div key={v.vpcId} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
            <div className="font-mono font-bold">{v.vpcId}</div>
            <div className="text-[10px] text-gray-500">{v.cidr} · {subnets.filter((s) => s.vpcId === v.vpcId).length} subnets</div>
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
          <div className="flex items-center justify-between">
            <span className="font-bold text-sky-700 dark:text-sky-300">{e.service}</span>
            <span className="text-[10px] text-gray-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="font-mono text-bleepx-text">{e.action} {e.resource}</div>
          <div className={`text-[10px] ${e.status === 'success' ? 'text-green-600' : e.status === 'failure' ? 'text-red-600' : 'text-gray-500'}`}>{e.message}</div>
        </div>
      ))}
    </div>
  );
}
