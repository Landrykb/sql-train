import './globals.css';
import { ReactNode } from 'react';
import Link from 'next/link';
import NavAuth from '@/components/NavAuth';
import AuthProvider from '@/components/AuthProvider';
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  title: 'BleepxQuery - SQL Challenges',
  description: 'Master SQL with Bleepx in an exciting adventure',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bleepx-bg min-h-screen font-sans overflow-x-hidden" suppressHydrationWarning>
        <AuthProvider>
        <header className="bg-bleepx-white shadow-sm dark:shadow-gray-900/30 sticky top-0 z-40 border-b border-transparent dark:border-bleepx-border">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <picture>
                <source srcSet="/bleepx-logo.png" type="image/svg+xml" />
                <span className="text-bleepx-blue font-bold inline-block h-6 leading-6">
                  Bleepx
                </span>
              </picture>
              <h1 className="text-base sm:text-xl font-semibold text-bleepx-text">BleepxQuery</h1>
            </Link>
            <nav className="flex items-center gap-3 sm:gap-4">
              <Link href="/cases" className="flex items-center gap-1 text-bleepx-text-secondary hover:text-bleepx-blue font-semibold text-sm sm:text-base transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <span className="hidden sm:inline">Trials</span>
              </Link>
              <NavAuth />
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 text-bleepx-text">
          {children}
        </main>
        <footer className="bg-bleepx-white text-bleepx-text-secondary py-3 sm:py-4 border-t border-bleepx-border">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 text-center text-xs sm:text-sm">
            <p>&copy; 2025 BleepxQuery</p>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}