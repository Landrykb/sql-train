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

  // Full case order including hidden levels
  export const fullCaseOrder: { [domain: string]: string[] } = Object.fromEntries(
    Object.keys(caseOrder).map((domain) => [
      domain,
      [...caseOrder[domain], ...(hiddenCaseOrder[domain] || [])],
    ])
  );

  // Visualization configurations for each domain and case
  export const visualizationConfigs: Record<string, Record<string, VisualizationConfig[]>> = {
    business: {
      basics_select: [
        {
          query: 'SELECT sale_date, SUM(amount) as total_sales FROM business_retail GROUP BY sale_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.sale_date),
              y: data.map((row) => row.total_sales),
              type: 'bar',
              name: 'Total Sales',
              marker: { color: '#1f77b4' },
            },
          ],
          layout: {
            title: { text: 'Total Sales by Date', font: { size: 18 } },
            xaxis: { title: 'Sale Date', type: 'date' },
            yaxis: { title: 'Total Sales ($)' },
            margin: { b: 100 },
            showlegend: false,
          },
        },
      ],
      agg_revenue: [
        {
          query: 'SELECT product_id, SUM(amount) as revenue FROM business_retail GROUP BY product_id',
          dataMapper: (data) => [
            {
              labels: data.map((row) => row.product_id),
              values: data.map((row) => row.revenue),
              type: 'pie',
              name: 'Revenue by Product',
              textinfo: 'percent+label',
              hoverinfo: 'label+percent',
            },
          ],
          layout: {
            title: { text: 'Revenue by Product', font: { size: 18 } },
            showlegend: true,
            margin: { t: 100, b: 100, l: 100, r: 100 },
          },
        },
      ],
      joins_returns: [
        {
          query: 'SELECT r.product_id, COUNT(r.return_id) as return_count FROM business_retail b JOIN returns r ON b.product_id = r.product_id GROUP BY r.product_id',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.product_id),
              y: data.map((row) => row.return_count),
              type: 'bar',
              name: 'Returns by Product',
              marker: { color: '#d62728' },
            },
          ],
          layout: {
            title: { text: 'Returns by Product', font: { size: 18 } },
            xaxis: { title: 'Product ID', tickangle: 45 },
            yaxis: { title: 'Return Count' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      window_cumsum: [
        {
          query: 'SELECT sale_date, SUM(amount) OVER (ORDER BY sale_date) as cumulative_sales FROM business_retail',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.sale_date),
              y: data.map((row) => row.cumulative_sales),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Cumulative Sales',
              line: { color: '#ff7f0e', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Cumulative Sales Over Time', font: { size: 18 } },
            xaxis: { title: 'Sale Date', type: 'date' },
            yaxis: { title: 'Cumulative Sales ($)' },
            showlegend: true,
          },
        },
      ],
      cte_profit: [
        {
          query: 'WITH Profit AS (SELECT product_id, SUM(amount) - SUM(return_amount) as profit FROM business_retail b JOIN returns r ON b.product_id = r.product_id GROUP BY product_id) SELECT product_id, profit FROM Profit',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.product_id),
              y: data.map((row) => row.profit),
              type: 'bar',
              name: 'Profit by Product',
              marker: { color: '#2ca02c' },
            },
          ],
          layout: {
            title: { text: 'Profit by Product', font: { size: 18 } },
            xaxis: { title: 'Product ID', tickangle: 45 },
            yaxis: { title: 'Profit ($)' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      capstone_root: [
        {
          query: 'SELECT b.sale_date, SUM(b.amount) as total_sales, COUNT(r.return_id) as return_count FROM business_retail b LEFT JOIN returns r ON b.product_id = r.product_id GROUP BY b.sale_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.sale_date),
              y: data.map((row) => row.total_sales),
              type: 'bar',
              name: 'Total Sales',
              marker: { color: '#1f77b4' },
            },
            {
              x: data.map((row) => row.sale_date),
              y: data.map((row) => row.return_count),
              type: 'scatter',
              mode: 'lines+markers',
              yaxis: 'y2',
              name: 'Return Count',
              line: { color: '#d62728', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Sales and Returns Over Time', font: { size: 18 } },
            xaxis: { title: 'Sale Date', type: 'date' },
            yaxis: { title: 'Total Sales ($)' },
            yaxis2: { title: 'Return Count', overlaying: 'y', side: 'right' },
            margin: { b: 100 },
            showlegend: true,
          },
        },
      ],
    },
    crime: {
      crime_select: [
        {
          query: 'SELECT crime_type, COUNT(*) as count FROM crime_chicago GROUP BY crime_type',
          dataMapper: (data) => [
            {
              labels: data.map((row) => row.crime_type),
              values: data.map((row) => row.count),
              type: 'pie',
              name: 'Crime Types',
              textinfo: 'percent+label',
              hoverinfo: 'label+percent',
            },
          ],
          layout: {
            title: { text: 'Crime Type Distribution', font: { size: 18 } },
            showlegend: true,
            margin: { t: 100, b: 100, l: 100, r: 100 },
          },
        },
      ],
      crime_by_area: [
        {
          query: 'SELECT area_name, COUNT(*) as crime_count FROM crime_chicago GROUP BY area_name',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.area_name),
              y: data.map((row) => row.crime_count),
              type: 'bar',
              name: 'Crimes by Area',
              marker: { color: '#9467bd' },
            },
          ],
          layout: {
            title: { text: 'Crimes by Area', font: { size: 18 } },
            xaxis: { title: 'Area Name', tickangle: 45 },
            yaxis: { title: 'Crime Count' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      suspect_joins: [
        {
          query: 'SELECT c.crime_type, COUNT(s.suspect_id) as suspect_count FROM crime_chicago c JOIN suspects s ON c.case_id = s.case_id GROUP BY c.crime_type',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.crime_type),
              y: data.map((row) => row.suspect_count),
              type: 'bar',
              name: 'Suspects by Crime Type',
              marker: { color: '#e377c2' },
            },
          ],
          layout: {
            title: { text: 'Suspects by Crime Type', font: { size: 18 } },
            xaxis: { title: 'Crime Type', tickangle: 45 },
            yaxis: { title: 'Suspect Count' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      crime_trend: [
        {
          query: 'SELECT crime_date, COUNT(*) OVER (ORDER BY crime_date) as cumulative_crimes FROM crime_chicago',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.crime_date),
              y: data.map((row) => row.cumulative_crimes),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Cumulative Crimes',
              line: { color: '#7f7f7f', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Cumulative Crimes Over Time', font: { size: 18 } },
            xaxis: { title: 'Crime Date', type: 'date' },
            yaxis: { title: 'Cumulative Crimes' },
            showlegend: true,
          },
        },
      ],
      cte_crime: [
        {
          query: 'WITH CrimeStats AS (SELECT crime_type, COUNT(*) as count FROM crime_chicago GROUP BY crime_type) SELECT crime_type, count FROM CrimeStats',
          dataMapper: (data) => [
            {
              labels: data.map((row) => row.crime_type),
              values: data.map((row) => row.count),
              type: 'pie',
              name: 'Crime Stats',
              textinfo: 'percent+label',
              hoverinfo: 'label+percent',
            },
          ],
          layout: {
            title: { text: 'Crime Type Distribution with CTE', font: { size: 18 } },
            showlegend: true,
            margin: { t: 100, b: 100, l: 100, r: 100 },
          },
        },
      ],
      capstone_crime: [
        {
          query: 'SELECT c.crime_date, COUNT(c.case_id) as crime_count, COUNT(s.suspect_id) as suspect_count FROM crime_chicago c LEFT JOIN suspects s ON c.case_id = s.case_id GROUP BY c.crime_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.crime_date),
              y: data.map((row) => row.crime_count),
              type: 'bar',
              name: 'Crime Count',
              marker: { color: '#9467bd' },
            },
            {
              x: data.map((row) => row.crime_date),
              y: data.map((row) => row.suspect_count),
              type: 'scatter',
              mode: 'lines+markers',
              yaxis: 'y2',
              name: 'Suspect Count',
              line: { color: '#e377c2', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Crimes and Suspects Over Time', font: { size: 18 } },
            xaxis: { title: 'Crime Date', type: 'date' },
            yaxis: { title: 'Crime Count' },
            yaxis2: { title: 'Suspect Count', overlaying: 'y', side: 'right' },
            margin: { b: 100 },
            showlegend: true,
          },
        },
      ],
    },
    farming: {
      ndvi_overview: [
        {
          query: 'SELECT crop_type, AVG(ndvi) as avg_ndvi FROM farming_yield GROUP BY crop_type',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.crop_type),
              y: data.map((row) => row.avg_ndvi),
              type: 'bar',
              name: 'Average NDVI',
              marker: { color: '#bcbd22' },
            },
          ],
          layout: {
            title: { text: 'Average NDVI by Crop', font: { size: 18 } },
            xaxis: { title: 'Crop Type', tickangle: 45 },
            yaxis: { title: 'Average NDVI' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      yield_by_crop: [
        {
          query: 'SELECT crop_type, SUM(yield) as total_yield FROM farming_yield GROUP BY crop_type',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.crop_type),
              y: data.map((row) => row.total_yield),
              type: 'bar',
              name: 'Total Yield',
              marker: { color: '#17becf' },
            },
          ],
          layout: {
            title: { text: 'Total Yield by Crop', font: { size: 18 } },
            xaxis: { title: 'Crop Type', tickangle: 45 },
            yaxis: { title: 'Total Yield (kg)' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      soil_joins: [
        {
          query: 'SELECT f.crop_type, AVG(s.soil_ph) as avg_ph FROM farming_yield f JOIN soil_data s ON f.field_id = s.field_id GROUP BY f.crop_type',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.crop_type),
              y: data.map((row) => row.avg_ph),
              type: 'bar',
              name: 'Average Soil pH',
              marker: { color: '#1f77b4' },
            },
          ],
          layout: {
            title: { text: 'Average Soil pH by Crop', font: { size: 18 } },
            xaxis: { title: 'Crop Type', tickangle: 45 },
            yaxis: { title: 'Average Soil pH' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      yield_trend: [
        {
          query: 'SELECT harvest_date, SUM(yield) OVER (ORDER BY harvest_date) as cumulative_yield FROM farming_yield',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.harvest_date),
              y: data.map((row) => row.cumulative_yield),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Cumulative Yield',
              line: { color: '#ff7f0e', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Cumulative Yield Over Time', font: { size: 18 } },
            xaxis: { title: 'Harvest Date', type: 'date' },
            yaxis: { title: 'Cumulative Yield (kg)' },
            showlegend: true,
          },
        },
      ],
      cte_soil: [
        {
          query: 'WITH SoilStats AS (SELECT field_id, AVG(soil_ph) as avg_ph FROM soil_data GROUP BY field_id) SELECT s.field_id, s.avg_ph FROM SoilStats s JOIN farming_yield f ON s.field_id = f.field_id',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.field_id),
              y: data.map((row) => row.avg_ph),
              type: 'bar',
              name: 'Average Soil pH',
              marker: { color: '#2ca02c' },
            },
          ],
          layout: {
            title: { text: 'Soil pH by Field', font: { size: 18 } },
            xaxis: { title: 'Field ID', tickangle: 45 },
            yaxis: { title: 'Average Soil pH' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      capstone_farm: [
        {
          query: 'SELECT f.harvest_date, SUM(f.yield) as total_yield, AVG(s.soil_ph) as avg_ph FROM farming_yield f JOIN soil_data s ON f.field_id = s.field_id GROUP BY f.harvest_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.harvest_date),
              y: data.map((row) => row.total_yield),
              type: 'bar',
              name: 'Total Yield',
              marker: { color: '#bcbd22' },
            },
            {
              x: data.map((row) => row.harvest_date),
              y: data.map((row) => row.avg_ph),
              type: 'scatter',
              mode: 'lines+markers',
              yaxis: 'y2',
              name: 'Average Soil pH',
              line: { color: '#17becf', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Yield and Soil pH Over Time', font: { size: 18 } },
            xaxis: { title: 'Harvest Date', type: 'date' },
            yaxis: { title: 'Total Yield (kg)' },
            yaxis2: { title: 'Average Soil pH', overlaying: 'y', side: 'right' },
            margin: { b: 100 },
            showlegend: true,
          },
        },
      ],
    },
    finance: {
      transaction_select: [
        {
          query: 'SELECT transaction_date, SUM(amount) as total FROM finance_stocks GROUP BY transaction_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.transaction_date),
              y: data.map((row) => row.total),
              type: 'bar',
              name: 'Transaction Total',
              marker: { color: '#d62728' },
            },
          ],
          layout: {
            title: { text: 'Transactions by Date', font: { size: 18 } },
            xaxis: { title: 'Transaction Date', type: 'date' },
            yaxis: { title: 'Total Amount ($)' },
            margin: { b: 100 },
            showlegend: false,
          },
        },
      ],
      balance_by_account: [
        {
          query: 'SELECT ticker, SUM(amount) as balance FROM finance_stocks GROUP BY ticker',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.ticker),
              y: data.map((row) => row.balance),
              type: 'bar',
              name: 'Balance by Ticker',
              marker: { color: '#9467bd' },
            },
          ],
          layout: {
            title: { text: 'Balance by Ticker', font: { size: 18 } },
            xaxis: { title: 'Ticker', tickangle: 45 },
            yaxis: { title: 'Balance ($)' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      fraud_joins: [
        {
          query: 'SELECT f.ticker, COUNT(m.index_id) as market_count FROM finance_stocks f JOIN market_index m ON f.transaction_date = m.index_date GROUP BY f.ticker',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.ticker),
              y: data.map((row) => row.market_count),
              type: 'bar',
              name: 'Market Index Counts',
              marker: { color: '#e377c2' },
            },
          ],
          layout: {
            title: { text: 'Market Index Counts by Ticker', font: { size: 18 } },
            xaxis: { title: 'Ticker', tickangle: 45 },
            yaxis: { title: 'Market Index Count' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      balance_trend: [
        {
          query: 'SELECT transaction_date, SUM(amount) OVER (ORDER BY transaction_date) as cumulative_balance FROM finance_stocks',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.transaction_date),
              y: data.map((row) => row.cumulative_balance),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Cumulative Balance',
              line: { color: '#7f7f7f', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Cumulative Balance Over Time', font: { size: 18 } },
            xaxis: { title: 'Transaction Date', type: 'date' },
            yaxis: { title: 'Cumulative Balance ($)' },
            showlegend: true,
          },
        },
      ],
      cte_fraud: [
        {
          query: 'WITH FraudStats AS (SELECT ticker, COUNT(*) as fraud_count FROM finance_stocks WHERE suspicious = true GROUP BY ticker) SELECT ticker, fraud_count FROM FraudStats',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.ticker),
              y: data.map((row) => row.fraud_count),
              type: 'bar',
              name: 'Fraud Counts',
              marker: { color: '#ff7f0e' },
            },
          ],
          layout: {
            title: { text: 'Fraud Counts by Ticker', font: { size: 18 } },
            xaxis: { title: 'Ticker', tickangle: 45 },
            yaxis: { title: 'Fraud Count' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      capstone_finance: [
        {
          query: 'SELECT f.transaction_date, SUM(f.amount) as total_balance, COUNT(m.index_id) as market_count FROM finance_stocks f LEFT JOIN market_index m ON f.transaction_date = m.index_date GROUP BY f.transaction_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.transaction_date),
              y: data.map((row) => row.total_balance),
              type: 'bar',
              name: 'Total Balance',
              marker: { color: '#d62728' },
            },
            {
              x: data.map((row) => row.transaction_date),
              y: data.map((row) => row.market_count),
              type: 'scatter',
              mode: 'lines+markers',
              yaxis: 'y2',
              name: 'Market Count',
              line: { color: '#9467bd', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Balance and Market Index Over Time', font: { size: 18 } },
            xaxis: { title: 'Transaction Date', type: 'date' },
            yaxis: { title: 'Total Balance ($)' },
            yaxis2: { title: 'Market Index Count', overlaying: 'y', side: 'right' },
            margin: { b: 100 },
            showlegend: true,
          },
        },
      ],
    },
    healthcare: {
      patient_select: [
        {
          query: 'SELECT diagnosis, COUNT(*) as count FROM patients GROUP BY diagnosis',
          dataMapper: (data) => [
            {
              labels: data.map((row) => row.diagnosis),
              values: data.map((row) => row.count),
              type: 'pie',
              name: 'Diagnosis Distribution',
              textinfo: 'percent+label',
              hoverinfo: 'label+percent',
            },
          ],
          layout: {
            title: { text: 'Diagnosis Distribution', font: { size: 18 } },
            showlegend: true,
            margin: { t: 100, b: 100, l: 100, r: 100 },
          },
        },
      ],
      diagnosis_count: [
        {
          query: 'SELECT treatment_type, COUNT(*) as count FROM treatments GROUP BY treatment_type',
          dataMapper: (data) => [
            {
              labels: data.map((row) => row.treatment_type),
              values: data.map((row) => row.count),
              type: 'pie',
              name: 'Treatment Types',
              textinfo: 'percent+label',
              hoverinfo: 'label+percent',
            },
          ],
          layout: {
            title: { text: 'Treatment Type Distribution', font: { size: 18 } },
            showlegend: true,
            margin: { t: 100, b: 100, l: 100, r: 100 },
          },
        },
      ],
      treatment_joins: [
        {
          query: 'SELECT p.diagnosis, COUNT(t.treatment_id) as treatment_count FROM patients p JOIN treatments t ON p.patient_id = t.patient_id GROUP BY p.diagnosis',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.diagnosis),
              y: data.map((row) => row.treatment_count),
              type: 'bar',
              name: 'Treatments by Diagnosis',
              marker: { color: '#2ca02c' },
            },
          ],
          layout: {
            title: { text: 'Treatments by Diagnosis', font: { size: 18 } },
            xaxis: { title: 'Diagnosis', tickangle: 45 },
            yaxis: { title: 'Treatment Count' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      admission_trend: [
        {
          query: 'SELECT admission_date, COUNT(*) OVER (ORDER BY admission_date) as cumulative_admissions FROM admissions',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.admission_date),
              y: data.map((row) => row.cumulative_admissions),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Cumulative Admissions',
              line: { color: '#17becf', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Cumulative Admissions Over Time', font: { size: 18 } },
            xaxis: { title: 'Admission Date', type: 'date' },
            yaxis: { title: 'Cumulative Admissions' },
            showlegend: true,
          },
        },
      ],
      cte_treatment: [
        {
          query: 'WITH TreatmentStats AS (SELECT treatment_type, COUNT(*) as count FROM treatments GROUP BY treatment_type) SELECT treatment_type, count FROM TreatmentStats',
          dataMapper: (data) => [
            {
              labels: data.map((row) => row.treatment_type),
              values: data.map((row) => row.count),
              type: 'pie',
              name: 'Treatment Stats',
              textinfo: 'percent+label',
              hoverinfo: 'label+percent',
            },
          ],
          layout: {
            title: { text: 'Treatment Type Distribution with CTE', font: { size: 18 } },
            showlegend: true,
            margin: { t: 100, b: 100, l: 100, r: 100 },
          },
        },
      ],
      capstone_health: [
        {
          query: 'SELECT a.admission_date, COUNT(p.patient_id) as patient_count, COUNT(t.treatment_id) as treatment_count FROM admissions a LEFT JOIN patients p ON a.patient_id = p.patient_id LEFT JOIN treatments t ON p.patient_id = t.patient_id GROUP BY a.admission_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.admission_date),
              y: data.map((row) => row.patient_count),
              type: 'bar',
              name: 'Patient Count',
              marker: { color: '#2ca02c' },
            },
            {
              x: data.map((row) => row.admission_date),
              y: data.map((row) => row.treatment_count),
              type: 'scatter',
              mode: 'lines+markers',
              yaxis: 'y2',
              name: 'Treatment Count',
              line: { color: '#17becf', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Patients and Treatments Over Time', font: { size: 18 } },
            xaxis: { title: 'Admission Date', type: 'date' },
            yaxis: { title: 'Patient Count' },
            yaxis2: { title: 'Treatment Count', overlaying: 'y', side: 'right' },
            margin: { b: 100 },
            showlegend: true,
          },
        },
      ],
    },
    social: {
      post_select: [
        {
          query: 'SELECT post_type, COUNT(*) as count FROM tweets GROUP BY post_type',
          dataMapper: (data) => [
            {
              labels: data.map((row) => row.post_type),
              values: data.map((row) => row.count),
              type: 'pie',
              name: 'Post Types',
              textinfo: 'percent+label',
              hoverinfo: 'label+percent',
            },
          ],
          layout: {
            title: { text: 'Post Type Distribution', font: { size: 18 } },
            showlegend: true,
            margin: { t: 100, b: 100, l: 100, r: 100 },
          },
        },
      ],
      engagement_by_type: [
        {
          query: 'SELECT post_type, SUM(likes) as total_likes FROM tweets GROUP BY post_type',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.post_type),
              y: data.map((row) => row.total_likes),
              type: 'bar',
              name: 'Total Likes',
              marker: { color: '#bcbd22' },
            },
          ],
          layout: {
            title: { text: 'Total Likes by Post Type', font: { size: 18 } },
            xaxis: { title: 'Post Type', tickangle: 45 },
            yaxis: { title: 'Total Likes' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      user_joins: [
        {
          query: 'SELECT u.user_id, COUNT(t.tweet_id) as tweet_count FROM users u JOIN tweets t ON u.user_id = t.user_id GROUP BY u.user_id',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.user_id),
              y: data.map((row) => row.tweet_count),
              type: 'bar',
              name: 'Tweets by User',
              marker: { color: '#17becf' },
            },
          ],
          layout: {
            title: { text

  : 'Tweets by User', font: { size: 18 } },
            xaxis: { title: 'User ID', tickangle: 45 },
            yaxis: { title: 'Tweet Count' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      likes_trend: [
        {
          query: 'SELECT post_date, SUM(likes) OVER (ORDER BY post_date) as cumulative_likes FROM tweets',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.post_date),
              y: data.map((row) => row.cumulative_likes),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Cumulative Likes',
              line: { color: '#1f77b4', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Cumulative Likes Over Time', font: { size: 18 } },
            xaxis: { title: 'Post Date', type: 'date' },
            yaxis: { title: 'Cumulative Likes' },
            showlegend: true,
          },
        },
      ],
      cte_engagement: [
        {
          query: 'WITH EngagementStats AS (SELECT post_type, SUM(likes) as total_likes FROM tweets GROUP BY post_type) SELECT post_type, total_likes FROM EngagementStats',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.post_type),
              y: data.map((row) => row.total_likes),
              type: 'bar',
              name: 'Total Likes',
              marker: { color: '#d62728' },
            },
          ],
          layout: {
            title: { text: 'Engagement by Post Type with CTE', font: { size: 18 } },
            xaxis: { title: 'Post Type', tickangle: 45 },
            yaxis: { title: 'Total Likes' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      capstone_social: [
        {
          query: 'SELECT t.post_date, COUNT(t.tweet_id) as tweet_count, COUNT(u.user_id) as user_count FROM tweets t LEFT JOIN users u ON t.user_id = u.user_id GROUP BY t.post_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.post_date),
              y: data.map((row) => row.tweet_count),
              type: 'bar',
              name: 'Tweet Count',
              marker: { color: '#bcbd22' },
            },
            {
              x: data.map((row) => row.post_date),
              y: data.map((row) => row.user_count),
              type: 'scatter',
              mode: 'lines+markers',
              yaxis: 'y2',
              name: 'User Count',
              line: { color: '#17becf', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Tweets and Users Over Time', font: { size: 18 } },
            xaxis: { title: 'Post Date', type: 'date' },
            yaxis: { title: 'Tweet Count' },
            yaxis2: { title: 'User Count', overlaying: 'y', side: 'right' },
            margin: { b: 100 },
            showlegend: true,
          },
        },
      ],
    },
    space: {
      orbit_select: [
        {
          query: 'SELECT orbit_type, COUNT(*) as count FROM space_neo GROUP BY orbit_type',
          dataMapper: (data) => [
            {
              labels: data.map((row) => row.orbit_type),
              values: data.map((row) => row.count),
              type: 'pie',
              name: 'Orbit Types',
              textinfo: 'percent+label',
              hoverinfo: 'label+percent',
            },
          ],
          layout: {
            title: { text: 'Orbit Type Distribution', font: { size: 18 } },
            showlegend: true,
            margin: { t: 100, b: 100, l: 100, r: 100 },
          },
        },
      ],
      velocity_by_type: [
        {
          query: 'SELECT orbit_type, AVG(velocity) as avg_velocity FROM space_neo GROUP BY orbit_type',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.orbit_type),
              y: data.map((row) => row.avg_velocity),
              type: 'bar',
              name: 'Average Velocity',
              marker: { color: '#9467bd' },
            },
          ],
          layout: {
            title: { text: 'Average Velocity by Orbit Type', font: { size: 18 } },
            xaxis: { title: 'Orbit Type', tickangle: 45 },
            yaxis: { title: 'Average Velocity (km/s)' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      mission_joins: [
        {
          query: 'SELECT orbit_type, COUNT(*) as hazard_count FROM space_neo WHERE is_hazardous = true GROUP BY orbit_type',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.orbit_type),
              y: data.map((row) => row.hazard_count),
              type: 'bar',
              name: 'Hazardous NEOs',
              marker: { color: '#e377c2' },
            },
          ],
          layout: {
            title: { text: 'Hazardous NEOs by Orbit Type', font: { size: 18 } },
            xaxis: { title: 'Orbit Type', tickangle: 45 },
            yaxis: { title: 'Hazardous NEO Count' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      orbit_trend: [
        {
          query: 'SELECT observation_date, COUNT(*) OVER (ORDER BY observation_date) as cumulative_neos FROM space_neo',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.observation_date),
              y: data.map((row) => row.cumulative_neos),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Cumulative NEOs',
              line: { color: '#7f7f7f', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Cumulative NEOs Over Time', font: { size: 18 } },
            xaxis: { title: 'Observation Date', type: 'date' },
            yaxis: { title: 'Cumulative NEOs' },
            showlegend: true,
          },
        },
      ],
      cte_payload: [
        {
          query: 'WITH VelocityStats AS (SELECT orbit_type, AVG(velocity) as avg_velocity FROM space_neo GROUP BY orbit_type) SELECT orbit_type, avg_velocity FROM VelocityStats',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.orbit_type),
              y: data.map((row) => row.avg_velocity),
              type: 'bar',
              name: 'Average Velocity',
              marker: { color: '#ff7f0e' },
            },
          ],
          layout: {
            title: { text: 'Average Velocity by Orbit Type with CTE', font: { size: 18 } },
            xaxis: { title: 'Orbit Type', tickangle: 45 },
            yaxis: { title: 'Average Velocity (km/s)' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      capstone_space: [
        {
          query: 'SELECT observation_date, COUNT(*) as neo_count, AVG(velocity) as avg_velocity FROM space_neo GROUP BY observation_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.observation_date),
              y: data.map((row) => row.neo_count),
              type: 'bar',
              name: 'NEO Count',
              marker: { color: '#9467bd' },
            },
            {
              x: data.map((row) => row.observation_date),
              y: data.map((row) => row.avg_velocity),
              type: 'scatter',
              mode: 'lines+markers',
              yaxis: 'y2',
              name: 'Average Velocity',
              line: { color: '#e377c2', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'NEOs and Velocity Over Time', font: { size: 18 } },
            xaxis: { title: 'Observation Date', type: 'date' },
            yaxis: { title: 'NEO Count' },
            yaxis2: { title: 'Average Velocity (km/s)', overlaying: 'y', side: 'right' },
            margin: { b: 100 },
            showlegend: true,
          },
        },
      ],
    },
    sports: {
      match_select: [
        {
          query: 'SELECT game_date, SUM(points) as total_points FROM nba_games GROUP BY game_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.game_date),
              y: data.map((row) => row.total_points),
              type: 'bar',
              name: 'Total Points',
              marker: { color: '#1f77b4' },
            },
          ],
          layout: {
            title: { text: 'Points by Game Date', font: { size: 18 } },
            xaxis: { title: 'Game Date', type: 'date' },
            yaxis: { title: 'Total Points' },
            margin: { b: 100 },
            showlegend: false,
          },
        },
      ],
      score_by_team: [
        {
          query: 'SELECT player_id, SUM(points) as total_points FROM nba_games GROUP BY player_id',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.player_id),
              y: data.map((row) => row.total_points),
              type: 'bar',
              name: 'Points by Player',
              marker: { color: '#d62728' },
            },
          ],
          layout: {
            title: { text: 'Points by Player', font: { size: 18 } },
            xaxis: { title: 'Player ID', tickangle: 45 },
            yaxis: { title: 'Total Points' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      player_joins: [
        {
          query: 'SELECT n.player_id, COUNT(s.shot_id) as shot_count FROM nba_games n JOIN shot_zones s ON n.player_id = s.player_id GROUP BY n.player_id',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.player_id),
              y: data.map((row) => row.shot_count),
              type: 'bar',
              name: 'Shots by Player',
              marker: { color: '#2ca02c' },
            },
          ],
          layout: {
            title: { text: 'Shots by Player', font: { size: 18 } },
            xaxis: { title: 'Player ID', tickangle: 45 },
            yaxis: { title: 'Shot Count' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      score_trend: [
        {
          query: 'SELECT game_date, SUM(points) OVER (ORDER BY game_date) as cumulative_points FROM nba_games',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.game_date),
              y: data.map((row) => row.cumulative_points),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Cumulative Points',
              line: { color: '#17becf', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Cumulative Points Over Time', font: { size: 18 } },
            xaxis: { title: 'Game Date', type: 'date' },
            yaxis: { title: 'Cumulative Points' },
            showlegend: true,
          },
        },
      ],
      cte_player: [
        {
          query: 'WITH PlayerStats AS (SELECT player_id, SUM(points) as total_points FROM nba_games GROUP BY player_id) SELECT player_id, total_points FROM PlayerStats',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.player_id),
              y: data.map((row) => row.total_points),
              type: 'bar',
              name: 'Total Points',
              marker: { color: '#bcbd22' },
            },
          ],
          layout: {
            title: { text: 'Player Points with CTE', font: { size: 18 } },
            xaxis: { title: 'Player ID', tickangle: 45 },
            yaxis: { title: 'Total Points' },
            margin: { b: 150 },
            showlegend: false,
          },
        },
      ],
      capstone_sports: [
        {
          query: 'SELECT n.game_date, SUM(n.points) as total_points, COUNT(s.shot_id) as shot_count FROM nba_games n LEFT JOIN shot_zones s ON n.player_id = s.player_id GROUP BY n.game_date',
          dataMapper: (data) => [
            {
              x: data.map((row) => row.game_date),
              y: data.map((row) => row.total_points),
              type: 'bar',
              name: 'Total Points',
              marker: { color: '#1f77b4' },
            },
            {
              x: data.map((row) => row.game_date),
              y: data.map((row) => row.shot_count),
              type: 'scatter',
              mode: 'lines+markers',
              yaxis: 'y2',
              name: 'Shot Count',
              line: { color: '#d62728', width: 2 },
              marker: { size: 8 },
            },
          ],
          layout: {
            title: { text: 'Points and Shots Over Time', font: { size: 18 } },
            xaxis: { title: 'Game Date', type: 'date' },
            yaxis: { title: 'Total Points' },
            yaxis2: { title: 'Shot Count', overlaying: 'y', side: 'right' },
            margin: { b: 100 },
            showlegend: true,
          },
        },
      ],
    },
    guide: {
      guide: [
        {
          query: 'SELECT topic, COUNT(*) as count FROM guides GROUP BY topic',
          dataMapper: (data) => [
            {
              labels: data.map((row) => row.topic),
              values: data.map((row) => row.count),
              type: 'pie',
              name: 'Guide Topics',
              textinfo: 'percent+label',
              hoverinfo: 'label+percent',
            },
          ],
          layout: {
            title: { text: 'Guide Topic Distribution', font: { size: 18 } },
            showlegend: true,
            margin: { t: 100, b: 100, l: 100, r: 100 },
          },
        },
      ],
    },
  };