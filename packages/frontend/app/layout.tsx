import './globals.css';
import { ReactNode } from 'react';
import Link from 'next/link';
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
        <header className="bg-bleepx-white shadow-sm sticky top-0 z-40">
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
              <Link href="/cases" className="text-bleepx-text-secondary hover:text-bleepx-blue font-medium text-sm sm:text-base transition-colors">
                Challenges
              </Link>
              <Link href="/profile" className="flex items-center gap-1.5 text-bleepx-blue hover:text-bleepx-blue-hover font-medium text-sm sm:text-base transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="hidden sm:inline">Profile</span>
              </Link>
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
      </body>
    </html>
  );
}