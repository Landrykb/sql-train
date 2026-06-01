'use client';

import React, { useState, useEffect } from 'react';
import { 
  InterpretationSection, 
  ReportData, 
  getDefaultSections, 
  saveInterpretation, 
  loadInterpretation,
  deleteInterpretation 
} from '@/lib/reportGeneration';
import { BleepxFace } from './BleepxIcons';

interface InterpretationEditorProps {
  verse: 'query' | 'lab' | 'cloud';
  itemId: string;
  itemName: string;
  domain?: string;
  onSave?: (data: ReportData) => void;
  onCancel?: () => void;
}

export function InterpretationEditor({ 
  verse, 
  itemId, 
  itemName, 
  domain,
  onSave,
  onCancel 
}: InterpretationEditorProps) {
  const [sections, setSections] = useState<InterpretationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load existing interpretation or create new
    const existing = loadInterpretation(verse, itemId);
    if (existing) {
      setSections(existing.sections);
    } else {
      setSections(getDefaultSections(verse));
    }
    setLoading(false);
  }, [verse, itemId]);

  const handleSectionChange = (index: number, content: string) => {
    const updated = [...sections];
    updated[index].userContent = content;
    setSections(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    setSaving(true);
    const data: ReportData = {
      verse,
      itemId,
      itemName,
      domain,
      sections,
      completedAt: new Date().toISOString()
    };
    saveInterpretation(data);
    setSaving(false);
    setHasChanges(false);
    onSave?.(data);
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-bleepx-text flex items-center gap-2">
            <BleepxFace size={20} />
            {itemName}
          </h3>
          <p className="text-xs text-bleepx-text-secondary mt-1">
            Write your analysis and interpretations. Bleepx will guide you with hints.
          </p>
        </div>
        <div className="flex gap-2">
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

      <div className="space-y-6">
        {sections.map((section, index) => (
          <div key={section.id} className="border border-bleepx-border rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <h4 className="font-bold text-bleepx-text">{section.title}</h4>
            </div>
            
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
