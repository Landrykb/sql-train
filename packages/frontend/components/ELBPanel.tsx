'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { createELBLoadBalancer, createELBTargetGroup, addELBListener, registerELBTargets } from '@/lib/cloud/sandboxActions';

export default function ELBPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [lbName, setLbName] = useState('');
  const [lbType, setLbType] = useState<'application' | 'network'>('application');
  const [lbScheme, setLbScheme] = useState<'internet-facing' | 'internal'>('internet-facing');
  const [tgName, setTgName] = useState('');
  const [tgPort, setTgPort] = useState(80);
  const [instanceIds, setInstanceIds] = useState('');

  const subnets = Object.values(state.vpc.subnets).map((s) => s.subnetId);
  const sgs = Object.values(state.vpc.securityGroups).map((s) => s.groupId);

  return (
    <div className="space-y-4">
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Create Target Group</h3>
        <div className="flex gap-2 mb-3">
          <input value={tgName} onChange={(e) => setTgName(e.target.value)} placeholder="Target group name" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input type="number" value={tgPort} onChange={(e) => setTgPort(parseInt(e.target.value || '0'))} className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Port" />
        </div>
        <button onClick={() => { if (tgName) { onAction(createELBTargetGroup(state, tgName, 'HTTP', tgPort, '/')); setTgName(''); } }} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create Target Group</button>
      </div>

      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Create Load Balancer</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={lbName} onChange={(e) => setLbName(e.target.value)} placeholder="Load balancer name" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <select value={lbType} onChange={(e) => setLbType(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="application">Application (ALB)</option>
            <option value="network">Network (NLB)</option>
          </select>
          <select value={lbScheme} onChange={(e) => setLbScheme(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="internet-facing">Internet-facing</option>
            <option value="internal">Internal</option>
          </select>
        </div>
        <button onClick={() => { if (lbName) { onAction(createELBLoadBalancer(state, lbName, lbType, lbScheme, subnets.slice(0, 2), sgs.slice(0, 1))); setLbName(''); } }} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create Load Balancer</button>
      </div>

      {Object.keys(state.elb.targetGroups).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Register Targets</h3>
          <div className="flex gap-2 mb-3">
            <input value={instanceIds} onChange={(e) => setInstanceIds(e.target.value)} placeholder="i-1234567890abcdef0,i-0987654321fedcba0" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            <select className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" onChange={(e) => { if (e.target.value && instanceIds) { onAction(registerELBTargets(state, e.target.value, instanceIds.split(',').map((x) => x.trim()))); } }} value="">
              <option value="">Pick target group</option>
              {Object.keys(state.elb.targetGroups).map((tg) => <option key={tg} value={tg}>{tg}</option>)}
            </select>
          </div>
        </div>
      )}

      {Object.keys(state.elb.loadBalancers).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Load Balancers</h3>
          <div className="space-y-2">
            {Object.values(state.elb.loadBalancers).map((lb) => (
              <div key={lb.name} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                <strong className="text-bleepx-text min-w-0 break-words">{lb.name}</strong> <span className="text-xs text-bleepx-text-secondary">({lb.type} · {lb.scheme})</span>
                <div className="text-xs text-bleepx-text-secondary mt-1 break-words">Subnets: {lb.subnets.join(', ')} | SGs: {lb.securityGroups.join(', ') || 'none'}</div>
                {lb.listeners.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {lb.listeners.map((l, i) => (
                      <div key={i} className="text-xs text-sky-700 dark:text-sky-400 break-words">{l.protocol}:{l.port} → {l.targetGroupName}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">No listeners yet</div>
                )}
                <div className="flex gap-2 mt-2">
                  <select className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs" onChange={(e) => { const port = parseInt(e.target.value); if (port) { onAction(addELBListener(state, lb.name, 'HTTP', port, Object.keys(state.elb.targetGroups)[0])); e.target.value = ''; } }} value="">
                    <option value="">Add listener...</option>
                    <option value="80">HTTP 80</option>
                    <option value="443">HTTPS 443</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>ELB on the exam:</strong> ALBs are for HTTP/HTTPS layer-7 routing. NLBs are for TCP/UDP layer-4 performance. Internet-facing needs public subnets; internal uses private subnets.
      </div>
    </div>
  );
}
