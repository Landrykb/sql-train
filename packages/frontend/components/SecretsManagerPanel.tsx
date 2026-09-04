'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { createSecret, rotateSecret, deleteSecret } from '@/lib/cloud/sandboxActions';

export default function SecretsManagerPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [rotationDays, setRotationDays] = useState<number | undefined>(undefined);
  const [selectedKey, setSelectedKey] = useState('');
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const kmsKeys = Object.keys(state.kms.keys);

  const handleCreate = () => {
    if (!name || !value) return;
    onAction(createSecret(state, name, value, description, selectedKey || undefined, rotationDays));
    setName('');
    setValue('');
    setDescription('');
    setRotationDays(undefined);
    setSelectedKey('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Create Secret</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Secret name (e.g. prod/db/password)" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="">KMS key (optional - default AWS key)</option>
            {kmsKeys.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input type="number" value={rotationDays ?? ''} onChange={(e) => setRotationDays(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Rotation days (optional)" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input value={value} onChange={(e) => setValue(e.target.value)} type="password" placeholder="Secret value" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm sm:col-span-2" />
        </div>
        <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create Secret</button>
      </div>

      {Object.keys(state.secretsmanager.secrets).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Secrets</h3>
          <div className="space-y-3">
            {Object.values(state.secretsmanager.secrets).map((s) => (
              <div key={s.name} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <strong className="text-bleepx-text min-w-0 break-words">{s.name}</strong>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => onAction(rotateSecret(state, s.name))} className="text-[10px] px-2.5 py-1.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-200 transition-colors">Rotate</button>
                    <button onClick={() => onAction(deleteSecret(state, s.name, true))} className="text-[10px] px-2.5 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-200 transition-colors">Delete</button>
                  </div>
                </div>
                <div className="text-xs text-bleepx-text-secondary mt-1">{s.description}</div>
                <div className="text-xs text-bleepx-text-secondary mt-1">KMS: {s.kmsKeyId || 'AWS default'} | Rotation: {s.rotationEnabled ? `${s.rotationRule?.automaticallyAfterDays} days` : 'Off'}</div>
                <div className="mt-2 flex items-center gap-2 min-w-0">
                  <code className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-bleepx-text font-mono min-w-0 break-all">
                    {reveal[s.name] ? s.value : '•'.repeat(Math.min(s.value.length, 24))}
                  </code>
                  <button onClick={() => setReveal((prev) => ({ ...prev, [s.name]: !prev[s.name] }))} className="text-[10px] px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 transition-colors flex-shrink-0">
                    {reveal[s.name] ? 'Hide' : 'Reveal'}
                  </button>
                </div>
                {s.versionStages.includes('AWSPENDING') && (
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">Pending rotation version exists</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>Secrets Manager on the exam:</strong> Never hard-code credentials. Store DB passwords, API keys, and tokens in Secrets Manager. Use automatic rotation with Lambda. KMS customer-managed keys give you audit and deletion control.
      </div>
    </div>
  );
}
