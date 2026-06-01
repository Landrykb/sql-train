// ─── BleepxCloud types ───────────────────────────────────────────────────────
// A third "verse" alongside BleepxQuery (SQL) and BleepxLab (Data Science).
// Cloud architecture certification prep blended with ESG / decarbonization.

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'esg' | 'finance';

export type CloudLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert'
  | 'Master';

export type CloudLabType = 'diagram' | 'iac' | 'quiz';

/** A node in an architecture flow diagram (rendered as connected cards). */
export interface ArchNode {
  icon: string;
  label: string;
  note?: string;
}

export interface CloudMission {
  slug: string;
  title: string;
  section: string;
  level: CloudLevel;
  stars: number;
  skills: string[];
  description: string;
  prerequisites: string[];
  labType: CloudLabType;
  /** Optional cross-link to another provider/verse */
  crossDomain?: string;
  /** Hidden / bonus mission (shown with ??? until prereqs met) */
  isBonus?: boolean;

  // ── Optional rich learning content (flagship missions) ──────────
  /** A memorable real-world scenario this mission is modeled on. */
  realWorld?: string;
  /** Concrete "by the end you can…" outcomes. */
  objectives?: string[];
  /** Ordered architecture flow, rendered as connected cards. */
  architecture?: ArchNode[];
}

export interface CloudProviderMeta {
  key: CloudProvider;
  icon: string;
  name: string;
  short: string;
  desc: string;
  /** Tailwind gradient stops */
  color: string;
  difficulty: string;
  stars: number;
  /** Certification this track prepares for */
  cert?: string;
}

/** Points awarded per level (mirrors SQL/Lab tier*10 scheme). */
export const CLOUD_LEVEL_TIER: Record<CloudLevel, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
  Master: 5,
};

/** Prefix used for cloud mission completion IDs in the shared progress store. */
export const CLOUD_ID_PREFIX = 'cloud_';

export function cloudMissionId(provider: CloudProvider, slug: string): string {
  return `${CLOUD_ID_PREFIX}${provider}_${slug}`;
}
