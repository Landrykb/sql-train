'use client';
import { useEffect } from 'react';
import { track } from '@/lib/analytics';

export default function TrackView({ event, props }: { event: string; props?: Record<string, any> }) {
  useEffect(() => { track(event, props); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
