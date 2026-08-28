'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { createAutoScalingGroup, putScalingPolicy } from '@/lib/cloud/sandboxActions';

export default function ASGPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [name, setName] = useState('');
  const [launchTemplate, setLaunchTemplate] = useState('');
  const [minSize, setMinSize] = useState(1);
  const [maxSize, setMaxSize] = useState(3);
  const [desired, setDesired] = useState(2);
  const [selectedAsg, setSelectedAsg] = useState('');
  const [policyName, setPolicyName] = useState('');
  const [target, setTarget] = useState(50);

  const templates = ['t2.micro-template', 't3.small-template'];
  const subnets = Object.values(state.vpc.subnets).map((s) => s.subnetId);
  const tgNames = Object.keys(state.elb.targetGroups);

  return (
    <div className="space-y-4">
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Create Auto Scaling Group</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ASG name" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <select value={launchTemplate} onChange={(e) => setLaunchTemplate(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="">Launch template...</option>
            {templates.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" value={minSize} onChange={(e) => setMinSize(parseInt(e.target.value || '0'))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Min" />
          <input type="number" value={maxSize} onChange={(e) => setMaxSize(parseInt(e.target.value || '0'))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Max" />
          <input type="number" value={desired} onChange={(e) => setDesired(parseInt(e.target.value || '0'))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Desired" />
        </div>
        <button onClick={() => { if (name && launchTemplate) { onAction(createAutoScalingGroup(state, name, launchTemplate, minSize, maxSize, desired, subnets.slice(0, 2), tgNames.slice(0, 1))); setName(''); } }} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create ASG</button>
      </div>

      {Object.keys(state.asg.autoScalingGroups).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Auto Scaling Groups</h3>
          <div className="space-y-3">
            {Object.values(state.asg.autoScalingGroups).map((asg) => (
              <div key={asg.name} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <strong className="text-bleepx-text">{asg.name}</strong>
                  <span className="text-xs text-bleepx-text-secondary">{asg.desiredCapacity} desired · {asg.minSize}-{asg.maxSize}</span>
                </div>
                <div className="text-xs text-bleepx-text-secondary mt-1">Template: {asg.launchTemplate} | Subnets: {asg.vpcZoneIdentifier.join(', ')} | TGs: {asg.targetGroupARNs.join(', ') || 'none'}</div>
                {asg.scalingPolicies.length > 0 && (
                  <div className="mt-2 text-xs text-sky-700 dark:text-sky-400">
                    {asg.scalingPolicies.map((p) => <div key={p.name}>{p.name}: {p.metricType} target {p.targetValue}</div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(state.asg.autoScalingGroups).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Add Target Tracking Policy</h3>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <select onChange={(e) => setSelectedAsg(e.target.value)} value={selectedAsg} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
              <option value="">Pick ASG...</option>
              {Object.keys(state.asg.autoScalingGroups).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <input value={policyName} onChange={(e) => setPolicyName(e.target.value)} placeholder="Policy name" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            <input type="number" value={target} onChange={(e) => setTarget(parseInt(e.target.value || '0'))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Target %" />
          </div>
          <button onClick={() => { if (selectedAsg && policyName) { onAction(putScalingPolicy(state, selectedAsg, policyName, 'CPUUtilization', target)); setPolicyName(''); } }} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Add Policy</button>
        </div>
      )}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>ASG on the exam:</strong> Use multiple AZs for HA, target tracking for scaling, and health checks to replace unhealthy instances. ASGs are free; you pay for the EC2 instances.
      </div>
    </div>
  );
}
