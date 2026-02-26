/**
 * SQL Error Helper
 * Parses raw SQL error messages and returns beginner-friendly explanations
 * with specific fix suggestions based on the error pattern and user's query.
 */

interface ErrorHelp {
  title: string;
  explanation: string;
  suggestions: string[];
  guideSection?: string; // anchor to a guide section
}

const RESERVED_WORDS = new Set([
  'select','from','where','group','order','by','having','limit','offset',
  'join','inner','left','right','outer','cross','on','as','in','is','not',
  'null','and','or','between','like','exists','case','when','then','else',
  'end','with','union','all','distinct','insert','update','delete','drop',
  'create','alter','table','into','values','set','asc','desc','count',
  'sum','avg','min','max','rank','dense_rank','row_number','over',
  'partition','recursive','returns','return','index','primary','key',
  'references','foreign','check','default','constraint','unique',
]);

export function getSqlErrorHelp(rawError: string, userQuery: string): ErrorHelp {
  const error = rawError.toLowerCase();
  const query = userQuery.trim();
  const queryUpper = query.toUpperCase();

  // --- near "X": syntax error ---
  const nearMatch = rawError.match(/near "([^"]+)":\s*syntax error/i);
  if (nearMatch) {
    const token = nearMatch[1];
    const tokenLower = token.toLowerCase();

    // CTE name conflicts with reserved word (e.g., WITH returns AS ...)
    if (RESERVED_WORDS.has(tokenLower)) {
      return {
        title: `"${token}" is a reserved SQL keyword`,
        explanation: `You used "${token}" as a name (for a CTE, alias, or column), but it's a reserved SQL keyword. SQL gets confused because it expects "${token}" to act as a command, not a name.`,
        suggestions: [
          `Rename it to something descriptive, e.g. "${tokenLower}_data" or "${tokenLower}_cte"`,
          `If you meant to use the keyword "${token.toUpperCase()}", check that the syntax around it is correct`,
          `Example: WITH ${tokenLower}_data AS (...) instead of WITH ${tokenLower} AS (...)`,
        ],
        guideSection: 'cte',
      };
    }

    // WITH at the start — often means malformed CTE
    if (tokenLower === 'with') {
      return {
        title: 'Problem with your WITH (CTE) clause',
        explanation: 'The WITH keyword was found in an unexpected position. This usually means there\'s a syntax issue before or inside your CTE definition.',
        suggestions: [
          'Make sure your CTE follows the pattern: WITH name AS (SELECT ...)',
          'Check that you have matching parentheses around each CTE subquery',
          'If you have multiple CTEs, separate them with commas: WITH a AS (...), b AS (...)',
          'Remove any semicolons (;) before the WITH keyword',
        ],
        guideSection: 'cte',
      };
    }

    // Token looks like a CTE or alias name (PascalCase or camelCase)
    if (/^[A-Z][a-z]/.test(token) || /^[a-z]+[A-Z]/.test(token)) {
      return {
        title: `Unexpected name "${token}"`,
        explanation: `SQL found "${token}" in a place where it expected a keyword or operator. This often happens when a comma, keyword (like AS), or parenthesis is missing.`,
        suggestions: [
          `Check for a missing comma before "${token}" — e.g., in a CTE chain: WITH first AS (...), ${token} AS (...)`,
          `Make sure you have the AS keyword: WITH ${token} AS (SELECT ...)`,
          `Verify all parentheses are matched and closed properly`,
          `If "${token}" is a column alias, make sure it comes after AS`,
        ],
        guideSection: 'cte',
      };
    }

    // Generic near-token error
    return {
      title: `Syntax error near "${token}"`,
      explanation: `SQL couldn't understand your query at or near "${token}". Something is missing or misplaced right before this point.`,
      suggestions: [
        `Check for missing commas, parentheses, or keywords right before "${token}"`,
        `Make sure all string values are wrapped in single quotes: 'value' (not double quotes)`,
        `Verify that column and table names are spelled correctly`,
        `If "${token}" is a name you chose, make sure it's not a reserved SQL word`,
      ],
    };
  }

  // --- no such table ---
  const tableMatch = rawError.match(/no such table:\s*(\S+)/i);
  if (tableMatch) {
    return {
      title: `Table "${tableMatch[1]}" not found`,
      explanation: `The table "${tableMatch[1]}" doesn't exist in the loaded datasets. This is usually a typo or you're referencing a table that hasn't been loaded.`,
      suggestions: [
        'Check the Dataset Explorer panel above — it shows the exact table names available',
        `Make sure you're spelling the table name exactly as shown (case-sensitive)`,
        'If you defined a CTE, make sure you reference it by the name you gave it',
      ],
    };
  }

  // --- no such column ---
  const colMatch = rawError.match(/no such column:\s*(\S+)/i);
  if (colMatch) {
    return {
      title: `Column "${colMatch[1]}" not found`,
      explanation: `The column "${colMatch[1]}" doesn't exist in the table you're querying. This could be a typo or the column might be named differently.`,
      suggestions: [
        'Click on a table name in the Dataset Explorer to see all available columns',
        'Column names are case-sensitive — check the exact spelling',
        'If you used a column alias (AS), you can only reference it in ORDER BY, not in WHERE or HAVING',
        `If using a JOIN, prefix the column with the table name: table_name.${colMatch[1]}`,
      ],
      guideSection: 'select',
    };
  }

  // --- ambiguous column ---
  const ambigMatch = rawError.match(/ambiguous column name:\s*(\S+)/i);
  if (ambigMatch) {
    return {
      title: `Ambiguous column "${ambigMatch[1]}"`,
      explanation: `Multiple tables in your query have a column called "${ambigMatch[1]}". SQL doesn't know which one you mean.`,
      suggestions: [
        `Add the table name as a prefix: table_name.${ambigMatch[1]}`,
        'When using JOINs, always prefix columns that exist in both tables',
        'You can use short aliases: FROM orders o JOIN customers c ON o.id = c.id',
      ],
      guideSection: 'join',
    };
  }

  // --- misuse of aggregate ---
  if (error.includes('misuse of aggregate')) {
    return {
      title: 'Aggregate function used incorrectly',
      explanation: 'You used an aggregate function (SUM, COUNT, AVG, etc.) in a place where it\'s not allowed, or you\'re mixing aggregated and non-aggregated columns without GROUP BY.',
      suggestions: [
        'If you use SUM(), COUNT(), AVG(), MIN(), or MAX(), all other columns in SELECT must appear in GROUP BY',
        'You cannot use aggregate functions in a WHERE clause — use HAVING instead',
        'Example: SELECT city, COUNT(*) FROM table GROUP BY city HAVING COUNT(*) > 5',
      ],
      guideSection: 'group by',
    };
  }

  // --- GROUP BY related ---
  if (error.includes('not an aggregate') || error.includes('must appear in the group by')) {
    return {
      title: 'Missing column in GROUP BY',
      explanation: 'When you use GROUP BY, every column in your SELECT must either be in the GROUP BY clause or wrapped in an aggregate function (SUM, COUNT, AVG, etc.).',
      suggestions: [
        'Add the missing column to your GROUP BY clause',
        'Or wrap it in an aggregate function like MAX(), MIN(), or COUNT()',
        'Example: SELECT name, SUM(amount) FROM sales GROUP BY name',
      ],
      guideSection: 'group by',
    };
  }

  // --- unrecognized token ---
  if (error.includes('unrecognized token')) {
    return {
      title: 'Unrecognized character in your query',
      explanation: 'Your query contains a character that SQL doesn\'t understand. Common culprits are smart quotes, curly quotes, or special characters copy-pasted from other sources.',
      suggestions: [
        'Replace any "smart quotes" (\u201c\u201d) with straight single quotes (\' \')',
        'Make sure string values use single quotes: WHERE name = \'Alice\' (not double quotes)',
        'Check for invisible characters — try retyping the query from scratch',
        'Remove any stray characters like @, #, or $ that aren\'t part of a valid expression',
      ],
    };
  }

  // --- incomplete input ---
  if (error.includes('incomplete input') || error.includes('unexpected end')) {
    return {
      title: 'Query is incomplete',
      explanation: 'SQL reached the end of your query but was still expecting more. Something is missing at the end.',
      suggestions: [
        'Check that all opening parentheses ( have matching closing parentheses )',
        'Make sure your query ends with a complete clause (e.g., a semicolon is optional but all keywords should be paired)',
        'If using CASE WHEN, make sure you have a matching END',
        'If using a CTE, make sure the outer SELECT is present after the CTE definition',
      ],
    };
  }

  // --- circular reference (already handled but adding here for completeness) ---
  if (error.includes('circular reference')) {
    return {
      title: 'Circular reference in your CTE',
      explanation: 'Your CTE (WITH clause) has the same name as one of the tables it queries from, creating an infinite loop.',
      suggestions: [
        'Rename your CTE to something different from the table name',
        'Example: Instead of WITH orders AS (SELECT * FROM orders ...), use WITH filtered_orders AS (SELECT * FROM orders ...)',
      ],
      guideSection: 'cte',
    };
  }

  // --- division by zero ---
  if (error.includes('division by zero')) {
    return {
      title: 'Division by zero',
      explanation: 'Your query tried to divide a number by zero. This can happen when a column contains 0 values.',
      suggestions: [
        'Use NULLIF to avoid division by zero: column_a / NULLIF(column_b, 0)',
        'Or filter out zero values with WHERE: WHERE column_b != 0',
        'CASE WHEN column_b = 0 THEN NULL ELSE column_a / column_b END',
      ],
      guideSection: 'nullif',
    };
  }

  // --- OVER / PARTITION BY / window function errors ---
  if (error.includes('over') && (error.includes('syntax') || error.includes('unexpected') || error.includes('near'))) {
    return {
      title: 'Window function syntax error',
      explanation: 'There\'s a problem with your OVER clause. The OVER keyword turns aggregates and ranking functions into window functions.',
      suggestions: [
        'OVER must follow a window function: SUM(col) OVER (...), not SUM(col OVER(...))',
        'PARTITION BY goes inside OVER: SUM(col) OVER (PARTITION BY group_col)',
        'ORDER BY inside OVER defines row order: ROW_NUMBER() OVER (ORDER BY col DESC)',
        'You can combine both: RANK() OVER (PARTITION BY group ORDER BY val DESC)',
      ],
      guideSection: 'over / partition by',
    };
  }
  if (error.includes('partition') && (error.includes('syntax') || error.includes('unexpected') || error.includes('near'))) {
    return {
      title: 'PARTITION BY syntax error',
      explanation: 'PARTITION BY must appear inside an OVER clause. It divides rows into groups for window functions.',
      suggestions: [
        'Correct pattern: SUM(col) OVER (PARTITION BY group_col)',
        'PARTITION BY is NOT the same as GROUP BY — it keeps all rows visible',
        'Make sure PARTITION BY is inside the OVER parentheses, not outside',
      ],
      guideSection: 'over / partition by',
    };
  }

  // --- COALESCE errors ---
  if (error.includes('coalesce')) {
    return {
      title: 'COALESCE function error',
      explanation: 'COALESCE returns the first non-NULL value from a list. It needs at least two arguments.',
      suggestions: [
        'Syntax: COALESCE(value1, value2, ...) — returns first non-NULL',
        'Common use: COALESCE(nullable_col, 0) to replace NULL with 0',
        'Make sure all parentheses are balanced and arguments are separated by commas',
      ],
      guideSection: 'coalesce',
    };
  }

  // --- ROUND errors ---
  if (error.includes('round')) {
    return {
      title: 'ROUND function error',
      explanation: 'ROUND takes a numeric value and an optional number of decimal places.',
      suggestions: [
        'Syntax: ROUND(value, decimal_places) — e.g., ROUND(3.14159, 2) → 3.14',
        'The second argument is optional — ROUND(3.7) rounds to nearest integer',
        'Make sure the first argument is numeric, not a string',
      ],
      guideSection: 'round',
    };
  }

  // --- CAST errors ---
  if (error.includes('cast') && (error.includes('syntax') || error.includes('type') || error.includes('cannot'))) {
    return {
      title: 'CAST type conversion error',
      explanation: 'CAST converts a value to a different data type. The syntax is: CAST(value AS type).',
      suggestions: [
        'Syntax: CAST(column AS INTEGER), CAST(column AS REAL), CAST(column AS TEXT)',
        'Use CAST for decimal division: CAST(a AS REAL) / b',
        'Make sure the AS keyword separates the value and the target type',
      ],
      guideSection: 'cast',
    };
  }

  // --- Window function names (FIRST_VALUE, LAST_VALUE, NTILE, LAG, LEAD) ---
  const windowFnMatch = error.match(/(first_value|last_value|ntile|lag|lead|row_number|rank|dense_rank)/);
  if (windowFnMatch) {
    const fn = windowFnMatch[1].toUpperCase();
    const sectionMap: Record<string, string> = {
      'FIRST_VALUE': 'first_value / last_value',
      'LAST_VALUE': 'first_value / last_value',
      'NTILE': 'ntile',
      'LAG': 'lag / lead',
      'LEAD': 'lag / lead',
      'ROW_NUMBER': 'window functions',
      'RANK': 'rank / dense_rank',
      'DENSE_RANK': 'rank / dense_rank',
    };
    return {
      title: `${fn} window function error`,
      explanation: `${fn} is a window function that requires an OVER clause. Window functions compute values across a set of rows related to the current row.`,
      suggestions: [
        `${fn} must be followed by OVER (...): ${fn}(...) OVER (ORDER BY col)`,
        'Add PARTITION BY inside OVER to group rows: OVER (PARTITION BY group_col ORDER BY sort_col)',
        'Window functions cannot be used in WHERE — use a CTE or subquery to filter on the result',
      ],
      guideSection: sectionMap[fn] || 'window functions',
    };
  }

  // --- STRING_AGG / GROUP_CONCAT ---
  if (error.includes('string_agg') || error.includes('group_concat')) {
    return {
      title: 'String aggregation error',
      explanation: 'STRING_AGG (or GROUP_CONCAT) combines multiple string values into one. It requires a GROUP BY clause when used with other columns.',
      suggestions: [
        'Syntax: STRING_AGG(column, \', \') — combines values with a comma separator',
        'Must be used with GROUP BY when selecting other non-aggregated columns',
        'In SQLite, use GROUP_CONCAT instead of STRING_AGG',
      ],
      guideSection: 'string_agg',
    };
  }

  // --- Date function errors ---
  if (error.includes('strftime') || error.includes('date_trunc') || error.includes('extract')) {
    return {
      title: 'Date function error',
      explanation: 'Date functions extract or format parts of date/timestamp values.',
      suggestions: [
        'STRFTIME syntax: STRFTIME(\'%Y-%m\', date_column)',
        'EXTRACT syntax: EXTRACT(YEAR FROM date_column)',
        'Make sure the column you\'re using actually contains date/timestamp data',
        'Common format codes: %Y (year), %m (month), %d (day), %H (hour)',
      ],
      guideSection: 'date functions',
    };
  }

  // --- Query-context hints: detect concepts in user query and suggest guide sections ---
  const queryLower = query.toLowerCase();
  if (queryLower.includes('coalesce')) {
    return {
      title: 'Query error involving COALESCE',
      explanation: 'Your query uses COALESCE but something went wrong. COALESCE returns the first non-NULL value from its arguments.',
      suggestions: [
        'Syntax: COALESCE(value1, value2, ...) — needs at least 2 arguments',
        'Check parentheses and commas between arguments',
        'Common use: COALESCE(nullable_col, 0) replaces NULL with 0',
      ],
      guideSection: 'coalesce',
    };
  }
  if (queryLower.includes('over') || queryLower.includes('partition by')) {
    return {
      title: 'Query error involving window functions',
      explanation: 'Your query uses OVER or PARTITION BY. These turn aggregate/ranking functions into window functions that compute across rows without collapsing them.',
      suggestions: [
        'Pattern: FUNC() OVER (PARTITION BY group ORDER BY sort)',
        'OVER must directly follow the function call',
        'PARTITION BY and ORDER BY go inside the OVER parentheses',
        'Window functions cannot appear in WHERE — wrap in a CTE first',
      ],
      guideSection: 'over / partition by',
    };
  }
  if (queryLower.includes('round(')) {
    return {
      title: 'Query error involving ROUND',
      explanation: 'Your query uses ROUND. Check that it wraps a numeric expression and has balanced parentheses.',
      suggestions: [
        'Syntax: ROUND(numeric_expr, decimal_places)',
        'Ensure the expression inside ROUND evaluates to a number',
      ],
      guideSection: 'round',
    };
  }
  if (queryLower.includes('cast(')) {
    return {
      title: 'Query error involving CAST',
      explanation: 'Your query uses CAST for type conversion. Make sure the syntax is correct.',
      suggestions: [
        'Syntax: CAST(value AS TYPE) — e.g., CAST(col AS REAL)',
        'Valid types: INTEGER, REAL, TEXT, BLOB, NUMERIC',
      ],
      guideSection: 'cast',
    };
  }
  if (queryLower.includes('nullif(')) {
    return {
      title: 'Query error involving NULLIF',
      explanation: 'NULLIF returns NULL when its two arguments are equal. Commonly used to avoid division by zero.',
      suggestions: [
        'Syntax: NULLIF(value, 0) — returns NULL if value is 0',
        'Typical use: numerator / NULLIF(denominator, 0)',
      ],
      guideSection: 'nullif',
    };
  }

  // --- fallback: generic help ---
  return {
    title: 'Query error',
    explanation: 'Something went wrong with your SQL query. Here are some common things to check:',
    suggestions: [
      'Make sure all keywords are spelled correctly (SELECT, FROM, WHERE, GROUP BY, etc.)',
      'Check that parentheses are balanced — every ( needs a )',
      'String values need single quotes: \'value\' not "value"',
      'Column and table names must match exactly (check the Dataset Explorer)',
      'Try the "Open SQL GuideBook" button below for syntax reference',
    ],
  };
}
