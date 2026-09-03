'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import BleepxLogo from '@/components/BleepxLogo';
import AchievementNotification from '@/components/AchievementNotification';
import { TopicIcon, GuideIcon, CopyIcon, CheckBadge } from '@/components/AppIcons';

// ─── Guide Data ─────────────────────────────────────────────────────────────

interface GuideSection {
  title: string;
  content: string;
  code?: string;
  language?: string;
}

interface GuideTopic {
  id: string;
  name: string;
  description: string;
  sections: GuideSection[];
}

const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: 'python_basics',
    name: 'Python Essentials',
    description: 'Core Python for data science — lists, dicts, comprehensions, functions',
    sections: [
      { title: 'Variables & Types', content: 'Python is dynamically typed. Common types: int, float, str, bool, list, dict, tuple, set.', code: 'x = 42          # int\npi = 3.14       # float\nname = "Bleepx" # str\nis_active = True # bool\nnums = [1, 2, 3] # list\ninfo = {"key": "value"} # dict' },
      { title: 'List Comprehensions', content: 'Compact way to create lists by transforming or filtering elements.', code: '# Basic\nsquares = [x**2 for x in range(10)]\n\n# With condition\nevens = [x for x in range(20) if x % 2 == 0]\n\n# Nested\nflat = [x for row in matrix for x in row]' },
      { title: 'Functions', content: 'Define reusable code blocks. Use *args and **kwargs for flexible parameters.', code: 'def greet(name, greeting="Hello"):\n    return f"{greeting}, {name}!"\n\n# Lambda functions\nsquare = lambda x: x ** 2\n\n# Apply to list\nresult = list(map(lambda x: x*2, [1, 2, 3]))' },
      { title: 'String Formatting', content: 'f-strings (Python 3.6+) are the modern way to format strings.', code: 'name = "Bleepx"\nscore = 95.678\nprint(f"Agent {name} scored {score:.2f}%")\n# Output: Agent Bleepx scored 95.68%' },
    ],
  },
  {
    id: 'pandas',
    name: 'Pandas DataFrame',
    description: 'Data manipulation — loading, selecting, filtering, grouping, merging',
    sections: [
      { title: 'Loading Data', content: 'Read data from CSV, Excel, JSON, SQL, and more.', code: 'import pandas as pd\n\ndf = pd.read_csv("data.csv")\ndf = pd.read_excel("data.xlsx")\ndf = pd.read_json("data.json")\n\n# Quick look\ndf.head()        # first 5 rows\ndf.shape         # (rows, cols)\ndf.info()        # types & null counts\ndf.describe()    # stats summary' },
      { title: 'Selecting & Filtering', content: 'Access columns, rows, and subsets with loc/iloc.', code: '# Column\ndf["age"]\ndf[["name", "age"]]  # multiple cols\n\n# Rows by condition\ndf[df["age"] > 30]\ndf[(df["age"] > 20) & (df["city"] == "Tokyo")]\n\n# loc (label) vs iloc (position)\ndf.loc[0:5, "name":"age"]    # inclusive\ndf.iloc[0:5, 0:3]           # exclusive end' },
      { title: 'GroupBy & Aggregation', content: 'Split-apply-combine pattern for summarizing data.', code: '# Single aggregation\ndf.groupby("department")["salary"].mean()\n\n# Multiple aggregations\ndf.groupby("department").agg(\n    avg_salary=("salary", "mean"),\n    total=("salary", "sum"),\n    count=("salary", "count")\n)\n\n# Transform (keeps original shape)\ndf["dept_avg"] = df.groupby("dept")["salary"].transform("mean")' },
      { title: 'Handling Missing Data', content: 'Detect, fill, or drop NaN values.', code: '# Detect\ndf.isnull().sum()           # count per column\ndf.isnull().sum().sum()     # total nulls\n\n# Drop\ndf.dropna()                 # drop any row with NaN\ndf.dropna(subset=["age"])   # only if age is NaN\n\n# Fill\ndf["age"].fillna(df["age"].median(), inplace=True)\ndf["city"].fillna("Unknown", inplace=True)' },
      { title: 'Merging & Joining', content: 'Combine DataFrames like SQL JOINs.', code: '# Merge (like SQL JOIN)\npd.merge(df1, df2, on="id", how="inner")\npd.merge(df1, df2, on="id", how="left")\n\n# Concatenate (stack rows/cols)\npd.concat([df1, df2], axis=0)  # vertical\npd.concat([df1, df2], axis=1)  # horizontal' },
    ],
  },
  {
    id: 'numpy',
    name: 'NumPy Arrays',
    description: 'Numerical computing — arrays, linear algebra, random, broadcasting',
    sections: [
      { title: 'Creating Arrays', content: 'NumPy arrays are faster and more memory-efficient than Python lists.', code: 'import numpy as np\n\na = np.array([1, 2, 3, 4])\nb = np.zeros((3, 4))        # 3x4 of zeros\nc = np.ones((2, 3))         # 2x3 of ones\nd = np.arange(0, 10, 2)     # [0, 2, 4, 6, 8]\ne = np.linspace(0, 1, 5)    # 5 evenly spaced in [0,1]\nf = np.random.randn(3, 3)  # 3x3 standard normal' },
      { title: 'Array Operations', content: 'Element-wise operations and broadcasting — no loops needed.', code: 'a = np.array([1, 2, 3])\nb = np.array([4, 5, 6])\n\na + b     # [5, 7, 9]\na * b     # [4, 10, 18]\na ** 2    # [1, 4, 9]\nnp.dot(a, b)  # 32 (dot product)\n\n# Broadcasting\nmatrix = np.ones((3, 3))\nmatrix + a  # adds [1,2,3] to each row' },
      { title: 'Statistical Functions', content: 'Compute statistics across arrays or along axes.', code: 'arr = np.array([[1, 2, 3], [4, 5, 6]])\n\nnp.mean(arr)        # 3.5\nnp.std(arr)         # 1.707\nnp.mean(arr, axis=0) # [2.5, 3.5, 4.5] per column\nnp.mean(arr, axis=1) # [2.0, 5.0] per row\nnp.corrcoef(x, y)   # correlation matrix' },
    ],
  },
  {
    id: 'visualization',
    name: 'Data Visualization',
    description: 'Matplotlib, Seaborn, Plotly — charts, distributions, correlations',
    sections: [
      { title: 'Matplotlib Basics', content: 'The foundation of Python plotting. Create figures and axes.', code: 'import matplotlib.pyplot as plt\n\nfig, ax = plt.subplots(figsize=(10, 6))\nax.plot(x, y, label="Revenue")\nax.set_xlabel("Month")\nax.set_ylabel("Revenue ($)")\nax.set_title("Monthly Revenue")\nax.legend()\nplt.tight_layout()\nplt.show()' },
      { title: 'Seaborn Statistical Plots', content: 'Seaborn builds on matplotlib with beautiful statistical visualizations.', code: 'import seaborn as sns\n\n# Distribution\nsns.histplot(df["age"], kde=True)\n\n# Correlation heatmap\nsns.heatmap(df.corr(), annot=True, cmap="coolwarm")\n\n# Scatter with regression\nsns.regplot(x="sqft", y="price", data=df)\n\n# Box plot by category\nsns.boxplot(x="department", y="salary", data=df)' },
      { title: 'Choosing the Right Chart', content: 'Match your visualization to the question you\'re answering.', code: '# Distribution of 1 variable → histogram, KDE\n# Relationship between 2 → scatter, regplot\n# Compare categories → bar, box, violin\n# Trends over time → line chart\n# Composition → pie, stacked bar\n# Correlation matrix → heatmap\n# Geographic → choropleth map' },
    ],
  },
  {
    id: 'statistics',
    name: 'Statistics & Probability',
    description: 'Descriptive stats, distributions, hypothesis testing, confidence intervals',
    sections: [
      { title: 'Descriptive Statistics', content: 'Summarize data with measures of center (mean, median, mode) and spread (std, variance, IQR).', code: 'import numpy as np\nfrom scipy import stats\n\ndata = [23, 45, 12, 67, 34, 89, 23, 45]\n\nmean = np.mean(data)       # 42.25\nmedian = np.median(data)   # 39.5\nmode = stats.mode(data)    # 23\nstd = np.std(data)         # 23.9\nq1, q3 = np.percentile(data, [25, 75])\niqr = q3 - q1' },
      { title: 'Probability Distributions', content: 'Normal, binomial, Poisson — model real-world randomness.', code: 'from scipy.stats import norm, binom, poisson\n\n# Normal distribution\nnorm.pdf(0, loc=0, scale=1)    # P(X=0)\nnorm.cdf(1.96, loc=0, scale=1) # P(X≤1.96) ≈ 0.975\n\n# Binomial: n=10 trials, p=0.5 success\nbinom.pmf(5, n=10, p=0.5)     # P(X=5)\n\n# Poisson: average rate λ=3\npoisson.pmf(2, mu=3)           # P(X=2)' },
      { title: 'Hypothesis Testing', content: 'Test claims about populations using sample data.', code: 'from scipy.stats import ttest_ind, chi2_contingency\n\n# Two-sample t-test\nt_stat, p_value = ttest_ind(group_a, group_b)\nif p_value < 0.05:\n    print("Statistically significant difference")\n\n# Chi-squared test (categorical)\nchi2, p, dof, expected = chi2_contingency(contingency_table)\n\n# Steps: 1) State H0 & H1\n#        2) Choose significance level (α=0.05)\n#        3) Calculate test statistic\n#        4) Compare p-value to α\n#        5) Reject or fail to reject H0' },
      { title: 'Correlation', content: 'Measure linear relationships between variables.', code: '# Pearson correlation (-1 to 1)\nr, p_value = stats.pearsonr(x, y)\n\n# Spearman (rank-based, non-linear)\nrho, p_value = stats.spearmanr(x, y)\n\n# Correlation matrix\ncorr_matrix = df.corr()\n# Interpretation:\n# |r| > 0.7  → strong\n# |r| 0.3-0.7 → moderate\n# |r| < 0.3  → weak' },
    ],
  },
  {
    id: 'ml_supervised',
    name: 'Supervised Learning',
    description: 'Regression, classification — train/test, cross-validation, tuning',
    sections: [
      { title: 'Train/Test Split', content: 'Always evaluate on unseen data. Never train and test on the same data.', code: 'from sklearn.model_selection import train_test_split\n\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, random_state=42\n)\n# 80% training, 20% testing\n# random_state ensures reproducibility' },
      { title: 'Linear Regression', content: 'Predict continuous values. Assumes linear relationship between features and target.', code: 'from sklearn.linear_model import LinearRegression\nfrom sklearn.metrics import mean_squared_error, r2_score\n\nmodel = LinearRegression()\nmodel.fit(X_train, y_train)\ny_pred = model.predict(X_test)\n\nrmse = mean_squared_error(y_test, y_pred, squared=False)\nr2 = r2_score(y_test, y_pred)\nprint(f"RMSE: {rmse:.2f}, R²: {r2:.3f}")\nprint(f"Coefficients: {model.coef_}")' },
      { title: 'Classification', content: 'Predict categories. Choose based on data size, linearity, interpretability.', code: 'from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.metrics import classification_report\n\nrf = RandomForestClassifier(n_estimators=100, random_state=42)\nrf.fit(X_train, y_train)\ny_pred = rf.predict(X_test)\n\nprint(classification_report(y_test, y_pred))\n# Shows precision, recall, F1 per class\n\n# Feature importance\nimportances = pd.Series(\n    rf.feature_importances_, index=feature_names\n).sort_values(ascending=False)' },
      { title: 'Cross-Validation', content: 'More robust evaluation than a single train/test split.', code: 'from sklearn.model_selection import cross_val_score\n\nscores = cross_val_score(model, X, y, cv=5, scoring="r2")\nprint(f"Mean R²: {scores.mean():.3f} ± {scores.std():.3f}")\n\n# GridSearchCV for hyperparameter tuning\nfrom sklearn.model_selection import GridSearchCV\n\nparam_grid = {"n_estimators": [50, 100, 200], "max_depth": [3, 5, 10]}\ngrid = GridSearchCV(RandomForestClassifier(), param_grid, cv=5)\ngrid.fit(X_train, y_train)\nprint(f"Best params: {grid.best_params_}")' },
    ],
  },
  {
    id: 'ml_unsupervised',
    name: 'Unsupervised Learning',
    description: 'Clustering, PCA, anomaly detection — discover hidden patterns',
    sections: [
      { title: 'K-Means Clustering', content: 'Partition data into K groups by minimizing within-cluster variance.', code: 'from sklearn.cluster import KMeans\nfrom sklearn.preprocessing import StandardScaler\n\n# Always scale before clustering!\nscaler = StandardScaler()\nX_scaled = scaler.fit_transform(X)\n\nkmeans = KMeans(n_clusters=3, random_state=42, n_init=10)\nkmeans.fit(X_scaled)\nlabels = kmeans.labels_\n\n# Elbow method\ninertias = []\nfor k in range(1, 11):\n    km = KMeans(n_clusters=k, random_state=42, n_init=10)\n    km.fit(X_scaled)\n    inertias.append(km.inertia_)' },
      { title: 'PCA (Dimensionality Reduction)', content: 'Reduce features while preserving maximum variance.', code: 'from sklearn.decomposition import PCA\n\npca = PCA(n_components=2)\nX_pca = pca.fit_transform(X_scaled)\n\nprint(f"Variance explained: {pca.explained_variance_ratio_}")\nprint(f"Total: {pca.explained_variance_ratio_.sum():.2%}")\n\n# Choose components explaining ≥95% variance\npca_95 = PCA(n_components=0.95)\nX_reduced = pca_95.fit_transform(X_scaled)' },
      { title: 'Anomaly Detection', content: 'Find unusual data points — fraud, defects, intrusions.', code: 'from sklearn.ensemble import IsolationForest\n\niso = IsolationForest(contamination=0.05, random_state=42)\npredictions = iso.fit_predict(X_scaled)\n# -1 = anomaly, 1 = normal\n\nanomalies = df[predictions == -1]\nprint(f"Found {len(anomalies)} anomalies")' },
    ],
  },
  {
    id: 'feature_eng',
    name: 'Feature Engineering',
    description: 'Encoding, scaling, selection — transform raw data into model-ready features',
    sections: [
      { title: 'Encoding Categorical Variables', content: 'Convert text categories to numbers for ML models.', code: '# One-hot encoding\ndf_encoded = pd.get_dummies(df, columns=["color", "size"])\n\n# Label encoding (ordinal)\nfrom sklearn.preprocessing import LabelEncoder\nle = LabelEncoder()\ndf["size_encoded"] = le.fit_transform(df["size"])\n\n# Target encoding (advanced)\ndf["city_encoded"] = df.groupby("city")["target"].transform("mean")' },
      { title: 'Feature Scaling', content: 'Normalize features so all contribute equally.', code: 'from sklearn.preprocessing import StandardScaler, MinMaxScaler\n\n# StandardScaler: mean=0, std=1\nscaler = StandardScaler()\nX_scaled = scaler.fit_transform(X_train)\nX_test_scaled = scaler.transform(X_test)  # use TRAIN stats!\n\n# MinMaxScaler: [0, 1] range\nmm = MinMaxScaler()\nX_mm = mm.fit_transform(X_train)' },
      { title: 'Feature Selection', content: 'Remove irrelevant features to improve model performance.', code: '# Correlation-based (drop highly correlated)\ncorr = df.corr().abs()\nupper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))\nto_drop = [c for c in upper.columns if any(upper[c] > 0.95)]\n\n# Feature importance from model\nimportances = rf.feature_importances_\ntop_features = X.columns[np.argsort(importances)[-10:]]\n\n# SelectKBest\nfrom sklearn.feature_selection import SelectKBest, f_classif\nselector = SelectKBest(f_classif, k=10)\nX_selected = selector.fit_transform(X, y)' },
    ],
  },
  {
    id: 'timeseries',
    name: 'Time Series',
    description: 'ARIMA, Prophet, stationarity, forecasting, seasonal decomposition',
    sections: [
      { title: 'Time Series Basics', content: 'Set datetime index, resample, and detect trends.', code: 'df["date"] = pd.to_datetime(df["date"])\ndf.set_index("date", inplace=True)\n\n# Resample to monthly\nmonthly = df.resample("M").mean()\n\n# Rolling average (smooth noise)\ndf["rolling_7d"] = df["value"].rolling(window=7).mean()\n\n# Seasonal decomposition\nfrom statsmodels.tsa.seasonal import seasonal_decompose\nresult = seasonal_decompose(df["value"], period=12)\nresult.plot()' },
      { title: 'Stationarity & Differencing', content: 'Most models require stationary data. Test with ADF, fix with differencing.', code: 'from statsmodels.tsa.stattools import adfuller\n\nresult = adfuller(df["value"])\nprint(f"ADF Statistic: {result[0]:.4f}")\nprint(f"p-value: {result[1]:.4f}")\n# p < 0.05 → stationary\n\n# Differencing to make stationary\ndf["value_diff"] = df["value"].diff()\ndf["value_diff2"] = df["value"].diff().diff()  # 2nd order' },
      { title: 'ARIMA', content: 'Auto-Regressive Integrated Moving Average — classic forecasting model.', code: 'from statsmodels.tsa.arima.model import ARIMA\nimport pmdarima as pm\n\n# Auto ARIMA (finds best p,d,q)\nauto_model = pm.auto_arima(train, seasonal=False,\n    stepwise=True, trace=True)\nprint(auto_model.summary())\n\n# Manual ARIMA\nmodel = ARIMA(train, order=(2, 1, 2))\nfitted = model.fit()\nforecast = fitted.forecast(steps=30)' },
    ],
  },
  {
    id: 'r_basics',
    name: 'R Essentials',
    description: 'R for data science — tidyverse, ggplot2, dplyr, data wrangling',
    sections: [
      { title: 'R Basics', content: 'R is purpose-built for statistics. Vectors are the fundamental data type.', code: '# Variables\nx <- 42\nname <- "Bleepx"\nnums <- c(1, 2, 3, 4, 5)\n\n# Data types\nclass(x)      # "numeric"\nlength(nums)  # 5\nsummary(nums) # Min, Q1, Median, Mean, Q3, Max' },
      { title: 'dplyr Data Manipulation', content: 'The tidyverse way to filter, select, mutate, and summarize.', code: 'library(dplyr)\n\ndf %>%\n  filter(age > 30) %>%\n  select(name, age, salary) %>%\n  mutate(salary_k = salary / 1000) %>%\n  group_by(department) %>%\n  summarise(\n    avg_salary = mean(salary),\n    count = n()\n  ) %>%\n  arrange(desc(avg_salary))' },
      { title: 'ggplot2 Visualization', content: 'Grammar of graphics — layer-based plotting.', code: 'library(ggplot2)\n\nggplot(df, aes(x = sqft, y = price, color = city)) +\n  geom_point(alpha = 0.6) +\n  geom_smooth(method = "lm") +\n  labs(\n    title = "House Prices vs Square Footage",\n    x = "Square Feet",\n    y = "Price ($)"\n  ) +\n  theme_minimal()' },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function LabGuidePage() {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const topic = activeTopic ? GUIDE_TOPICS.find((t) => t.id === activeTopic) : null;

  return (
    <main className="max-w-5xl mx-auto px-2 md:px-4 lg:px-6 py-4 space-y-6 bg-bleepx-bg min-h-screen pb-20">
      <nav className="text-xs sm:text-sm text-bleepx-text-secondary flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/lab" className="hover:underline">BleepxLab</Link>
        <span>/</span>
        <span className="font-semibold text-bleepx-gray">Guide</span>
      </nav>

      <div className="flex items-center gap-3">
        <BleepxLogo />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-bleepx-text flex flex-wrap items-center gap-2"><GuideIcon size={28} /> Data Science Guide</h1>
          <p className="text-xs sm:text-sm text-bleepx-text-secondary">
            Reference guide for Python, R, pandas, statistics, ML, and more.
          </p>
        </div>
      </div>

      {!topic ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GUIDE_TOPICS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTopic(t.id)}
              className="group bg-bleepx-white border border-bleepx-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-left p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-bleepx-text"><TopicIcon topic={t.id} size={24} /></span>
                <h3 className="font-bold text-bleepx-text group-hover:text-teal-600 transition-colors">{t.name}</h3>
              </div>
              <p className="text-xs text-bleepx-text-secondary">{t.description}</p>
              <div className="mt-3 text-[10px] text-teal-600 font-medium">{t.sections.length} sections →</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => setActiveTopic(null)}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
          >
            ← Back to Topics
          </button>

          <div className="bg-bleepx-white border-l-4 border-teal-500 p-5 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-bleepx-text"><TopicIcon topic={topic.id} size={24} /></span>
              <h2 className="text-xl font-bold text-bleepx-text">{topic.name}</h2>
            </div>
            <p className="text-sm text-bleepx-text-secondary">{topic.description}</p>
          </div>

          {topic.sections.map((section, i) => (
            <div key={i} className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
              <h3 className="font-bold text-bleepx-text text-lg mb-2">{section.title}</h3>
              <p className="text-sm text-bleepx-text-secondary leading-relaxed mb-4">{section.content}</p>
              {section.code && (
                <div className="relative">
                  <button
                    onClick={() => copyCode(section.code!)}
                    className="absolute top-2 right-2 px-2 py-1 text-[10px] font-bold rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors z-10 inline-flex items-center gap-1"
                  >
                    {copiedCode === section.code ? <><CheckBadge size={10} className="text-gray-300" /> Copied</> : <><CopyIcon size={10} /> Copy</>}
                  </button>
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto leading-relaxed">
                    <code>{section.code}</code>
                  </pre>
                </div>
              )}
            </div>
          ))}

          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
            <h3 className="font-bold text-bleepx-text mb-3">All Topics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {GUIDE_TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTopic(t.id)}
                  className={`text-left p-2 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                    t.id === activeTopic
                      ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-bleepx-text-secondary'
                  }`}
                >
                  <TopicIcon topic={t.id} size={14} /> {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <AchievementNotification />
    </main>
  );
}
