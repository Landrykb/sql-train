'use client';

import {
  BarChart3,
  BookOpen,
  Cloud,
  Coins,
  Database,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Target,
  Trophy,
  Upload,
} from 'lucide-react';

interface NavIconProps {
  size?: number;
  className?: string;
}

// Profile tab icons
export const OverviewIcon = ({ size = 18, className }: NavIconProps) => <BarChart3 size={size} className={className} />;
export const ShopIcon = ({ size = 18, className }: NavIconProps) => <Coins size={size} className={className} />;
export const AchievementsIcon = ({ size = 18, className }: NavIconProps) => <Trophy size={size} className={className} />;
export const ExportsIcon = ({ size = 18, className }: NavIconProps) => <Upload size={size} className={className} />;
export const SettingsIcon = ({ size = 18, className }: NavIconProps) => <Settings size={size} className={className} />;

// Global nav icons (same meaning in every verse)
export const DashboardIcon = ({ size = 18, className }: NavIconProps) => <LayoutDashboard size={size} className={className} />;
export const TrialsIcon = ({ size = 18, className }: NavIconProps) => <Target size={size} className={className} />;
export const GuideIcon = ({ size = 18, className }: NavIconProps) => <BookOpen size={size} className={className} />;
export const ProjectsIcon = ({ size = 18, className }: NavIconProps) => <FolderOpen size={size} className={className} />;

// Verse switcher icons
export const QueryIcon = ({ size = 18, className }: NavIconProps) => <Database size={size} className={className} />;
export const LabIcon = ({ size = 18, className }: NavIconProps) => <FlaskConical size={size} className={className} />;
export const CloudIcon = ({ size = 18, className }: NavIconProps) => <Cloud size={size} className={className} />;

export function VerseIcon({ verse, size = 18, className }: { verse: 'query' | 'lab' | 'cloud' } & NavIconProps) {
  if (verse === 'lab') return <LabIcon size={size} className={className} />;
  if (verse === 'cloud') return <CloudIcon size={size} className={className} />;
  return <QueryIcon size={size} className={className} />;
}
