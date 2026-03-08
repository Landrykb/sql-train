// ─── BleepxLab Constants ─────────────────────────────────────────────────────
// Parallel to constants.ts but for data-science / Python+R projects.

export const LAB_DOMAIN_FOLDER_MAP: Record<string, string> = {
  transport: 'transport',
  forecasting: 'forecasting',
  churn: 'churn',
  music: 'music',
  fraud: 'fraud',
  esg_climate: 'esg_climate',
  decarb: 'decarb',
  agri_econ: 'agri_econ',
  fin_risk: 'fin_risk',
};

export const LAB_CASE_ORDER: Record<string, string[]> = {
  transport: [
    'transport_explore',
    'transport_clean',
    'transport_features',
    'transport_model',
    'transport_evaluate',
  ],
  forecasting: [
    'forecast_explore',
    'forecast_timeseries',
    'forecast_arima',
    'forecast_prophet',
    'forecast_evaluate',
  ],
  churn: [
    'churn_explore',
    'churn_features',
    'churn_model',
    'churn_evaluate',
  ],
  music: [
    'music_explore',
    'music_eda',
    'music_clustering',
    'music_insights',
  ],
  fraud: [
    'fraud_explore',
    'fraud_imbalance',
    'fraud_anomaly',
    'fraud_evaluate',
  ],
  esg_climate: [
    'esg_explore',
    'esg_scoring',
    'esg_risk',
    'esg_portfolio',
  ],
  decarb: [
    'decarb_explore',
    'decarb_emissions',
    'decarb_forecast',
    'decarb_strategy',
  ],
  agri_econ: [
    'agri_explore',
    'agri_prices',
    'agri_yield',
    'agri_policy',
  ],
  fin_risk: [
    'fin_explore',
    'fin_var',
    'fin_portfolio',
    'fin_stress',
  ],
};

export const LAB_DOMAIN_META: Record<string, {
  icon: string;
  name: string;
  desc: string;
  color: string;
  difficulty: string;
  stars: number;
  language: string;
  dataset_url?: string;
}> = {
  transport: {
    icon: '🚌',
    name: 'Transport Delays',
    desc: 'Predict public transport delays using weather & events data',
    color: 'from-sky-500 to-sky-700',
    difficulty: 'Beginner',
    stars: 1,
    language: 'Python',
    dataset_url: 'https://www.kaggle.com/datasets/khushikyad001/public-transport-delays-with-weather-and-events',
  },
  forecasting: {
    icon: '📉',
    name: 'Time Series Forecasting',
    desc: 'Predict future trends with ARIMA, Prophet & LSTM models',
    color: 'from-violet-500 to-violet-700',
    difficulty: 'Intermediate',
    stars: 2,
    language: 'Python',
    dataset_url: 'https://www.kaggle.com/datasets/rohitsahoo/sales-forecasting',
  },
  churn: {
    icon: '🔄',
    name: 'Customer Churn',
    desc: 'Predict customer churn with classification models',
    color: 'from-rose-500 to-rose-700',
    difficulty: 'Beginner',
    stars: 1,
    language: 'Python',
    dataset_url: 'https://www.kaggle.com/datasets/blastchar/telco-customer-churn',
  },
  music: {
    icon: '🎵',
    name: 'Spotify Analysis',
    desc: 'Analyze music patterns, popularity & audio features',
    color: 'from-emerald-500 to-emerald-700',
    difficulty: 'Beginner',
    stars: 1,
    language: 'Python',
    dataset_url: 'https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset',
  },
  fraud: {
    icon: '🛡️',
    name: 'Fraud Detection',
    desc: 'Detect suspicious transactions with anomaly detection',
    color: 'from-amber-500 to-amber-700',
    difficulty: 'Intermediate',
    stars: 2,
    language: 'Python',
    dataset_url: 'https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud',
  },
  esg_climate: {
    icon: '🌍',
    name: 'ESG & Climate Risk',
    desc: 'Analyze ESG scores, climate risk metrics & sustainability reporting',
    color: 'from-teal-500 to-teal-700',
    difficulty: 'Intermediate',
    stars: 2,
    language: 'Python / R',
    dataset_url: 'https://www.kaggle.com/datasets/debashish311601/esg-scores-and-ratings',
  },
  decarb: {
    icon: '♻️',
    name: 'Decarbonization',
    desc: 'Model carbon emissions, forecast reduction pathways & net-zero strategies',
    color: 'from-lime-600 to-lime-800',
    difficulty: 'Advanced',
    stars: 3,
    language: 'Python',
    dataset_url: 'https://www.kaggle.com/datasets/unitednations/international-greenhouse-gas-emissions',
  },
  agri_econ: {
    icon: '🌾',
    name: 'Agriculture Economics',
    desc: 'Commodity price analysis, yield prediction & food-security modeling',
    color: 'from-yellow-600 to-yellow-800',
    difficulty: 'Intermediate',
    stars: 2,
    language: 'Python / R',
    dataset_url: 'https://www.kaggle.com/datasets/patelris/crop-yield-prediction-dataset',
  },
  fin_risk: {
    icon: '💹',
    name: 'Financial Risk',
    desc: 'Value-at-Risk, portfolio optimization & stress testing',
    color: 'from-fuchsia-500 to-fuchsia-700',
    difficulty: 'Advanced',
    stars: 3,
    language: 'Python',
    dataset_url: 'https://www.kaggle.com/datasets/szrlee/stock-time-series-20050101-to-20171231',
  },
};

// Time limits for test mode on Lab projects (in seconds), keyed by tier
export const LAB_TEST_MODE_LIMITS: Record<number, number> = {
  1: 60 * 60,    // 1 hour for tier-1 (explore / basics)
  2: 45 * 60,    // 45 min for tier-2 (intermediate)
  3: 30 * 60,    // 30 min for tier-3 (advanced)
};

export const LAB_CASE_TIERS: Record<string, number> = {
  // transport
  transport_explore: 1, transport_clean: 1, transport_features: 2, transport_model: 2, transport_evaluate: 3,
  // forecasting
  forecast_explore: 1, forecast_timeseries: 2, forecast_arima: 2, forecast_prophet: 3, forecast_evaluate: 3,
  // churn
  churn_explore: 1, churn_features: 1, churn_model: 2, churn_evaluate: 2,
  // music
  music_explore: 1, music_eda: 1, music_clustering: 2, music_insights: 2,
  // fraud
  fraud_explore: 1, fraud_imbalance: 2, fraud_anomaly: 2, fraud_evaluate: 3,
  // esg_climate
  esg_explore: 1, esg_scoring: 2, esg_risk: 2, esg_portfolio: 3,
  // decarb
  decarb_explore: 1, decarb_emissions: 2, decarb_forecast: 3, decarb_strategy: 3,
  // agri_econ
  agri_explore: 1, agri_prices: 2, agri_yield: 2, agri_policy: 3,
  // fin_risk
  fin_explore: 1, fin_var: 2, fin_portfolio: 3, fin_stress: 3,
};
