import './globals.css';
import { ReactNode } from 'react';
import Link from 'next/link';
import NavHeader from '@/components/NavHeader';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import SignupNudge from '@/components/SignupNudge';
import ErrorBoundary from '@/components/ErrorBoundary';
import BleepxAssistant from '@/components/BleepxAssistant';
import { ArenaRunnerProvider } from '@/components/arena/ArenaRunner';
import MiniFight from '@/components/arena/MiniFight';
import AppToaster from '@/components/AppToaster';
import Script from 'next/script';
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#57ECF4',
};

export const metadata = {
  metadataBase: new URL('https://bleepxacademy.vercel.app'),
  title: { default: 'Bleepx — SQL, Data Science & Cloud training', template: '%s | Bleepx' },
  description: 'Master SQL with BleepxQuery, data science with BleepxLab, and cloud with BleepxCloud — free, in-browser training with a fight-card Arena.',
  openGraph: {
    title: 'Bleepx — SQL, Data Science & Cloud training',
    description: 'Free in-browser training: SQL challenges, Python/R labs, cloud missions — plus the Bleepx Arena.',
    siteName: 'Bleepx',
    type: 'website',
    images: [{ url: '/bleepx-logo.png', width: 512, height: 512, alt: 'Bleepx' }],
  },
  twitter: { card: 'summary', title: 'Bleepx — SQL, Data Science & Cloud training', description: 'Free in-browser SQL, Python and cloud training.' },
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
        {/* nosemgrep: hardcoded, self-contained hydration-cleanup script. */}
        <script dangerouslySetInnerHTML={{__html: '(function(){document.querySelectorAll("[id*=ton],[id*=tron],[id*=wallet]").forEach(e=>e.remove());setTimeout(()=>document.querySelectorAll("[id*=ton],[id*=tron],[id*=wallet]").forEach(e=>e.remove()),100);const originalError=console.error;console.error=function(...e){if(typeof e[0]==="string"&&(e[0].includes("418")||e[0].includes("hydration")||e[0].includes("Text content")))return;originalError.apply(console,e)}})()'}} />
      </head>
      <body className="bg-bleepx-bg min-h-screen flex flex-col font-sans" suppressHydrationWarning>
        <ErrorBoundary>
          <AnalyticsProvider>
            <ArenaRunnerProvider>
            <NavHeader />
            <SignupNudge />
            <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-2 sm:px-6 py-3 sm:py-6 text-bleepx-text min-w-0">
              {children}
            </main>
            <footer className="bg-bleepx-white text-bleepx-text-secondary py-3 sm:py-4 pb-24 border-t border-bleepx-border min-w-0">
              <div className="max-w-5xl mx-auto px-2 sm:px-6 text-center text-xs sm:text-sm space-y-1">
                <p>&copy; {new Date().getFullYear()} Bleepx &mdash; All rights reserved.</p>
                <p className="flex flex-wrap justify-center items-center gap-3 text-xs sm:text-sm">
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
            <MiniFight />
            <AppToaster />
            </ArenaRunnerProvider>
          </AnalyticsProvider>
        </ErrorBoundary>
        <Script strategy="afterInteractive" id="register-sw">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`}
        </Script>
      </body>
    </html>
  );
}