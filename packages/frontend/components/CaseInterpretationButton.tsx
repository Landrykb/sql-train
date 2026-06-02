'use client';

import React, { useState } from 'react';
import { InterpretationEditor } from './InterpretationEditor';

interface CaseInterpretationButtonProps {
  verse: 'query' | 'lab' | 'cloud';
  itemId: string;
  itemName: string;
  domain?: string;
}

export function CaseInterpretationButton({ verse, itemId, itemName, domain }: CaseInterpretationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-bleepx-border text-bleepx-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        📝 Write Analysis
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bleepx-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-bleepx-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-bleepx-text">{itemName}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-bleepx-text-secondary hover:text-bleepx-text"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <InterpretationEditor
                verse={verse}
                itemId={itemId}
                itemName={itemName}
                domain={domain}
                onSave={() => setIsOpen(false)}
                onCancel={() => setIsOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
