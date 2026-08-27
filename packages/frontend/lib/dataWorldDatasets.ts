/**
 * data.world dataset metadata — maps the `dataset_url` in each lab YAML to the
 * canonical CSV filename and metadata available on data.world.
 *
 * data.world often ships datasets with cleaner metadata, multiple files, and
 * SPDX-style license tags, making it a great complement to Kaggle for labs.
 */

export interface DataWorldDatasetInfo {
  /** The canonical CSV filename to look for inside the data.world download. */
  filename: string;
  /** Optional human note — shown under the dataset panel. */
  note?: string;
  /** Optional table / file name on data.world (some datasets contain many CSVs). */
  table?: string;
  /** Optional owner display name. */
  owner?: string;
}

const DATAWORLD_DATASETS: Record<string, DataWorldDatasetInfo> = {
  // finance ───────────────────────────────────────────────────────────────────
  'jwmount/ibex-share-prices-apr-2019': {
    filename: 'ibex_2019.csv',
    table: 'ibex_2019',
    note: 'IBEX 35 daily share prices for April 2019 — 35 Spanish companies.',
  },
  'usdor/customer-churn-dataset': {
    filename: 'customer_churn.csv',
    table: 'customer_churn',
    note: 'Synthetic customer churn dataset — comparable to the Kaggle Telco churn dataset.',
  },
  // transport ─────────────────────────────────────────────────────────────────
  'usdot/flight-delays': {
    filename: 'flights.csv',
    table: 'flights',
    note: '2015 U.S. flight delay records — excellent for delays + weather joins.',
  },
  // esg / climate ─────────────────────────────────────────────────────────────
  'worldbank/co2-emissions': {
    filename: 'co2_emissions.csv',
    table: 'co2_emissions',
    note: 'CO2 (kt) by country and year from the World Bank.',
  },
  // healthcare ────────────────────────────────────────────────────────────────
  'cdc/us-cancer-mortality': {
    filename: 'cancer_mortality.csv',
    table: 'cancer_mortality',
    note: 'U.S. cancer mortality by county, age-adjusted.',
  },
  // crime ─────────────────────────────────────────────────────────────────────
  'cityofchicago/crimes-2001-to-present': {
    filename: 'crimes.csv',
    table: 'crimes',
    note: 'Chicago reported crimes — large, rich geospatial columns.',
  },
  // agri ──────────────────────────────────────────────────────────────────────
  'usda/agricultural-exchange-rates': {
    filename: 'exchange_rates.csv',
    table: 'exchange_rates',
    note: 'USDA agricultural exchange rates by country and year.',
  },
};

/** Extract the data.world dataset ID (`owner/dataset-name`) from a full data.world URL. */
export function dataWorldSlugFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = url.match(/data\.world\/([^/?#]+\/[^/?#]+)/i);
  return m ? m[1] : null;
}

/** Look up the canonical data.world CSV filename and metadata for a dataset URL. */
export function getDataWorldInfo(url: string | undefined | null): DataWorldDatasetInfo | null {
  const slug = dataWorldSlugFromUrl(url);
  if (!slug) return null;
  return DATAWORLD_DATASETS[slug] ?? null;
}
