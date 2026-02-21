import './globals.css';
import { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'BleepxQuery - SQL Challenges',
  description: 'Master SQL with Bleepx in an exciting adventure',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bleepx-bg min-h-screen font-sans" suppressHydrationWarning>
        <header className="bg-bleepx-white shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <picture>
                <source srcSet="/bleepx-logo.png" type="image/svg+xml" />
                <span className="text-bleepx-blue font-bold inline-block h-6 leading-6">
                  Bleepx
                </span>
              </picture>
              <h1 className="text-xl font-semibold text-bleepx-text">BleepxQuery</h1>
            </div>
            <nav>
              <Link href="/" className="text-bleepx-blue hover:underline font-medium">
                Home
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8 text-bleepx-text">
          {children}
        </main>
        <footer className="bg-bleepx-white text-bleepx-text-secondary py-4 border-t border-bleepx-border">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <p>© 2025 BleepxQuery</p>
          </div>
        </footer>
      </body>
    </html>
  );
}