'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { createEBSVolume, attachEBSVolume, deleteEBSVolume, createEFSFileSystem, addEFSLifecyclePolicy, deleteEFSFileSystem } from '@/lib/cloud/sandboxActions';

export default function StoragePanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [active, setActive] = useState<'ebs' | 'efs'>('ebs');
  const [volId, setVolId] = useState('');
  const [volSize, setVolSize] = useState(10);
  const [volType, setVolType] = useState<'gp2' | 'gp3' | 'io1' | 'io2' | 'st1' | 'sc1'>('gp3');
  const [volIops, setVolIops] = useState(3000);
  const [volAz, setVolAz] = useState('us-east-1a');
  const [attachTarget, setAttachTarget] = useState('');
  const [efsToken, setEfsToken] = useState('');
  const [efsPerf, setEfsPerf] = useState<'generalPurpose' | 'maxIO'>('generalPurpose');
  const [efsThroughput, setEfsThroughput] = useState<'bursting' | 'provisioned'>('bursting');
  const [efsProvisioned, setEfsProvisioned] = useState<number | undefined>(undefined);
  const [efsPolicy, setEfsPolicy] = useState('');

  const volumes = Object.values(state.storage.volumes);
  const fss = Object.values(state.storage.filesystems);
  const instances = Object.values(state.ec2.instances).filter((i) => i.state === 'running');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setActive('ebs')} className={`px-4 py-2 rounded-full text-xs font-bold ${active === 'ebs' ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>EBS</button>
        <button onClick={() => setActive('efs')} className={`px-4 py-2 rounded-full text-xs font-bold ${active === 'efs' ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>EFS</button>
      </div>

      {active === 'ebs' ? (
        <>
          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-bleepx-text mb-3">Create EBS Volume</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input value={volId} onChange={(e) => setVolId(e.target.value)} placeholder="Volume ID" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
              <input type="number" value={volSize} onChange={(e) => setVolSize(parseInt(e.target.value))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Size (GB)" />
              <select value={volType} onChange={(e) => setVolType(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
                <option value="gp3">gp3</option>
                <option value="gp2">gp2</option>
                <option value="io1">io1</option>
                <option value="io2">io2</option>
                <option value="st1">st1</option>
                <option value="sc1">sc1</option>
              </select>
              <input value={volAz} onChange={(e) => setVolAz(e.target.value)} placeholder="AZ" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
              {['io1', 'io2'].includes(volType) && <input type="number" value={volIops} onChange={(e) => setVolIops(parseInt(e.target.value))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="IOPS" />}
            </div>
            <button onClick={() => { onAction(createEBSVolume(state, volId, volSize, volType, volAz, ['io1', 'io2'].includes(volType) ? volIops : undefined)); setVolId(''); }} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create Volume</button>
          </div>

          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-bleepx-text mb-3">Attach Volume</h3>
            <select value={attachTarget} onChange={(e) => setAttachTarget(e.target.value)} className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
              <option value="">Select running EC2</option>
              {instances.map((i) => <option key={i.instanceId} value={i.instanceId}>{i.instanceId}</option>)}
            </select>
            {volumes.length > 0 && (
              <div className="space-y-2">
                {volumes.map((v) => (
                  <div key={v.volumeId} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                    <div className="flex items-center justify-between">
                      <strong>{v.volumeId}</strong>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">{v.volumeType}</span>
                    </div>
                    <div className="text-xs text-bleepx-text-secondary mt-1">{v.size} GB · {v.availabilityZone} · {v.attachedTo ? `attached to ${v.attachedTo}` : 'unattached'}</div>
                    <div className="flex gap-2 mt-2">
                      {!v.attachedTo && attachTarget && <button onClick={() => onAction(attachEBSVolume(state, v.volumeId, attachTarget))} className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold">Attach</button>}
                      {!v.attachedTo && <button onClick={() => onAction(deleteEBSVolume(state, v.volumeId))} className="text-[10px] px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 font-bold">Delete</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
            <strong>EBS on the exam:</strong> gp3 is the best default for most workloads. io1/io2 are for high IOPS. st1/sc1 are throughput-optimized/cold HDD. EBS is tied to one AZ and one instance (except io2 Block Express multi-attach).
          </div>
        </>
      ) : (
        <>
          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-bleepx-text mb-3">Create EFS File System</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input value={efsToken} onChange={(e) => setEfsToken(e.target.value)} placeholder="Creation token / name" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
              <select value={efsPerf} onChange={(e) => setEfsPerf(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
                <option value="generalPurpose">generalPurpose</option>
                <option value="maxIO">maxIO</option>
              </select>
              <select value={efsThroughput} onChange={(e) => setEfsThroughput(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
                <option value="bursting">bursting</option>
                <option value="provisioned">provisioned</option>
              </select>
              {efsThroughput === 'provisioned' && <input type="number" value={efsProvisioned ?? ''} onChange={(e) => setEfsProvisioned(e.target.value ? parseInt(e.target.value) : undefined)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="Provisioned MiB/s" />}
            </div>
            <button onClick={() => { onAction(createEFSFileSystem(state, efsToken, efsPerf, efsThroughput, efsProvisioned)); setEfsToken(''); }} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create File System</button>
          </div>

          {fss.length > 0 && (
            <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
              <h3 className="text-sm font-bold text-bleepx-text mb-3">EFS Systems</h3>
              <div className="space-y-3">
                {fss.map((fs) => (
                  <div key={fs.creationToken} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                    <div className="flex items-center justify-between">
                      <strong>{fs.creationToken}</strong>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{fs.performanceMode}</span>
                    </div>
                    <div className="text-xs text-bleepx-text-secondary mt-1">{fs.fileSystemId} · {fs.throughputMode} · {fs.lifeCyclePolicies.length} lifecycle policies</div>
                    {fs.lifeCyclePolicies.length > 0 && <div className="text-xs text-bleepx-text-secondary mt-1">{fs.lifeCyclePolicies.join(', ')}</div>}
                    <div className="flex gap-2 mt-2">
                      <input value={efsPolicy} onChange={(e) => setEfsPolicy(e.target.value)} placeholder="e.g. AFTER_90_DAYS" className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs" />
                      <button onClick={() => efsPolicy && onAction(addEFSLifecyclePolicy(state, fs.creationToken, efsPolicy))} className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold">Add</button>
                      <button onClick={() => onAction(deleteEFSFileSystem(state, fs.creationToken))} className="text-[10px] px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 font-bold">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
            <strong>EFS on the exam:</strong> EFS is a managed NFS that can be mounted by many EC2 instances across AZs. Use <em>generalPurpose</em> for most, <em>maxIO</em> for very high IOPS. Lifecycle policies move files to EFS-IA to cut cost.
          </div>
        </>
      )}
    </div>
  );
}
