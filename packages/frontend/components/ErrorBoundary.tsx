'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary to catch and suppress hydration errors caused by browser extensions.
 * 
 * Browser extensions (wallets, ad blockers, etc.) can inject content into the DOM
 * before React hydrates, causing hydration mismatches. This error boundary catches
 * these errors and renders the children normally, allowing the app to function
 * despite extension interference.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if this is a hydration error (error #418 or message contains "hydration")
    if (error.message.includes('418') || error.message.includes('hydration') || error.message.includes('Text content')) {
      // Return null to not update state - we'll ignore this error
      return null;
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log hydration errors but don't crash the app
    if (error.message.includes('418') || error.message.includes('hydration') || error.message.includes('Text content')) {
      console.warn('[ErrorBoundary] Ignoring hydration error from browser extension:', error.message);
      return;
    }
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-bleepx-text mb-2">Something went wrong</h1>
            <p className="text-bleepx-text-secondary mb-4">Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-bleepx-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
