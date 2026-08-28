'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { createElastiCacheCluster, deleteElastiCacheCluster } from '@/lib/cloud/sandboxActions';

export default function ElastiCachePanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [id, setId] = useState('');
  const [engine, setEngine] = useState<'redis' | 'memcached'>('redis');
  const [nodeType, setNodeType] = useState('cache.t3.micro');
  const [numNodes, setNumNodes] = useState(1);
  const [az, setAz] = useState('us-east-1a');

  const sgs = Object.values(state.vpc.securityGroups).map((s) => s.groupId);

  const handleCreate = () => {
    if (!id) return;
    onAction(createElastiCacheCluster(state, id, engine, nodeType, numNodes, sgs.slice(0, 1), 'default', az));
    setId('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Create Cache Cluster</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Cluster ID" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <select value={engine} onChange={(e) => setEngine(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="redis">Redis</option>
            <option value="memcached">Memcached</option>
          </select>
          <select value={nodeType} onChange={(e) => setNodeType(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="cache.t3.micro">cache.t3.micro</option>
            <option value="cache.t3.small">cache.t3.small</option>
            <option value="cache.m5.large">cache.m5.large</option>
          </select>
          <input type="number" value={numNodes} onChange={(e) => setNumNodes(parseInt(e.target.value || '1'))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Nodes" />
          <input value={az} onChange={(e) => setAz(e.target.value)} placeholder="Availability zone" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        </div>
        <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create Cluster</button>
      </div>

      {Object.keys(state.elasticache.clusters).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Cache Clusters</h3>
          <div className="space-y-3">
            {Object.values(state.elasticache.clusters).map((c) => (
              <div key={c.cacheClusterId} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <strong className="text-bleepx-text">{c.cacheClusterId}</strong>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                </div>
                <div className="text-xs text-bleepx-text-secondary mt-1">{c.engine} {c.engineVersion} · {c.cacheNodeType} × {c.numCacheNodes}</div>
                <div className="text-xs text-bleepx-text-secondary mt-1">Endpoint: {c.endpoint}</div>
                <div className="text-xs text-bleepx-text-secondary mt-1">AZ: {c.preferredAvailabilityZone} · Subnet group: {c.cacheSubnetGroupName} · SGs: {c.securityGroupIds.join(', ') || 'default'}</div>
                <button onClick={() => onAction(deleteElastiCacheCluster(state, c.cacheClusterId))} className="mt-2 text-[10px] px-2.5 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-200 transition-colors">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>ElastiCache on the exam:</strong> Redis is single-threaded and supports data persistence, replication, and Multi-AZ. Memcached is multi-threaded, simple, and does not persist. Use ElastiCache to offload read traffic from databases. Place it in private subnets with a security group.
      </div>
    </div>
  );
}
