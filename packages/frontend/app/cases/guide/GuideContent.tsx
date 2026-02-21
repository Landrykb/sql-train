'use client';

import { useState } from 'react';
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

interface GuideYaml {
  id: string;
  title: string;
  description: string;
  query_types: QueryType[];
}

export default function GuideContent({ guideData }: { guideData: GuideYaml }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-bleepx-text">Bleepx’s SQL Query Types</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {guideData.query_types.map((query, idx) => (
          <div
            key={query.name}
            className="border border-bleepx-border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full text-left px-4 py-3 bg-bleepx-white hover:bg-bleepx-blue hover:text-bleepx-white flex justify-between items-center font-medium text-bleepx-text transition-colors duration-300"
            >
              <span className="truncate">{query.name}</span>
              <span>{openIndex === idx ? '−' : '+'}</span>
            </button>
            <div
              className={`overflow-hidden transition-[max-height] duration-300 ${
                openIndex === idx ? 'max-h-screen p-4' : 'max-h-0'
              }`}
            >
              <p className="text-sm text-bleepx-text-secondary mb-3">{query.description}</p>
              <div className="space-y-6 text-xs">
                {query.variants.map((variant, i) => (
                  <div key={i} className="space-y-2">
                    <h3 className="font-semibold text-bleepx-text">{variant.name}</h3>
                    <p className="text-bleepx-text-secondary">{variant.description}</p>
                    <div className="bg-bleepx-white p-3 rounded border border-bleepx-border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      <div dangerouslySetInnerHTML={{ __html: marked(variant.example_generic) }} />
                    </div>
                    <div className="bg-bleepx-white p-3 rounded border border-bleepx-border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      <div dangerouslySetInnerHTML={{ __html: marked(variant.example) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}