/**
 * Kaggle dataset metadata \u2014 maps the `dataset_url` in each lab YAML to the
 * canonical CSV filename shipped by Kaggle.
 *
 * This lets the Lab UI show learners the *exact* filename they will see in
 * their Kaggle download, so they can drop the file into the provided code
 * with no renaming friction.
 *
 * When you add a new Kaggle dataset to a lab step, extend the map below with
 * the URL slug (the path portion after `/datasets/`) and the canonical
 * filename(s).
 */

export interface KaggleDatasetInfo {
  /** The canonical CSV filename as it appears inside Kaggle's ZIP download. */
  filename: string;
  /** Optional human note \u2014 shown under the dataset panel. */
  note?: string;
}

const KAGGLE_DATASETS: Record<string, KaggleDatasetInfo> = {
  // churn ───────────────────────────────────────────────────────────────────
  'blastchar/telco-customer-churn': {
    filename: 'WA_Fn-UseC_-Telco-Customer-Churn.csv',
    note: 'IBM Sample Data — ~7k rows, 21 columns.',
  },
  // forecasting ─────────────────────────────────────────────────────────────
  'rohitsahoo/sales-forecasting': {
    filename: 'train.csv',
    note: 'Superstore Sales dataset — Order Date, Sales, Category, Region, etc.',
  },
  // fraud ───────────────────────────────────────────────────────────────────
  'mlg-ulb/creditcardfraud': {
    filename: 'creditcard.csv',
    note: '~284k transactions, PCA-anonymized features (V1–V28), severe class imbalance.',
  },
  // fin_risk ────────────────────────────────────────────────────────────────
  'szrlee/stock-time-series-20050101-to-20171231': {
    filename: 'all_stocks_2006-01-01_to_2018-01-01.csv',
    note: 'Daily OHLCV for 29 of 30 DJIA components, 2006-01-01 → 2018-01-01.',
  },
  // agri_econ — verified via Kaggle API (patelris/crop-yield-prediction-dataset).
  // Columns: Area, Item, Year, hg/ha_yield,
  // average_rain_fall_mm_per_year, pesticides_tonnes, avg_temp.
  'patelris/crop-yield-prediction-dataset': {
    filename: 'yield_df.csv',
    note: 'FAO yield joined with rainfall, pesticides, and temperature per country/crop/year.',
  },
  // music ───────────────────────────────────────────────────────────────────
  'maharshipandya/-spotify-tracks-dataset': {
    filename: 'dataset.csv',
    note: '~114k Spotify tracks with audio features + genre labels.',
  },
  // decarb — verified via Kaggle API (unitednations/international-greenhouse-gas-emissions).
  'unitednations/international-greenhouse-gas-emissions': {
    filename: 'greenhouse_gas_inventory_data_data.csv',
    note: 'UNFCCC GHG inventory 1990-2017 — country_or_area, year, value, category.',
  },
  // esg_climate — verified via Kaggle API (shriyashjagtap/esg-and-financial-performance-dataset).
  'shriyashjagtap/esg-and-financial-performance-dataset': {
    filename: 'company_esg_financial_dataset.csv',
    note: '1,000 companies × 11 years — ESG pillar scores + financials (Revenue, MarketCap, GrowthRate, CarbonEmissions).',
  },
  // transport — verified via Kaggle API (khushikyad001/public-transport-delays-with-weather-and-events).
  'khushikyad001/public-transport-delays-with-weather-and-events': {
    filename: 'public_transport_delays.csv',
    note: 'Transit departure / arrival delays with weather & event context (synthetic).',
  },
};

/** Extract the Kaggle slug (`owner/dataset-name`) from a full Kaggle URL. */
export function kaggleSlugFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = url.match(/kaggle\.com\/datasets\/([^/?#]+\/[^/?#]+)/i);
  return m ? m[1] : null;
}

/** Look up the canonical Kaggle CSV filename for a dataset URL. */
export function getKaggleInfo(url: string | undefined | null): KaggleDatasetInfo | null {
  const slug = kaggleSlugFromUrl(url);
  if (!slug) return null;
  return KAGGLE_DATASETS[slug] ?? null;
}

/** Extract `/datasets/XYZ.csv` from a code snippet (solution_code or section). */
export function extractLabDatasetPath(code: string | undefined | null): string | null {
  if (!code) return null;
  const m = code.match(/open_url\(\s*["'](\/datasets\/[^"']+\.csv)["']\s*\)/);
  return m ? m[1] : null;
}
