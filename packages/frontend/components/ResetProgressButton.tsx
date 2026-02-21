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
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Reset Progress
    </button>
  );
}