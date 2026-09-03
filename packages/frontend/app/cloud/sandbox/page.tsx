'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import CloudSandbox from '@/components/CloudSandbox';
import { ScenarioIcon, CloudIcon, CheckBadge } from '@/components/AppIcons';
import { createBleepxBankScenario, createBleepxRetailScenario, createBleepxHealthScenario, type CloudSandboxState } from '@/lib/cloud/sandbox';
import { scanSecurityPosture } from '@/lib/cloud/sandboxActions';

type ScenarioKey = 'bank' | 'retail' | 'health';

interface SandboxScenario {
  key: ScenarioKey;
  title: string;
  description: string;
  realWorld: string;
  dataNote: string;
  create: () => CloudSandboxState;
  objectives: Array<{
    id: string;
    label: string;
    theory: string;
    check: (state: CloudSandboxState) => boolean;
  }>;
}

const SCENARIOS: Record<ScenarioKey, SandboxScenario> = {
  health: {
    key: 'health',
    title: 'BleepxHealth',
    description:
      'A healthcare platform with patient vitals and records in S3, DynamoDB patient consent data, and a Lambda that flags abnormal vitals. PHI must be protected — a public reports bucket and loose IAM are violations.',
    realWorld:
      'Healthcare workloads must meet HIPAA and GDPR. S3 encryption, Block Public Access, and least-privilege IAM are non-negotiable; audit logs are required.',
    dataNote: 'Vitals, patient CSVs, consent flags, critical-alerts Lambda',
    create: createBleepxHealthScenario,
    objectives: [
      {
        id: 'health-encrypt',
        label: 'Encrypt the reports bucket',
        theory: 'PHI must be encrypted at rest. S3 default encryption ensures every object is encrypted on upload.',
        check: (s) => s.s3.buckets['bleepx-health-reports']?.defaultEncryption !== 'none',
      },
      {
        id: 'health-block',
        label: 'Block public access on the reports bucket',
        theory: 'PHI can never be public. Block Public Access overrides any policy or ACL.',
        check: (s) => s.s3.buckets['bleepx-health-reports']?.publicAccessBlock === true,
      },
      {
        id: 'health-lambda',
        label: 'Invoke the vital-check Lambda',
        theory: 'Lambda lets you run short health checks on streaming records without long-lived servers.',
        check: (s) => s.events.some((e) => e.service === 'lambda' && e.action === 'Invoke'),
      },
      {
        id: 'health-iam',
        label: 'Create and attach a scoped health policy',
        theory: 'HIPAA requires workforce authentication and least-privilege access to PHI.',
        check: (s) => s.iam.users['dev-admin']?.attachedPolicies.some((p) => p !== 'PowerUserAccess') ?? false,
      },
      {
        id: 'health-pitr',
        label: 'Confirm DynamoDB recovery is enabled',
        theory: 'Point-in-time recovery protects patient data by allowing restoration to any point in the last 35 days.',
        check: (s) => s.dynamodb.tables['BleepxHealthPatients']?.pointInTimeRecovery === true,
      },
      {
        id: 'health-terraform',
        label: 'Export the compliant architecture as Terraform',
        theory: 'Regulators and auditors want to see how infrastructure is deployed and who can change it.',
        check: (s) => s.events.some((e) => e.service === 'terraform' && e.action === 'Export' && e.status === 'success'),
      },
    ],
  },
  bank: {
    key: 'bank',
    title: 'BleepxBank',
    description:
      'A fintech data lake with transaction CSVs in S3, customer records in DynamoDB, a fraud-detection Lambda, and a few deliberate security mistakes. Your job: explore the services, then audit and lock it down.',
    realWorld:
      'Fintechs run serverless ETL on transaction streams, store KYC data in DynamoDB, and must pass audits that check S3 public access, encryption, and least-privilege IAM.',
    dataNote: 'Transaction data, customer KYC tiers, IAM roles, Lambda threshold logic',
    create: createBleepxBankScenario,
    objectives: [
      {
        id: 'bank-explore-s3',
        label: 'Explore the data lake',
        theory: 'S3 is the object store of choice for raw data lakes; the prefix structure (raw/transactions/...) is the foundation of data partitioning.',
        check: (s) => s.events.some((e) => e.service === 's3' && e.action === 'ListObjects' || e.action === 'GetObject'),
      },
      {
        id: 'bank-query-dynamodb',
        label: 'Query a customer record',
        theory: 'DynamoDB queries are efficient because they use the partition key to locate the exact storage partition.',
        check: (s) => s.events.some((e) => e.service === 'dynamodb' && e.action === 'Query'),
      },
      {
        id: 'bank-invoke-lambda',
        label: 'Run the fraud-detection Lambda',
        theory: 'Lambda functions are event-driven and stateless; each invocation is independent.',
        check: (s) => s.events.some((e) => e.service === 'lambda' && e.action === 'Invoke'),
      },
      {
        id: 'bank-fix-public-bucket',
        label: 'Block public access on the website bucket',
        theory: 'S3 Block Public Access is the strongest control to prevent accidental public object exposure.',
        check: (s) => s.s3.buckets['bleepx-bank-website']?.publicAccessBlock === true,
      },
      {
        id: 'bank-fix-ssh',
        label: 'Tighten the SSH security group rule',
        theory: 'SSH (port 22) should never be open to 0.0.0.0/0. Use Systems Manager Session Manager or a bastion instead.',
        check: (s) => {
          const sg = s.vpc.securityGroups['sg-web-01'];
          return !!sg?.inbound.some((r) => r.protocol === 'tcp' && r.fromPort === 22 && r.source !== '0.0.0.0/0');
        },
      },
      {
        id: 'bank-export-terraform',
        label: 'Export Infrastructure as Code',
        theory: 'Terraform (IaC) turns manual console changes into versioned, reviewable, repeatable deployments.',
        check: (s) => s.events.some((e) => e.service === 'terraform' && e.action === 'Export' && e.status === 'success'),
      },
    ],
  },
  retail: {
    key: 'retail',
    title: 'BleepxRetail',
    description:
      'An e-commerce platform with orders, product inventory in DynamoDB, and a restock-alert Lambda. The storefront S3 bucket is public and IAM is too broad — lock it down while keeping the site running.',
    realWorld:
      'Retailers use Lambda and DynamoDB for real-time inventory; S3 hosts static storefronts; public buckets and broad IAM are common audit findings.',
    dataNote: 'Orders, inventory CSVs, product records, restock thresholds',
    create: createBleepxRetailScenario,
    objectives: [
      {
        id: 'retail-explore',
        label: 'Inspect the orders and inventory data',
        theory: 'Data lakes are not just a single file; they are collections of related datasets stored as objects.',
        check: (s) => s.events.some((e) => e.service === 's3' && (e.action === 'ListObjects' || e.action === 'GetObject')),
      },
      {
        id: 'retail-restock',
        label: 'Invoke the restock-alert Lambda',
        theory: 'Lambda can react to low-stock events and trigger notifications or reorder workflows.',
        check: (s) => s.events.some((e) => e.service === 'lambda' && e.action === 'Invoke'),
      },
      {
        id: 'retail-product',
        label: 'Add a new product to DynamoDB',
        theory: 'DynamoDB items are schemaless (except the key), so you can store varying attributes for different products.',
        check: (s) => s.dynamodb.tables['BleepxRetailProducts']?.items.length > 3,
      },
      {
        id: 'retail-fix-public',
        label: 'Enable S3 Block Public Access',
        theory: 'A public static website bucket can expose customer PII, logos, or internal JS. Block Public Access first.',
        check: (s) => s.s3.buckets['bleepx-retail-website']?.publicAccessBlock === true,
      },
      {
        id: 'retail-iam',
        label: 'Create and attach a scoped retail admin policy',
        theory: 'Least privilege says users should only have the actions their role actually needs, not wildcard access.',
        check: (s) => s.iam.users['web-admin']?.attachedPolicies.some((p) => p !== 'PowerUserAccess') ?? false,
      },
      {
        id: 'retail-terraform',
        label: 'Export the storefront and database as Terraform',
        theory: 'IaC lets you recreate the same environment in dev, staging, and prod without config drift.',
        check: (s) => s.events.some((e) => e.service === 'terraform' && e.action === 'Export' && e.status === 'success'),
      },
    ],
  },
};

