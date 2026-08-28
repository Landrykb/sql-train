'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { createKMSKey, setKMSKeyEnabled } from '@/lib/cloud/sandboxActions';

export default function KMSPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [keyId, setKeyId] = useState('');
  const [alias, setAlias] = useState('');
  const [description, setDescription] = useState('Bleepx data encryption key');

  return (
    <div className="space-y-4">
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">Create KMS Key</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="Key ID / name" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Alias (optional, e.g. alias/data-key)" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        </div>
        <button onClick={() => { if (keyId) { onAction(createKMSKey(state, keyId, alias, description)); setKeyId(''); setAlias(''); } }} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create Key</button>
      </div>

      {Object.keys(state.kms.keys).length > 0 && (
        <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-bleepx-text mb-3">Customer Managed Keys</h3>
          <div className="space-y-2">
            {Object.values(state.kms.keys).map((key) => (
              <div key={key.keyId} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <strong className="text-bleepx-text">{key.alias || key.keyId}</strong>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${key.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{key.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="text-xs text-bleepx-text-secondary mt-1">{key.keySpec} · {key.keyUsage} · {key.description}</div>
                <button onClick={() => onAction(setKMSKeyEnabled(state, key.keyId, !key.enabled))} className="mt-2 text-[10px] px-2.5 py-1.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-200 transition-colors">{key.enabled ? 'Disable' : 'Enable'}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>KMS on the exam:</strong> Customer-managed keys give you full control and audit trails via CloudTrail. AWS-managed keys are easier but less flexible. Disable (not delete) keys you no longer need.
      </div>
    </div>
  );
}
