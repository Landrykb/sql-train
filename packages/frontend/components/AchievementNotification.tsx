'use client';

import { useState, useEffect } from 'react';
import { useProgress } from '@/lib/useProgress';

// BleepxPulse component for the pulse effect
const BleepxPulse: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="w-12 h-12 rounded-full bg-bleepx-blue/20 animate-bleepx-pulse"
        style={{ animationIterationCount: 1 }}
      />
      <div
        className="w-12 h-12 rounded-full bg-bleepx-blue/15 animate-bleepx-pulse"
        style={{ animationDelay: '0.2s', animationIterationCount: 1 }}
      />
      <div
        className="w-12 h-12 rounded-full bg-bleepx-blue/10 animate-bleepx-pulse"
        style={{ animationDelay: '0.4s', animationIterationCount: 1 }}
      />
    </div>
  );
};

export default function AchievementNotification() {
  const { completed } = useProgress();
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    // Handle achievement-unlocked events
    const handleAchievement = (e: Event) => {
      if (e instanceof CustomEvent && typeof e.detail === 'string') {
        setAchievements((prev) => {
          if (!prev.includes(e.detail)) {
            return [...prev, e.detail];
          }
          return prev;
        });
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1000); // Pulse for 1 second
      }
    };

    // Sync achievements from localStorage and completed cases
    const syncAchievements = () => {
      const completedCases = Array.from(completed);
      const storedAchievements = JSON.parse(localStorage.getItem('bleepxAchievements') || '[]') as string[];
      const newAchievements = [...storedAchievements];

      // Achievement logic
      if (completedCases.length >= 1 && !newAchievements.includes('First Query')) {
        newAchievements.push('First Query');
      }
      if (completedCases.length >= 5 && !newAchievements.includes('SwiftLink Rookie')) {
        newAchievements.push('SwiftLink Rookie');
      }
      if (completedCases.length >= 10 && !newAchievements.includes('Ghost Query Master')) {
        newAchievements.push('Ghost Query Master');
      }

      // Domain-specific achievements
      const completedCasesArray = JSON.parse(localStorage.getItem('completedCases') || '[]') as string[];
      const domains = [...new Set(completedCasesArray.map((id: string) => id.split('-')[0]))] as string[];
      domains.forEach((domain) => {
        const domainCompleted = completedCasesArray.filter((id: string) => id.startsWith(domain)).length >= 5;
        if (domainCompleted && !newAchievements.includes(`Tokyo Query Pro: ${domain}`)) {
          newAchievements.push(`Tokyo Query Pro: ${domain}`);
        }
      });

      // Update achievements if new ones were added
      if (newAchievements.length > storedAchievements.length) {
        setAchievements(newAchievements);
        localStorage.setItem('bleepxAchievements', JSON.stringify(newAchievements));
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1000);
      }
    };

    // Initial sync and event listener setup
    syncAchievements();
    window.addEventListener('achievement-unlocked', handleAchievement);

    return () => {
      window.removeEventListener('achievement-unlocked', handleAchievement);
    };
  }, [completed]);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {achievements.map((achievement, index) => (
        <div
          key={index}
          className="relative bg-bleepx-white text-bleepx-text px-4 py-3 rounded-lg shadow-md animate-slide-in flex items-center gap-3 border border-bleepx-border"
        >
          {showPulse && index === achievements.length - 1 && <BleepxPulse />}
          <img
            src="/bleepx-icon.png"
            alt="Bleepx"
            className="h-6 w-6"
            onError={(e) => {
              e.currentTarget.outerHTML = '<span class="text-bleepx-blue font-bold inline-block h-6 leading-6">B</span>';
            }}
          />
          <span className="text-sm font-medium">Achievement Unlocked: {achievement}</span>
        </div>
      ))}
    </div>
  );
}