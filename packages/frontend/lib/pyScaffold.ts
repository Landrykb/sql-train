/**
 * Generate a scaffolded starter from a full solution.
 *
 * Imports, comments and blank lines are preserved. Code lines are replaced
 * with `# TODO` prompts so the learner has to fill them in. The full solution
 * remains available via the "Solution" reveal button in PythonTerminal.
 */

const PATTERNS: { re: RegExp; hint: string }[] = [
  { re: /\bpd\.read_csv\b|\bopen_url\b/, hint: 'Load the dataset from the source URL/CSV.' },
  { re: /\bto_datetime\b/, hint: 'Parse date columns into proper datetime types.' },
  { re: /\bgroupby\b/, hint: 'Group the data and compute an aggregation.' },
  { re: /\b(dropna|fillna|replace)\b/, hint: 'Clean the data (handle missing or invalid values).' },
  { re: /\bmerge\(|join\(|concat\(/, hint: 'Combine multiple data sources (merge/join/concat).' },
  { re: /\b(train_test_split|StratifiedKFold|TimeSeriesSplit)\b/, hint: 'Split the data into training and test sets.' },
  { re: /\b(ARIMA|SARIMAX|ExponentialSmoothing|LinearRegression|Ridge|LogisticRegression|RandomForest|GradientBoosting|IsolationForest|OneClassSVM|LocalOutlierFactor)\b/, hint: 'Create and fit the model.' },
  { re: /\.fit\(/, hint: 'Fit the model to the training data.' },
  { re: /\.predict\(|\.forecast\(|forecast\(/, hint: 'Generate predictions or forecasts.' },
  { re: /\b(mean_absolute_error|mean_squared_error|accuracy_score|recall_score|precision_score|f1_score|classification_report|r2_score|confusion_matrix)\b/, hint: 'Evaluate the model with the right metric(s).' },
  { re: /\bprint\(/, hint: 'Print the required output.' },
  { re: /\bplt\.show\(\)/, hint: 'Display the visualization.' },
  { re: /\.to_csv\(/, hint: 'Export the result to CSV.' },
];

export function makeScaffold(solutionCode: string): string {
  const lines = solutionCode.split('\n');
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return line; // keep blank lines
      if (/^(import|from)\s+/.test(trimmed)) return line; // keep imports
      if (/^#/.test(trimmed)) return line; // keep comments

      // Match the most specific pattern
      for (const { re, hint } of PATTERNS) {
        if (re.test(line)) {
          return `${getIndent(line)}# TODO: ${hint}`;
        }
      }

      // Fallback based on line shape
      if (/\bif\s+/.test(line) && trimmed.endsWith(':')) {
        return `${getIndent(line)}# TODO: Add a conditional check.`;
      }
      if (/\bfor\s+/.test(line) && trimmed.endsWith(':')) {
        return `${getIndent(line)}# TODO: Iterate over the data.`;
      }
      if (/\bdef\s+/.test(line)) {
        return `${getIndent(line)}# TODO: Define this helper function.`;
      }
      if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(trimmed)) {
        return `${getIndent(line)}# TODO: Compute this variable.`;
      }

      return `${getIndent(line)}# TODO: Implement this step.`;
    })
    .join('\n');
}

function getIndent(line: string): string {
  const m = line.match(/^\s*/);
  return m ? m[0] : '';
}
