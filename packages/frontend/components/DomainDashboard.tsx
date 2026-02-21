'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Papa from 'papaparse';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Visualizations from './Visualizations';
import DataGrid from './DataGrid';
import ClientCaseGrid from './ClientCaseGrid';
import { useProgress } from '@/lib/useProgress';
import { caseOrder } from '@/lib/constants';

const Spinner = dynamic(() => import('./Spinner'), { ssr: false });

export interface PlotData {
  caseId: string;
  title: string;
  plot: {
    data: any[];
    layout: any;
    config: { responsive: boolean; displayModeBar: boolean };
  };
  queryResults: {
    columns: string[];
    rows: any[][];
  };
  matplotlibImage?: string;
}

export interface TableData {
  name: string;
  columns: string[];
  previewRows: Record<string, string | number | null>[];
}

interface Dataset {
  name: string;
  file: string;
}

interface Case {
  id: string;
  name: string;
  tier: number;
  skills: string[];
}

interface DomainDashboardProps {
  domain: string;
  datasets: Dataset[];
  plots: PlotData[];
}

export default function DomainDashboard({
  domain,
  datasets,
  plots,
}: DomainDashboardProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [repoName, setRepoName] = useState('');
  const [createRepo, setCreateRepo] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    loading: boolean;
    message: string | null;
    error: string | null;
  }>({ loading: false, message: null, error: null });

  const progress = useProgress();
  const totalCases = caseOrder[domain]?.length || 0;
  const completedCases = progress.completed.size;

  const cases: Case[] = caseOrder[domain]?.map((caseId: string) => ({
    id: caseId,
    name: caseId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    tier: 1,
    skills: ['SQL'],
  })) || [];

  useEffect(() => {
    console.log('Plots prop:', plots);
    if (plots.length === 0) {
      console.warn('No plots received from backend. Check if backend is running at http://localhost:8000 and visualization_configs.py is set up correctly.');
    }
    plots.forEach((plot, index) => {
      console.log(`Plot ${index}:`, {
        caseId: plot.caseId,
        title: plot.title,
        dataLength: plot.plot.data?.length,
        data: plot.plot.data,
        queryRows: plot.queryResults.rows?.length,
        columns: plot.queryResults.columns,
        layout: plot.plot.layout,
        hasMatplotlib: !!plot.matplotlibImage,
      });
      if (!plot.plot.data || plot.plot.data.length === 0) {
        console.warn(`Plot ${plot.caseId} has no Plotly data. Falling back to Matplotlib if available.`);
      }
      if (!plot.queryResults.rows || plot.queryResults.rows.length === 0) {
        console.warn(`Plot ${plot.caseId} has no query results. Check query execution in app.py.`);
      }
    });
  }, [plots]);

  useEffect(() => {
    console.log('Datasets prop:', datasets);
    if (datasets.length === 0) {
      console.warn('No datasets provided. Check YAML case files in cases/{domain}/ and dataset files in public/datasets/.');
    }
  }, [datasets]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        console.log('Starting CSV parsing for datasets:', datasets);
        const promises = datasets.map(async (ds) => {
          try {
            // Normalize the file path to ensure it points to /datasets/
            const filePath = ds.file.startsWith('/datasets/')
              ? ds.file
              : `/datasets/${ds.file.split('/').pop()}`;
            console.log(`Fetching dataset: ${filePath}`);
            const res = await fetch(filePath);
            if (!res.ok) {
              console.error(`Failed to fetch ${filePath}: ${res.status} ${res.statusText}`);
              return null;
            }
            const txt = await res.text();
            const parsed = Papa.parse<Record<string, string | number | null>>(txt, {
              header: true,
              preview: 5,
              transform: (v) =>
                v === '' || v == null ? null : isNaN(Number(v)) ? v : Number(v),
            });
            console.log(`Parsed dataset ${ds.name}:`, {
              columns: parsed.meta.fields,
              rows: parsed.data.length,
            });
            return {
              name: ds.name,
              columns: parsed.meta.fields ?? [],
              previewRows: parsed.data,
            };
          } catch (err) {
            console.error(`Error parsing ${ds.file}: ${err}`);
            return null;
          }
        });
        const allTables = (await Promise.all(promises)).filter(
          (t): t is TableData => !!t
        );
        console.log('Parsed tables:', allTables);
        setTables(allTables);

        if (!allTables.length && !plots.length) {
          setError('No visualizations or datasets available. Ensure the backend is running, datasets are accessible, and queries are returning data.');
        }
      } catch (e: any) {
        console.error('Error loading datasets:', e);
        setError(`Failed to load datasets: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [datasets, plots]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('github_token');
    if (token) {
      setGithubToken(token);
      setExportModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGitHubLogin = async () => {
    try {
      const res = await axios.get('/api/auth/github');
      window.location.href = res.data.url;
    } catch (err) {
      setExportStatus({
        loading: false,
        message: null,
        error: 'Failed to initiate GitHub login',
      });
    }
  };

  const handleExportToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken) {
      setExportStatus({ loading: false, message: null, error: 'Please log in to GitHub' });
      return;
    }
    setExportStatus({ loading: true, message: null, error: null });
    try {
      const resp = await axios.post('/api/matplotlib/export', {
        domain,
        github_token: githubToken,
        repo_name: repoName,
        create_repo: createRepo,
      });
      setExportStatus({ loading: false, message: resp.data.message, error: null });
      setExportModalOpen(false);
      setTimeout(() => setExportStatus({ loading: false, message: null, error: null }), 5000);
    } catch (err: any) {
      setExportStatus({
        loading: false,
        message: null,
        error: err.response?.data?.detail || 'Failed to export to GitHub',
      });
    }
  };

  if (loading) {
    return (
      <Suspense fallback={<Spinner />}>
        <div className="flex items-center justify-center p-8" aria-live="polite">
          <Spinner />
          <span className="ml-2 text-gray-600">Loading dashboard...</span>
        </div>
      </Suspense>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8 bg-gray-50 min-h-screen">
        <nav className="text-sm font-medium text-blue-600 mb-6">
          <Link href={`/cases/${domain}`} className="hover:underline">
            Back to {domain} Exercises
          </Link>
        </nav>
        <div className="p-6 bg-red-100 text-red-800 rounded-xl shadow-lg" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8 bg-gray-50 min-h-screen">
      <nav className="text-sm font-medium text-blue-600" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {' > '}
        <Link href="/cases" className="hover:underline">
          Exercises
        </Link>
        {' > '}
        <Link href={`/cases/${domain}`} className="hover:underline">
          {domain.charAt(0).toUpperCase() + domain.slice(1)}
        </Link>
        {' > '}
        <span className="font-semibold">Dashboard</span>
      </nav>

      <header className="bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900">
          {domain.charAt(0).toUpperCase() + domain.slice(1)} Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Explore visualizations, query results, and datasets for the {domain} domain.
        </p>
      </header>

      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Progress</h2>
        <p className="text-gray-600 mb-4">
          Completed {completedCases} of {totalCases} cases.
        </p>
        <ClientCaseGrid domain={domain} cases={cases} />
      </section>

      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Visualizations and Query Results</h2>
        <Visualizations
          domain={domain}
          caseId="dashboard"
          datasets={datasets}
          plots={plots}
        />
      </section>

      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Datasets</h2>
        {tables.length > 0 ? (
          tables.map((table) => (
            <div key={table.name} className="mb-6">
              <h3 className="font-medium text-lg mb-2">Table: {table.name}</h3>
              <DataGrid data={table.previewRows} />
            </div>
          ))
        ) : (
          <p className="text-gray-600">
            No datasets available. Check the YAML case files and dataset files in public/datasets/.
          </p>
        )}
      </section>

      <section className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Export Dashboard</h2>
        <p className="mb-4 text-gray-600">
          Download a PDF report or export your progress to GitHub.
        </p>
        <div className="flex gap-4">
          <a
            href={`/api/export/pdf/${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            Download PDF
          </a>
          <button
            onClick={() => setExportModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
          >
            Export to GitHub
          </button>
          <Link href={`/cases/${domain}`}>
            <button className="px-4 py-2 border rounded-full hover:bg-gray-100 transition-colors">
              Back to Cases
            </button>
          </Link>
        </div>
        {exportStatus.message && (
          <p className="mt-4 text-green-600" role="alert">
            {exportStatus.message}
          </p>
        )}
        {exportStatus.error && (
          <p className="mt-4 text-red-600" role="alert">
            {exportStatus.error}
          </p>
        )}
      </section>

      {exportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Export to GitHub</h3>
            <form onSubmit={handleExportToGitHub} className="space-y-4">
              {!githubToken ? (
                <button
                  type="button"
                  onClick={handleGitHubLogin}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition-colors"
                >
                  Log in with GitHub
                </button>
              ) : (
                <>
                  <div>
                    <label htmlFor="repoName" className="block mb-1 font-medium">
                      Repository Name
                    </label>
                    <input
                      id="repoName"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="username/sql-progress"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createRepo}
                      onChange={(e) => setCreateRepo(e.target.checked)}
                      className="mr-2"
                      id="createRepo"
                    />
                    <label htmlFor="createRepo" className="text-sm">
                      Create repo if it doesn’t exist
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setExportModalOpen(false)}
                      className="px-4 py-2 border rounded hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={exportStatus.loading}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-green-400"
                    >
                      {exportStatus.loading ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}