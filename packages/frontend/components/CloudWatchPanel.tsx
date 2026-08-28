'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { putCloudWatchAlarm } from '@/lib/cloud/sandboxActions';

export default function CloudWatchPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [name, setName] = useState('');
  const [metric, setMetric] = useState('CPUUtilization');
  const [stat, setStat] = useState<'Average' | 'Sum' | 'Minimum' | 'Maximum'>('Average');
  const [op, setOp] = useState<'GreaterThanThreshold' | 'LessThanThreshold'>('GreaterThanThreshold');
  const [threshold, setThreshold] = useState(80);
  const [periods, setPeriods] = useState(2);

  return (
    <div className="space-y-4">
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Create CloudWatch Alarm</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alarm name" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="Metric name" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <select value={stat} onChange={(e) => setStat(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="Average">Average</option>
            <option value="Sum">Sum</option>
            <option value="Minimum">Minimum</option>
            <option value="Maximum">Maximum</option>
          </select>
          <select value={op} onChange={(e) => setOp(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="GreaterThanThreshold">Greater than</option>
            <option value="LessThanThreshold">Less than</option>
          </select>
          <input type="number" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value || '0'))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Threshold" />
          <input type="number" value={periods} onChange={(e) => setPeriods(parseInt(e.target.value || '1'))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Evaluation periods" />
        </div>
        <button onClick={() => { if (name) { onAction(putCloudWatchAlarm(state, name, 'AWS/EC2', metric, stat, op, threshold, periods)); setName(''); } }} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create Alarm</button>
      </div>

      {Object.keys(state.cloudwatch.alarms).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Alarms</h3>
          <div className="space-y-2">
            {Object.values(state.cloudwatch.alarms).map((a) => (
              <div key={a.alarmName} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm flex items-center justify-between flex-wrap gap-2">
                <div>
                  <strong className="text-bleepx-text">{a.alarmName}</strong>
                  <div className="text-xs text-bleepx-text-secondary">{a.namespace}/{a.metricName} {a.statistic} {a.comparisonOperator} {a.threshold} for {a.evaluationPeriods} periods</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">OK</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>CloudWatch on the exam:</strong> Alarms trigger on metrics (e.g. CPU {'>'} 80% for 2 periods). Use them with Auto Scaling to scale out, or SNS for notifications.
      </div>
    </div>
  );
}
