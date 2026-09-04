'use client';

import { useEffect, useState } from 'react';
import { marked } from 'marked';

interface SafeMarkdownProps {
  source: string;
  className?: string;
}

export default function SafeMarkdown({ source, className }: SafeMarkdownProps) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    // dompurify needs a DOM, so load it only on the client.
    import('dompurify').then((mod) => {
      const DOMPurify = mod.default;
      const raw = marked(source, { async: false }) as string;
      if (!cancelled) {
        // nosemgrep: output is sanitized with DOMPurify before being injected.
        setHtml(DOMPurify.sanitize(raw));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [source]);

  // nosemgrep: html is sanitized with DOMPurify before being set.
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
