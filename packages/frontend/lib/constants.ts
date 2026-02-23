  // Type definition for a single visualization configuration
  export interface VisualizationConfig {
    query: string; // SQL query to fetch data
    dataMapper: (data: Record<string, any>[]) => any; // Maps query results to Plotly data format
    layout: any; // Plotly layout configuration
  }

  // Maps normalized domain names to folder names
  export const domainFolderMap: { [key: string]: string } = {
    business: 'business',
    crime: 'crime',
    farming: 'farming',
    finance: 'finance',
    healthcare: 'healthcare',
    social: 'social',
    space: 'space',
    sports: 'sports',
    guide: 'guide',
    trials: 'trials',
  };

  // Defines the order of regular cases for each domain
  export const caseOrder: { [domain: string]: string[] } = {
    business: ['basics_select', 'agg_revenue', 'joins_returns', 'window_cumsum', 'cte_profit', 'capstone_root'],
    crime: ['crime_select', 'crime_by_area', 'suspect_joins', 'crime_trend', 'cte_crime', 'capstone_crime'],
    farming: ['ndvi_overview', 'yield_by_crop', 'soil_joins', 'yield_trend', 'cte_soil', 'capstone_farm'],
    finance: ['transaction_select', 'balance_by_account', 'fraud_joins', 'balance_trend', 'cte_fraud', 'capstone_finance'],
    healthcare: ['patient_select', 'diagnosis_count', 'treatment_joins', 'admission_trend', 'cte_treatment', 'capstone_health'],
    social: ['post_select', 'engagement_by_type', 'user_joins', 'likes_trend', 'cte_engagement', 'capstone_social'],
    space: ['orbit_select', 'velocity_by_type', 'mission_joins', 'orbit_trend', 'cte_payload', 'capstone_space'],
    sports: ['match_select', 'score_by_team', 'player_joins', 'score_trend', 'cte_player', 'capstone_sports'],
    guide: ['guide'],
    trials: ['trial_basics', 'trial_aggregation', 'trial_joins', 'trial_advanced', 'trial_window'],
  };

  // Hidden bonus levels: real-world business scenarios that unlock after completing all regular cases
  export const hiddenCaseOrder: { [domain: string]: string[] } = {
    business: ['hidden_sales_boost', 'hidden_credit_recommend', 'hidden_inventory_alert'],
    crime: ['hidden_crime_hotspot', 'hidden_serial_pattern'],
    farming: ['hidden_crop_optimization', 'hidden_drought_risk'],
    finance: ['hidden_fraud_detection', 'hidden_portfolio_optimize'],
    healthcare: ['hidden_readmission_risk', 'hidden_diagnosis_delay'],
    social: ['hidden_influencer_roi', 'hidden_viral_prediction'],
    space: ['hidden_mission_risk', 'hidden_collision_alert'],
    sports: ['hidden_player_value', 'hidden_mvp_predictor'],
  };

  // Trial difficulty levels with time limits (in seconds)
  export interface TrialDifficulty {
    id: string;
    label: string;
    emoji: string;
    timeLimitSeconds: number;
    description: string;
    color: string;
  }

  export const trialDifficulties: TrialDifficulty[] = [
    { id: 'intermediate', label: 'Intermediate', emoji: '🟢', timeLimitSeconds: 60 * 60, description: '1 hour — relaxed pace, take your time and think it through', color: 'green' },
    { id: 'advanced', label: 'Advanced', emoji: '🟡', timeLimitSeconds: 45 * 60, description: '45 minutes — confident and focused, you know your way around SQL', color: 'yellow' },
    { id: 'elite', label: 'Elite', emoji: '🔴', timeLimitSeconds: 30 * 60, description: '30 minutes — sharp under pressure, no second-guessing', color: 'red' },
    { id: 'legendary', label: 'Legendary', emoji: '💀', timeLimitSeconds: 20 * 60, description: '20 minutes — fearless problem solver, thrives on challenge', color: 'purple' },
    { id: 'senior_pro', label: 'Senior Data Pro', emoji: '👑', timeLimitSeconds: 20 * 60, description: '20 minutes — battle-tested expert, nothing phases you', color: 'amber' },
  ];

  // Default time limits for test mode on regular challenges (in seconds)
  export const testModeTimeLimits: Record<string, number> = {
    capstone: 45 * 60,   // 45 min for capstone
    hidden: 30 * 60,     // 30 min for hidden/bonus
    regular: 60 * 60,    // 1 hour for regular cases
  };

  // Full case order including hidden levels
  export const fullCaseOrder: { [domain: string]: string[] } = Object.fromEntries(
    Object.keys(caseOrder).map((domain) => [
      domain,
      [...caseOrder[domain], ...(hiddenCaseOrder[domain] || [])],
    ])
  );

  // Visualization configurations for each domain and case
  // CSV columns:
  // business_retail: invoice_id, branch, city, customer_type, gender, product_line, unit_price, quantity, tax_5, total, date, time, payment, cogs, gross_margin_percentage, gross_income, rating
  // returns: invoice_id, return_date, return_reason
  // crime_chicago: id, date, primary_type, location_description, latitude, longitude
  // suspects: suspect_id, crime_id, suspect_name
  // farming_yield: id, region, ndvi, yield, year, month, soil_type
  // soil_data: id, soil_ph, soil_type
  // finance_stocks: ticker, date, open, high, low, close, volume
  // market_index: date, index_close
  // patients: patient_id, age, gender, birthdate
  // treatments: treatment_id, patient_id, diagnosis, treatment_date
  // admissions: admission_id, patient_id, admission_date, discharge_date
  // tweets: tweet_id, user_id, created_at, text
  // users: user_id, user_name, signup_date
  // space_neo: des, close_approach_date, dist_km, relative_velocity_km_s, is_potentially_hazardous
  // nba_games: game_id, player_id, points, assists, rebounds, game_date
  // shot_zones: shot_id, player_id, shot_zone, made
  export const visualizationConfigs: Record<string, Record<string, VisualizationConfig[]>> = {
    business: {
      dashboard: [
        {
          query: "SELECT product_line, ROUND(SUM(total),2) as revenue FROM business_retail GROUP BY product_line ORDER BY revenue DESC",
          dataMapper: (data) => [{ x: data.map(r => r.product_line), y: data.map(r => r.revenue), type: 'bar', name: 'Revenue', marker: { color: '#1f77b4' } }],
          layout: { title: { text: 'Revenue by Product Line', font: { size: 16 } }, xaxis: { title: 'Product Line', tickangle: 45 }, yaxis: { title: 'Revenue ($)' }, margin: { b: 140 }, showlegend: false },
        },
        {
          query: "SELECT return_reason, COUNT(*) as cnt FROM returns GROUP BY return_reason ORDER BY cnt DESC",
          dataMapper: (data) => [{ labels: data.map(r => r.return_reason), values: data.map(r => r.cnt), type: 'pie', textinfo: 'percent+label' }],
          layout: { title: { text: 'Return Reasons', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 60, l: 60, r: 60 } },
        },
      ],
      basics_select: [
        {
          query: "SELECT date, ROUND(SUM(total),2) as total_sales FROM business_retail GROUP BY date ORDER BY date",
          dataMapper: (data) => [{ x: data.map(r => r.date), y: data.map(r => r.total_sales), type: 'bar', name: 'Daily Sales', marker: { color: '#1f77b4' } }],
          layout: { title: { text: 'Total Sales by Date', font: { size: 16 } }, xaxis: { title: 'Date', type: 'date' }, yaxis: { title: 'Total Sales ($)' }, margin: { b: 100 }, showlegend: false },
        },
      ],
      agg_revenue: [
        {
          query: "SELECT product_line, ROUND(SUM(total),2) as revenue FROM business_retail GROUP BY product_line ORDER BY revenue DESC",
          dataMapper: (data) => [{ labels: data.map(r => r.product_line), values: data.map(r => r.revenue), type: 'pie', textinfo: 'percent+label', hoverinfo: 'label+percent' }],
          layout: { title: { text: 'Revenue by Product Line', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 80, l: 80, r: 80 } },
        },
      ],
      joins_returns: [
        {
          query: "SELECT return_reason, COUNT(*) as return_count FROM returns GROUP BY return_reason ORDER BY return_count DESC",
          dataMapper: (data) => [{ x: data.map(r => r.return_reason), y: data.map(r => r.return_count), type: 'bar', name: 'Returns', marker: { color: '#d62728' } }],
          layout: { title: { text: 'Returns by Reason', font: { size: 16 } }, xaxis: { title: 'Return Reason', tickangle: 45 }, yaxis: { title: 'Count' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      window_cumsum: [
        {
          query: "SELECT date, SUM(total) OVER (ORDER BY date) as cumulative_sales FROM business_retail",
          dataMapper: (data) => [{ x: data.map(r => r.date), y: data.map(r => r.cumulative_sales), type: 'scatter', mode: 'lines', name: 'Cumulative Sales', line: { color: '#ff7f0e', width: 2 } }],
          layout: { title: { text: 'Cumulative Sales Over Time', font: { size: 16 } }, xaxis: { title: 'Date', type: 'date' }, yaxis: { title: 'Cumulative Sales ($)' }, showlegend: false },
        },
      ],
      cte_profit: [
        {
          query: "SELECT product_line, ROUND(SUM(gross_income),2) as profit FROM business_retail GROUP BY product_line ORDER BY profit DESC",
          dataMapper: (data) => [{ x: data.map(r => r.product_line), y: data.map(r => r.profit), type: 'bar', name: 'Profit', marker: { color: '#2ca02c' } }],
          layout: { title: { text: 'Gross Income by Product Line', font: { size: 16 } }, xaxis: { title: 'Product Line', tickangle: 45 }, yaxis: { title: 'Gross Income ($)' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      capstone_root: [
        {
          query: "SELECT product_line, ROUND(SUM(total),2) as revenue, ROUND(AVG(rating),2) as avg_rating FROM business_retail GROUP BY product_line ORDER BY revenue DESC",
          dataMapper: (data) => [
            { x: data.map(r => r.product_line), y: data.map(r => r.revenue), type: 'bar', name: 'Revenue', marker: { color: '#1f77b4' } },
            { x: data.map(r => r.product_line), y: data.map(r => r.avg_rating), type: 'scatter', mode: 'lines+markers', yaxis: 'y2', name: 'Avg Rating', line: { color: '#d62728', width: 2 } },
          ],
          layout: { title: { text: 'Revenue & Rating by Product Line', font: { size: 16 } }, xaxis: { title: 'Product Line', tickangle: 45 }, yaxis: { title: 'Revenue ($)' }, yaxis2: { title: 'Avg Rating', overlaying: 'y', side: 'right' }, margin: { b: 140 }, showlegend: true },
        },
      ],
      hidden_sales_boost: [
        {
          query: "SELECT branch, ROUND(SUM(total),2) as revenue FROM business_retail GROUP BY branch ORDER BY revenue DESC",
          dataMapper: (data) => [{ x: data.map(r => r.branch), y: data.map(r => r.revenue), type: 'bar', name: 'Revenue by Branch', marker: { color: '#9467bd' } }],
          layout: { title: { text: 'Revenue by Branch', font: { size: 16 } }, xaxis: { title: 'Branch' }, yaxis: { title: 'Revenue ($)' }, showlegend: false },
        },
      ],
      hidden_credit_recommend: [
        {
          query: "SELECT payment, COUNT(*) as cnt, ROUND(AVG(total),2) as avg_total FROM business_retail GROUP BY payment ORDER BY avg_total DESC",
          dataMapper: (data) => [{ x: data.map(r => r.payment), y: data.map(r => r.avg_total), type: 'bar', name: 'Avg Transaction', marker: { color: '#e377c2' } }],
          layout: { title: { text: 'Avg Transaction by Payment Method', font: { size: 16 } }, xaxis: { title: 'Payment' }, yaxis: { title: 'Avg Total ($)' }, showlegend: false },
        },
      ],
      hidden_inventory_alert: [
        {
          query: "SELECT product_line, SUM(quantity) as total_qty FROM business_retail GROUP BY product_line ORDER BY total_qty DESC",
          dataMapper: (data) => [{ x: data.map(r => r.product_line), y: data.map(r => r.total_qty), type: 'bar', name: 'Units Sold', marker: { color: '#ff7f0e' } }],
          layout: { title: { text: 'Units Sold by Product Line', font: { size: 16 } }, xaxis: { title: 'Product Line', tickangle: 45 }, yaxis: { title: 'Quantity' }, margin: { b: 140 }, showlegend: false },
        },
      ],
    },
    crime: {
      dashboard: [
        {
          query: "SELECT primary_type, COUNT(*) as cnt FROM crime_chicago GROUP BY primary_type ORDER BY cnt DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.primary_type), y: data.map(r => r.cnt), type: 'bar', name: 'Crimes', marker: { color: '#9467bd' } }],
          layout: { title: { text: 'Top 15 Crime Types', font: { size: 16 } }, xaxis: { title: 'Crime Type', tickangle: 45 }, yaxis: { title: 'Count' }, margin: { b: 160 }, showlegend: false },
        },
        {
          query: "SELECT location_description, COUNT(*) as cnt FROM crime_chicago WHERE location_description IS NOT NULL GROUP BY location_description ORDER BY cnt DESC LIMIT 10",
          dataMapper: (data) => [{ labels: data.map(r => r.location_description), values: data.map(r => r.cnt), type: 'pie', textinfo: 'percent+label' }],
          layout: { title: { text: 'Top 10 Crime Locations', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 60, l: 60, r: 60 } },
        },
      ],
      crime_select: [
        {
          query: "SELECT primary_type, COUNT(*) as cnt FROM crime_chicago GROUP BY primary_type ORDER BY cnt DESC LIMIT 10",
          dataMapper: (data) => [{ labels: data.map(r => r.primary_type), values: data.map(r => r.cnt), type: 'pie', textinfo: 'percent+label' }],
          layout: { title: { text: 'Crime Type Distribution (Top 10)', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 80, l: 80, r: 80 } },
        },
      ],
      crime_by_area: [
        {
          query: "SELECT location_description, COUNT(*) as crime_count FROM crime_chicago WHERE location_description IS NOT NULL GROUP BY location_description ORDER BY crime_count DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.location_description), y: data.map(r => r.crime_count), type: 'bar', name: 'Crimes by Location', marker: { color: '#9467bd' } }],
          layout: { title: { text: 'Crimes by Location', font: { size: 16 } }, xaxis: { title: 'Location', tickangle: 45 }, yaxis: { title: 'Count' }, margin: { b: 160 }, showlegend: false },
        },
      ],
      suspect_joins: [
        {
          query: "SELECT c.primary_type, COUNT(s.suspect_id) as suspect_count FROM crime_chicago c JOIN suspects s ON c.id = s.crime_id GROUP BY c.primary_type ORDER BY suspect_count DESC LIMIT 10",
          dataMapper: (data) => [{ x: data.map(r => r.primary_type), y: data.map(r => r.suspect_count), type: 'bar', name: 'Suspects', marker: { color: '#e377c2' } }],
          layout: { title: { text: 'Suspects by Crime Type', font: { size: 16 } }, xaxis: { title: 'Crime Type', tickangle: 45 }, yaxis: { title: 'Suspect Count' }, margin: { b: 160 }, showlegend: false },
        },
      ],
      crime_trend: [
        {
          query: "SELECT date, COUNT(*) OVER (ORDER BY date) as cumulative_crimes FROM crime_chicago",
          dataMapper: (data) => [{ x: data.map(r => r.date), y: data.map(r => r.cumulative_crimes), type: 'scatter', mode: 'lines', name: 'Cumulative Crimes', line: { color: '#7f7f7f', width: 2 } }],
          layout: { title: { text: 'Cumulative Crimes Over Time', font: { size: 16 } }, xaxis: { title: 'Date', type: 'date' }, yaxis: { title: 'Cumulative Crimes' }, showlegend: false },
        },
      ],
      cte_crime: [
        {
          query: "WITH CrimeStats AS (SELECT primary_type, COUNT(*) as cnt FROM crime_chicago GROUP BY primary_type) SELECT primary_type, cnt FROM CrimeStats ORDER BY cnt DESC LIMIT 10",
          dataMapper: (data) => [{ labels: data.map(r => r.primary_type), values: data.map(r => r.cnt), type: 'pie', textinfo: 'percent+label' }],
          layout: { title: { text: 'Crime Distribution (CTE)', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 80, l: 80, r: 80 } },
        },
      ],
      capstone_crime: [
        {
          query: "SELECT c.primary_type, COUNT(DISTINCT c.id) as crime_count, COUNT(DISTINCT s.suspect_id) as suspect_count FROM crime_chicago c LEFT JOIN suspects s ON c.id = s.crime_id GROUP BY c.primary_type ORDER BY crime_count DESC LIMIT 10",
          dataMapper: (data) => [
            { x: data.map(r => r.primary_type), y: data.map(r => r.crime_count), type: 'bar', name: 'Crimes', marker: { color: '#9467bd' } },
            { x: data.map(r => r.primary_type), y: data.map(r => r.suspect_count), type: 'bar', name: 'Suspects', marker: { color: '#e377c2' } },
          ],
          layout: { title: { text: 'Crimes vs Suspects by Type', font: { size: 16 } }, xaxis: { title: 'Crime Type', tickangle: 45 }, yaxis: { title: 'Count' }, barmode: 'group', margin: { b: 160 }, showlegend: true },
        },
      ],
      hidden_crime_hotspot: [
        {
          query: "SELECT location_description, primary_type, COUNT(*) as cnt FROM crime_chicago WHERE location_description IS NOT NULL GROUP BY location_description, primary_type ORDER BY cnt DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.location_description + ' - ' + r.primary_type), y: data.map(r => r.cnt), type: 'bar', marker: { color: '#d62728' } }],
          layout: { title: { text: 'Crime Hotspots', font: { size: 16 } }, xaxis: { title: 'Location — Type', tickangle: 60 }, yaxis: { title: 'Count' }, margin: { b: 200 }, showlegend: false },
        },
      ],
      hidden_serial_pattern: [
        {
          query: "SELECT strftime('%Y-%m', date) as month, COUNT(*) as cnt FROM crime_chicago GROUP BY month ORDER BY month",
          dataMapper: (data) => [{ x: data.map(r => r.month), y: data.map(r => r.cnt), type: 'scatter', mode: 'lines+markers', name: 'Monthly Crimes', line: { color: '#1f77b4', width: 2 } }],
          layout: { title: { text: 'Crime Trend by Month', font: { size: 16 } }, xaxis: { title: 'Month' }, yaxis: { title: 'Crime Count' }, showlegend: false },
        },
      ],
    },
    farming: {
      dashboard: [
        {
          query: "SELECT region, ROUND(AVG(ndvi),4) as avg_ndvi, ROUND(SUM(yield),2) as total_yield FROM farming_yield GROUP BY region ORDER BY total_yield DESC",
          dataMapper: (data) => [
            { x: data.map(r => r.region), y: data.map(r => r.total_yield), type: 'bar', name: 'Total Yield', marker: { color: '#2ca02c' } },
            { x: data.map(r => r.region), y: data.map(r => r.avg_ndvi), type: 'scatter', mode: 'lines+markers', yaxis: 'y2', name: 'Avg NDVI', line: { color: '#ff7f0e', width: 2 } },
          ],
          layout: { title: { text: 'Yield & NDVI by Region', font: { size: 16 } }, xaxis: { title: 'Region', tickangle: 45 }, yaxis: { title: 'Total Yield' }, yaxis2: { title: 'Avg NDVI', overlaying: 'y', side: 'right' }, margin: { b: 140 }, showlegend: true },
        },
      ],
      ndvi_overview: [
        {
          query: "SELECT region, ROUND(AVG(ndvi),4) as avg_ndvi FROM farming_yield GROUP BY region ORDER BY avg_ndvi DESC",
          dataMapper: (data) => [{ x: data.map(r => r.region), y: data.map(r => r.avg_ndvi), type: 'bar', name: 'Avg NDVI', marker: { color: '#bcbd22' } }],
          layout: { title: { text: 'Average NDVI by Region', font: { size: 16 } }, xaxis: { title: 'Region', tickangle: 45 }, yaxis: { title: 'Average NDVI' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      yield_by_crop: [
        {
          query: "SELECT soil_type, ROUND(SUM(yield),2) as total_yield FROM farming_yield GROUP BY soil_type ORDER BY total_yield DESC",
          dataMapper: (data) => [{ x: data.map(r => r.soil_type), y: data.map(r => r.total_yield), type: 'bar', name: 'Total Yield', marker: { color: '#17becf' } }],
          layout: { title: { text: 'Total Yield by Soil Type', font: { size: 16 } }, xaxis: { title: 'Soil Type', tickangle: 45 }, yaxis: { title: 'Total Yield' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      soil_joins: [
        {
          query: "SELECT f.soil_type, ROUND(AVG(s.soil_ph),2) as avg_ph FROM farming_yield f JOIN soil_data s ON f.id = s.id GROUP BY f.soil_type ORDER BY avg_ph DESC",
          dataMapper: (data) => [{ x: data.map(r => r.soil_type), y: data.map(r => r.avg_ph), type: 'bar', name: 'Avg Soil pH', marker: { color: '#1f77b4' } }],
          layout: { title: { text: 'Average Soil pH by Soil Type', font: { size: 16 } }, xaxis: { title: 'Soil Type', tickangle: 45 }, yaxis: { title: 'Average pH' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      yield_trend: [
        {
          query: "SELECT year, ROUND(SUM(yield),2) as total_yield FROM farming_yield GROUP BY year ORDER BY year",
          dataMapper: (data) => [{ x: data.map(r => r.year), y: data.map(r => r.total_yield), type: 'scatter', mode: 'lines+markers', name: 'Yield Trend', line: { color: '#ff7f0e', width: 2 } }],
          layout: { title: { text: 'Yield Over Time', font: { size: 16 } }, xaxis: { title: 'Year' }, yaxis: { title: 'Total Yield' }, showlegend: false },
        },
      ],
      cte_soil: [
        {
          query: "WITH SoilStats AS (SELECT soil_type, ROUND(AVG(soil_ph),2) as avg_ph FROM soil_data GROUP BY soil_type) SELECT soil_type, avg_ph FROM SoilStats ORDER BY avg_ph DESC",
          dataMapper: (data) => [{ x: data.map(r => r.soil_type), y: data.map(r => r.avg_ph), type: 'bar', name: 'Avg pH', marker: { color: '#2ca02c' } }],
          layout: { title: { text: 'Soil pH by Type (CTE)', font: { size: 16 } }, xaxis: { title: 'Soil Type', tickangle: 45 }, yaxis: { title: 'Avg pH' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      capstone_farm: [
        {
          query: "SELECT f.region, ROUND(SUM(f.yield),2) as total_yield, ROUND(AVG(s.soil_ph),2) as avg_ph FROM farming_yield f JOIN soil_data s ON f.id = s.id GROUP BY f.region ORDER BY total_yield DESC",
          dataMapper: (data) => [
            { x: data.map(r => r.region), y: data.map(r => r.total_yield), type: 'bar', name: 'Total Yield', marker: { color: '#bcbd22' } },
            { x: data.map(r => r.region), y: data.map(r => r.avg_ph), type: 'scatter', mode: 'lines+markers', yaxis: 'y2', name: 'Avg pH', line: { color: '#17becf', width: 2 } },
          ],
          layout: { title: { text: 'Yield & Soil pH by Region', font: { size: 16 } }, xaxis: { title: 'Region', tickangle: 45 }, yaxis: { title: 'Total Yield' }, yaxis2: { title: 'Avg pH', overlaying: 'y', side: 'right' }, margin: { b: 140 }, showlegend: true },
        },
      ],
      hidden_crop_optimization: [
        {
          query: "SELECT soil_type, region, ROUND(AVG(yield),2) as avg_yield FROM farming_yield GROUP BY soil_type, region ORDER BY avg_yield DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.soil_type + ' — ' + r.region), y: data.map(r => r.avg_yield), type: 'bar', marker: { color: '#2ca02c' } }],
          layout: { title: { text: 'Top Crop-Region Combinations', font: { size: 16 } }, xaxis: { title: 'Soil Type — Region', tickangle: 60 }, yaxis: { title: 'Avg Yield' }, margin: { b: 200 }, showlegend: false },
        },
      ],
      hidden_drought_risk: [
        {
          query: "SELECT region, ROUND(AVG(ndvi),4) as avg_ndvi, ROUND(AVG(yield),2) as avg_yield FROM farming_yield GROUP BY region ORDER BY avg_ndvi ASC",
          dataMapper: (data) => [{ x: data.map(r => r.avg_ndvi), y: data.map(r => r.avg_yield), text: data.map(r => r.region), type: 'scatter', mode: 'markers+text', textposition: 'top center', marker: { size: 12, color: '#d62728' } }],
          layout: { title: { text: 'Drought Risk: NDVI vs Yield', font: { size: 16 } }, xaxis: { title: 'Avg NDVI' }, yaxis: { title: 'Avg Yield' }, showlegend: false },
        },
      ],
    },
    finance: {
      dashboard: [
        {
          query: "SELECT ticker, ROUND(AVG(close),2) as avg_close, SUM(volume) as total_volume FROM finance_stocks GROUP BY ticker ORDER BY avg_close DESC",
          dataMapper: (data) => [
            { x: data.map(r => r.ticker), y: data.map(r => r.avg_close), type: 'bar', name: 'Avg Close', marker: { color: '#1f77b4' } },
          ],
          layout: { title: { text: 'Average Close Price by Ticker', font: { size: 16 } }, xaxis: { title: 'Ticker', tickangle: 45 }, yaxis: { title: 'Avg Close ($)' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      transaction_select: [
        {
          query: "SELECT date, ROUND(SUM(close),2) as total FROM finance_stocks GROUP BY date ORDER BY date",
          dataMapper: (data) => [{ x: data.map(r => r.date), y: data.map(r => r.total), type: 'bar', name: 'Close Prices', marker: { color: '#d62728' } }],
          layout: { title: { text: 'Total Close Price by Date', font: { size: 16 } }, xaxis: { title: 'Date', type: 'date' }, yaxis: { title: 'Sum Close ($)' }, margin: { b: 100 }, showlegend: false },
        },
      ],
      balance_by_account: [
        {
          query: "SELECT ticker, ROUND(SUM(close),2) as balance FROM finance_stocks GROUP BY ticker ORDER BY balance DESC",
          dataMapper: (data) => [{ x: data.map(r => r.ticker), y: data.map(r => r.balance), type: 'bar', name: 'Balance', marker: { color: '#9467bd' } }],
          layout: { title: { text: 'Cumulative Close by Ticker', font: { size: 16 } }, xaxis: { title: 'Ticker', tickangle: 45 }, yaxis: { title: 'Sum Close ($)' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      fraud_joins: [
        {
          query: "SELECT f.ticker, COUNT(*) as market_count FROM finance_stocks f JOIN market_index m ON f.date = m.date GROUP BY f.ticker ORDER BY market_count DESC",
          dataMapper: (data) => [{ x: data.map(r => r.ticker), y: data.map(r => r.market_count), type: 'bar', name: 'Matched Market Days', marker: { color: '#e377c2' } }],
          layout: { title: { text: 'Stock-Market Index Matches by Ticker', font: { size: 16 } }, xaxis: { title: 'Ticker', tickangle: 45 }, yaxis: { title: 'Count' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      balance_trend: [
        {
          query: "SELECT date, SUM(close) OVER (ORDER BY date) as cumulative_close FROM finance_stocks",
          dataMapper: (data) => [{ x: data.map(r => r.date), y: data.map(r => r.cumulative_close), type: 'scatter', mode: 'lines', name: 'Cumulative Close', line: { color: '#7f7f7f', width: 2 } }],
          layout: { title: { text: 'Cumulative Close Over Time', font: { size: 16 } }, xaxis: { title: 'Date', type: 'date' }, yaxis: { title: 'Cumulative Close ($)' }, showlegend: false },
        },
      ],
      cte_fraud: [
        {
          query: "WITH TickerStats AS (SELECT ticker, SUM(volume) as total_volume FROM finance_stocks GROUP BY ticker) SELECT ticker, total_volume FROM TickerStats ORDER BY total_volume DESC",
          dataMapper: (data) => [{ x: data.map(r => r.ticker), y: data.map(r => r.total_volume), type: 'bar', name: 'Volume', marker: { color: '#ff7f0e' } }],
          layout: { title: { text: 'Total Volume by Ticker (CTE)', font: { size: 16 } }, xaxis: { title: 'Ticker', tickangle: 45 }, yaxis: { title: 'Total Volume' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      capstone_finance: [
        {
          query: "SELECT f.date, ROUND(AVG(f.close),2) as avg_close, ROUND(AVG(m.index_close),2) as avg_index FROM finance_stocks f LEFT JOIN market_index m ON f.date = m.date GROUP BY f.date ORDER BY f.date",
          dataMapper: (data) => [
            { x: data.map(r => r.date), y: data.map(r => r.avg_close), type: 'scatter', mode: 'lines', name: 'Avg Stock Close', line: { color: '#d62728', width: 2 } },
            { x: data.map(r => r.date), y: data.map(r => r.avg_index), type: 'scatter', mode: 'lines', yaxis: 'y2', name: 'Market Index', line: { color: '#9467bd', width: 2 } },
          ],
          layout: { title: { text: 'Stock vs Market Index', font: { size: 16 } }, xaxis: { title: 'Date', type: 'date' }, yaxis: { title: 'Avg Close ($)' }, yaxis2: { title: 'Index Close', overlaying: 'y', side: 'right' }, margin: { b: 100 }, showlegend: true },
        },
      ],
      hidden_fraud_detection: [
        {
          query: "SELECT ticker, ROUND(AVG(high - low),2) as avg_spread, SUM(volume) as total_vol FROM finance_stocks GROUP BY ticker ORDER BY avg_spread DESC",
          dataMapper: (data) => [{ x: data.map(r => r.ticker), y: data.map(r => r.avg_spread), type: 'bar', name: 'Avg Daily Spread', marker: { color: '#d62728' } }],
          layout: { title: { text: 'Average Daily Spread by Ticker', font: { size: 16 } }, xaxis: { title: 'Ticker', tickangle: 45 }, yaxis: { title: 'Avg Spread ($)' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      hidden_portfolio_optimize: [
        {
          query: "SELECT ticker, ROUND(AVG(close),2) as avg_close, ROUND(AVG(volume),0) as avg_volume FROM finance_stocks GROUP BY ticker ORDER BY avg_close DESC",
          dataMapper: (data) => [{ x: data.map(r => r.avg_volume), y: data.map(r => r.avg_close), text: data.map(r => r.ticker), type: 'scatter', mode: 'markers+text', textposition: 'top center', marker: { size: 12, color: '#2ca02c' } }],
          layout: { title: { text: 'Portfolio: Close vs Volume', font: { size: 16 } }, xaxis: { title: 'Avg Volume' }, yaxis: { title: 'Avg Close ($)' }, showlegend: false },
        },
      ],
    },
    healthcare: {
      dashboard: [
        {
          query: "SELECT diagnosis, COUNT(*) as cnt FROM treatments GROUP BY diagnosis ORDER BY cnt DESC LIMIT 10",
          dataMapper: (data) => [{ labels: data.map(r => r.diagnosis), values: data.map(r => r.cnt), type: 'pie', textinfo: 'percent+label' }],
          layout: { title: { text: 'Top Diagnoses', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 60, l: 60, r: 60 } },
        },
        {
          query: "SELECT gender, COUNT(*) as cnt FROM patients GROUP BY gender ORDER BY cnt DESC",
          dataMapper: (data) => [{ x: data.map(r => r.gender), y: data.map(r => r.cnt), type: 'bar', name: 'Patients', marker: { color: '#2ca02c' } }],
          layout: { title: { text: 'Patients by Gender', font: { size: 16 } }, xaxis: { title: 'Gender' }, yaxis: { title: 'Count' }, showlegend: false },
        },
      ],
      patient_select: [
        {
          query: "SELECT gender, COUNT(*) as cnt FROM patients GROUP BY gender ORDER BY cnt DESC",
          dataMapper: (data) => [{ labels: data.map(r => r.gender), values: data.map(r => r.cnt), type: 'pie', textinfo: 'percent+label' }],
          layout: { title: { text: 'Patient Gender Distribution', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 80, l: 80, r: 80 } },
        },
      ],
      diagnosis_count: [
        {
          query: "SELECT diagnosis, COUNT(*) as cnt FROM treatments GROUP BY diagnosis ORDER BY cnt DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.diagnosis), y: data.map(r => r.cnt), type: 'bar', name: 'Count', marker: { color: '#17becf' } }],
          layout: { title: { text: 'Diagnosis Counts', font: { size: 16 } }, xaxis: { title: 'Diagnosis', tickangle: 45 }, yaxis: { title: 'Count' }, margin: { b: 160 }, showlegend: false },
        },
      ],
      treatment_joins: [
        {
          query: "SELECT t.diagnosis, COUNT(t.treatment_id) as treatment_count FROM patients p JOIN treatments t ON p.patient_id = t.patient_id GROUP BY t.diagnosis ORDER BY treatment_count DESC LIMIT 10",
          dataMapper: (data) => [{ x: data.map(r => r.diagnosis), y: data.map(r => r.treatment_count), type: 'bar', name: 'Treatments', marker: { color: '#2ca02c' } }],
          layout: { title: { text: 'Treatments by Diagnosis', font: { size: 16 } }, xaxis: { title: 'Diagnosis', tickangle: 45 }, yaxis: { title: 'Treatment Count' }, margin: { b: 160 }, showlegend: false },
        },
      ],
      admission_trend: [
        {
          query: "SELECT admission_date, COUNT(*) OVER (ORDER BY admission_date) as cumulative_admissions FROM admissions",
          dataMapper: (data) => [{ x: data.map(r => r.admission_date), y: data.map(r => r.cumulative_admissions), type: 'scatter', mode: 'lines', name: 'Cumulative', line: { color: '#17becf', width: 2 } }],
          layout: { title: { text: 'Cumulative Admissions', font: { size: 16 } }, xaxis: { title: 'Date', type: 'date' }, yaxis: { title: 'Cumulative Admissions' }, showlegend: false },
        },
      ],
      cte_treatment: [
        {
          query: "WITH DiagStats AS (SELECT diagnosis, COUNT(*) as cnt FROM treatments GROUP BY diagnosis) SELECT diagnosis, cnt FROM DiagStats ORDER BY cnt DESC LIMIT 10",
          dataMapper: (data) => [{ labels: data.map(r => r.diagnosis), values: data.map(r => r.cnt), type: 'pie', textinfo: 'percent+label' }],
          layout: { title: { text: 'Diagnosis Distribution (CTE)', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 80, l: 80, r: 80 } },
        },
      ],
      capstone_health: [
        {
          query: "SELECT t.diagnosis, COUNT(DISTINCT p.patient_id) as patient_count, COUNT(t.treatment_id) as treatment_count FROM patients p JOIN treatments t ON p.patient_id = t.patient_id GROUP BY t.diagnosis ORDER BY patient_count DESC LIMIT 10",
          dataMapper: (data) => [
            { x: data.map(r => r.diagnosis), y: data.map(r => r.patient_count), type: 'bar', name: 'Patients', marker: { color: '#2ca02c' } },
            { x: data.map(r => r.diagnosis), y: data.map(r => r.treatment_count), type: 'bar', name: 'Treatments', marker: { color: '#17becf' } },
          ],
          layout: { title: { text: 'Patients & Treatments by Diagnosis', font: { size: 16 } }, xaxis: { title: 'Diagnosis', tickangle: 45 }, yaxis: { title: 'Count' }, barmode: 'group', margin: { b: 160 }, showlegend: true },
        },
      ],
      hidden_readmission_risk: [
        {
          query: "SELECT p.gender, COUNT(a.admission_id) as admissions, COUNT(DISTINCT p.patient_id) as patients FROM patients p JOIN admissions a ON p.patient_id = a.patient_id GROUP BY p.gender",
          dataMapper: (data) => [
            { x: data.map(r => r.gender), y: data.map(r => r.admissions), type: 'bar', name: 'Admissions', marker: { color: '#d62728' } },
            { x: data.map(r => r.gender), y: data.map(r => r.patients), type: 'bar', name: 'Patients', marker: { color: '#1f77b4' } },
          ],
          layout: { title: { text: 'Admissions vs Patients by Gender', font: { size: 16 } }, xaxis: { title: 'Gender' }, yaxis: { title: 'Count' }, barmode: 'group', showlegend: true },
        },
      ],
      hidden_diagnosis_delay: [
        {
          query: "SELECT t.diagnosis, ROUND(AVG(JULIANDAY(t.treatment_date) - JULIANDAY(p.birthdate))/365,1) as avg_age_at_treatment FROM treatments t JOIN patients p ON t.patient_id = p.patient_id GROUP BY t.diagnosis ORDER BY avg_age_at_treatment DESC LIMIT 10",
          dataMapper: (data) => [{ x: data.map(r => r.diagnosis), y: data.map(r => r.avg_age_at_treatment), type: 'bar', marker: { color: '#ff7f0e' } }],
          layout: { title: { text: 'Avg Patient Age at Treatment by Diagnosis', font: { size: 16 } }, xaxis: { title: 'Diagnosis', tickangle: 45 }, yaxis: { title: 'Avg Age (years)' }, margin: { b: 160 }, showlegend: false },
        },
      ],
    },
    social: {
      dashboard: [
        {
          query: "SELECT user_id, COUNT(*) as tweet_count FROM tweets GROUP BY user_id ORDER BY tweet_count DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.user_id), y: data.map(r => r.tweet_count), type: 'bar', name: 'Tweets', marker: { color: '#1f77b4' } }],
          layout: { title: { text: 'Top 15 Users by Tweet Count', font: { size: 16 } }, xaxis: { title: 'User ID', tickangle: 45 }, yaxis: { title: 'Tweet Count' }, margin: { b: 140 }, showlegend: false },
        },
        {
          query: "SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as cnt FROM tweets GROUP BY month ORDER BY month",
          dataMapper: (data) => [{ x: data.map(r => r.month), y: data.map(r => r.cnt), type: 'scatter', mode: 'lines+markers', name: 'Tweets/Month', line: { color: '#bcbd22', width: 2 } }],
          layout: { title: { text: 'Tweet Volume Over Time', font: { size: 16 } }, xaxis: { title: 'Month' }, yaxis: { title: 'Tweets' }, showlegend: false },
        },
      ],
      post_select: [
        {
          query: "SELECT user_id, COUNT(*) as cnt FROM tweets GROUP BY user_id ORDER BY cnt DESC LIMIT 10",
          dataMapper: (data) => [{ labels: data.map(r => r.user_id), values: data.map(r => r.cnt), type: 'pie', textinfo: 'percent+label' }],
          layout: { title: { text: 'Tweet Distribution by User (Top 10)', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 80, l: 80, r: 80 } },
        },
      ],
      engagement_by_type: [
        {
          query: "SELECT user_id, COUNT(*) as tweet_count, ROUND(AVG(LENGTH(text)),1) as avg_length FROM tweets GROUP BY user_id ORDER BY tweet_count DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.user_id), y: data.map(r => r.tweet_count), type: 'bar', name: 'Tweets', marker: { color: '#bcbd22' } }],
          layout: { title: { text: 'Engagement: Tweets per User', font: { size: 16 } }, xaxis: { title: 'User ID', tickangle: 45 }, yaxis: { title: 'Tweet Count' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      user_joins: [
        {
          query: "SELECT u.user_name, COUNT(t.tweet_id) as tweet_count FROM users u JOIN tweets t ON u.user_id = t.user_id GROUP BY u.user_name ORDER BY tweet_count DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.user_name), y: data.map(r => r.tweet_count), type: 'bar', name: 'Tweets', marker: { color: '#17becf' } }],
          layout: { title: { text: 'Tweets by User Name', font: { size: 16 } }, xaxis: { title: 'User', tickangle: 45 }, yaxis: { title: 'Tweet Count' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      likes_trend: [
        {
          query: "SELECT created_at, COUNT(*) OVER (ORDER BY created_at) as cumulative_tweets FROM tweets",
          dataMapper: (data) => [{ x: data.map(r => r.created_at), y: data.map(r => r.cumulative_tweets), type: 'scatter', mode: 'lines', name: 'Cumulative Tweets', line: { color: '#1f77b4', width: 2 } }],
          layout: { title: { text: 'Cumulative Tweets Over Time', font: { size: 16 } }, xaxis: { title: 'Date', type: 'date' }, yaxis: { title: 'Cumulative Tweets' }, showlegend: false },
        },
      ],
      cte_engagement: [
        {
          query: "WITH UserStats AS (SELECT user_id, COUNT(*) as tweet_count FROM tweets GROUP BY user_id) SELECT user_id, tweet_count FROM UserStats ORDER BY tweet_count DESC LIMIT 10",
          dataMapper: (data) => [{ x: data.map(r => r.user_id), y: data.map(r => r.tweet_count), type: 'bar', name: 'Tweets', marker: { color: '#d62728' } }],
          layout: { title: { text: 'Top Users by Tweet Count (CTE)', font: { size: 16 } }, xaxis: { title: 'User ID', tickangle: 45 }, yaxis: { title: 'Tweets' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      capstone_social: [
        {
          query: "SELECT u.user_name, COUNT(t.tweet_id) as tweet_count, ROUND(AVG(LENGTH(t.text)),1) as avg_text_len FROM tweets t JOIN users u ON t.user_id = u.user_id GROUP BY u.user_name ORDER BY tweet_count DESC LIMIT 10",
          dataMapper: (data) => [
            { x: data.map(r => r.user_name), y: data.map(r => r.tweet_count), type: 'bar', name: 'Tweets', marker: { color: '#bcbd22' } },
            { x: data.map(r => r.user_name), y: data.map(r => r.avg_text_len), type: 'scatter', mode: 'lines+markers', yaxis: 'y2', name: 'Avg Text Length', line: { color: '#17becf', width: 2 } },
          ],
          layout: { title: { text: 'Tweets & Avg Length by User', font: { size: 16 } }, xaxis: { title: 'User', tickangle: 45 }, yaxis: { title: 'Tweet Count' }, yaxis2: { title: 'Avg Text Length', overlaying: 'y', side: 'right' }, margin: { b: 140 }, showlegend: true },
        },
      ],
      hidden_influencer_roi: [
        {
          query: "SELECT u.user_name, COUNT(t.tweet_id) as tweets, ROUND(AVG(LENGTH(t.text)),1) as avg_len FROM users u JOIN tweets t ON u.user_id = t.user_id GROUP BY u.user_name ORDER BY tweets DESC LIMIT 10",
          dataMapper: (data) => [{ x: data.map(r => r.user_name), y: data.map(r => r.tweets), type: 'bar', marker: { color: '#9467bd' } }],
          layout: { title: { text: 'Top Influencers by Activity', font: { size: 16 } }, xaxis: { title: 'User', tickangle: 45 }, yaxis: { title: 'Tweets' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      hidden_viral_prediction: [
        {
          query: "SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as tweet_count FROM tweets GROUP BY month ORDER BY month",
          dataMapper: (data) => [{ x: data.map(r => r.month), y: data.map(r => r.tweet_count), type: 'scatter', mode: 'lines+markers', line: { color: '#ff7f0e', width: 2 } }],
          layout: { title: { text: 'Tweet Volume Trend', font: { size: 16 } }, xaxis: { title: 'Month' }, yaxis: { title: 'Tweets' }, showlegend: false },
        },
      ],
    },
    space: {
      dashboard: [
        {
          query: "SELECT is_potentially_hazardous, COUNT(*) as cnt FROM space_neo GROUP BY is_potentially_hazardous",
          dataMapper: (data) => [{ labels: data.map(r => r.is_potentially_hazardous), values: data.map(r => r.cnt), type: 'pie', textinfo: 'percent+label' }],
          layout: { title: { text: 'NEOs by Hazard Status', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 60, l: 60, r: 60 } },
        },
        {
          query: "SELECT is_potentially_hazardous, ROUND(AVG(relative_velocity_km_s),2) as avg_vel, ROUND(AVG(dist_km),0) as avg_dist FROM space_neo GROUP BY is_potentially_hazardous",
          dataMapper: (data) => [{ x: data.map(r => r.is_potentially_hazardous), y: data.map(r => r.avg_vel), type: 'bar', name: 'Avg Velocity', marker: { color: '#e377c2' } }],
          layout: { title: { text: 'Avg Velocity by Hazard Status', font: { size: 16 } }, xaxis: { title: 'Hazardous' }, yaxis: { title: 'Avg Velocity (km/s)' }, showlegend: false },
        },
      ],
      orbit_select: [
        {
          query: "SELECT is_potentially_hazardous, COUNT(*) as cnt FROM space_neo GROUP BY is_potentially_hazardous",
          dataMapper: (data) => [{ labels: data.map(r => r.is_potentially_hazardous), values: data.map(r => r.cnt), type: 'pie', textinfo: 'percent+label' }],
          layout: { title: { text: 'NEO Hazard Distribution', font: { size: 16 } }, showlegend: true, margin: { t: 80, b: 80, l: 80, r: 80 } },
        },
      ],
      velocity_by_type: [
        {
          query: "SELECT is_potentially_hazardous, ROUND(AVG(relative_velocity_km_s),2) as avg_velocity FROM space_neo GROUP BY is_potentially_hazardous ORDER BY avg_velocity DESC",
          dataMapper: (data) => [{ x: data.map(r => r.is_potentially_hazardous), y: data.map(r => r.avg_velocity), type: 'bar', name: 'Avg Velocity', marker: { color: '#9467bd' } }],
          layout: { title: { text: 'Average Velocity by Hazard Status', font: { size: 16 } }, xaxis: { title: 'Potentially Hazardous' }, yaxis: { title: 'Avg Velocity (km/s)' }, showlegend: false },
        },
      ],
      mission_joins: [
        {
          query: "SELECT is_potentially_hazardous, COUNT(*) as cnt FROM space_neo WHERE dist_km < 1000000 GROUP BY is_potentially_hazardous",
          dataMapper: (data) => [{ x: data.map(r => r.is_potentially_hazardous), y: data.map(r => r.cnt), type: 'bar', name: 'Close NEOs', marker: { color: '#e377c2' } }],
          layout: { title: { text: 'Close Approaches (<1M km) by Hazard', font: { size: 16 } }, xaxis: { title: 'Hazardous' }, yaxis: { title: 'Count' }, showlegend: false },
        },
      ],
      orbit_trend: [
        {
          query: "SELECT strftime('%Y', close_approach_date) as year, COUNT(*) as neo_count FROM space_neo GROUP BY year ORDER BY year",
          dataMapper: (data) => [{ x: data.map(r => r.year), y: data.map(r => r.neo_count), type: 'scatter', mode: 'lines+markers', name: 'NEOs per Year', line: { color: '#7f7f7f', width: 2 } }],
          layout: { title: { text: 'NEO Approaches by Year', font: { size: 16 } }, xaxis: { title: 'Year' }, yaxis: { title: 'NEO Count' }, showlegend: false },
        },
      ],
      cte_payload: [
        {
          query: "WITH RiskScores AS (SELECT des, ROUND(dist_km * relative_velocity_km_s, 0) as risk_score FROM space_neo) SELECT des, risk_score FROM RiskScores ORDER BY risk_score DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.des), y: data.map(r => r.risk_score), type: 'bar', name: 'Risk Score', marker: { color: '#ff7f0e' } }],
          layout: { title: { text: 'Top 15 NEO Risk Scores (CTE)', font: { size: 16 } }, xaxis: { title: 'NEO Designation', tickangle: 45 }, yaxis: { title: 'Risk Score' }, margin: { b: 160 }, showlegend: false },
        },
      ],
      capstone_space: [
        {
          query: "SELECT strftime('%Y', close_approach_date) as year, COUNT(*) as neo_count, ROUND(AVG(relative_velocity_km_s),2) as avg_velocity FROM space_neo GROUP BY year ORDER BY year",
          dataMapper: (data) => [
            { x: data.map(r => r.year), y: data.map(r => r.neo_count), type: 'bar', name: 'NEO Count', marker: { color: '#9467bd' } },
            { x: data.map(r => r.year), y: data.map(r => r.avg_velocity), type: 'scatter', mode: 'lines+markers', yaxis: 'y2', name: 'Avg Velocity', line: { color: '#e377c2', width: 2 } },
          ],
          layout: { title: { text: 'NEO Count & Velocity by Year', font: { size: 16 } }, xaxis: { title: 'Year' }, yaxis: { title: 'NEO Count' }, yaxis2: { title: 'Avg Velocity (km/s)', overlaying: 'y', side: 'right' }, showlegend: true },
        },
      ],
      hidden_mission_risk: [
        {
          query: "SELECT des, ROUND(dist_km, 0) as distance, ROUND(relative_velocity_km_s, 2) as velocity FROM space_neo WHERE is_potentially_hazardous = 'True' ORDER BY dist_km ASC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.distance), y: data.map(r => r.velocity), text: data.map(r => r.des), type: 'scatter', mode: 'markers+text', textposition: 'top center', marker: { size: 10, color: '#d62728' } }],
          layout: { title: { text: 'Hazardous NEOs: Distance vs Velocity', font: { size: 16 } }, xaxis: { title: 'Distance (km)' }, yaxis: { title: 'Velocity (km/s)' }, showlegend: false },
        },
      ],
      hidden_collision_alert: [
        {
          query: "SELECT des, ROUND(MIN(dist_km),0) as closest_km, ROUND(MAX(relative_velocity_km_s),2) as max_velocity FROM space_neo GROUP BY des ORDER BY closest_km ASC LIMIT 15",
          dataMapper: (data) => [
            { x: data.map(r => r.des), y: data.map(r => r.closest_km), type: 'bar', name: 'Closest Approach (km)', marker: { color: '#d62728' } },
          ],
          layout: { title: { text: 'Closest NEO Approaches', font: { size: 16 } }, xaxis: { title: 'NEO', tickangle: 45 }, yaxis: { title: 'Distance (km)' }, margin: { b: 160 }, showlegend: false },
        },
      ],
    },
    sports: {
      dashboard: [
        {
          query: "SELECT player_id, SUM(points) as total_points, SUM(assists) as total_assists FROM nba_games GROUP BY player_id ORDER BY total_points DESC LIMIT 15",
          dataMapper: (data) => [
            { x: data.map(r => r.player_id), y: data.map(r => r.total_points), type: 'bar', name: 'Points', marker: { color: '#1f77b4' } },
            { x: data.map(r => r.player_id), y: data.map(r => r.total_assists), type: 'bar', name: 'Assists', marker: { color: '#ff7f0e' } },
          ],
          layout: { title: { text: 'Top 15 Players: Points & Assists', font: { size: 16 } }, xaxis: { title: 'Player', tickangle: 45 }, yaxis: { title: 'Total' }, barmode: 'group', margin: { b: 140 }, showlegend: true },
        },
      ],
      match_select: [
        {
          query: "SELECT game_date, SUM(points) as total_points FROM nba_games GROUP BY game_date ORDER BY game_date",
          dataMapper: (data) => [{ x: data.map(r => r.game_date), y: data.map(r => r.total_points), type: 'bar', name: 'Points', marker: { color: '#1f77b4' } }],
          layout: { title: { text: 'Points by Game Date', font: { size: 16 } }, xaxis: { title: 'Game Date', type: 'date' }, yaxis: { title: 'Total Points' }, margin: { b: 100 }, showlegend: false },
        },
      ],
      score_by_team: [
        {
          query: "SELECT player_id, SUM(points) as total_points FROM nba_games GROUP BY player_id ORDER BY total_points DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.player_id), y: data.map(r => r.total_points), type: 'bar', name: 'Points', marker: { color: '#d62728' } }],
          layout: { title: { text: 'Points by Player', font: { size: 16 } }, xaxis: { title: 'Player ID', tickangle: 45 }, yaxis: { title: 'Total Points' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      player_joins: [
        {
          query: "SELECT n.player_id, COUNT(s.shot_id) as shot_count FROM nba_games n JOIN shot_zones s ON n.player_id = s.player_id GROUP BY n.player_id ORDER BY shot_count DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.player_id), y: data.map(r => r.shot_count), type: 'bar', name: 'Shots', marker: { color: '#2ca02c' } }],
          layout: { title: { text: 'Shots by Player', font: { size: 16 } }, xaxis: { title: 'Player ID', tickangle: 45 }, yaxis: { title: 'Shot Count' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      score_trend: [
        {
          query: "SELECT game_date, SUM(points) OVER (ORDER BY game_date) as cumulative_points FROM nba_games",
          dataMapper: (data) => [{ x: data.map(r => r.game_date), y: data.map(r => r.cumulative_points), type: 'scatter', mode: 'lines', name: 'Cumulative Points', line: { color: '#17becf', width: 2 } }],
          layout: { title: { text: 'Cumulative Points Over Time', font: { size: 16 } }, xaxis: { title: 'Game Date', type: 'date' }, yaxis: { title: 'Cumulative Points' }, showlegend: false },
        },
      ],
      cte_player: [
        {
          query: "WITH PlayerStats AS (SELECT player_id, SUM(points) as total_points FROM nba_games GROUP BY player_id) SELECT player_id, total_points FROM PlayerStats ORDER BY total_points DESC LIMIT 15",
          dataMapper: (data) => [{ x: data.map(r => r.player_id), y: data.map(r => r.total_points), type: 'bar', name: 'Points', marker: { color: '#bcbd22' } }],
          layout: { title: { text: 'Player Points (CTE)', font: { size: 16 } }, xaxis: { title: 'Player ID', tickangle: 45 }, yaxis: { title: 'Total Points' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      capstone_sports: [
        {
          query: "SELECT n.player_id, SUM(n.points) as total_points, COUNT(s.shot_id) as shot_count FROM nba_games n LEFT JOIN shot_zones s ON n.player_id = s.player_id GROUP BY n.player_id ORDER BY total_points DESC LIMIT 10",
          dataMapper: (data) => [
            { x: data.map(r => r.player_id), y: data.map(r => r.total_points), type: 'bar', name: 'Points', marker: { color: '#1f77b4' } },
            { x: data.map(r => r.player_id), y: data.map(r => r.shot_count), type: 'bar', name: 'Shots', marker: { color: '#d62728' } },
          ],
          layout: { title: { text: 'Points & Shots by Player', font: { size: 16 } }, xaxis: { title: 'Player', tickangle: 45 }, yaxis: { title: 'Count' }, barmode: 'group', margin: { b: 140 }, showlegend: true },
        },
      ],
      hidden_player_value: [
        {
          query: "SELECT player_id, SUM(points) as pts, SUM(assists) as ast, SUM(rebounds) as reb FROM nba_games GROUP BY player_id ORDER BY pts DESC LIMIT 10",
          dataMapper: (data) => [{ x: data.map(r => r.player_id), y: data.map(r => r.pts + r.ast + r.reb), type: 'bar', name: 'Total Efficiency', marker: { color: '#9467bd' } }],
          layout: { title: { text: 'Player Efficiency (Pts+Ast+Reb)', font: { size: 16 } }, xaxis: { title: 'Player', tickangle: 45 }, yaxis: { title: 'Efficiency' }, margin: { b: 140 }, showlegend: false },
        },
      ],
      hidden_mvp_predictor: [
        {
          query: "SELECT player_id, ROUND(AVG(points),1) as avg_pts, ROUND(AVG(assists),1) as avg_ast, ROUND(AVG(rebounds),1) as avg_reb FROM nba_games GROUP BY player_id ORDER BY avg_pts DESC LIMIT 10",
          dataMapper: (data) => [
            { x: data.map(r => r.player_id), y: data.map(r => r.avg_pts), type: 'bar', name: 'Avg Points', marker: { color: '#1f77b4' } },
            { x: data.map(r => r.player_id), y: data.map(r => r.avg_ast), type: 'bar', name: 'Avg Assists', marker: { color: '#ff7f0e' } },
            { x: data.map(r => r.player_id), y: data.map(r => r.avg_reb), type: 'bar', name: 'Avg Rebounds', marker: { color: '#2ca02c' } },
          ],
          layout: { title: { text: 'MVP Candidates', font: { size: 16 } }, xaxis: { title: 'Player', tickangle: 45 }, yaxis: { title: 'Avg per Game' }, barmode: 'group', margin: { b: 140 }, showlegend: true },
        },
      ],
    },
  };