import './globals.css';
import { ReactNode } from 'react';
import NavHeader from '@/components/NavHeader';
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
        <NavHeader />
        <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 text-bleepx-text">
          {children}
        </main>
        <footer className="bg-bleepx-white text-bleepx-text-secondary py-3 sm:py-4 border-t border-bleepx-border">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 text-center text-xs sm:text-sm">
            <p>&copy; 2025 Bleepx</p>
          </div>
        </footer>
      </body>
    </html>
  );
}