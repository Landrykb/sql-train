'use client';

import { useEffect, useState } from 'react';
import { CasePageSkeleton } from '@/components/Skeleton';

export default function Loading() {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    // Show skeleton after a delay to ensure it's visible even on fast networks
    const timer = setTimeout(() => setShowSkeleton(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!showSkeleton) {
    return null;
  }

  return <CasePageSkeleton />;
}
