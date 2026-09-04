'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { createRoute53HostedZone, createRoute53Record, deleteRoute53Record } from '@/lib/cloud/sandboxActions';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'Alias'] as const;
const ROUTING_POLICIES = ['simple', 'weighted', 'failover', 'latency', 'geolocation'] as const;

export default function Route53Panel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [zoneName, setZoneName] = useState('bleepx.internal');
  const [isPrivate, setIsPrivate] = useState(false);
  const [recordName, setRecordName] = useState('www');
  const [recordType, setRecordType] = useState<'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'Alias'>('A');
  const [recordValue, setRecordValue] = useState('');
  const [policy, setPolicy] = useState('simple');
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [failover, setFailover] = useState<'PRIMARY' | 'SECONDARY' | undefined>(undefined);
  const [region, setRegion] = useState<string | undefined>(undefined);

  const vpcs = Object.values(state.vpc.vpcs).map((v) => v.vpcId);

  const handleCreateZone = () => {
    if (!zoneName) return;
    onAction(createRoute53HostedZone(state, zoneName, isPrivate, vpcs[0]));
    setZoneName('bleepx.internal');
  };

  const handleCreateRecord = (zoneId: string) => {
    if (!recordValue) return;
    const fqdn = recordName === '@' ? state.route53.hostedZones[zoneId].name : `${recordName}.${state.route53.hostedZones[zoneId].name}`;
    const record = {
      name: fqdn,
      type: recordType,
      value: recordValue,
      ttl: recordType === 'Alias' ? 0 : 300,
      weight: policy === 'weighted' ? weight : undefined,
      failover: policy === 'failover' ? failover : undefined,
      region: policy === 'latency' ? region : undefined,
    };
    onAction(createRoute53Record(state, zoneId, record));
    setRecordValue('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Create Hosted Zone</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="example.com" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <label className="flex items-center gap-2 text-sm text-bleepx-text">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="w-4 h-4 text-sky-600" /> Private zone (requires VPC)
          </label>
        </div>
        <button onClick={handleCreateZone} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create Hosted Zone</button>
      </div>

      {Object.values(state.route53.hostedZones).map((zone) => (
        <div key={zone.id} className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm" id={zone.id}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-sm font-bold text-bleepx-text min-w-0 break-words">{zone.name} <span className="font-mono text-xs text-bleepx-text-secondary">{zone.id}</span></h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold flex-shrink-0">{zone.isPrivate ? 'Private' : 'Public'}</span>
          </div>

          {zone.records.length > 0 && (
            <div className="space-y-2 mb-4">
              {zone.records.map((r) => (
                <div key={r.name} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs flex items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0 break-words">
                    <strong className="text-bleepx-text">{r.name}</strong> <span className="text-bleepx-text-secondary">{r.type}</span>
                    <div className="text-bleepx-text-secondary break-words">→ {r.value} {r.ttl > 0 && `TTL ${r.ttl}`}</div>
                    {r.weight !== undefined && <div className="text-sky-700 dark:text-sky-400">Weight: {r.weight}</div>}
                    {r.failover && <div className="text-sky-700 dark:text-sky-400">Failover: {r.failover}</div>}
                    {r.region && <div className="text-sky-700 dark:text-sky-400">Region: {r.region}</div>}
                  </div>
                  <button onClick={() => onAction(deleteRoute53Record(state, zone.id, r.name))} className="text-xs px-2 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-200 transition-colors flex-shrink-0">Delete</button>
                </div>
              ))}
            </div>
          )}

          <h4 className="text-xs font-bold text-bleepx-text-secondary uppercase mb-2">Add Record</h4>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <input value={recordName} onChange={(e) => setRecordName(e.target.value)} placeholder="www" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            <select value={recordType} onChange={(e) => setRecordType(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
              {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={recordValue} onChange={(e) => setRecordValue(e.target.value)} placeholder={recordType === 'Alias' ? 'ALB DNS name' : '1.2.3.4'} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            <select value={policy} onChange={(e) => setPolicy(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
              {ROUTING_POLICIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {policy === 'weighted' && (
            <div className="mb-3">
              <input type="number" value={weight ?? ''} onChange={(e) => setWeight(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Weight" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            </div>
          )}
          {policy === 'failover' && (
            <div className="mb-3">
              <select value={failover} onChange={(e) => setFailover(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
                <option value="">Failover role...</option>
                <option value="PRIMARY">PRIMARY</option>
                <option value="SECONDARY">SECONDARY</option>
              </select>
            </div>
          )}
          {policy === 'latency' && (
            <div className="mb-3">
              <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="us-east-1" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            </div>
          )}

          <button onClick={() => handleCreateRecord(zone.id)} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Add Record</button>
        </div>
      ))}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>Route 53 on the exam:</strong> Public zones resolve on the internet. Private zones only resolve inside a VPC. Use Alias records for A/AAAA to AWS resources (ALB, CloudFront) to avoid TTL issues. Use failover routing for DR and latency routing for global users.
      </div>
    </div>
  );
}
