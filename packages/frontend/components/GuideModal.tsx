'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';

interface QueryVariant {
  name: string;
  description: string;
  example_generic: string;
  example: string;
}

interface QueryType {
  name: string;
  description: string;
  variants: QueryVariant[];
}

interface GuideData {
  id: string;
  title: string;
  description: string;
  query_types: QueryType[];
}

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  guideData: GuideData | null;
  scrollToSection?: string;
}

export default function GuideModal({ isOpen, onClose, guideData, scrollToSection }: GuideModalProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Auto-open section when scrollToSection changes
  useEffect(() => {
    if (scrollToSection && guideData) {
      const idx = guideData.query_types.findIndex(
        (qt) => qt.name.toLowerCase().replace(/[^a-z0-9]/g, '') === scrollToSection.toLowerCase().replace(/[^a-z0-9]/g, '')
          || qt.name.toLowerCase().includes(scrollToSection.toLowerCase())
      );
      if (idx >= 0) {
        setOpenIndex(idx);
        setSearch('');
      }
    }
  }, [scrollToSection, guideData]);

  const filteredTypes = guideData?.query_types.filter((qt) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return qt.name.toLowerCase().includes(s) || qt.description.toLowerCase().includes(s)
      || qt.variants.some((v) => v.name.toLowerCase().includes(s) || v.description.toLowerCase().includes(s));
  }) ?? [];

  if (!isOpen || !guideData) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="SQL GuideBook">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-lg bg-bleepx-bg border-l border-bleepx-border shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bleepx-border bg-bleepx-white">
          <div>
            <h2 className="text-lg font-bold text-bleepx-text flex items-center gap-2">
              <span>📖</span> SQL GuideBook
            </h2>
            <p className="text-xs text-bleepx-text-secondary mt-0.5">Quick reference — stay on your challenge</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bleepx-border/50 transition-colors text-bleepx-text-secondary hover:text-bleepx-text"
            aria-label="Close guide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-bleepx-border bg-bleepx-white">
          <input
            type="text"
            placeholder="Search keywords... (SELECT, JOIN, CTE, RANK...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-bleepx-border bg-bleepx-bg text-bleepx-text placeholder:text-bleepx-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-bleepx-blue/40"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {filteredTypes.length === 0 && (
            <p className="text-sm text-bleepx-text-secondary text-center py-8">No matching SQL commands found.</p>
          )}
          {filteredTypes.map((qt, idx) => {
            const realIdx = guideData.query_types.indexOf(qt);
            const isExpanded = openIndex === realIdx;
            return (
              <div key={qt.name} className="border border-bleepx-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenIndex(isExpanded ? null : realIdx)}
                  className={`w-full text-left px-4 py-3 flex justify-between items-center text-sm font-semibold transition-colors duration-200 ${
                    isExpanded
                      ? 'bg-bleepx-blue text-white'
                      : 'bg-bleepx-white text-bleepx-text hover:bg-bleepx-blue/10'
                  }`}
                >
                  <span>{qt.name}</span>
                  <span className="text-xs">{isExpanded ? '▾' : '▸'}</span>
                </button>
                {isExpanded && (
                  <div className="px-4 py-3 bg-bleepx-white space-y-4">
                    <p className="text-xs text-bleepx-text-secondary">{qt.description}</p>
                    {qt.variants.map((variant, vi) => (
                      <div key={vi} className="space-y-2">
                        <h4 className="text-xs font-bold text-bleepx-text">{variant.name}</h4>
                        <p className="text-xs text-bleepx-text-secondary">{variant.description}</p>
                        <div className="text-[11px] font-mono bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                          <div dangerouslySetInnerHTML={{ __html: marked(variant.example_generic) }} />
                        </div>
                        <details className="group">
                          <summary className="text-[11px] text-bleepx-blue cursor-pointer hover:underline">Show real-world example</summary>
                          <div className="mt-1 text-[11px] font-mono bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded border border-blue-200 dark:border-blue-800 overflow-x-auto whitespace-pre-wrap text-blue-800 dark:text-blue-200">
                            <div dangerouslySetInnerHTML={{ __html: marked(variant.example) }} />
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-bleepx-border bg-bleepx-white text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium rounded-full bg-bleepx-blue text-white hover:bg-blue-700 transition-colors"
          >
            Back to Challenge
          </button>
        </div>
      </div>
    </div>
  );
}
