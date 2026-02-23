"use client";

import { useState, useEffect } from 'react';
import { playBleep } from '@/lib/audio';

/**
 * Client-side component for the "View Dashboard" button with Bleepx-themed loading messages.
 */
export default function DashboardButton({ domainKey }: { domainKey: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = [
    'Bleepx is fetching your dashboard, human!',
    'Processing data faster than Tokyo trains...',
    'Almost there, don’t compare me to a puppy!',
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleClick = () => {
    setIsLoading(true);
    playBleep();
    setTimeout(() => {
      window.location.href = `/cases/${domainKey}/dashboard`;
    }, 500);
  };

  return (
    <>
      <button
        className={`px-2 sm:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm bg-bleepx-blue text-white hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleClick}
        disabled={isLoading}
        title="View BleepxQuery Dashboard"
      >
        {isLoading ? '...' : 'Dashboard'}
      </button>
      {isLoading && (
        <div className="fixed top-14 sm:top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-bleepx-blue/10 to-bleepx-pink/10 text-bleepx-gray px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg flex items-center space-x-2 sm:space-x-3 animate-fade-in transition-opacity duration-300 max-w-[90vw]">
          <img src="/bleepx-icon.png" alt="Bleepx" className="h-5 w-5" />
          <div className="w-5 h-5 border-2 border-bleepx-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-xs sm:text-sm font-medium">{messages[messageIndex]}</span>
        </div>
      )}
    </>
  );
}