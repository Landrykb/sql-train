'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getGlossaryEntry, hasGlossaryEntry } from '@/lib/cloud/glossary';
import { BulbIcon, TargetIcon } from '@/components/AppIcons';

interface GlossaryTooltipProps {
  term: string;
  children: React.ReactNode;
  className?: string;
}

export function GlossaryTooltip({ term, children, className = '' }: GlossaryTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const entry = getGlossaryEntry(term);

  if (!entry) {
    return <span className={className}>{children}</span>;
  }

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    // Delay showing tooltip to prevent instant appearance/disappearance
    hoverTimeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top - 10,
          left: rect.left + rect.width / 2
        });
      }
      setIsOpen(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    // Delay hiding to prevent instant disappearance
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (isOpen) {
      setIsOpen(false);
    } else {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top - 10,
          left: rect.left + rect.width / 2
        });
      }
      setIsOpen(true);
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
          tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [isOpen]);

  return (
    <span className={`relative inline-block ${className}`}>
      <span
        ref={triggerRef}
        className="cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-medium hover:from-sky-100 hover:to-blue-100 dark:hover:from-sky-900/30 dark:hover:to-blue-900/30 transition-all duration-200 shadow-sm"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      
      {isOpen && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0"><BulbIcon size={24} className="text-amber-500" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-bold text-bleepx-text">{entry.term}</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-700 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800">
                  Bleepx analogy
                </span>
              </div>
              <p className="text-sm text-bleepx-text-secondary mb-3 leading-relaxed">{entry.definition}</p>
              <div className="rounded-lg bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 p-3 border-l-4 border-sky-500">
                <p className="text-xs font-bold text-sky-700 dark:text-sky-300 mb-1 flex items-center gap-1"><TargetIcon size={12} /> Analogy</p>
                <p className="text-sm text-bleepx-text leading-relaxed">{entry.analogy}</p>
              </div>
              {entry.example && (
                <p className="text-xs text-bleepx-text-secondary mt-3 italic leading-relaxed">
                  Example: {entry.example}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-bleepx-text-secondary">Click anywhere to close</p>
          </div>
        </div>
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
