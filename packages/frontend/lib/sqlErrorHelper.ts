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
