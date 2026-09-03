import './globals.css';
import { ReactNode } from 'react';
import Link from 'next/link';
import NavHeader from '@/components/NavHeader';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import BleepxAssistant from '@/components/BleepxAssistant';
import Script from 'next/script';
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#57ECF4',
};

export const metadata = {
  title: 'Bleepx - SQL & Data Science',
  description: 'Master SQL with BleepxQuery and Data Science with BleepxLab',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Bleepx',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: '(function(){document.querySelectorAll("[id*=ton],[id*=tron],[id*=wallet]").forEach(e=>e.remove());setTimeout(()=>document.querySelectorAll("[id*=ton],[id*=tron],[id*=wallet]").forEach(e=>e.remove()),100);const originalError=console.error;console.error=function(...e){if(typeof e[0]==="string"&&(e[0].includes("418")||e[0].includes("hydration")||e[0].includes("Text content")))return;originalError.apply(console,e)}})()'}} />
      </head>
      <body className="bg-bleepx-bg min-h-screen flex flex-col font-sans" suppressHydrationWarning>
        <ErrorBoundary>
          <AnalyticsProvider>
            <NavHeader />
            <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 text-bleepx-text">
              {children}
            </main>
            <footer className="bg-bleepx-white text-bleepx-text-secondary py-3 sm:py-4 pb-24 border-t border-bleepx-border">
              <div className="max-w-5xl mx-auto px-3 sm:px-6 text-center text-xs sm:text-sm space-y-1">
                <p>&copy; {new Date().getFullYear()} Bleepx &mdash; All rights reserved.</p>
                <p className="flex flex-wrap justify-center items-center gap-3 text-[11px]">
                  <a
                    href="https://www.linkedin.com/in/landrykb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-teal-600 transition-colors"
                  >
                    LinkedIn
                  </a>
                  <span aria-hidden>&middot;</span>
                  <a
                    href="https://github.com/Landrykb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-teal-600 transition-colors"
                  >
                    GitHub
                  </a>
                  <span aria-hidden>&middot;</span>
                  <Link href="/privacy" className="hover:text-teal-600 transition-colors">Privacy</Link>
                  <span aria-hidden>&middot;</span>
                  <Link href="/terms" className="hover:text-teal-600 transition-colors">Terms</Link>
                </p>
              </div>
            </footer>
            <BleepxAssistant />
          </AnalyticsProvider>
        </ErrorBoundary>
        <Script strategy="afterInteractive" id="register-sw">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`}
        </Script>
      </body>
    </html>
  );
}