'use client';

import React, { useState, useEffect } from 'react';
import { 
  InterpretationSection, 
  ReportData, 
  getDefaultSections, 
  saveInterpretation, 
  loadInterpretation,
  deleteInterpretation,
  formatReportMarkdown,
  pullAnalysisResults,
  generateCompleteReport
} from '@/lib/reportGeneration';
import { BleepxFace } from './BleepxIcons';
import { ChartBarIcon, AlertIcon } from '@/components/AppIcons';
import { IconDownload } from '@tabler/icons-react';
import { 
  useReportGeneration, 
  recordReportGeneration,
  getReportGenerationTier,
  canGenerateReports,
  REPORT_GENERATION_TIERS
} from '@/lib/pointsStore';
import { generateDomainGraphs, generateLabGraphs, mergeGraphsIntoReport, GeneratedGraph } from '@/lib/graphGeneration';
import { useProgress } from '@/lib/useProgress';

interface InterpretationEditorProps {
  verse: 'query' | 'lab' | 'cloud';
  itemId: string;
  itemName: string;
  domain?: string;
  onSave?: (data: ReportData) => void;
  onCancel?: () => void;
  currentPoints?: number;
}

export function InterpretationEditor({ 
  verse, 
  itemId, 
  itemName, 
  domain,
  onSave,
  onCancel,
  currentPoints = 0
}: InterpretationEditorProps) {
  const [sections, setSections] = useState<InterpretationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generatingGraphs, setGeneratingGraphs] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  // Check report generation permissions
  const reportPerms = useReportGeneration(itemId);
  const canGenerate = canGenerateReports();
  const reportTier = getReportGenerationTier();
  const { completed } = useProgress();
  
  // Check if user has any report tier (including if they're elite from other purchases)
  const hasReportTier = reportTier !== null;

  useEffect(() => {
    // Load existing interpretation or create new with context-aware hints
    const existing = loadInterpretation(verse, itemId);
    if (existing) {
      setSections(existing.sections);
      setReportData(existing);
    } else {
      const defaultSections = getDefaultSections(verse, itemId, domain);
      const analysisResults = pullAnalysisResults(verse, itemId, domain);
      setSections(defaultSections);
      setReportData({
        verse,
        itemId,
        itemName,
        domain,
        sections: defaultSections,
        completedAt: new Date().toISOString(),
        analysisResults
      });
    }
    setLoading(false);
  }, [verse, itemId, domain, itemName]);

  const handleSectionChange = (index: number, content: string) => {
    const updated = [...sections];
    updated[index].userContent = content;
    setSections(updated);
    setHasChanges(true);
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSection: InterpretationSection = {
      id: newSectionTitle.toLowerCase().replace(/\s+/g, '_'),
      title: newSectionTitle,
      hint: '*bleep* Add your custom analysis here.',
      placeholder: 'Write your custom interpretation...',
      userContent: ''
    };
    setSections([...sections, newSection]);
    setNewSectionTitle('');
    setShowAddSection(false);
    setHasChanges(true);
  };

  const handleRemoveSection = (index: number) => {
    const updated = sections.filter((_, i) => i !== index);
    setSections(updated);
    setHasChanges(true);
  };

  const handleGenerateGraphs = async () => {
    if (!domain) return;
    
    setGeneratingGraphs(true);
    try {
      let graphs: GeneratedGraph[] = [];
      if (verse === 'query') {
        const { fullCaseOrder } = await import('@/lib/constants');
        const completedCases = (fullCaseOrder[domain] || []).filter(c => completed.has(c));
        console.log('Generating graphs for domain:', domain, 'completed cases:', completedCases);
        graphs = await generateDomainGraphs(domain, completedCases);
      } else if (verse === 'lab') {
        const { LAB_CASE_ORDER } = await import('@/lib/labConstants');
        const completedProjects = (LAB_CASE_ORDER[domain] || []).filter(p => completed.has(p) || completed.has(`lab_${p}`));
        console.log('Generating graphs for lab domain:', domain, 'completed projects:', completedProjects);
        graphs = await generateLabGraphs(domain, completedProjects);
      }
      
      if (graphs.length > 0) {
        const updated = mergeGraphsIntoReport(reportData, graphs);
        setReportData(updated);
        recordReportGeneration(itemId);
      } else {
        console.warn('No graphs generated - no completed cases/projects found for domain:', domain);
      }
    } catch (err) {
      console.error('Error generating graphs:', err);
    } finally {
      setGeneratingGraphs(false);
    }
  };

  const handleSave = () => {
    setSaving(true);
    const updatedReport: ReportData = {
      verse,
      itemId,
      itemName,
      domain,
      sections,
      completedAt: new Date().toISOString(),
      graphs: reportData?.graphs,
      analysisResults: reportData?.analysisResults || pullAnalysisResults(verse, itemId, domain)
    };
    saveInterpretation(updatedReport);
    setHasChanges(false);
    setSaving(false);
    onSave?.(updatedReport);
  };

  const handleExportMarkdown = () => {
    if (!reportData) return;
    // Ensure analysis results are included in the export
    const reportWithResults = {
      ...reportData,
      analysisResults: reportData.analysisResults || pullAnalysisResults(verse, itemId, domain)
    };
    const markdown = formatReportMarkdown(reportWithResults);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${itemName.replace(/\s+/g, '_')}_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all your interpretations? This cannot be undone.')) {
      const cleared = sections.map(s => ({ ...s, userContent: '' }));
      setSections(cleared);
      setHasChanges(true);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this entire interpretation?')) {
      deleteInterpretation(verse, itemId);
      onCancel?.();
    }
  };

  if (loading) {
    return <div className="text-center text-bleepx-text-secondary py-8">Loading interpretation...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-bleepx-text flex flex-wrap items-center gap-2">
            <BleepxFace size={20} />
            {itemName}
          </h3>
          <p className="text-xs text-bleepx-text-secondary mt-1">
            {verse === 'query' ? 'SQL' : verse === 'lab' ? 'Data Science' : 'Cloud'} Portfolio Interpretation
          </p>
        </div>
        <div className="flex gap-2">
          {reportTier?.perks.includeGraphs && domain && (
            <button
              onClick={handleGenerateGraphs}
              disabled={generatingGraphs || !reportPerms.allowed}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {generatingGraphs ? 'Generating...' : <span className="inline-flex flex-wrap items-center gap-1.5"><ChartBarIcon size={14} className="inline" /> Generate Graphs</span>}
            </button>
          )}
          {reportTier?.perks.multipleFormats && (
            <button
              onClick={handleExportMarkdown}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-bleepx-border text-bleepx-text hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <IconDownload size={14} className="inline" /> Export
            </button>
          )}
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-bleepx-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-bleepx-border text-bleepx-text text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {!hasReportTier && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-2 flex flex-wrap items-center gap-1.5">
            <AlertIcon size={14} className="inline" /> Purchase a Report Generation tier to unlock AI-powered reports with graphs
          </p>
          <div className="flex flex-wrap gap-2">
            {REPORT_GENERATION_TIERS.map((tier) => (
              <button
                key={tier.id}
                onClick={() => {
                  // Navigate to profile page to purchase
                  window.location.href = '/profile?tab=shop';
                }}
                className="px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
              >
                {tier.name} ({tier.cost} pts)
              </button>
            ))}
          </div>
        </div>
      )}

      {reportPerms.error && hasReportTier && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-800 dark:text-red-300 flex flex-wrap items-center gap-1.5">
            <AlertIcon size={14} className="inline" /> {reportPerms.error}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {sections.map((section, index) => (
          <div key={section.id} className="border border-bleepx-border rounded-lg p-4 relative">
            <div className="flex flex-wrap items-start justify-between mb-2">
              <h4 className="font-bold text-bleepx-text">{section.title}</h4>
              <button
                onClick={() => handleRemoveSection(index)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            
            {section.context && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 border-l-4 border-emerald-400 mb-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  <span className="font-semibold inline-flex flex-wrap items-center gap-1"><ChartBarIcon size={12} className="inline" /> Context:</span> {section.context}
                </p>
              </div>
            )}

            <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 p-3 border-l-4 border-sky-400 mb-3">
              <p className="text-xs text-sky-700 dark:text-sky-300">{section.hint}</p>
            </div>

            <textarea
              value={section.userContent}
              onChange={(e) => handleSectionChange(index, e.target.value)}
              placeholder={section.placeholder}
              className="w-full min-h-[120px] p-3 rounded-lg border border-bleepx-border bg-bleepx-white text-bleepx-text text-sm resize-y focus:outline-none focus:ring-2 focus:ring-bleepx-blue"
            />
          </div>
        ))}
      </div>

      <div className="border border-dashed border-bleepx-border rounded-lg p-4">
        {showAddSection ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Section title (e.g., 'Risk Analysis')"
              className="w-full px-3 py-2 rounded-lg border border-bleepx-border bg-bleepx-white text-bleepx-text text-sm focus:outline-none focus:ring-2 focus:ring-bleepx-blue"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddSection}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bleepx-blue text-white hover:bg-blue-600 transition-colors"
              >
                Add Section
              </button>
              <button
                onClick={() => setShowAddSection(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-bleepx-border text-bleepx-text hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddSection(true)}
            className="w-full text-center text-sm text-bleepx-text-secondary hover:text-bleepx-text"
          >
            + Add Custom Section
          </button>
        )}
      </div>

      {/* Analysis Results Display */}
      {reportData?.analysisResults && reportData.analysisResults.length > 0 && (
        <div className="border border-bleepx-border rounded-lg p-4">
          <h4 className="font-bold text-bleepx-text mb-3">Analysis Results</h4>
          <div className="space-y-4">
            {reportData.analysisResults.map((result, idx) => (
              <div key={idx} className="border border-bleepx-border rounded-lg p-3">
                <div className="flex flex-wrap items-start justify-between mb-2">
                  <h5 className="font-semibold text-bleepx-text text-sm">{result.title}</h5>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                    {result.type}
                  </span>
                </div>
                {result.summary && (
                  <p className="text-xs text-bleepx-text-secondary mb-2">{result.summary}</p>
                )}
                {result.query && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-bleepx-text mb-1">Query:</p>
                    <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                      <code>{result.query}</code>
                    </pre>
                  </div>
                )}
                {result.data && Array.isArray(result.data) && result.data.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-bleepx-text mb-1">Data Preview ({result.data.length} rows):</p>
                    <div className="overflow-x-auto">
                      <table className="text-xs w-full border-collapse">
                        <thead>
                          <tr className="border-b border-bleepx-border">
                            {Object.keys(result.data[0]).map(key => (
                              <th key={key} className="text-left p-1 font-semibold text-bleepx-text">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.data.slice(0, 5).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-gray-200 dark:border-gray-700">
                              {Object.values(row).map((val, valIdx) => (
                                <td key={valIdx} className="p-1 text-bleepx-text-secondary">{String(val ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {result.data.length > 5 && (
                        <p className="text-xs text-bleepx-text-secondary mt-1">... and {result.data.length - 5} more rows</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graphs Display */}
      {reportData?.graphs && reportData.graphs.length > 0 && (
        <div className="border border-bleepx-border rounded-lg p-4">
          <h4 className="font-bold text-bleepx-text mb-3">Generated Graphs</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportData.graphs.map((graph, idx) => (
              <div key={idx} className="border border-bleepx-border rounded-lg p-2">
                <img src={graph.imageData} alt={graph.title} className="w-full h-auto" />
                <p className="text-xs text-bleepx-text-secondary mt-2">{graph.title}</p>
                {graph.insights && graph.insights.length > 0 && (
                  <div className="mt-2 text-xs text-bleepx-text-secondary">
                    <strong>Insights:</strong>
                    <ul className="list-disc list-inside">
                      {graph.insights.map((insight, i) => (
                        <li key={i}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Graphs Button for users with tier */}
      {hasReportTier && reportTier?.perks.includeGraphs && domain && (
        <div className="border border-dashed border-bleepx-border rounded-lg p-4 text-center">
          <button
            onClick={handleGenerateGraphs}
            disabled={generatingGraphs}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {generatingGraphs ? 'Generating...' : (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <ChartBarIcon size={14} className="inline" />
                {reportData?.graphs?.length ? 'Regenerate Graphs' : 'Generate Graphs from Your Data'}
              </span>
            )}
          </button>
          <p className="text-xs text-bleepx-text-secondary mt-2">
            Generate data-driven graphs from your completed work
          </p>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-bleepx-border">
        <button
          onClick={handleClear}
          className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 rounded-lg text-sm text-red-600 hover:text-red-700 transition-colors"
        >
          Delete Interpretation
        </button>
      </div>
    </div>
  );
}
