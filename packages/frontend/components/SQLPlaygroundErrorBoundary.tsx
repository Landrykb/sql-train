'use client';

import React from 'react';
import { AlertIcon, RefreshIcon } from '@/components/AppIcons';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class SQLPlaygroundErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SQLPlayground] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-3">
            <AlertIcon size={24} className="text-red-600" />
            <h3 className="font-bold text-red-800 dark:text-red-300">Something went wrong</h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-400 mb-3">
            *bleep* The SQL playground encountered an error. This might be due to a large dataset or browser memory limits.
          </p>
          <p className="text-xs text-red-600 dark:text-red-500 font-mono mb-4">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <RefreshIcon size={16} className="inline" /> Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
