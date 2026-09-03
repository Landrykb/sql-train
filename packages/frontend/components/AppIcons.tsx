'use client';

import type { ComponentType } from 'react';
import {
  IconBuildingStore,
  IconBuildingBank,
  IconFingerprint,
  IconSeeding,
  IconTrendingUp,
  IconHeartbeat,
  IconCircleFilled,
  IconSkull,
  IconMoon,
  IconSun,
  IconEye,
  IconEyeOff,
  IconEraser,
  IconUpload,
  IconFileText,
  IconPrinter,
  IconClock,
  IconPlayerPlay,
  IconRotateClockwise,
  IconHistory,
  IconFolder,
  IconCircle,
  IconSearch,
  IconMessages,
  IconRocket,
  IconBallBasketball,
  IconBus,
  IconChartLine,
  IconUserMinus,
  IconMusic,
  IconShield,
  IconLeaf,
  IconRecycle,
  IconWheat,
  IconChartBar,
  IconCoin,
  IconBrandAws,
  IconBrandAzure,
  IconBrandGoogle,
  IconCloudComputing,
  IconCloud,
  IconBuilding,
  IconRouter,
  IconTrophy,
  IconTarget,
  IconThumbUp,
  IconHash,
  IconCrown,
  IconWorld,
  IconBolt,
  IconBarbell,
  IconMedal,
  IconFlask,
  IconBook,
  IconSchool,
  IconPencil,
  IconBrain,
  IconTools,
  IconSettings,
  IconUser,
  IconStar,
  IconStarFilled,
  IconCheck,
  IconTerminal,
  IconCode,
  IconSend,
  IconBulb,
  IconDatabase,
  IconRobot,
  IconMap,
  IconForms,
  IconLock,
  IconLockOpen,
  IconDice,
  IconCompass,
  IconTable,
  IconLetterR,
  IconCopy,
  IconExternalLink,
  IconX,
  IconFlame,
  IconDiamond,
  IconGhost,
  IconSpy,
  IconDna,
  IconSatellite,
  IconRefresh,
  IconAlertTriangle,
} from '@tabler/icons-react';

interface AppIconProps {
  size?: number;
  className?: string;
}

type TablerIcon = ComponentType<AppIconProps>;

// ─── SQL domain icons ───────────────────────────────────────────────────────
const DOMAIN_ICONS: Record<string, TablerIcon> = {
  business: IconBuildingStore,
  crime: IconFingerprint,
  farming: IconSeeding,
  finance: IconTrendingUp,
  healthcare: IconHeartbeat,
  social: IconMessages,
  space: IconRocket,
  sports: IconBallBasketball,
};

export function DomainIcon({ domain, size = 20, className }: { domain: string } & AppIconProps) {
  const I = DOMAIN_ICONS[domain] || IconWorld;
  return <I size={size} className={className} />;
}

// ─── Lab domain icons ───────────────────────────────────────────────────────
const LAB_DOMAIN_ICONS: Record<string, TablerIcon> = {
  transport: IconBus,
  forecasting: IconChartLine,
  churn: IconUserMinus,
  music: IconMusic,
  fraud: IconShield,
  esg_climate: IconLeaf,
  decarb: IconRecycle,
  agri_econ: IconWheat,
  fin_risk: IconChartBar,
  carbon_credits: IconCoin,
};

export function LabDomainIcon({ domain, size = 20, className }: { domain: string } & AppIconProps) {
  const I = LAB_DOMAIN_ICONS[domain] || IconFlask;
  return <I size={size} className={className} />;
}

// ─── Cloud provider icons ─────────────────────────────────────────────────────
const CLOUD_PROVIDER_ICONS: Record<string, TablerIcon> = {
  aws: IconBrandAws,
  azure: IconBrandAzure,
  gcp: IconBrandGoogle,
  esg: IconLeaf,
  finance: IconCoin,
  general: IconBook,
};

export function CloudProviderIcon({ provider, size = 22, className }: { provider: string } & AppIconProps) {
  const I = CLOUD_PROVIDER_ICONS[provider] || IconCloudComputing;
  return <I size={size} className={className} />;
}

// ─── Achievement icons ──────────────────────────────────────────────────────
const ACHIEVEMENT_ICONS: Record<string, TablerIcon> = {
  first_query: IconTarget,
  five_down: IconThumbUp,
  ten_solved: IconHash,
  domain_master: IconCrown,
  multi_domain: IconWorld,
  speed_demon: IconBolt,
  persistent: IconBarbell,
  all_domains: IconMedal,
  lab_pioneer: IconFlask,
  data_scientist: IconChartBar,
  lab_legend: IconChartLine,
  full_stack_ds: IconSchool,
  cloud_initiate: IconCloud,
  cloud_architect: IconBuilding,
  multi_cloud: IconCloudComputing,
  track_master: IconRouter,
  cloud_overlord: IconTrophy,
  tri_verse: IconWorld,
};

export function AchievementIcon({ id, size = 22, className }: { id: string } & AppIconProps) {
  const I = ACHIEVEMENT_ICONS[id] || IconTrophy;
  return <I size={size} className={className} />;
}

// ─── Badge icons (store/achievements) ─────────────────────────────────────────
const BADGE_ICONS: Record<string, TablerIcon> = {
  badge_fire: IconFlame,
  badge_brain: IconBrain,
  badge_rocket: IconRocket,
  badge_crown: IconCrown,
  badge_diamond: IconDiamond,
  badge_ghost: IconGhost,
  badge_star: IconStarFilled,
  badge_ninja: IconSpy,
  badge_lightning: IconBolt,
  badge_trophy: IconTrophy,
  badge_flask: IconFlask,
  badge_dna: IconDna,
  badge_cloud: IconCloud,
  badge_satellite: IconSatellite,
};

