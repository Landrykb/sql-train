'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular', 
  width, 
  height 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

interface SkeletonCardProps {
  showAvatar?: boolean;
  lines?: number;
}

export function SkeletonCard({ showAvatar = true, lines = 3 }: SkeletonCardProps) {
  return (
    <div className="p-4 space-y-3">
      {showAvatar && (
        <div className="flex items-center space-x-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={20} />
            <Skeleton width="40%" height={16} />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            width={i === lines - 1 ? '80%' : '100%'} 
            height={16} 
          />
        ))}
      </div>
    </div>
  );
}

interface SkeletonButtonProps {
  width?: string | number;
  height?: string | number;
}

export function SkeletonButton({ width = '100%', height = 40 }: SkeletonButtonProps) {
  return (
    <Skeleton 
      variant="rounded" 
      width={width} 
      height={height} 
      className="rounded-full"
    />
  );
}

interface PageSkeletonProps {
  showHeader?: boolean;
  showSidebar?: boolean;
  contentLines?: number;
}

export function PageSkeleton({ 
  showHeader = true, 
  showSidebar = false, 
  contentLines = 8 
}: PageSkeletonProps) {
  return (
    <div className="min-h-screen bg-bleepx-background dark:bg-bleepx-background-dark">
      {showHeader && (
        <div className="border-b border-bleepx-gray/20 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Skeleton width={200} height={32} />
            <div className="flex items-center gap-4">
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="circular" width={32} height={32} />
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex gap-6">
          {showSidebar && (
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="space-y-3">
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </div>
            </div>
          )}
          <div className="flex-1 space-y-4">
            <Skeleton width="60%" height={32} />
            <Skeleton width="90%" height={20} />
            <div className="space-y-2 mt-6">
              {Array.from({ length: contentLines }).map((_, i) => (
                <Skeleton 
                  key={i} 
                  width={i === contentLines - 1 ? '75%' : '100%'} 
                  height={16} 
                />
              ))}
            </div>
            <div className="mt-8 space-y-3">
              <Skeleton height={48} width="30%" />
              <Skeleton height={48} width="30%" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CasePageSkeletonProps {
  showEditor?: boolean;
  showResults?: boolean;
}

export function CasePageSkeleton({ 
  showEditor = true, 
  showResults = true 
}: CasePageSkeletonProps) {
  return (
    <div className="min-h-screen bg-bleepx-background dark:bg-bleepx-background-dark">
      <div className="border-b border-bleepx-gray/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Skeleton width={150} height={28} />
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="circular" width={28} height={28} />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Skeleton width="40%" height={28} className="mb-2" />
          <Skeleton width="80%" height={16} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showEditor && (
            <div className="space-y-3">
              <Skeleton width="30%" height={20} />
              <div className="border border-bleepx-gray/20 rounded-lg p-4 h-[400px]">
                <div className="space-y-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} width={`${60 + Math.random() * 40}%`} height={14} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {showResults && (
            <div className="space-y-3">
              <Skeleton width="25%" height={20} />
              <div className="border border-bleepx-gray/20 rounded-lg p-4 h-[400px]">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Skeleton width="20%" height={20} />
                    <Skeleton width="25%" height={20} />
                    <Skeleton width="30%" height={20} />
                  </div>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex gap-2">
                      <Skeleton width="20%" height={16} />
                      <Skeleton width="25%" height={16} />
                      <Skeleton width="30%" height={16} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
