'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { createStepFunction, startStepFunctionExecution, deleteStepFunction } from '@/lib/cloud/sandboxActions';

const SAMPLE_DEF = JSON.stringify({
  Comment: 'A simple linear state machine',
  StartAt: 'Validate',
  States: {
    Validate: { Type: 'Task', Resource: 'arn:aws:lambda:::function:validate', Next: 'Process' },
    Process: { Type: 'Task', Resource: 'arn:aws:lambda:::function:process', End: true },
  },
}, null, 2);

export default function StepFunctionsPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [definition, setDefinition] = useState(SAMPLE_DEF);
  const [selected, setSelected] = useState('');
  const [input, setInput] = useState('{}');

  const machines = Object.values(state.stepfunctions.stateMachines);

  const handleCreate = () => {
    if (!name) return;
    onAction(createStepFunction(state, name, definition, type));
    setName('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Create State Machine</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="State machine name" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <select value={type} onChange={(e) => setType(e.target.value as 'STANDARD' | 'EXPRESS')} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="STANDARD">STANDARD</option>
            <option value="EXPRESS">EXPRESS</option>
          </select>
        </div>
        <textarea value={definition} onChange={(e) => setDefinition(e.target.value)} rows={8} className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono" />
        <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create</button>
      </div>

      {machines.length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Start Execution</h3>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="">Select state machine</option>
            {machines.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder='{"orderId":"ord-123"}' rows={3} className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono" />
          <button onClick={() => selected && onAction(startStepFunctionExecution(state, selected, input))} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">Start Execution</button>
        </div>
      )}

      {machines.length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">State Machines</h3>
          <div className="space-y-3">
            {machines.map((m) => (
              <div key={m.name} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <strong className="text-bleepx-text min-w-0 break-words">{m.name}</strong>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-bold flex-shrink-0">{m.type}</span>
                </div>
                <pre className="mt-2 p-2 rounded-lg bg-gray-900 text-green-400 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-words max-w-full">{m.definition}</pre>
                {m.executions.length > 0 && (
                  <div className="mt-2 text-xs text-bleepx-text-secondary">
                    Executions: {m.executions.length} · latest {m.executions[m.executions.length - 1].status}
                  </div>
                )}
                <button onClick={() => onAction(deleteStepFunction(state, m.name))} className="mt-2 text-[10px] px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 font-bold">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>Step Functions on the exam:</strong> Use <em>STANDARD</em> for long-running, durable workflows (up to 1 year, exactly-once). Use <em>EXPRESS</em> for high-volume, short (≤ 5 min), at-least-once workloads. Step Functions can invoke Lambda, SNS, SQS, ECS, Glue, and more.
      </div>
    </div>
  );
}
