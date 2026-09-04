'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SchoolIcon, FormsIcon, ToolsIcon, FlaskIcon, MapIcon } from '@/components/AppIcons';

interface JourneyStep {
  id: string;
  label: string;
  resource: string;
  href: string;
  done?: boolean;
}

interface Domain {
  id: string;
  title: string;
  weight: string;
  topics: string[];
  bleepx: { label: string; href: string }[];
  steps: JourneyStep[];
}

const SAA_DOMAINS: Domain[] = [
  {
    id: 'secure',
    title: 'Domain 1 — Design Secure Architectures',
    weight: '18% of exam',
    topics: ['IAM users, groups, roles, policies, least privilege', 'S3 encryption, bucket policies, Block Public Access', 'VPC security groups, NACLs, bastion hosts', 'KMS encryption at rest and in transit', 'AWS Secrets Manager'],
    bleepx: [
      { label: 'Cloud Sandbox IAM tab', href: '/cloud/sandbox' },
      { label: 'Cloud Sandbox S3 & VPC tabs', href: '/cloud/sandbox' },
      { label: 'BleepxBank Security Audit mission', href: '/cloud/aws/bleepx-bank-security-audit' },
    ],
    steps: [
      { id: 'iam-least', label: 'Create an IAM policy with least privilege', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 's3-block', label: 'Enable S3 Block Public Access and encryption', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 'sg-ssh', label: 'Restrict a security group SSH rule', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 'tf-export', label: 'Export a secure architecture to Terraform', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
    ],
  },
  {
    id: 'resilient',
    title: 'Domain 2 — Design Resilient Architectures',
    weight: '24% of exam',
    topics: ['RDS Multi-AZ, read replicas, automated backups', 'S3 versioning, cross-region replication, lifecycle', 'EBS snapshots and AMIs', 'Auto Scaling Groups and health checks', 'Route 53 failover routing'],
    bleepx: [
      { label: 'Cloud Sandbox RDS tab', href: '/cloud/sandbox' },
      { label: 'Cloud Sandbox S3 versioning', href: '/cloud/sandbox' },
      { label: 'RDS Multi-AZ mission (coming)', href: '/cloud/sandbox' },
    ],
    steps: [
      { id: 'rds-multi', label: 'Launch an RDS instance with Multi-AZ', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 's3-version', label: 'Create a versioned S3 bucket', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 'snapshot', label: 'Create a manual RDS snapshot', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 'restore', label: 'Restore an RDS instance from a snapshot', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
    ],
  },
  {
    id: 'high-performing',
    title: 'Domain 3 — Design High-Performing Architectures',
    weight: '30% of exam',
    topics: ['EC2 instance types, placement groups, EBS gp2/gp3/io1', 'ELB/ALB target groups and listeners', 'Auto Scaling Groups scaling policies', 'CloudFront edge caching', 'DynamoDB DAX, caching, DDB streams', 'Lambda concurrency and event-driven design'],
    bleepx: [
      { label: 'Cloud Sandbox EC2 & VPC', href: '/cloud/sandbox' },
      { label: 'Cloud Sandbox DynamoDB & Lambda', href: '/cloud/sandbox' },
      { label: 'Lambda Fraud Detection mission', href: '/cloud/aws/lambda-fraud-detection' },
      { label: 'Bleepx Pipeline Canvas', href: '/cloud/pipelines' },
    ],
    steps: [
      { id: 'ec2-types', label: 'Launch EC2 instances with size and AMI trade-offs', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 'lambda-invoke', label: 'Create and invoke a Lambda function', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 'dynamodb-put', label: 'Create a DynamoDB table and query items', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 'etl-s3', label: 'Build an Extract → SQL → Python → S3 pipeline', resource: 'Pipeline Canvas', href: '/cloud/pipelines' },
    ],
  },
  {
    id: 'cost-optimized',
    title: 'Domain 4 — Design Cost-Optimized Architectures',
    weight: '28% of exam',
    topics: ['EC2 Reserved/Spot/Savings Plans vs On-Demand', 'S3 storage classes and lifecycle', 'RDS right-sizing and storage', 'Cost Explorer, AWS Budgets, Billing Alarms', 'Serverless cost model (Lambda, S3, DynamoDB PAY_PER_REQUEST)'],
    bleepx: [
      { label: 'Cloud Sandbox EC2 pricing', href: '/cloud/sandbox' },
      { label: 'Cloud Sandbox DynamoDB billing mode', href: '/cloud/sandbox' },
      { label: 'Carbon Credits lab', href: '/lab/carbon_credits/carbon_awd' },
    ],
    steps: [
      { id: 'ec2-pricing', label: 'Compare EC2 on-demand vs reserved costs', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 's3-lifecycle', label: 'Plan S3 storage-class lifecycle', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 'ddb-billing', label: 'Use DynamoDB PAY_PER_REQUEST vs provisioned', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
      { id: 'spot-sim', label: 'Model Spot vs On-Demand cost for a workload', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
    ],
  },
];

const FOUNDATION_TRACK: JourneyStep[] = [
  { id: 'sql', label: 'Learn SQL queries, joins, CTEs, window functions', resource: 'BleepxQuery', href: '/' },
  { id: 'python', label: 'Learn Python pandas, visualization, statistics', resource: 'BleepxLab', href: '/lab' },
  { id: 'ml', label: 'Train classification and regression models', resource: 'BleepxLab', href: '/lab' },
  { id: 'etl', label: 'Build Extract → SQL → Python → S3 pipelines', resource: 'Pipeline Canvas', href: '/cloud/pipelines' },
  { id: 'cloud-fundamentals', label: 'Master S3, IAM, EC2, VPC, DynamoDB, Lambda, RDS', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
  { id: 'iac', label: 'Write Terraform and understand Infrastructure as Code', resource: 'Cloud Sandbox', href: '/cloud/sandbox' },
  { id: 'security', label: 'Harden a realistic multi-service architecture', resource: 'Security Audit mission', href: '/cloud/aws/bleepx-bank-security-audit' },
  { id: 'saa', label: 'Complete the SAA-C03 domains checklist below', resource: 'This page', href: '#' },
];

const STORAGE_KEY = 'bleepx-saa-checklist';

export default function CertificationsPage() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch {}
  }, [done]);

  const toggle = (id: string) => setDone((d) => ({ ...d, [id]: !d[id] }));

  const allSteps = [...FOUNDATION_TRACK, ...SAA_DOMAINS.flatMap((d) => d.steps)];
  const completed = allSteps.filter((s) => done[s.id]).length;
  const pct = Math.round((completed / allSteps.length) * 100);

  return (
    <main className="max-w-5xl mx-auto px-2 md:px-4 py-4 space-y-6 bg-bleepx-bg min-h-screen pb-20">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/cloud" className="hover:underline">BleepxCloud</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Certifications</span>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-700 rounded-2xl p-6 sm:p-10 text-white">
        <div className="flex items-center gap-3 mb-3">
          <SchoolIcon size={40} className="text-white" />
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight break-words">AWS Solutions Architect – Associate</h1>
        </div>
        <p className="text-white/80 text-sm sm:text-lg max-w-2xl leading-relaxed">
          Bleepx is building a fully integrated learning journey: SQL → Python → Data Science → ML → ETL → Cloud → SAA. Use this page as your master plan. It maps every SAA-C03 domain to hands-on labs, sandbox exercises, and missions.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cloud/certifications/practice" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white text-indigo-700 font-semibold text-sm hover:bg-gray-100 transition-colors shadow-lg">
            <FormsIcon size={16} /> Take Practice Exam
          </Link>
          <Link href="/cloud/sandbox" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-white/30 text-white/90 font-semibold text-sm hover:bg-white/10 transition-colors">
            Open Cloud Sandbox
          </Link>
          <Link href="/cloud/pipelines" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-white/30 text-white/90 font-medium text-sm hover:bg-white/10 transition-colors">
            <ToolsIcon size={16} /> ETL Pipeline
          </Link>
          <Link href="/lab" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-white/30 text-white/90 font-medium text-sm hover:bg-white/10 transition-colors">
            <FlaskIcon size={16} /> BleepxLab
          </Link>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-bleepx-white rounded-xl p-5 border border-bleepx-border shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-bleepx-text">Your Journey Progress</h2>
          <span className="text-2xl font-bold text-sky-600">{pct}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-bleepx-text-secondary mt-2">{completed}/{allSteps.length} steps checked off. Progress is saved in your browser.</p>
      </div>

      {/* Foundation track */}
      <div className="bg-bleepx-white rounded-xl p-5 border border-bleepx-border shadow-sm">
        <h2 className="text-lg font-bold text-bleepx-text mb-3 flex flex-wrap items-center gap-2"><MapIcon size={20} /> Master Plan: From Zero to SAA</h2>
        <p className="text-sm text-bleepx-text-secondary mb-4">Follow this sequence. Each step unlocks the vocabulary and skills needed for the next.</p>
        <div className="grid gap-2">
          {FOUNDATION_TRACK.map((step, idx) => (
            <label key={step.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={!!done[step.id]}
                onChange={() => toggle(step.id)}
                className="mt-0.5 w-4 h-4 text-sky-600 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                  <span className="font-semibold text-sm text-bleepx-text min-w-0 break-words">{step.label}</span>
                </div>
                <Link href={step.href} className="text-[10px] text-sky-600 hover:underline break-words min-w-0">{step.resource} →</Link>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* SAA Domains */}
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-bleepx-text">SAA-C03 Exam Domains</h2>
        {SAA_DOMAINS.map((domain) => (
          <div key={domain.id} className="bg-bleepx-white rounded-xl p-5 border border-bleepx-border shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-base font-bold text-bleepx-text min-w-0 break-words">{domain.title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium flex-shrink-0">{domain.weight}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase text-bleepx-text-secondary mb-1">AWS Topics</h4>
                <ul className="text-sm text-bleepx-text-secondary space-y-1 list-disc pl-4">
                  {domain.topics.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-bleepx-text-secondary mb-1">Bleepx Resources</h4>
                <div className="flex flex-wrap gap-2">
                  {domain.bleepx.map((b, i) => (
                    <Link key={i} href={b.href} className="text-xs px-2 py-1 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:underline">{b.label}</Link>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <h4 className="text-xs font-bold uppercase text-bleepx-text-secondary mb-2">Hands-on Checklist</h4>
              <div className="grid sm:grid-cols-2 gap-2">
                {domain.steps.map((step) => (
                  <label key={step.id} className="flex items-start gap-2 p-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={!!done[step.id]}
                      onChange={() => toggle(step.id)}
                      className="mt-0.5 w-4 h-4 text-sky-600 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-bleepx-text break-words">{step.label}</span>
                      <br/>
                      <Link href={step.href} className="text-[10px] text-sky-600 hover:underline break-words">{step.resource}</Link>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Exam tips */}
      <div className="bg-bleepx-white rounded-xl p-5 border border-bleepx-border shadow-sm">
        <h2 className="text-lg font-bold text-bleepx-text mb-2 flex flex-wrap items-center gap-2"><FormsIcon size={20} /> Exam Strategy</h2>
        <ul className="text-sm text-bleepx-text-secondary space-y-2 list-disc pl-4">
          <li><strong>Start with scenarios, not facts.</strong> SAA questions are scenario-based. The BleepxCloud missions put you in the architect's seat.</li>
          <li><strong>Master the pillars.</strong> Every answer should balance security, resilience, performance, and cost.</li>
          <li><strong>Know the defaults.</strong> S3 default is private; RDS storage can be gp2/gp3; security groups are stateful; NACLs are stateless.</li>
          <li><strong>Practice elimination.</strong> If an option uses public S3, open SSH to 0.0.0.0/0, or a single AZ, it is almost always wrong.</li>
          <li><strong>Map services to use cases:</strong> RDS for relational, DynamoDB for key-value, Lambda for event-driven, S3 for object store, CloudFront for caching.</li>
        </ul>
      </div>

      {/* Cross verse nav */}
      <div className="text-center">
        <Link href="/cloud" className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:underline font-medium">
          ← Back to BleepxCloud
        </Link>
      </div>
    </main>
  );
}
