'use client';

import React, { useState } from 'react';
import { getGlossaryEntry, hasGlossaryEntry } from '@/lib/cloud/glossary';

interface GlossaryTooltipProps {
  term: string;
  children: React.ReactNode;
  className?: string;
}

export function GlossaryTooltip({ term, children, className = '' }: GlossaryTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const entry = getGlossaryEntry(term);

  if (!entry) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={`relative inline-block ${className}`}>
      <span
        className="cursor-help border-b-2 border-sky-400 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        title="Click or hover to learn more"
      >
        {children}
      </span>
      
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-bleepx-text">{entry.term}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                    Bleepx says
                  </span>
                </div>
                <p className="text-sm text-bleepx-text-secondary mb-2">{entry.definition}</p>
                <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 p-3 border-l-4 border-sky-400">
                  <p className="text-xs font-bold text-sky-700 dark:text-sky-300 mb-1">🎯 Analogy</p>
                  <p className="text-sm text-bleepx-text leading-relaxed">{entry.analogy}</p>
                </div>
                {entry.example && (
                  <p className="text-xs text-bleepx-text-secondary mt-2 italic">
                    Example: {entry.example}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-bleepx-text-secondary">Click anywhere to close</p>
            </div>
          </div>
        </>
      )}
    </span>
  );
}

/** Helper to wrap text with glossary tooltips for detected terms */
export function wrapTextWithGlossary(text: string): React.ReactNode {
  if (typeof text !== 'string') return text;
  
  // Simple approach: split by word boundaries and check each word
  // This is a basic implementation - for production, you'd want a more sophisticated parser
  const words = text.split(/(\s+)/);
  
  return words.map((word, index) => {
    const cleanWord = word.replace(/[^a-zA-Z0-9-_]/g, '');
    if (hasGlossaryEntry(cleanWord)) {
      return <GlossaryTooltip key={index} term={cleanWord}>{word}</GlossaryTooltip>;
    }
    return word;
  });
}