export default function CloudSandboxPage() {
  const [scenario, setScenario] = useState<ScenarioKey>('bank');
  const [state, setState] = useState<CloudSandboxState | null>(null);

  const current = SCENARIOS[scenario];
  const findings = useMemo(() => (state ? scanSecurityPosture(state) : []), [state]);
  const completed = useMemo(() => {
    const counts = new Set<string>();
    if (!state) return counts;
    for (const obj of current.objectives) {
      try {
        if (obj.check(state)) counts.add(obj.id);
      } catch {}
    }
    return counts;
  }, [state, current]);
  const criticalCount = useMemo(() => findings.filter((f) => f.severity === 'critical' || f.severity === 'high').length, [findings]);

  return (
    <main className="max-w-4xl mx-auto px-2 md:px-4 py-4 space-y-5 bg-bleepx-bg min-h-screen pb-12">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Sandbox</span>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-sky-600 to-indigo-700 rounded-2xl p-5 sm:p-6 text-white">
        <div className="flex items-start gap-3">
          <CloudIcon size={40} className="text-white flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold">BleepxCloud Sandbox</h1>
            <p className="text-white/80 text-sm mt-1">
              Browser-native AWS console. Pick a scenario, follow the objectives, and learn by fixing real-looking infrastructure.
            </p>
          </div>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-4 shadow-sm">
        <label className="text-xs font-bold uppercase text-bleepx-text-secondary mb-2 block">Pick a situation</label>
        <div className="flex flex-wrap gap-2">
          {Object.values(SCENARIOS).map((s) => (
            <button
              key={s.key}
              onClick={() => setScenario(s.key)}
              className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                scenario === s.key ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-bleepx-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <ScenarioIcon scenario={s.key} size={16} /> {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Mission brief */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-xl border border-bleepx-border bg-bleepx-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-bleepx-text flex items-center gap-2">
            <ScenarioIcon scenario={current.key} size={22} /> {current.title} — Mission Brief
          </h2>
          <p className="text-sm text-bleepx-text-secondary mt-2 leading-relaxed">{current.description}</p>
          <div className="mt-3 p-3 rounded-lg bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-200">
            <strong>Real-world context:</strong> {current.realWorld}
          </div>
          <div className="mt-2 text-xs text-bleepx-text-secondary">
            <strong>Data included:</strong> {current.dataNote}
          </div>
        </div>

        <div className="rounded-xl border border-bleepx-border bg-bleepx-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-bleepx-text mb-2">Live Security Posture</h3>
            {findings.length > 0 ? (
              <div className="space-y-1">
                {criticalCount > 0 && (
                  <div className="text-sm font-bold text-red-600">{criticalCount} critical/high finding{criticalCount === 1 ? '' : 's'}</div>
                )}
                <div className="text-2xl font-bold text-bleepx-text">{findings.length}</div>
                <div className="text-xs text-bleepx-text-secondary">total finding{findings.length === 1 ? '' : 's'} detected</div>
              </div>
            ) : (
              <div className="text-sm text-emerald-600 font-bold">No findings — well done!</div>
            )}
          </div>
          <Link href="/cloud/aws/bleepx-bank-security-audit" className="mt-3 text-xs text-sky-600 hover:underline font-medium">
            → Take the guided Security Audit mission
          </Link>
        </div>
      </div>

      {/* Objectives checklist */}
      <div className="rounded-xl border border-bleepx-border bg-bleepx-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-bleepx-text mb-3">What to do</h3>
        <div className="space-y-2">
          {current.objectives.map((obj, idx) => {
            const isDone = completed.has(obj.id);
            return (
              <div
                key={obj.id}
                className={`p-3 rounded-lg border text-sm ${
                  isDone
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isDone ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isDone ? 'text-green-700' : 'text-bleepx-text'}`}>{obj.label}</span>
                      {isDone && <span className="text-green-600 text-xs font-bold inline-flex items-center gap-1"><CheckBadge size={12} className="text-green-600" /> Done</span>}
                    </div>
                    <p className="text-[10px] text-bleepx-text-secondary mt-0.5 leading-relaxed">{obj.theory}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hint */}
      <div className="rounded-xl border-2 border-dashed border-sky-300 dark:border-sky-700 p-4 text-sm text-sky-800 dark:text-sky-200 bg-sky-50/50 dark:bg-sky-900/10">
        <strong>Not sure where to start?</strong> Open the <strong>Security</strong> tab to see the red findings, then switch to the matching service tab to fix them. Use the <strong>Terraform</strong> tab to export your final architecture.
      </div>

      <CloudSandbox
        key={scenario}
        freePlay
        initialState={current.create()}
        onStateChange={setState}
      />

      <div className="flex items-center justify-between text-sm text-bleepx-text-secondary">
        <Link href="/cloud/pipelines" className="text-sky-600 hover:underline font-medium">
          → Try the ETL Pipeline Canvas
        </Link>
        <Link href="/cloud" className="text-bleepx-text-secondary hover:underline">
          ← Back to Cloud
        </Link>
      </div>
    </main>
  );
}
