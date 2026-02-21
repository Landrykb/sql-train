'use client';
import { useProgress } from '@/lib/useProgress';

export default function ResetProgressButton() {
  const { resetProgress } = useProgress();
  return (
    <button
      onClick={() => {
        if (confirm('Reset all progress? This cannot be undone.')) {
          resetProgress();
          window.location.reload();
        }
      }}
      className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700"
    >
      Reset Progress
    </button>
  );
}