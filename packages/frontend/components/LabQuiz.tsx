'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BleepxHead, BleepxTrophy, BleepxFace } from '@/components/BleepxIcons';
import { syncCurrentProgress } from '@/lib/progressSync';

// ─── Question types ─────────────────────────────────────────────────────────

export interface LabQuizQuestion {
  type: 'multiple_choice' | 'fill_blank';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

// ─── Data Science Question Bank ─────────────────────────────────────────────

export const LAB_SKILL_QUESTIONS: Record<string, LabQuizQuestion[]> = {
  // ── Statistics ───────────────────────────────────────────────────────────
  statistics: [
    { type: 'multiple_choice', question: 'What is the difference between population and sample?', options: ['Population is always larger', 'Population includes ALL members; sample is a subset', 'Sample is more accurate', 'No difference'], answer: 'Population includes ALL members; sample is a subset', explanation: 'A population includes every member of the group of interest. A sample is a representative subset used for analysis.' },
    { type: 'multiple_choice', question: 'Which measure of central tendency is most robust to outliers?', options: ['Mean', 'Median', 'Mode', 'Range'], answer: 'Median', explanation: 'The median is the middle value when sorted. Unlike the mean, extreme outliers don\'t shift it significantly.' },
    { type: 'fill_blank', question: 'The measure of spread that uses squared deviations from the mean is called ___', answer: 'variance', explanation: 'Variance = average of squared deviations from the mean. Standard deviation is its square root.' },
    { type: 'multiple_choice', question: 'What does a standard deviation of 0 mean?', options: ['All values are negative', 'All values are the same', 'The mean is 0', 'There are no values'], answer: 'All values are the same', explanation: 'If standard deviation = 0, there is no spread — every value equals the mean.' },
    { type: 'multiple_choice', question: 'In a right-skewed distribution, what is the relationship between mean and median?', options: ['Mean < Median', 'Mean = Median', 'Mean > Median', 'Cannot determine'], answer: 'Mean > Median', explanation: 'Right skew means a long tail to the right. The mean gets pulled toward the tail, making it larger than the median.' },
    { type: 'fill_blank', question: 'The 68-95-99.7 rule applies to the ___ distribution', answer: 'normal', explanation: 'In a normal (Gaussian) distribution: 68% within 1σ, 95% within 2σ, 99.7% within 3σ of the mean.' },
  ],
  // ── Probability ─────────────────────────────────────────────────────────
  probability: [
    { type: 'multiple_choice', question: 'What is the probability of getting heads on a fair coin flip?', options: ['0.25', '0.5', '0.75', '1.0'], answer: '0.5', explanation: 'A fair coin has two equally likely outcomes: P(heads) = 1/2 = 0.5.' },
    { type: 'multiple_choice', question: 'What does Bayes\' Theorem calculate?', options: ['The probability of A given B, using prior knowledge', 'Only joint probabilities', 'Only marginal probabilities', 'Correlation between events'], answer: 'The probability of A given B, using prior knowledge', explanation: 'P(A|B) = P(B|A)·P(A) / P(B). Bayes\' theorem updates our belief about A after observing B.' },
    { type: 'fill_blank', question: 'P(A or B) = P(A) + P(B) - P(A ___ B)', answer: 'and', explanation: 'The addition rule: P(A∪B) = P(A) + P(B) - P(A∩B). We subtract the intersection to avoid double-counting.' },
    { type: 'multiple_choice', question: 'If two events are independent, what is P(A and B)?', options: ['P(A) + P(B)', 'P(A) × P(B)', 'P(A) / P(B)', 'P(A) - P(B)'], answer: 'P(A) × P(B)', explanation: 'For independent events, the joint probability is the product of individual probabilities.' },
    { type: 'multiple_choice', question: 'What is the Central Limit Theorem about?', options: ['Large datasets are always normal', 'Sample means approach a normal distribution as sample size increases', 'All probabilities sum to 1', 'Variance decreases over time'], answer: 'Sample means approach a normal distribution as sample size increases', explanation: 'CLT: regardless of population distribution, the distribution of sample means becomes approximately normal with large enough samples.' },
  ],
  // ── Machine Learning ────────────────────────────────────────────────────
  machine_learning: [
    { type: 'multiple_choice', question: 'What is the difference between supervised and unsupervised learning?', options: ['Speed of training', 'Supervised uses labeled data; unsupervised finds patterns without labels', 'Supervised is always better', 'Unsupervised requires more data'], answer: 'Supervised uses labeled data; unsupervised finds patterns without labels', explanation: 'Supervised learning trains on labeled examples (X→y). Unsupervised learning discovers structure (clustering, dimensionality reduction) without labels.' },
    { type: 'multiple_choice', question: 'What is overfitting?', options: ['Model is too simple', 'Model memorizes training data but fails on new data', 'Model trains too slowly', 'Model has too few parameters'], answer: 'Model memorizes training data but fails on new data', explanation: 'Overfitting: high training accuracy, low test accuracy. The model learned noise instead of signal. Fix with regularization, more data, or simpler models.' },
    { type: 'fill_blank', question: 'The technique of splitting data into training and testing sets to evaluate model performance is called ___-validation', answer: 'cross', explanation: 'Cross-validation splits data into k folds, trains on k-1, tests on 1, and rotates. This gives a robust performance estimate.' },
    { type: 'multiple_choice', question: 'Which algorithm is best for predicting a continuous number (e.g., house price)?', options: ['Logistic Regression', 'K-Means Clustering', 'Linear Regression', 'Naive Bayes'], answer: 'Linear Regression', explanation: 'Regression predicts continuous values. Logistic regression predicts probabilities/classes. K-Means clusters. Naive Bayes classifies.' },
    { type: 'multiple_choice', question: 'What does the bias-variance tradeoff mean?', options: ['Bias and variance are always equal', 'Reducing bias increases variance and vice versa; we seek a balance', 'More data always reduces both', 'It only applies to neural networks'], answer: 'Reducing bias increases variance and vice versa; we seek a balance', explanation: 'High bias = underfitting (too simple). High variance = overfitting (too complex). The sweet spot minimizes total error.' },
    { type: 'multiple_choice', question: 'What is a Random Forest?', options: ['A single deep decision tree', 'An ensemble of many decision trees trained on random subsets', 'A type of neural network', 'A clustering algorithm'], answer: 'An ensemble of many decision trees trained on random subsets', explanation: 'Random Forest builds many trees on bootstrapped data with random feature subsets, then averages their predictions. This reduces variance.' },
    { type: 'fill_blank', question: 'The process of tuning model parameters to find the best configuration is called ___ search', answer: 'grid', explanation: 'Grid search exhaustively tries all combinations of hyperparameters. Random search samples randomly — often more efficient for large search spaces.' },
  ],
  // ── Data Analysis & Pandas ──────────────────────────────────────────────
  data_analysis: [
    { type: 'fill_blank', question: 'In pandas, use df.___() to see the first 5 rows of a DataFrame', answer: 'head', explanation: 'df.head() shows the first 5 rows. df.head(10) shows the first 10. df.tail() shows the last rows.' },
    { type: 'multiple_choice', question: 'What does df.describe() return?', options: ['Column names only', 'Data types', 'Statistical summary (count, mean, std, min, max, quartiles)', 'Missing values only'], answer: 'Statistical summary (count, mean, std, min, max, quartiles)', explanation: 'describe() provides count, mean, std, min, 25%, 50%, 75%, max for each numerical column.' },
    { type: 'fill_blank', question: 'To check for missing values in pandas: df.___().sum()', answer: 'isnull', explanation: 'df.isnull().sum() counts NULL/NaN values per column. Also: df.isna() is equivalent.' },
    { type: 'multiple_choice', question: 'What does df.groupby("category").mean() do?', options: ['Sorts by category', 'Calculates the mean for each category group', 'Filters rows by category', 'Renames the category column'], answer: 'Calculates the mean for each category group', explanation: 'groupby splits the DataFrame into groups, then .mean() calculates the average of numeric columns within each group.' },
    { type: 'multiple_choice', question: 'How do you merge two DataFrames on a common column?', options: ['df1.add(df2)', 'pd.merge(df1, df2, on="col")', 'df1.concat(df2)', 'df1.join_on(df2)'], answer: 'pd.merge(df1, df2, on="col")', explanation: 'pd.merge() joins DataFrames like SQL JOIN. Use on= for the key column, how= for join type (inner, left, right, outer).' },
    { type: 'fill_blank', question: 'To select rows where age > 30 in pandas: df[df["age"] ___ 30]', answer: '>', explanation: 'Boolean indexing: df[condition] filters rows. The condition df["age"] > 30 creates a boolean mask.' },
  ],
  // ── Python Fundamentals ─────────────────────────────────────────────────
  python: [
    { type: 'multiple_choice', question: 'What does len([1, 2, 3, 4]) return?', options: ['3', '4', '10', 'Error'], answer: '4', explanation: 'len() returns the number of items in a list. [1, 2, 3, 4] has 4 elements.' },
    { type: 'fill_blank', question: 'Import numpy as: import numpy as ___', answer: 'np', explanation: 'import numpy as np is the universal convention. np is used as the alias in virtually all data science code.' },
    { type: 'multiple_choice', question: 'What is a list comprehension?', options: ['A way to explain lists', 'A concise way to create lists: [expr for item in iterable]', 'A sorting algorithm', 'A type of dictionary'], answer: 'A concise way to create lists: [expr for item in iterable]', explanation: '[x**2 for x in range(5)] creates [0, 1, 4, 9, 16]. It\'s a compact alternative to a for loop with append.' },
    { type: 'multiple_choice', question: 'What is the difference between a list and a tuple in Python?', options: ['No difference', 'Lists are mutable; tuples are immutable', 'Tuples are faster to create', 'Lists can only hold numbers'], answer: 'Lists are mutable; tuples are immutable', explanation: 'Lists use [] and can be modified. Tuples use () and cannot be changed after creation. Tuples are slightly faster and hashable.' },
    { type: 'fill_blank', question: 'Create a numpy array of zeros with shape (3, 4): np.___(( 3, 4))', answer: 'zeros', explanation: 'np.zeros((rows, cols)) creates an array filled with 0.0. np.ones() fills with 1.0. np.empty() allocates without initializing.' },
  ],
  // ── Model Evaluation ────────────────────────────────────────────────────
  evaluation: [
    { type: 'multiple_choice', question: 'What does accuracy measure?', options: ['Only true positives', 'Fraction of correct predictions out of all predictions', 'How fast the model trains', 'The number of features used'], answer: 'Fraction of correct predictions out of all predictions', explanation: 'Accuracy = (TP + TN) / (TP + TN + FP + FN). It can be misleading on imbalanced datasets.' },
    { type: 'multiple_choice', question: 'When is accuracy a BAD metric?', options: ['Always', 'When classes are imbalanced (e.g., 99% vs 1%)', 'When using deep learning', 'When the dataset is small'], answer: 'When classes are imbalanced (e.g., 99% vs 1%)', explanation: 'With 99% class A, predicting "always A" gives 99% accuracy but catches 0% of class B. Use precision, recall, F1, or AUC instead.' },
    { type: 'fill_blank', question: 'The harmonic mean of precision and recall is called the ___-score', answer: 'F1', explanation: 'F1 = 2 × (precision × recall) / (precision + recall). It balances both metrics — useful when you care about both false positives and false negatives.' },
    { type: 'multiple_choice', question: 'What is R² (R-squared)?', options: ['The square of the residuals', 'The proportion of variance in the target explained by the model', 'The correlation between features', 'The number of regression coefficients'], answer: 'The proportion of variance in the target explained by the model', explanation: 'R² ranges from 0 to 1 (can be negative for very bad models). R²=1 means perfect prediction. R²=0 means the model is no better than predicting the mean.' },
    { type: 'multiple_choice', question: 'What is the purpose of a confusion matrix?', options: ['To confuse the model', 'To show TP, TN, FP, FN counts for classification evaluation', 'To display feature correlations', 'To normalize predictions'], answer: 'To show TP, TN, FP, FN counts for classification evaluation', explanation: 'A confusion matrix is a 2×2 table (for binary classification) showing true/false positives/negatives. It reveals where the model makes mistakes.' },
    { type: 'multiple_choice', question: 'What does MAE (Mean Absolute Error) measure?', options: ['The average of squared errors', 'The average of absolute prediction errors', 'The maximum error', 'The percentage error'], answer: 'The average of absolute prediction errors', explanation: 'MAE = mean(|actual - predicted|). It\'s in the same units as the target and easy to interpret.' },
  ],
  // ── Feature Engineering ─────────────────────────────────────────────────
  feature_engineering: [
    { type: 'multiple_choice', question: 'What is one-hot encoding?', options: ['Encoding values as temperatures', 'Converting categorical variables into binary columns (0/1)', 'Normalizing features to [0,1]', 'Removing duplicate features'], answer: 'Converting categorical variables into binary columns (0/1)', explanation: 'One-hot encoding creates a new binary column for each category. "Color: red/blue/green" becomes 3 columns with 0/1 values.' },
    { type: 'multiple_choice', question: 'Why do we scale features before training some models?', options: ['To make data look nicer', 'So all features contribute equally; algorithms like SVM and KNN are distance-based', 'It\'s only for neural networks', 'To reduce the number of features'], answer: 'So all features contribute equally; algorithms like SVM and KNN are distance-based', explanation: 'Features with larger scales dominate distance calculations. StandardScaler (mean=0, std=1) or MinMaxScaler (0-1) fix this.' },
    { type: 'fill_blank', question: 'StandardScaler transforms features to have mean 0 and standard deviation ___', answer: '1', explanation: 'StandardScaler: z = (x - mean) / std. Each feature gets mean=0 and std=1. This is also called z-score normalization.' },
    { type: 'multiple_choice', question: 'What is the curse of dimensionality?', options: ['Having too many rows', 'As features increase, data becomes sparse and models need exponentially more data', 'Models become too fast', 'Features become correlated'], answer: 'As features increase, data becomes sparse and models need exponentially more data', explanation: 'In high dimensions, data points are far apart, making patterns harder to find. PCA and feature selection help combat this.' },
  ],
  // ── Visualization ───────────────────────────────────────────────────────
  visualization: [
    { type: 'multiple_choice', question: 'Which plot is best for showing the distribution of a single numerical variable?', options: ['Scatter plot', 'Histogram', 'Bar chart', 'Line chart'], answer: 'Histogram', explanation: 'Histograms bin values and show frequency — revealing shape, center, and spread of the distribution.' },
    { type: 'multiple_choice', question: 'When should you use a scatter plot?', options: ['To show categories', 'To show the relationship between two numerical variables', 'To show time trends', 'To compare group sizes'], answer: 'To show the relationship between two numerical variables', explanation: 'Scatter plots reveal correlations, clusters, and outliers between two continuous variables.' },
    { type: 'fill_blank', question: 'In matplotlib, create a figure and axes: fig, ax = plt.___()', answer: 'subplots', explanation: 'plt.subplots() creates a figure and axes objects. plt.subplots(2, 2) creates a 2×2 grid of subplots.' },
    { type: 'multiple_choice', question: 'What does a box plot show?', options: ['Mean and mode', 'Median, quartiles, and outliers (5-number summary)', 'Only the range', 'Correlation between variables'], answer: 'Median, quartiles, and outliers (5-number summary)', explanation: 'Box plot: box = IQR (Q1 to Q3), line = median, whiskers = 1.5×IQR, dots = outliers.' },
  ],
  // ── Clustering & Unsupervised ───────────────────────────────────────────
  clustering: [
    { type: 'multiple_choice', question: 'What does K-Means clustering minimize?', options: ['The number of clusters', 'The sum of squared distances from points to their cluster centroid', 'The variance between clusters', 'The number of iterations'], answer: 'The sum of squared distances from points to their cluster centroid', explanation: 'K-Means minimizes inertia (within-cluster sum of squares). Each point is assigned to the nearest centroid.' },
    { type: 'fill_blank', question: 'The method to find the optimal number of clusters by plotting inertia vs K is called the ___ method', answer: 'elbow', explanation: 'The elbow method plots inertia for K=1,2,3... The "elbow" where improvement slows down suggests optimal K.' },
    { type: 'multiple_choice', question: 'What is the silhouette score?', options: ['The outline of a cluster', 'A measure of how similar a point is to its cluster vs other clusters (-1 to 1)', 'The number of clusters', 'The distance between centroids'], answer: 'A measure of how similar a point is to its cluster vs other clusters (-1 to 1)', explanation: 'Silhouette score near 1 = well-clustered, near 0 = on boundary, near -1 = probably in wrong cluster.' },
  ],
  // ── Time Series ─────────────────────────────────────────────────────────
  time_series: [
    { type: 'multiple_choice', question: 'What does "stationarity" mean for a time series?', options: ['It doesn\'t change', 'Statistical properties (mean, variance) are constant over time', 'It has no trend', 'It\'s always increasing'], answer: 'Statistical properties (mean, variance) are constant over time', explanation: 'A stationary series has constant mean and variance. Most forecasting models (ARIMA) require stationarity. Use differencing to achieve it.' },
    { type: 'fill_blank', question: 'ARIMA stands for Auto-Regressive Integrated ___ Average', answer: 'Moving', explanation: 'ARIMA(p,d,q): p=AR order, d=differencing, q=MA order. "Integrated" refers to the differencing step.' },
    { type: 'multiple_choice', question: 'What is the purpose of the Augmented Dickey-Fuller (ADF) test?', options: ['To test for correlation', 'To test if a time series is stationary', 'To find the best ARIMA parameters', 'To detect seasonality'], answer: 'To test if a time series is stationary', explanation: 'ADF null hypothesis: the series has a unit root (non-stationary). p-value < 0.05 → reject → series is stationary.' },
  ],
  // ── Deep Learning Basics ────────────────────────────────────────────────
  deep_learning: [
    { type: 'multiple_choice', question: 'What is a neural network activation function?', options: ['The learning rate', 'A function that introduces non-linearity to the output of a neuron', 'The loss function', 'The optimizer'], answer: 'A function that introduces non-linearity to the output of a neuron', explanation: 'Without activation functions, a neural network is just a linear model. ReLU, sigmoid, and tanh add non-linearity.' },
    { type: 'fill_blank', question: 'The most popular activation function in hidden layers is ___ (Rectified Linear Unit)', answer: 'ReLU', explanation: 'ReLU(x) = max(0, x). It\'s simple, fast, and avoids the vanishing gradient problem. Used in most modern architectures.' },
    { type: 'multiple_choice', question: 'What is gradient descent?', options: ['A way to increase the loss', 'An optimization algorithm that iteratively adjusts weights to minimize the loss function', 'A type of neural network', 'A regularization technique'], answer: 'An optimization algorithm that iteratively adjusts weights to minimize the loss function', explanation: 'Gradient descent computes the gradient of the loss, then steps in the opposite direction. Learning rate controls step size.' },
  ],
  // ── Large Language Models & NLP ───────────────────────────────────────────
  llm: [
    { type: 'multiple_choice', question: 'What does LLM stand for?', options: ['Large Linear Model', 'Large Language Model', 'Logistic Learning Machine', 'Low Latency Memory'], answer: 'Large Language Model', explanation: 'LLMs like GPT, Claude, and LLaMA are transformer-based models trained on massive text corpora.' },
    { type: 'multiple_choice', question: 'What is the core architecture behind modern LLMs?', options: ['RNN', 'CNN', 'Transformer', 'Random Forest'], answer: 'Transformer', explanation: 'The Transformer uses self-attention to process sequences in parallel, enabling massive scale.' },
    { type: 'fill_blank', question: 'Providing examples in the prompt to guide LLM output is called ___-shot learning', answer: 'few', explanation: 'Few-shot = a few examples. Zero-shot = no examples. One-shot = one example.' },
    { type: 'multiple_choice', question: 'What is "hallucination" in LLMs?', options: ['The model crashes', 'Generating plausible but factually incorrect info', 'Refusing to answer', 'Generating images'], answer: 'Generating plausible but factually incorrect info', explanation: 'LLMs can confidently produce false statements. RAG and grounding help mitigate this.' },
    { type: 'multiple_choice', question: 'What does RAG stand for?', options: ['Random Access Generation', 'Retrieval-Augmented Generation', 'Recursive Algorithm Graph', 'Reinforcement Action Gradient'], answer: 'Retrieval-Augmented Generation', explanation: 'RAG retrieves relevant docs then feeds them as context to the LLM, reducing hallucination.' },
    { type: 'fill_blank', question: 'The attention mechanism where each token attends to all others is called ___-attention', answer: 'self', explanation: 'Self-attention computes relevance scores between all token pairs in a sequence.' },
  ],
  // ── AWS & Cloud ───────────────────────────────────────────────────────────
  aws: [
    { type: 'multiple_choice', question: 'What is Amazon S3?', options: ['A database', 'Object storage for any amount of data', 'A compute service', 'A networking service'], answer: 'Object storage for any amount of data', explanation: 'S3 stores objects in buckets with 99.999999999% durability.' },
    { type: 'fill_blank', question: 'The AWS serverless function service is called AWS ___', answer: 'Lambda', explanation: 'Lambda runs code without servers. You pay only for compute time consumed.' },
    { type: 'multiple_choice', question: 'What is EC2?', options: ['Storage', 'Virtual server in the cloud', 'ML service', 'DNS service'], answer: 'Virtual server in the cloud', explanation: 'EC2 provides resizable compute capacity. You choose instance type, OS, and scale as needed.' },
    { type: 'multiple_choice', question: 'What is the AWS shared responsibility model?', options: ['AWS does everything', 'Customer does everything', 'AWS secures infrastructure; customer secures data and apps', 'Security is optional'], answer: 'AWS secures infrastructure; customer secures data and apps', explanation: 'AWS manages the cloud infrastructure. Customers manage what they put IN the cloud.' },
    { type: 'fill_blank', question: 'The AWS managed ML service for building models without code is Amazon ___', answer: 'SageMaker', explanation: 'SageMaker provides tools to build, train, and deploy ML models at scale.' },
  ],
  // ── Cloud Practitioner Essentials ─────────────────────────────────────────
  cloud: [
    { type: 'multiple_choice', question: 'What is cloud computing?', options: ['Storing files on USB', 'On-demand delivery of IT resources over the internet', 'Using a faster CPU', 'Local server hosting'], answer: 'On-demand delivery of IT resources over the internet', explanation: 'Cloud computing provides compute, storage, and services on-demand with pay-as-you-go pricing.' },
    { type: 'multiple_choice', question: 'What are the 3 main cloud service models?', options: ['HTTP, FTP, SSH', 'IaaS, PaaS, SaaS', 'CPU, GPU, TPU', 'Dev, Test, Prod'], answer: 'IaaS, PaaS, SaaS', explanation: 'IaaS = infrastructure. PaaS = platform. SaaS = software. Each abstracts more management away from the user.' },
    { type: 'fill_blank', question: 'The practice of distributing resources across multiple data centers is called high ___', answer: 'availability', explanation: 'High availability ensures systems remain operational. AWS uses multiple Availability Zones within regions.' },
    { type: 'multiple_choice', question: 'What is auto-scaling?', options: ['Manual server addition', 'Automatically adjusting capacity based on demand', 'Reducing server count', 'A billing feature'], answer: 'Automatically adjusting capacity based on demand', explanation: 'Auto-scaling adds or removes resources to match traffic, ensuring performance and cost efficiency.' },
  ],
  // ── MLOps & Deployment ────────────────────────────────────────────────────
  mlops: [
    { type: 'multiple_choice', question: 'What is MLOps?', options: ['A type of model', 'Practices for deploying and maintaining ML in production', 'A Python library', 'A database'], answer: 'Practices for deploying and maintaining ML in production', explanation: 'MLOps combines ML, DevOps, and data engineering for reliable ML system deployment and monitoring.' },
    { type: 'fill_blank', question: 'Tracking changes to datasets and models over time is called ___ control', answer: 'version', explanation: 'Version control (Git for code, DVC for data) ensures reproducibility and traceability.' },
    { type: 'multiple_choice', question: 'What is model drift?', options: ['Model gets faster', 'Model performance degrades as real-world data changes', 'Model size increases', 'Model learns new features'], answer: 'Model performance degrades as real-world data changes', explanation: 'Data distributions change over time. Monitor models and retrain when performance drops.' },
  ],
};

// ─── Generic DS questions ───────────────────────────────────────────────────

export const LAB_GENERIC_QUESTIONS: LabQuizQuestion[] = [
  { type: 'multiple_choice', question: 'What is the first step in any data science project?', options: ['Build a model', 'Understand the problem and explore the data', 'Feature engineering', 'Deploy to production'], answer: 'Understand the problem and explore the data', explanation: 'Always start with EDA (Exploratory Data Analysis). Understand the data before modeling.' },
  { type: 'multiple_choice', question: 'What does EDA stand for?', options: ['Estimated Data Accuracy', 'Exploratory Data Analysis', 'Extended Data Algorithm', 'Evaluated Data Assessment'], answer: 'Exploratory Data Analysis', explanation: 'EDA is the process of analyzing data to summarize main characteristics, often using visualizations.' },
  { type: 'fill_blank', question: 'The Python library for data manipulation with DataFrames is called ___', answer: 'pandas', explanation: 'pandas provides DataFrame and Series objects for tabular data manipulation — the foundation of data science in Python.' },
  { type: 'multiple_choice', question: 'What is the difference between correlation and causation?', options: ['They mean the same thing', 'Correlation means two things move together; causation means one causes the other', 'Causation is always stronger', 'Correlation only applies to numbers'], answer: 'Correlation means two things move together; causation means one causes the other', explanation: 'Ice cream sales and drowning are correlated (both increase in summer) but neither causes the other. Correlation ≠ causation.' },
  { type: 'fill_blank', question: 'The Python library for creating static visualizations is ___', answer: 'matplotlib', explanation: 'matplotlib is the foundational plotting library. seaborn builds on top of it with prettier defaults.' },
];

// ─── Build quiz ─────────────────────────────────────────────────────────────

function buildLabQuiz(skills: string[], count: number = 7): LabQuizQuestion[] {
  const skillPool: LabQuizQuestion[] = [];
  for (const skill of skills) {
    const questions = LAB_SKILL_QUESTIONS[skill.toLowerCase()];
    if (questions) skillPool.push(...questions);
  }
  skillPool.sort(() => Math.random() - 0.5);

  const seen = new Set<string>();
  const result: LabQuizQuestion[] = [];
  for (const q of skillPool) {
    if (!seen.has(q.question) && result.length < count) {
      seen.add(q.question);
      result.push(q);
    }
  }
  if (result.length < count) {
    const genericPool = [...LAB_GENERIC_QUESTIONS].sort(() => Math.random() - 0.5);
    for (const q of genericPool) {
      if (!seen.has(q.question) && result.length < count) {
        seen.add(q.question);
        result.push(q);
      }
    }
  }
  return result;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const POINTS_PER_CORRECT = 3;
const PERFECT_BONUS = 5;

// ─── Component ──────────────────────────────────────────────────────────────

interface LabQuizProps {
  quizId: string;
  quizName: string;
  skills: string[];
  backLink: string;
  backLabel: string;
  onBack?: () => void;
}

interface AnswerRecord {
  userAnswer: string;
  correct: boolean;
}

export default function LabQuiz({ quizId, quizName, skills, backLink, backLabel, onBack }: LabQuizProps) {
  const [questions, setQuestions] = useState<LabQuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(AnswerRecord | null)[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [previousScore, setPreviousScore] = useState(0);

  const currentAnswer = answers[currentIdx] ?? null;
  const answered = currentAnswer !== null;
  const correct = currentAnswer?.correct ?? false;

  useEffect(() => {
    const key = `bleepx_lab_quiz_${quizId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAlreadyCompleted(true);
        setPreviousScore(data.score || 0);
      } catch { /* ignore */ }
    }
    const built = buildLabQuiz(skills);
    setQuestions(built);
    setAnswers(new Array(built.length).fill(null));
  }, [quizId, skills]);

  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;

  const goToQuestion = useCallback((idx: number) => {
    setCurrentIdx(idx);
    const ans = answers[idx];
    if (ans) {
      setSelected(ans.userAnswer);
      setTextInput(ans.userAnswer);
    } else {
      setSelected(null);
      setTextInput('');
    }
  }, [answers]);

  const handleAnswer = useCallback(() => {
    if (!currentQ || answered) return;
    const userAnswer = currentQ.type === 'multiple_choice' ? selected : textInput.trim();
    if (!userAnswer) return;

    const isCorrect = currentQ.type === 'fill_blank'
      ? userAnswer.toLowerCase() === currentQ.answer.toLowerCase()
      : userAnswer === currentQ.answer;

    const newAnswers = [...answers];
    newAnswers[currentIdx] = { userAnswer, correct: isCorrect };
    setAnswers(newAnswers);
    if (isCorrect) setScore((s) => s + POINTS_PER_CORRECT);
  }, [currentQ, answered, selected, textInput, answers, currentIdx]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= totalQuestions) {
      const finalScore = score + (score === totalQuestions * POINTS_PER_CORRECT ? PERFECT_BONUS : 0);
      setScore(finalScore);
      setFinished(true);
      try {
        const currentPoints = parseInt(localStorage.getItem('bleepxPoints') || '0', 10);
        localStorage.setItem('bleepxPoints', (currentPoints + finalScore).toString());
        localStorage.setItem(`bleepx_lab_quiz_${quizId}`, JSON.stringify({
          score: finalScore, total: totalQuestions, ts: Date.now(),
        }));
        window.dispatchEvent(new Event('storage'));
        syncCurrentProgress().catch(() => {});
      } catch { /* ignore */ }
    } else {
      goToQuestion(currentIdx + 1);
    }
  }, [currentIdx, totalQuestions, score, quizId, goToQuestion]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) goToQuestion(currentIdx - 1);
  }, [currentIdx, goToQuestion]);

  const handleRetake = useCallback(() => {
    const built = buildLabQuiz(skills);
    setQuestions(built);
    setAnswers(new Array(built.length).fill(null));
    setCurrentIdx(0);
    setSelected(null);
    setTextInput('');
    setScore(0);
    setFinished(false);
    setAlreadyCompleted(false);
  }, [skills]);

  const answeredCount = answers.filter(a => a !== null).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-pulse flex items-center gap-2">
          <span className="text-bleepx-text-secondary">Loading quiz...</span>
        </div>
      </div>
    );
  }

  if (finished) {
    const maxScore = totalQuestions * POINTS_PER_CORRECT + PERFECT_BONUS;
    const isPerfect = score >= maxScore;
    const pct = Math.round((score / maxScore) * 100);
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-bleepx-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-4">
            {isPerfect ? <BleepxTrophy size={64} /> : <BleepxHead size={64} />}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-bleepx-gray mb-2">
            {isPerfect ? 'Perfect Score!' : score > 0 ? 'Quiz Complete!' : 'Keep Practicing!'}
          </h2>
          <p className="text-lg text-bleepx-text-secondary mb-1">{quizName}</p>
          <div className="my-6 p-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20">
            <div className="text-4xl font-bold text-teal-600 mb-1">+{score} pts</div>
            <p className="text-sm text-bleepx-text-secondary">
              {score}/{maxScore} possible points ({pct}%)
              {isPerfect && <span className="ml-1 text-yellow-500">✨ Perfect Bonus!</span>}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button onClick={handleRetake} className="px-5 py-2.5 rounded-full border-2 border-bleepx-border text-sm font-bold text-bleepx-text-secondary hover:bg-teal-50 transition-colors">
              🔄 Retake Quiz
            </button>
            {onBack ? (
              <button onClick={onBack} className="px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm">
                {backLabel}
              </button>
            ) : (
              <Link href={backLink}>
                <button className="px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm">
                  {backLabel}
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const previousBanner = alreadyCompleted && currentIdx === 0 && !answered ? (
    <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
      <span>✅</span>
      <span>You scored <strong>+{previousScore} pts</strong> previously. Retake to earn more!</span>
    </div>
  ) : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BleepxFace size={24} />
          <h2 className="text-lg font-bold text-bleepx-gray">Data Science Quiz</h2>
        </div>
        <span className="text-sm text-bleepx-text-secondary font-medium">{currentIdx + 1} / {totalQuestions}</span>
      </div>

      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {previousBanner}

      <div className="bg-bleepx-white rounded-2xl shadow-xl p-5 sm:p-8">
        <div className="flex flex-wrap gap-2 mb-3">
          {skills.map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-medium uppercase tracking-wide">{s.replace(/_/g, ' ')}</span>
          ))}
          {answered && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${correct ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
              {correct ? '✅ Mastered' : '❌ Review'}
            </span>
          )}
        </div>

        <h3 className="text-lg sm:text-xl font-semibold text-bleepx-gray mb-5 leading-relaxed">{currentQ.question}</h3>

        {currentQ.type === 'multiple_choice' ? (
          <div className="space-y-3">
            {currentQ.options?.map((opt) => {
              const isSelected = selected === opt;
              const isAnswer = opt === currentQ.answer;
              let classes = 'w-full text-left p-3.5 sm:p-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all duration-200 ';
              if (answered) {
                if (isAnswer) classes += 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 ring-2 ring-green-400';
                else if (isSelected && !isAnswer) classes += 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
                else classes += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-60';
              } else if (isSelected) {
                classes += 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 ring-2 ring-teal-400/30';
              } else {
                classes += 'border-gray-200 dark:border-gray-700 text-bleepx-gray hover:border-teal-400/40 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 cursor-pointer';
              }
              return (
                <button key={opt} onClick={() => !answered && setSelected(opt)} disabled={answered} className={classes}>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={textInput}
              onChange={(e) => !answered && setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !answered && handleAnswer()}
              disabled={answered}
              placeholder="Type your answer..."
              className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-mono font-medium transition-all duration-200 bg-transparent outline-none ${
                answered
                  ? correct ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : 'border-gray-200 dark:border-gray-700 text-bleepx-gray focus:border-teal-500 focus:ring-2 focus:ring-teal-400/30'
              }`}
            />
            {answered && !correct && (
              <div className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                Correct answer: <code className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-800/40 font-bold">{currentQ.answer}</code>
              </div>
            )}
          </div>
        )}

        {answered && (
          <div className={`mt-5 p-4 rounded-xl text-sm leading-relaxed ${
            correct ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
          }`}>
            <strong>{correct ? '✅ Correct!' : '❌ Not quite.'}</strong>{' '}
            {currentQ.explanation}
            {correct && <span className="ml-1 font-bold text-teal-600">+{POINTS_PER_CORRECT} pts</span>}
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          <button onClick={handlePrev} disabled={currentIdx === 0} className="px-4 py-2 rounded-full border-2 border-bleepx-border text-sm font-bold text-bleepx-text-secondary hover:bg-teal-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            ← Prev
          </button>
          <div className="text-sm text-bleepx-text-secondary">
            Score: <span className="font-bold text-teal-600">{score} pts</span>
          </div>
          {!answered ? (
            <button onClick={handleAnswer} disabled={currentQ.type === 'multiple_choice' ? !selected : !textInput.trim()} className="px-6 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Submit
            </button>
          ) : (
            <button onClick={handleNext} className="px-6 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-sm">
              {currentIdx + 1 >= totalQuestions ? 'See Results' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