export function BadgeIcon({ id, size = 16, className }: { id: string } & AppIconProps) {
  const I = BADGE_ICONS[id] || IconTrophy;
  return <I size={size} className={className} />;
}

// ─── Journey goal icons ───────────────────────────────────────────────────────
const GOAL_ICONS: Record<string, TablerIcon> = {
  sql: IconDatabase,
  python: IconCode,
  datascience: IconChartBar,
  'machine-learning': IconRobot,
  llm: IconBrain,
  cloud: IconCloud,
  saa: IconSchool,
  carbon: IconLeaf,
};

export function GoalIcon({ goal, size = 18, className }: { goal: string } & AppIconProps) {
  const I = GOAL_ICONS[goal] || IconTarget;
  return <I size={size} className={className} />;
}

// ─── Lab quiz topic icons ─────────────────────────────────────────────────────
const TOPIC_ICONS: Record<string, TablerIcon> = {
  fundamentals: IconBook,
  python: IconCode,
  python_basics: IconCode,
  pandas: IconTable,
  numpy: IconChartLine,
  ml_basics: IconRobot,
  statistics: IconChartLine,
  ml_supervised: IconRobot,
  ml_unsupervised: IconFlask,
  evaluation: IconTarget,
  feature_eng: IconTools,
  visualization: IconChartBar,
  clustering: IconFlask,
  timeseries: IconClock,
  deep_learning: IconBrain,
  llm: IconMessages,
  aws_cloud: IconCloud,
  mlops: IconRocket,
  r_basics: IconLetterR,
  master: IconTrophy,
};

export function TopicIcon({ topic, size = 18, className }: { topic: string } & AppIconProps) {
  const I = TOPIC_ICONS[topic] || IconBrain;
  return <I size={size} className={className} />;
}

// ─── Trial difficulty icons ───────────────────────────────────────────────────
const DIFFICULTY_CLASS: Record<string, string> = {
  intermediate: 'text-green-500',
  advanced: 'text-yellow-500',
  elite: 'text-red-500',
  legendary: 'text-purple-500',
  senior_pro: 'text-amber-500',
};

export function DifficultyIcon({ id, size = 18, className }: { id: string } & AppIconProps) {
  if (id === 'legendary') return <IconSkull size={size} className={className || DIFFICULTY_CLASS[id]} />;
  if (id === 'senior_pro') return <IconCrown size={size} className={className || DIFFICULTY_CLASS[id]} />;
  return <IconCircleFilled size={size} className={className || DIFFICULTY_CLASS[id]} />;
}

// ─── Mission / lab type icons ───────────────────────────────────────────────
const TYPE_ICONS: Record<string, TablerIcon> = {
  diagram: IconMap,
  iac: IconSettings,
  quiz: IconForms,
};

export function MissionTypeIcon({ type, size = 18, className }: { type: string } & AppIconProps) {
  const I = TYPE_ICONS[type] || IconForms;
  return <I size={size} className={className} />;
}

// ─── Sandbox scenario icons ───────────────────────────────────────────────────
const SCENARIO_ICONS: Record<string, TablerIcon> = {
  health: IconHeartbeat,
  bank: IconBuildingBank,
  retail: IconBuildingStore,
};

export function ScenarioIcon({ scenario, size = 18, className }: { scenario: string } & AppIconProps) {
  const I = SCENARIO_ICONS[scenario] || IconCloud;
  return <I size={size} className={className} />;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
export function StarRating({ stars, size = 12, className = 'text-amber-400' }: { stars: number } & AppIconProps) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${stars} stars`}>
      {Array.from({ length: stars }).map((_, i) => (
        <IconStarFilled key={i} size={size} />
      ))}
    </span>
  );
}

export function CheckBadge({ size = 10, className = 'text-white' }: AppIconProps) {
  return <IconCheck size={size} className={className} />;
}

export {
  IconUser as ProfileIcon,
  IconBook as GuideIcon,
  IconPencil as EditIcon,
  IconBrain as QuizIcon,
  IconTools as ToolsIcon,
  IconTerminal as TerminalIcon,
  IconCode as CodeIcon,
  IconSend as SendIcon,
  IconFlask as FlaskIcon,
  IconBrain as BrainIcon,
  IconTrophy as TrophyIcon,
  IconCloud as CloudIcon,
  IconBuilding as BuildingIcon,
  IconTarget as TargetIcon,
  IconBolt as BoltIcon,
  IconWorld as WorldIcon,
  IconCoin as CoinIcon,
  IconChartBar as ChartBarIcon,
  IconSchool as SchoolIcon,
  IconBulb as BulbIcon,
  IconMap as MapIcon,
  IconForms as FormsIcon,
  IconLock as LockIcon,
  IconLockOpen as LockOpenIcon,
  IconDice as DiceIcon,
  IconBarbell as BarbellIcon,
  IconCopy as CopyIcon,
  IconRefresh as RefreshIcon,
  IconAlertTriangle as AlertIcon,
  IconBuildingBank as BuildingBankIcon,
  IconRocket as RocketIcon,
  IconClock as ClockIcon,
  IconMoon as MoonIcon,
  IconSun as SunIcon,
  IconEye as EyeIcon,
  IconEyeOff as EyeOffIcon,
  IconEraser as EraserIcon,
  IconUpload as UploadIcon,
  IconFileText as FileTextIcon,
  IconPrinter as PrinterIcon,
  IconHistory as HistoryIcon,
  IconPlayerPlay as PlayIcon,
  IconRotateClockwise as ResetIcon,
  IconFolder as FolderIcon,
  IconCircle as CircleIcon,
  IconSearch as SearchIcon,
  IconExternalLink as ExternalLinkIcon,
  IconX as ErrorIcon,
};
