'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { createCloudFrontDistribution, createCloudFrontCacheBehavior, createCloudFrontInvalidation } from '@/lib/cloud/sandboxActions';

const PRICE_CLASSES = [
  { value: 'PriceClass_All', label: 'All edge locations' },
  { value: 'PriceClass_100', label: 'North America & Europe' },
  { value: 'PriceClass_200', label: 'North America, Europe, Asia' },
] as const;

export default function CloudFrontPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [originType, setOriginType] = useState<'s3' | 'custom' | 'elb'>('s3');
  const [originDomain, setOriginDomain] = useState('');
  const [aliases, setAliases] = useState('');
  const [defaultRoot, setDefaultRoot] = useState('index.html');
  const [priceClass, setPriceClass] = useState<'PriceClass_All' | 'PriceClass_100' | 'PriceClass_200'>('PriceClass_All');
  const [pathPattern, setPathPattern] = useState('/api/*');
  const [behaviorTTL, setBehaviorTTL] = useState(0);
  const [invalPath, setInvalPath] = useState('/*');
  const [selectedDist, setSelectedDist] = useState('');

  const s3Names = Object.keys(state.s3.buckets);
  const lbNames = Object.keys(state.elb.loadBalancers).map((n) => state.elb.loadBalancers[n].name);

  const originOptions = {
    s3: s3Names,
    custom: [],
    elb: lbNames,
  };

  const handleCreate = () => {
    const domain = originDomain;
    if (!domain) return;
    const originId = `origin-${Math.random().toString(36).slice(2, 8)}`;
    onAction(createCloudFrontDistribution(
      state,
      { id: originId, domainName: domain, type: originType, originAccessIdentity: originType === 's3' },
      aliases.split(',').map((a) => a.trim()).filter(Boolean),
      defaultRoot,
      priceClass
    ));
    setOriginDomain('');
    setAliases('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Create Distribution</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <select value={originType} onChange={(e) => { setOriginType(e.target.value as any); setOriginDomain(''); }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="s3">S3 bucket</option>
            <option value="elb">ELB load balancer</option>
            <option value="custom">Custom origin</option>
          </select>
          <select value={originDomain} onChange={(e) => setOriginDomain(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="">Select origin...</option>
            {originOptions[originType].map((o) => <option key={o} value={o}>{o}</option>)}
            {originType === 'custom' && <option value="">(type below)</option>}
          </select>
          {originType === 'custom' && (
            <input value={originDomain} onChange={(e) => setOriginDomain(e.target.value)} placeholder="origin.example.com" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          )}
          <input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="example.com, www.example.com" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input value={defaultRoot} onChange={(e) => setDefaultRoot(e.target.value)} placeholder="index.html" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <select value={priceClass} onChange={(e) => setPriceClass(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            {PRICE_CLASSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create Distribution</button>
      </div>

      {Object.values(state.cloudfront.distributions).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Distributions</h3>
          <div className="space-y-4">
            {Object.values(state.cloudfront.distributions).map((dist) => (
              <div key={dist.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <strong className="text-bleepx-text min-w-0 break-words">{dist.id}</strong>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold flex-shrink-0">{dist.status}</span>
                </div>
                <div className="text-xs text-bleepx-text-secondary mt-1 break-words">Domain: {dist.domainName}</div>
                <div className="text-xs text-bleepx-text-secondary mt-0.5 break-words">Origins: {dist.origins.map((o) => `${o.type}:${o.domainName}`).join(', ')}</div>
                <div className="text-xs text-bleepx-text-secondary mt-0.5 break-words">Price class: {dist.priceClass} | Default object: {dist.defaultRootObject}</div>
                {dist.aliases.length > 0 && <div className="text-xs text-sky-700 dark:text-sky-400 mt-0.5 break-words">Aliases: {dist.aliases.join(', ')}</div>}
                {dist.invalidations.length > 0 && <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 break-words">Invalidations: {dist.invalidations.join(', ')}</div>}

                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input value={pathPattern} onChange={(e) => setPathPattern(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs" placeholder="/images/*" />
                    <input type="number" value={behaviorTTL} onChange={(e) => setBehaviorTTL(parseInt(e.target.value || '0'))} className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs" placeholder="TTL" />
                    <button onClick={() => { if (pathPattern) onAction(createCloudFrontCacheBehavior(state, dist.id, pathPattern, { maxTTL: behaviorTTL, defaultTTL: behaviorTTL, minTTL: 0 })); }} className="px-3 py-1 rounded bg-sky-600 text-white text-xs font-bold">Add behavior</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input value={invalPath} onChange={(e) => setInvalPath(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs" placeholder="/*" />
                    <button onClick={() => onAction(createCloudFrontInvalidation(state, dist.id, [invalPath]))} className="px-3 py-1 rounded bg-amber-600 text-white text-xs font-bold">Invalidate</button>
                  </div>
                </div>

                {Object.keys(dist.cacheBehaviors).length > 0 && (
                  <div className="mt-2 text-xs text-sky-700 dark:text-sky-400 break-words">
                    Behaviors: {Object.keys(dist.cacheBehaviors).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>CloudFront on the exam:</strong> Use S3 + OAI for static content. Use ALB/EC2 as custom origins for dynamic content. HTTPS-only / redirect-to-https is common. Invalidate objects when you update content. PriceClass reduces cost by limiting edge locations.
      </div>
    </div>
  );
}
