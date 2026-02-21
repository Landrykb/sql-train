'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import DataGrid from './DataGrid';
import axios, { AxiosError } from 'axios';
import Image from 'next/image';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
const Spinner = dynamic(() => import('./Spinner'), { ssr: false });

interface PlotData {
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

interface VisualizationProps {
  domain: string;
  caseId: string;
  datasets: { name: string; file: string }[];
  plots?: PlotData[];
}

export default function Visualizations({ domain, caseId, datasets, plots: initialPlots }: VisualizationProps) {
  const [selectedViz, setSelectedViz] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [plots, setPlots] = useState<PlotData[]>(initialPlots || []);

  useEffect(() => {
    async function fetchPlots() {
      if (initialPlots?.length) {
        setPlots(initialPlots);
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`/api/visualizations/${domain}/${caseId}`);
        const fetchedPlots = response.data.visualizations.map((v: any) => ({
          caseId: v.case_id,
          title: v.title,
          plot: v.plot,
          queryResults: v.query_results,
          matplotlibImage: v.matplotlib_image,
        }));
        setPlots(fetchedPlots);
        setLoading(false);
      } catch (err: any) {
        const errorMessage = err instanceof AxiosError && err.response
          ? `Failed to fetch visualizations: ${err.response.status} - ${JSON.stringify(err.response.data)}`
          : `Failed to fetch visualizations: ${err.message}`;
        setError(errorMessage);
        setLoading(false);
      }
    }
    fetchPlots();
  }, [domain, caseId, initialPlots]);

  useEffect(() => {
    console.log(`Visualizations props: domain=${domain}, caseId=${caseId}, plots=`, plots);
    if (plots.length === 0) {
      console.warn('No plots provided. Check backend response and visualization_configs.py.');
    }
    plots.forEach((plot, index) => {
      console.log(`Plot ${index}:`, {
        caseId: plot.caseId,
        title: plot.title,
        dataLength: plot.plot.data?.length,
        queryRows: plot.queryResults.rows?.length,
        hasMatplotlib: !!plot.matplotlibImage,
      });
    });
  }, [domain, caseId, plots]);

  const handleExportToGitHub = async () => {
    setExportLoading(true);
    setExportError(null);
    try {
      const githubToken = prompt('Enter your GitHub Personal Access Token:');
      if (!githubToken) {
        throw new Error('GitHub token is required');
      }

      const response = await axios.post('/api/matplotlib/export', {
        domain,
        github_token: githubToken,
        repo_name: `sqlverse-${domain}-${caseId}`,
        create_repo: true,
      });
      alert(`Export successful! Repository URL: ${response.data.message}`);
    } catch (err: any) {
      const errorMessage =
        err instanceof AxiosError && err.response
          ? `Export failed: ${err.response.status} - ${JSON.stringify(err.response.data)}`
          : `Export failed: ${err.message}`;
      setExportError(errorMessage);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <Spinner />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        }
      >
        <div className="flex items-center justify-center p-8" aria-live="polite">
          <Spinner />
          <span className="ml-2 text-gray-600">Loading visualizations...</span>
        </div>
      </Suspense>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8 bg-gray-50 min-h-screen">
        <div className="p-6 bg-yellow-100 text-yellow-800 rounded-xl shadow-lg" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6 bg-gray-50 min-h-screen">
      <nav className="text-sm font-medium text-blue-600" aria-label="Breadcrumb">
        <ol className="flex space-x-2 items-center">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link href="/cases" className="hover:underline">
              Exercises
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link href={`/cases/${domain}`} className="hover:underline">
              {domain.charAt(0).toUpperCase() + domain.slice(1)}
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link href={`/cases/${domain}/${caseId}`} className="hover:underline">
              {caseId}
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-800 font-semibold">Visualizations</li>
        </ol>
      </nav>

      <header className="bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900">Visualizations for {caseId}</h1>
        <p className="mt-2 text-gray-600">Explore interactive dashboards for the {domain} domain.</p>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center mb-4">
          <label htmlFor="viz-select" className="text-gray-900 font-medium mr-3">
            Select Visualization:
          </label>
          <select
            id="viz-select"
            value={selectedViz}
            onChange={(e) => setSelectedViz(Number(e.target.value))}
            className="p-2 border border-gray-300 rounded-lg text-sm text-gray-700"
            aria-label="Select visualization"
          >
            {plots.map((plot, index) => (
              <option key={index} value={index}>
                {plot.title || `Visualization ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Plotly Visualization</h3>
        {plots[selectedViz]?.plot.data.length ? (
          <Plot
            data={plots[selectedViz].plot.data}
            layout={{
              ...plots[selectedViz].plot.layout,
              autosize: true,
              margin: { t: 50, b: 100, l: 80, r: 50 },
              title: plots[selectedViz].title,
            }}
            config={plots[selectedViz].plot.config || { responsive: true, displayModeBar: true }}
            className="w-full h-[500px]"
          />
        ) : plots[selectedViz]?.matplotlibImage ? (
          <div>
            <p className="text-yellow-600 mb-2">Plotly visualization unavailable, displaying Matplotlib fallback.</p>
            <Image
              src={plots[selectedViz].matplotlibImage}
              alt={plots[selectedViz].title}
              width={800}
              height={500}
              className="w-full max-h-[500px] object-contain"
            />
          </div>
        ) : (
          <p className="text-gray-600">No visualization available.</p>
        )}
        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Query Results</h3>
        {plots[selectedViz]?.queryResults.rows.length ? (
          <DataGrid
            data={plots[selectedViz].queryResults.rows.map((row) =>
              Object.fromEntries(
                plots[selectedViz].queryResults.columns.map((col, i) => [col, row[i]])
              )
            )}
          />
        ) : (
          <p className="text-gray-600">No query results available for this visualization.</p>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h2>
        <p className="text-gray-600">Export datasets or visualizations for advanced analysis:</p>
        <ol className="list-decimal pl-5 mt-2 text-gray-600">
          <li>Download the dataset from the case page.</li>
          <li>For Power BI/Tableau: Import the CSV and create custom dashboards.</li>
          <li>
            For Matplotlib: Use Python to generate plots. Example:
            <pre className="bg-gray-50 p-3 mt-2 rounded-lg text-sm text-gray-700">
              {`import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Example: Bar plot for business_retail
data = pd.read_csv('business_retail.csv')
sns.barplot(x='product_line', y='total', data=data)
plt.xlabel('Product Line')
plt.ylabel('Total Sales')
plt.title('Sales by Product Line')
plt.tight_layout()
plt.savefig('bar_plot.png')
plt.show()`}
            </pre>
          </li>
        </ol>
        <div className="mt-4 space-x-4">
          <button
            onClick={handleExportToGitHub}
            disabled={exportLoading}
            className={`px-4 py-2 rounded-full text-white transition-all duration-200 ${
              exportLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {exportLoading ? 'Exporting...' : 'Export to GitHub (PDF, PNGs & JSON)'}
          </button>
        </div>
        {exportError && (
          <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg">{exportError}</div>
        )}
      </div>
    </div>
  );
}