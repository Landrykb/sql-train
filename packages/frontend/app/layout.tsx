import './globals.css';
import { ReactNode } from 'react';
import Link from 'next/link';
import NavHeader from '@/components/NavHeader';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  title: 'Bleepx - SQL & Data Science',
  description: 'Master SQL with BleepxQuery and Data Science with BleepxLab',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bleepx-bg min-h-screen font-sans overflow-x-hidden" suppressHydrationWarning>
        <AnalyticsProvider>
          <NavHeader />
          <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 text-bleepx-text">
            {children}
          </main>
          <footer className="bg-bleepx-white text-bleepx-text-secondary py-3 sm:py-4 border-t border-bleepx-border">
            <div className="max-w-5xl mx-auto px-3 sm:px-6 text-center text-xs sm:text-sm space-y-1">
              <p>&copy; 2025 Bleepx</p>
              <p className="flex flex-wrap justify-center gap-3 text-[11px]">
                <Link href="/privacy" className="hover:text-teal-600 transition-colors">Privacy</Link>
                <span aria-hidden>·</span>
                <Link href="/terms" className="hover:text-teal-600 transition-colors">Terms</Link>
                <span aria-hidden>·</span>
                <a href="https://github.com/Landrykb/sql-train" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 transition-colors">GitHub</a>
              </p>
            </div>
          </footer>
        </AnalyticsProvider>
      </body>
    </html>
  );
}