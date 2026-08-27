// ─── Cross-verse learning bridges ──────────────────────────────────────────────
//
// Bleepx has three verses: Query (SQL), Lab (Data Science), Cloud (AWS).
// This file maps related content across verses so learners can flow from one
// skill to the next.

export interface CrossVerseBridge {
  /** Human label for the bridge type. */
  type: 'prerequisite' | 'next' | 'dataset' | 'practice' | 'cert-prep';
  /** Destination verse. */
  verse: 'query' | 'lab' | 'cloud';
  /** Local destination path, e.g. /cases/business/sales_by_month */
  href: string;
  /** One-line reason this is related. */
  why: string;
}

export const CROSS_VERSE_BRIDGES: Record<string, CrossVerseBridge[]> = {
  // SQL cases → Lab projects (same dataset / skill)
  '/cases/business/sales_by_month': [
    { type: 'next', verse: 'lab', href: '/lab/business/sales-forecast', why: 'Use the same retail data to train a forecasting model.' },
  ],
  '/cases/crime/crime_joins': [
    { type: 'next', verse: 'lab', href: '/lab/crime/geospatial-hotspots', why: 'Take the joined crime data into a Pandas + Folium map.' },
  ],
  '/cases/space/neo_approach': [
    { type: 'next', verse: 'lab', href: '/lab/space/neo-classifier', why: 'Classify near-Earth objects by orbital features.' },
  ],
  '/cases/finance/rolling_returns': [
    { type: 'next', verse: 'lab', href: '/lab/finance/portfolio-optimization', why: 'Move from SQL aggregations to portfolio optimization in Python.' },
  ],

  // Lab projects → Cloud / ETL
  '/lab/business/sales-forecast': [
    { type: 'next', verse: 'cloud', href: '/cloud/pipelines', why: 'Productionize the forecast by building an ETL pipeline to S3.' },
  ],
  '/lab/crime/geospatial-hotspots': [
    { type: 'next', verse: 'cloud', href: '/cloud/pipelines', why: 'Ship the hotspot CSV to a cloud data lake.' },
  ],

  // Cloud missions → SQL / Lab / Pipeline practice
  '/cloud/aws/s3-upload-csv': [
    { type: 'practice', verse: 'query', href: '/cases/business/sales_by_month', why: 'Query the same sales data in SQL before uploading it to S3.' },
    { type: 'next', verse: 'cloud', href: '/cloud/pipelines', why: 'Build a full ETL pipeline from CSV to S3.' },
  ],
  '/cloud/aws/iam-least-privilege-s3': [
    { type: 'practice', verse: 'query', href: '/cases/business/sales_by_month', why: 'Practice the data access patterns this policy protects.' },
  ],
  '/cloud/aws/aws-sandbox-capstone': [
    { type: 'next', verse: 'cloud', href: '/cloud/pipelines', why: 'Use the pipeline canvas to load CSV into your secure data lake.' },
  ],
};

/** Look up bridges for a given canonical path. */
export function getBridges(path: string): CrossVerseBridge[] {
  // Normalize to avoid trailing-slash mismatches
  const key = path.replace(/\/$/, '') || '/';
  return CROSS_VERSE_BRIDGES[key] || [];
}

/** Generic suggestions for a verse when no specific bridge exists. */
export function getDefaultBridges(verse: 'query' | 'lab' | 'cloud'): CrossVerseBridge[] {
  const map: Record<'query' | 'lab' | 'cloud', CrossVerseBridge[]> = {
    query: [
      { type: 'next', verse: 'lab', href: '/lab', why: 'Practice the same datasets with Python and Pandas in BleepxLab.' },
      { type: 'next', verse: 'cloud', href: '/cloud', why: 'Architect the cloud systems that store and query this data.' },
    ],
    lab: [
      { type: 'next', verse: 'query', href: '/cases', why: 'Sharpen your SQL on the same datasets in BleepxQuery.' },
      { type: 'next', verse: 'cloud', href: '/cloud/pipelines', why: 'Productionize your notebook with the ETL Pipeline Canvas.' },
    ],
    cloud: [
      { type: 'practice', verse: 'query', href: '/cases', why: 'Query the data that powers cloud services in BleepxQuery.' },
      { type: 'next', verse: 'lab', href: '/lab', why: 'Explore datasets in BleepxLab before moving them to the cloud.' },
    ],
  };
  return map[verse];
}

/** Verse metadata for rendering badges. */
export const VERSE_META: Record<CrossVerseBridge['verse'], { name: string; color: string; icon: string }> = {
  query: { name: 'BleepxQuery', color: 'bg-purple-100 text-purple-700', icon: '🔍' },
  lab: { name: 'BleepxLab', color: 'bg-teal-100 text-teal-700', icon: '🧪' },
  cloud: { name: 'BleepxCloud', color: 'bg-sky-100 text-sky-700', icon: '☁️' },
};
