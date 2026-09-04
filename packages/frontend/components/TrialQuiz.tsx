'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BleepxHead, BleepxTrophy, BleepxFace } from '@/components/BleepxIcons';
import { RefreshIcon } from '@/components/AppIcons';
import { IconCheck, IconX, IconSparkles } from '@tabler/icons-react';
import { syncCurrentProgress } from '@/lib/progressSync';
import { useAuthGate } from '@/components/SignInGate';
import { track, Events } from '@/lib/analytics';

// ─── Question bank keyed by SQL skill ────────────────────────────────────────

export interface QuizQuestion {
  type: 'multiple_choice' | 'fill_blank';
  question: string;
  /** For multiple_choice */
  options?: string[];
  /** Correct answer (exact match for fill_blank, option text for MC) */
  answer: string;
  explanation: string;
}

export const SKILL_QUESTIONS: Record<string, QuizQuestion[]> = {
  select: [
    { type: 'multiple_choice', question: 'What does the SELECT statement do in SQL?', options: ['Deletes rows from a table', 'Retrieves data from a table', 'Creates a new table', 'Updates existing rows'], answer: 'Retrieves data from a table', explanation: 'SELECT is used to query and retrieve data from one or more tables.' },
    { type: 'fill_blank', question: 'Write the keyword to select all columns from a table: ___ * FROM employees;', answer: 'SELECT', explanation: 'SELECT * retrieves all columns from the specified table.' },
    { type: 'multiple_choice', question: 'Which clause is used to rename a column in the output?', options: ['RENAME', 'AS', 'ALIAS', 'SET'], answer: 'AS', explanation: 'The AS keyword creates an alias for a column or table name.' },
  ],
  where: [
    { type: 'multiple_choice', question: 'When does the WHERE clause filter rows?', options: ['After GROUP BY', 'Before GROUP BY', 'After ORDER BY', 'Only on JOINed tables'], answer: 'Before GROUP BY', explanation: 'WHERE filters individual rows before any grouping is applied.' },
    { type: 'fill_blank', question: 'Complete: SELECT * FROM users ___ age > 18;', answer: 'WHERE', explanation: 'WHERE filters rows based on a condition.' },
    { type: 'multiple_choice', question: 'Which operator checks if a value is NULL?', options: ['= NULL', '== NULL', 'IS NULL', 'EQUALS NULL'], answer: 'IS NULL', explanation: 'NULL comparisons require IS NULL or IS NOT NULL. Standard operators don\'t work with NULL.' },
  ],
  order: [
    { type: 'multiple_choice', question: 'What is the default sort order for ORDER BY?', options: ['DESC (descending)', 'ASC (ascending)', 'Random', 'By insertion order'], answer: 'ASC (ascending)', explanation: 'ORDER BY defaults to ASC (ascending) — smallest to largest, A to Z.' },
    { type: 'fill_blank', question: 'Sort results from highest to lowest: ORDER BY price ___;', answer: 'DESC', explanation: 'DESC sorts in descending order — largest values first.' },
    { type: 'multiple_choice', question: 'Can you ORDER BY a column not in the SELECT list?', options: ['Yes, always', 'No, never', 'Only with GROUP BY', 'Only in subqueries'], answer: 'Yes, always', explanation: 'You can order by any column in the underlying tables, even if not selected.' },
  ],
  group: [
    { type: 'multiple_choice', question: 'What does GROUP BY do?', options: ['Sorts results', 'Combines rows with same values into summary rows', 'Joins two tables', 'Limits output rows'], answer: 'Combines rows with same values into summary rows', explanation: 'GROUP BY groups rows sharing a value so aggregate functions can operate on each group.' },
    { type: 'fill_blank', question: 'Complete: SELECT department, COUNT(*) FROM employees ___ ___ department;', answer: 'GROUP BY', explanation: 'GROUP BY groups rows by the specified column before applying aggregate functions.' },
    { type: 'multiple_choice', question: 'Which column(s) must appear in GROUP BY?', options: ['All columns in SELECT', 'Only aggregated columns', 'All non-aggregated columns in SELECT', 'The primary key'], answer: 'All non-aggregated columns in SELECT', explanation: 'Every column in SELECT that is not inside an aggregate function must appear in GROUP BY.' },
  ],
  count: [
    { type: 'multiple_choice', question: 'What is the difference between COUNT(*) and COUNT(column)?', options: ['No difference', 'COUNT(*) counts all rows; COUNT(column) skips NULLs', 'COUNT(column) is faster', 'COUNT(*) only works with integers'], answer: 'COUNT(*) counts all rows; COUNT(column) skips NULLs', explanation: 'COUNT(*) counts every row. COUNT(column) only counts rows where that column is not NULL.' },
    { type: 'fill_blank', question: 'Count unique values: SELECT COUNT(_____ email) FROM users;', answer: 'DISTINCT', explanation: 'COUNT(DISTINCT column) counts unique non-NULL values.' },
    { type: 'multiple_choice', question: 'What does COUNT(1) do?', options: ['Counts only the first column', 'Same as COUNT(*) — counts all rows', 'Returns 1', 'Counts NULL values'], answer: 'Same as COUNT(*) — counts all rows', explanation: 'COUNT(1) and COUNT(*) are equivalent — both count every row regardless of NULL values.' },
  ],
  limit: [
    { type: 'multiple_choice', question: 'What does LIMIT do in a SQL query?', options: ['Restricts column count', 'Caps the number of returned rows', 'Sets a maximum value', 'Limits JOIN depth'], answer: 'Caps the number of returned rows', explanation: 'LIMIT restricts how many rows the query returns. Useful for top-N queries.' },
    { type: 'fill_blank', question: 'Get the top 10 results: SELECT * FROM scores ORDER BY points DESC ___ 10;', answer: 'LIMIT', explanation: 'LIMIT N returns only the first N rows of the result set.' },
  ],
  join: [
    { type: 'multiple_choice', question: 'What does an INNER JOIN return?', options: ['All rows from both tables', 'Only rows with matching values in both tables', 'All rows from the left table', 'All rows from the right table'], answer: 'Only rows with matching values in both tables', explanation: 'INNER JOIN returns only the rows where the join condition is true in both tables.' },
    { type: 'fill_blank', question: 'Complete: SELECT * FROM orders ___ customers ON orders.customer_id = customers.id;', answer: 'JOIN', explanation: 'JOIN (or INNER JOIN) combines rows from two tables based on a related column.' },
    { type: 'multiple_choice', question: 'What happens with a LEFT JOIN when there is no match in the right table?', options: ['The row is excluded', 'NULLs fill the right table columns', 'An error is thrown', 'The row is duplicated'], answer: 'NULLs fill the right table columns', explanation: 'LEFT JOIN keeps all rows from the left table. Unmatched right-side columns become NULL.' },
  ],
  avg: [
    { type: 'multiple_choice', question: 'Does AVG() include NULL values in its calculation?', options: ['Yes, NULLs count as 0', 'No, NULLs are ignored', 'It depends on the database', 'It throws an error'], answer: 'No, NULLs are ignored', explanation: 'AVG() ignores NULL values — it sums non-NULL values and divides by their count.' },
    { type: 'fill_blank', question: 'Find average salary: SELECT ___(salary) FROM employees;', answer: 'AVG', explanation: 'AVG() calculates the arithmetic mean of a numeric column.' },
  ],
  sum: [
    { type: 'multiple_choice', question: 'What does SUM() return if all values are NULL?', options: ['0', 'NULL', 'An error', 'Empty string'], answer: 'NULL', explanation: 'SUM() returns NULL when all input values are NULL, not 0.' },
    { type: 'fill_blank', question: 'Calculate total revenue: SELECT ___(amount) AS total FROM sales;', answer: 'SUM', explanation: 'SUM() adds up all non-NULL values in a column.' },
  ],
  having: [
    { type: 'multiple_choice', question: 'What is the difference between WHERE and HAVING?', options: ['No difference', 'WHERE filters before GROUP BY; HAVING filters after', 'HAVING is faster', 'WHERE works on aggregates'], answer: 'WHERE filters before GROUP BY; HAVING filters after', explanation: 'WHERE filters individual rows before grouping. HAVING filters groups after aggregation.' },
    { type: 'fill_blank', question: 'Filter groups: SELECT dept, COUNT(*) AS c FROM emp GROUP BY dept ___ c > 5;', answer: 'HAVING', explanation: 'HAVING filters on aggregate results after GROUP BY.' },
    { type: 'multiple_choice', question: 'Can you use both WHERE and HAVING in the same query?', options: ['No, pick one', 'Yes — WHERE filters rows first, then HAVING filters groups', 'Only in subqueries', 'Only with DISTINCT'], answer: 'Yes — WHERE filters rows first, then HAVING filters groups', explanation: 'WHERE narrows the rows before grouping; HAVING narrows the groups after aggregation. Both can coexist.' },
  ],
  case: [
    { type: 'multiple_choice', question: 'What does a CASE expression do in SQL?', options: ['Creates a loop', 'Defines conditional logic (if/then/else)', 'Joins tables', 'Casts data types'], answer: 'Defines conditional logic (if/then/else)', explanation: 'CASE evaluates conditions sequentially and returns the first matching THEN value.' },
    { type: 'fill_blank', question: 'Complete: ___ WHEN score >= 90 THEN \'A\' WHEN score >= 80 THEN \'B\' ELSE \'C\' END', answer: 'CASE', explanation: 'CASE WHEN ... THEN ... ELSE ... END provides inline conditional logic.' },
    { type: 'multiple_choice', question: 'What happens if no WHEN condition matches and there is no ELSE?', options: ['An error', 'Returns 0', 'Returns NULL', 'Returns empty string'], answer: 'Returns NULL', explanation: 'Without an ELSE clause, CASE returns NULL when no condition matches.' },
  ],
  subquery: [
    { type: 'multiple_choice', question: 'Where can a subquery be used?', options: ['Only in WHERE', 'Only in SELECT', 'In SELECT, WHERE, FROM, and HAVING', 'Only in JOIN'], answer: 'In SELECT, WHERE, FROM, and HAVING', explanation: 'Subqueries can appear in multiple clauses depending on what they return.' },
    { type: 'fill_blank', question: 'Find above-average prices: SELECT * FROM products WHERE price > (SELECT ___(price) FROM products);', answer: 'AVG', explanation: 'A scalar subquery returning AVG(price) is compared against each row\'s price.' },
    { type: 'multiple_choice', question: 'What is a correlated subquery?', options: ['A subquery that runs once', 'A subquery that references columns from the outer query', 'A subquery with JOIN', 'A subquery in the SELECT clause'], answer: 'A subquery that references columns from the outer query', explanation: 'A correlated subquery references the outer query — it re-executes for each row of the outer query.' },
  ],
  cte: [
    { type: 'multiple_choice', question: 'What does CTE stand for?', options: ['Common Table Expression', 'Conditional Table Extract', 'Cross Table Evaluation', 'Computed Temporary Entity'], answer: 'Common Table Expression', explanation: 'A CTE (Common Table Expression) defines a temporary named result set using WITH.' },
    { type: 'fill_blank', question: 'Start a CTE: ___ monthly_sales AS (SELECT ... ) SELECT * FROM monthly_sales;', answer: 'WITH', explanation: 'CTEs begin with the WITH keyword followed by the CTE name and query.' },
    { type: 'multiple_choice', question: 'Can you define multiple CTEs in one query?', options: ['No, only one CTE per query', 'Yes, separated by commas after WITH', 'Yes, each needs its own WITH', 'Only with UNION'], answer: 'Yes, separated by commas after WITH', explanation: 'WITH cte1 AS (...), cte2 AS (...) SELECT ... — multiple CTEs are comma-separated after a single WITH.' },
    { type: 'multiple_choice', question: 'What is a key advantage of CTEs over subqueries?', options: ['CTEs are always faster', 'CTEs can be referenced multiple times in the same query', 'CTEs persist across queries', 'CTEs support more data types'], answer: 'CTEs can be referenced multiple times in the same query', explanation: 'A CTE is defined once and can be referenced multiple times, unlike a subquery which must be repeated.' },
    { type: 'multiple_choice', question: 'A CTE that references itself is called what?', options: ['Self-join CTE', 'Recursive CTE', 'Circular CTE', 'Loop CTE'], answer: 'Recursive CTE', explanation: 'A recursive CTE references its own name in the CTE body — used for hierarchical or iterative data.' },
    { type: 'fill_blank', question: 'Use a CTE for daily totals then query it: WITH daily AS (SELECT date, SUM(total) AS rev FROM sales GROUP BY date) SELECT * FROM ___;', answer: 'daily', explanation: 'After defining a CTE, reference it by name in the main SELECT as if it were a table.' },
  ],
  window: [
    { type: 'multiple_choice', question: 'What makes window functions different from GROUP BY aggregations?', options: ['They are faster', 'They don\'t collapse rows — each row keeps its identity', 'They only work with ORDER BY', 'They require a WHERE clause'], answer: 'They don\'t collapse rows — each row keeps its identity', explanation: 'Window functions compute values across a set of rows without collapsing them into one.' },
    { type: 'fill_blank', question: 'Complete: SELECT name, salary, RANK() ___ (ORDER BY salary DESC) FROM employees;', answer: 'OVER', explanation: 'OVER() defines the window frame for the window function.' },
    { type: 'multiple_choice', question: 'What does PARTITION BY do inside a window function?', options: ['Filters rows', 'Divides rows into groups for separate window calculations', 'Sorts the output', 'Limits the result set'], answer: 'Divides rows into groups for separate window calculations', explanation: 'PARTITION BY splits the window into groups — the window function resets for each partition.' },
    { type: 'fill_blank', question: 'Running total per department: SELECT dept, date, SUM(sales) OVER (___ ___ dept ORDER BY date) FROM revenue;', answer: 'PARTITION BY', explanation: 'PARTITION BY dept makes the running total restart for each department.' },
    { type: 'multiple_choice', question: 'What does SUM(amount) OVER (ORDER BY date) compute?', options: ['Total of all amounts', 'A running (cumulative) total ordered by date', 'Amount for each date only', 'The maximum amount'], answer: 'A running (cumulative) total ordered by date', explanation: 'SUM() with OVER(ORDER BY ...) and no PARTITION BY creates a running total across all rows.' },
    { type: 'multiple_choice', question: 'What does ROW_NUMBER() OVER (ORDER BY score DESC) produce?', options: ['Random numbers', 'Sequential numbers 1, 2, 3... with no gaps or ties', 'Same number for ties', 'The row count'], answer: 'Sequential numbers 1, 2, 3... with no gaps or ties', explanation: 'ROW_NUMBER() assigns a unique sequential integer — even tied values get different numbers.' },
    { type: 'multiple_choice', question: 'Without PARTITION BY, a window function operates over what?', options: ['Nothing — it errors', 'The first row only', 'The entire result set as one partition', 'Only grouped rows'], answer: 'The entire result set as one partition', explanation: 'Without PARTITION BY, the window spans all rows. With it, the function resets per group.' },
  ],
  rank: [
    { type: 'multiple_choice', question: 'What happens with RANK() when there are ties?', options: ['Values are averaged', 'Same rank is given, next rank is skipped', 'Same rank, no gap', 'Error is thrown'], answer: 'Same rank is given, next rank is skipped', explanation: 'RANK() assigns the same rank to ties, then skips. E.g., 1, 1, 3 (not 1, 1, 2).' },
    { type: 'multiple_choice', question: 'What is the difference between RANK() and DENSE_RANK()?', options: ['No difference', 'DENSE_RANK() doesn\'t skip numbers after ties', 'RANK() is faster', 'DENSE_RANK() only works with integers'], answer: 'DENSE_RANK() doesn\'t skip numbers after ties', explanation: 'DENSE_RANK() assigns 1, 1, 2 for ties. RANK() assigns 1, 1, 3.' },
    { type: 'multiple_choice', question: 'For the values 100, 90, 90, 80 — what does DENSE_RANK() assign?', options: ['1, 2, 2, 3', '1, 2, 2, 4', '1, 2, 3, 4', '1, 1, 1, 2'], answer: '1, 2, 2, 3', explanation: 'DENSE_RANK: 100→1, 90→2, 90→2, 80→3. No gap after the tie at rank 2.' },
    { type: 'fill_blank', question: 'Rank players per team: SELECT team, name, RANK() OVER (PARTITION BY team ___ ___ ___ score DESC) FROM players;', answer: 'ORDER BY', explanation: 'RANK() OVER (PARTITION BY team ORDER BY score DESC) ranks players within each team by score.' },
  ],
  date_functions: [
    { type: 'multiple_choice', question: 'Which function extracts the year from a date?', options: ['YEAR()', 'EXTRACT(YEAR FROM date)', 'DATE_PART(\'year\', date)', 'All of the above (varies by database)'], answer: 'All of the above (varies by database)', explanation: 'Date extraction syntax varies: YEAR(), EXTRACT(), DATE_PART() all work in different SQL dialects.' },
    { type: 'fill_blank', question: 'Extract the month: SELECT ___(MONTH FROM order_date) FROM orders;', answer: 'EXTRACT', explanation: 'EXTRACT(part FROM date) pulls a specific component from a date/timestamp.' },
  ],
  min: [
    { type: 'fill_blank', question: 'Find the lowest price: SELECT ___(price) FROM products;', answer: 'MIN', explanation: 'MIN() returns the smallest value in a column.' },
    { type: 'multiple_choice', question: 'Does MIN() work on text/string columns?', options: ['No, only numbers', 'Yes — it returns the alphabetically first value', 'It throws an error', 'Only with CAST'], answer: 'Yes — it returns the alphabetically first value', explanation: 'MIN() works on strings too — it returns the value that comes first alphabetically.' },
  ],
  max: [
    { type: 'fill_blank', question: 'Find the highest score: SELECT ___(score) FROM games;', answer: 'MAX', explanation: 'MAX() returns the largest value in a column.' },
    { type: 'multiple_choice', question: 'Can you use MAX() and MIN() in the same SELECT?', options: ['No, only one aggregate per query', 'Yes, you can use multiple aggregates', 'Only with GROUP BY', 'Only in subqueries'], answer: 'Yes, you can use multiple aggregates', explanation: 'You can combine any number of aggregate functions in one SELECT: SELECT MIN(x), MAX(x), AVG(x) FROM t.' },
  ],
  like: [
    { type: 'multiple_choice', question: 'What does the % wildcard mean in LIKE?', options: ['Exactly one character', 'Zero or more characters', 'Only numbers', 'End of string'], answer: 'Zero or more characters', explanation: '% matches any sequence of zero or more characters. _ matches exactly one character.' },
    { type: 'fill_blank', question: 'Find names starting with J: SELECT * FROM users WHERE name ___ \'J%\';', answer: 'LIKE', explanation: 'LIKE enables pattern matching with wildcards % and _.' },
  ],
  in: [
    { type: 'multiple_choice', question: 'What does the IN operator do?', options: ['Inserts data', 'Checks if a value matches any value in a list', 'Joins tables', 'Creates an index'], answer: 'Checks if a value matches any value in a list', explanation: 'IN checks whether a value matches any value in a parenthesized list or subquery.' },
    { type: 'fill_blank', question: 'Filter by list: SELECT * FROM products WHERE category ___ (\'Books\', \'Music\', \'Games\');', answer: 'IN', explanation: 'IN (value1, value2, ...) is shorthand for multiple OR conditions.' },
  ],
  between: [
    { type: 'multiple_choice', question: 'Is the BETWEEN operator inclusive of the boundary values?', options: ['Yes, both endpoints are included', 'No, both are excluded', 'Only the lower bound is included', 'Only the upper bound is included'], answer: 'Yes, both endpoints are included', explanation: 'BETWEEN a AND b includes both a and b — equivalent to >= a AND <= b.' },
    { type: 'fill_blank', question: 'Filter age range: SELECT * FROM users WHERE age ___ 18 AND 65;', answer: 'BETWEEN', explanation: 'BETWEEN low AND high filters values within an inclusive range.' },
  ],
  coalesce: [
    { type: 'multiple_choice', question: 'What does COALESCE() return?', options: ['Always the first argument', 'The first non-NULL argument', 'The last argument', 'The count of non-NULL arguments'], answer: 'The first non-NULL argument', explanation: 'COALESCE() evaluates arguments left to right and returns the first non-NULL value.' },
    { type: 'fill_blank', question: 'Provide a default: SELECT ___(nickname, first_name, \'Anonymous\') FROM users;', answer: 'COALESCE', explanation: 'COALESCE returns the first non-NULL value from its arguments — great for defaults.' },
  ],
  cast: [
    { type: 'multiple_choice', question: 'What does CAST do in SQL?', options: ['Creates a new table', 'Converts a value to a different data type', 'Casts a vote in a poll', 'Removes duplicates'], answer: 'Converts a value to a different data type', explanation: 'CAST(value AS type) converts a value from one data type to another.' },
    { type: 'fill_blank', question: 'Convert to integer: SELECT ___(price AS INTEGER) FROM products;', answer: 'CAST', explanation: 'CAST(expression AS target_type) performs explicit type conversion.' },
  ],
  exists: [
    { type: 'multiple_choice', question: 'What does EXISTS return?', options: ['The matching rows', 'TRUE if subquery returns any rows, FALSE otherwise', 'The count of matching rows', 'NULL if no match'], answer: 'TRUE if subquery returns any rows, FALSE otherwise', explanation: 'EXISTS is a boolean test — it returns TRUE as soon as the subquery finds at least one row.' },
    { type: 'multiple_choice', question: 'Why is EXISTS often preferred over IN for large datasets?', options: ['EXISTS is newer', 'EXISTS can stop early once it finds a match; IN must evaluate the entire list', 'EXISTS supports more data types', 'No real difference'], answer: 'EXISTS can stop early once it finds a match; IN must evaluate the entire list', explanation: 'EXISTS uses short-circuit evaluation — it returns TRUE as soon as one matching row is found.' },
  ],
  not_in: [
    { type: 'multiple_choice', question: 'What is a danger of NOT IN with NULL values?', options: ['It\'s slower', 'If the list contains NULL, no rows are returned', 'It ignores the NULL', 'It throws an error'], answer: 'If the list contains NULL, no rows are returned', explanation: 'NOT IN with a NULL in the list evaluates to UNKNOWN for every row, returning no results. Use NOT EXISTS instead.' },
    { type: 'multiple_choice', question: 'What is the safer alternative to NOT IN when NULLs might be present?', options: ['NOT LIKE', 'NOT EXISTS with a correlated subquery', 'EXCEPT', 'COALESCE'], answer: 'NOT EXISTS with a correlated subquery', explanation: 'NOT EXISTS handles NULLs correctly because it tests for row existence, not value comparison.' },
  ],
  is_null: [
    { type: 'multiple_choice', question: 'Why can\'t you use = NULL to check for NULL?', options: ['NULL is not a value — it\'s the absence of a value', 'It\'s just a syntax rule', 'You actually can', 'NULL equals empty string'], answer: 'NULL is not a value — it\'s the absence of a value', explanation: 'Any comparison with NULL using = returns UNKNOWN, not TRUE. Use IS NULL instead.' },
    { type: 'fill_blank', question: 'Find rows with missing email: SELECT * FROM users WHERE email ___ ___;', answer: 'IS NULL', explanation: 'IS NULL is the only correct way to test for NULL values in SQL.' },
  ],
  lag: [
    { type: 'multiple_choice', question: 'What does the LAG() function do?', options: ['Returns the next row value', 'Returns the previous row value in the partition', 'Counts rows', 'Calculates running total'], answer: 'Returns the previous row value in the partition', explanation: 'LAG(column, offset) accesses a value from a previous row in the window frame.' },
    { type: 'fill_blank', question: 'Get previous day price: SELECT date, price, ___(price, 1) OVER (ORDER BY date) AS prev_price FROM stocks;', answer: 'LAG', explanation: 'LAG(column, 1) returns the value from the previous row based on the ORDER BY.' },
    { type: 'multiple_choice', question: 'What does LEAD() do compared to LAG()?', options: ['Same thing', 'LEAD looks at the next row; LAG looks at the previous row', 'LEAD is faster', 'LEAD only works with numbers'], answer: 'LEAD looks at the next row; LAG looks at the previous row', explanation: 'LAG = look back, LEAD = look forward. Both use OVER(ORDER BY ...) to define row order.' },
    { type: 'multiple_choice', question: 'What does LAG(price, 1, 0) return when there is no previous row?', options: ['NULL', '0 (the default value provided)', 'An error', 'The current row value'], answer: '0 (the default value provided)', explanation: 'The third argument to LAG/LEAD is the default value when no row exists at the offset. Without it, NULL is returned.' },
  ],
  ntile: [
    { type: 'multiple_choice', question: 'What does NTILE(4) do?', options: ['Divides rows into 4 roughly equal buckets', 'Returns every 4th row', 'Multiplies values by 4', 'Groups by 4 columns'], answer: 'Divides rows into 4 roughly equal buckets', explanation: 'NTILE(n) distributes rows into n roughly equal numbered buckets (quartiles for n=4).' },
    { type: 'fill_blank', question: 'Split students into 3 performance tiers: SELECT name, score, ___(3) OVER (ORDER BY score DESC) AS tier FROM students;', answer: 'NTILE', explanation: 'NTILE(3) divides ordered rows into 3 buckets: top third gets 1, middle gets 2, bottom gets 3.' },
  ],
  union: [
    { type: 'multiple_choice', question: 'What is the difference between UNION and UNION ALL?', options: ['No difference', 'UNION removes duplicates; UNION ALL keeps all rows', 'UNION ALL is slower', 'UNION works across databases'], answer: 'UNION removes duplicates; UNION ALL keeps all rows', explanation: 'UNION deduplicates the combined result. UNION ALL simply appends all rows — faster.' },
    { type: 'multiple_choice', question: 'What must be true about the queries combined with UNION?', options: ['Same table names', 'Same number of columns with compatible types', 'Same WHERE clause', 'Same number of rows'], answer: 'Same number of columns with compatible types', explanation: 'All SELECT statements in a UNION must have the same number of columns with compatible data types.' },
  ],
  string_functions: [
    { type: 'fill_blank', question: 'Convert to uppercase: SELECT ___(name) FROM users;', answer: 'UPPER', explanation: 'UPPER() converts all characters in a string to uppercase.' },
    { type: 'multiple_choice', question: 'Which function extracts part of a string?', options: ['EXTRACT()', 'SUBSTRING()', 'SPLIT()', 'SLICE()'], answer: 'SUBSTRING()', explanation: 'SUBSTRING(string, start, length) extracts a portion of a string. Also called SUBSTR() in some dialects.' },
    { type: 'fill_blank', question: 'Combine first and last name: SELECT ___(first_name, \' \', last_name) AS full_name FROM users;', answer: 'CONCAT', explanation: 'CONCAT() joins two or more strings together. Some dialects also use the || operator.' },
  ],
  division: [
    { type: 'multiple_choice', question: 'What happens when you divide two integers in SQL?', options: ['You get a decimal result', 'Integer division — decimal part is truncated', 'An error', 'It depends on the database'], answer: 'Integer division — decimal part is truncated', explanation: 'In most SQL dialects, integer/integer = integer. CAST one to FLOAT for decimal results.' },
    { type: 'fill_blank', question: 'Get decimal division: SELECT CAST(revenue AS ___) / total_orders FROM sales;', answer: 'FLOAT', explanation: 'CAST to FLOAT (or DECIMAL/REAL) before dividing to avoid integer truncation.' },
  ],
  group_concat: [
    { type: 'multiple_choice', question: 'What does GROUP_CONCAT() do?', options: ['Counts groups', 'Concatenates values from multiple rows into a single string', 'Groups by concatenation', 'Combines tables'], answer: 'Concatenates values from multiple rows into a single string', explanation: 'GROUP_CONCAT() aggregates values from multiple rows into one comma-separated string.' },
    { type: 'multiple_choice', question: 'How do you change the separator in GROUP_CONCAT()?', options: ['SEP keyword', 'SEPARATOR keyword', 'DELIMIT keyword', 'You cannot change it'], answer: 'SEPARATOR keyword', explanation: 'GROUP_CONCAT(col SEPARATOR \'; \') changes the default comma separator to semicolon.' },
  ],
};

// ─── Fallback generic questions ──────────────────────────────────────────────

export const GENERIC_QUESTIONS: QuizQuestion[] = [
  { type: 'multiple_choice', question: 'Which SQL clause is processed first by the database engine?', options: ['SELECT', 'FROM', 'WHERE', 'ORDER BY'], answer: 'FROM', explanation: 'Logical processing order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY.' },
  { type: 'multiple_choice', question: 'What does DISTINCT do?', options: ['Sorts results', 'Removes duplicate rows from the result', 'Counts unique values', 'Joins tables'], answer: 'Removes duplicate rows from the result', explanation: 'DISTINCT eliminates duplicate rows from the query output.' },
  { type: 'fill_blank', question: 'Round a number to 2 decimals: SELECT ___(price, 2) FROM products;', answer: 'ROUND', explanation: 'ROUND(value, decimals) rounds a number to the specified decimal places.' },
  { type: 'multiple_choice', question: 'What does NULL represent in SQL?', options: ['Zero', 'Empty string', 'Unknown or missing value', 'False'], answer: 'Unknown or missing value', explanation: 'NULL represents the absence of a value — it is not 0, not empty string, not false.' },
  { type: 'fill_blank', question: 'Count all rows: SELECT ___(*) FROM orders;', answer: 'COUNT', explanation: 'COUNT(*) counts every row in the result set, including NULLs.' },
];

// ─── Build quiz from skills ──────────────────────────────────────────────────

function buildQuiz(skills: string[], count: number = 7): QuizQuestion[] {
  // 1. Collect ALL skill-specific questions first (these are the priority)
  const skillPool: QuizQuestion[] = [];
  for (const skill of skills) {
    const questions = SKILL_QUESTIONS[skill.toLowerCase()];
    if (questions) skillPool.push(...questions);
  }

  // Shuffle skill-specific questions
  skillPool.sort(() => Math.random() - 0.5);

  // 2. Deduplicate and take skill-specific first, up to count
  const seen = new Set<string>();
  const result: QuizQuestion[] = [];
  for (const q of skillPool) {
    if (!seen.has(q.question) && result.length < count) {
      seen.add(q.question);
      result.push(q);
    }
  }

  // 3. Only pad with generics if we still need more questions
  if (result.length < count) {
    const genericPool = [...GENERIC_QUESTIONS].sort(() => Math.random() - 0.5);
    for (const q of genericPool) {
      if (!seen.has(q.question) && result.length < count) {
        seen.add(q.question);
        result.push(q);
      }
    }
  }

  return result;
}

// ─── Points per correct answer ───────────────────────────────────────────────

const POINTS_PER_CORRECT = 3;
const PERFECT_BONUS = 5;

// ─── Component ───────────────────────────────────────────────────────────────

interface TrialQuizProps {
  caseId: string;
  caseName: string;
  skills: string[];
  domain: string;
}

interface TrialAnswerRecord {
  userAnswer: string;
  correct: boolean;
}

export default function TrialQuiz({ caseId, caseName, skills, domain }: TrialQuizProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(TrialAnswerRecord | null)[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [previousScore, setPreviousScore] = useState(0);
  const { requireAuth, GateComponent } = useAuthGate();

  // Derive answered/correct from answers array
  const currentAnswer = answers[currentIdx] ?? null;
  const answered = currentAnswer !== null;
  const correct = currentAnswer?.correct ?? false;

  // Build quiz on mount
  useEffect(() => {
    const key = `bleepx_quiz_${caseId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAlreadyCompleted(true);
        setPreviousScore(data.score || 0);
      } catch { /* ignore */ }
    }
    const built = buildQuiz(skills);
    setQuestions(built);
    setAnswers(new Array(built.length).fill(null));
  }, [caseId, skills]);

  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;

  // Navigate to a question index, restoring its input state
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
    // Gate: require GitHub sign-in to submit answers
    if (!requireAuth('submit quiz answers')) return;
    if (currentIdx === 0) track(Events.QUIZ_STARTED, { case_id: caseId, kind: 'trial' });
    const userAnswer = currentQ.type === 'multiple_choice' ? selected : textInput.trim();
    if (!userAnswer) return;

    const isCorrect = currentQ.type === 'fill_blank'
      ? userAnswer.toUpperCase() === currentQ.answer.toUpperCase()
      : userAnswer === currentQ.answer;

    const newAnswers = [...answers];
    newAnswers[currentIdx] = { userAnswer, correct: isCorrect };
    setAnswers(newAnswers);
    if (isCorrect) setScore((s) => s + POINTS_PER_CORRECT);
  }, [currentQ, answered, selected, textInput, answers, currentIdx, requireAuth, caseId]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= totalQuestions) {
      // Quiz complete
      const finalScore = score + (score === totalQuestions * POINTS_PER_CORRECT ? PERFECT_BONUS : 0);
      setScore(finalScore);
      setFinished(true);
      track(Events.QUIZ_COMPLETED, { quiz_type: 'trial', case_id: caseId, total_questions: totalQuestions, score: finalScore, max_score: totalQuestions * POINTS_PER_CORRECT + PERFECT_BONUS });

      // Award bonus points
      try {
        const currentPoints = parseInt(localStorage.getItem('bleepxPoints') || '0', 10);
        const newPoints = currentPoints + finalScore;
        localStorage.setItem('bleepxPoints', newPoints.toString());

        // Save quiz completion
        localStorage.setItem(`bleepx_quiz_${caseId}`, JSON.stringify({
          score: finalScore,
          total: totalQuestions,
          ts: Date.now(),
        }));

        // Trigger storage event for other components
        window.dispatchEvent(new Event('storage'));
        // Push to Supabase (tied to GitHub profile)
        syncCurrentProgress().catch(() => {});
      } catch { /* ignore */ }
    } else {
      goToQuestion(currentIdx + 1);
    }
  }, [currentIdx, totalQuestions, score, caseId, goToQuestion]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) goToQuestion(currentIdx - 1);
  }, [currentIdx, goToQuestion]);

  const handleRetake = useCallback(() => {
    const built = buildQuiz(skills);
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
          <img src="/bleepx-icon.png" alt="Bleepx" className="h-8 w-8" />
          <span className="text-bleepx-text-secondary">Loading quiz...</span>
        </div>
      </div>
    );
  }

  // ─── Finished State ──────────────────────────────────────────────────────

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
          <p className="text-lg text-bleepx-text-secondary mb-1">{caseName}</p>

          <div className="my-6 p-4 rounded-xl bg-gradient-to-r from-bleepx-blue/10 to-indigo-500/10 border border-bleepx-blue/20">
            <div className="text-3xl sm:text-4xl font-bold text-bleepx-blue mb-1">+{score} pts</div>
            <p className="text-sm text-bleepx-text-secondary">
              {score}/{maxScore} possible points ({pct}%)
              {isPerfect && <span className="ml-1 text-yellow-500 inline-flex items-center gap-1"><IconSparkles size={14} /> Perfect Bonus!</span>}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button
              onClick={handleRetake}
              className="px-5 py-2.5 rounded-full border-2 border-bleepx-border text-sm font-bold text-bleepx-text-secondary hover:bg-bleepx-blue/5 transition-colors"
            >
              <RefreshIcon size={16} className="inline" /> Retake Quiz
            </button>
            <Link href={`/cases/${domain}/${caseId}`}>
              <button className="px-5 py-2.5 rounded-full bg-bleepx-blue text-white text-sm font-bold hover:bg-bleepx-blue/90 transition-colors shadow-sm">
                ← Back to Trial
              </button>
            </Link>
            <Link href={`/cases/${domain}`}>
              <button className="px-5 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-sm">
                All Trials
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Previously completed banner ─────────────────────────────────────────

  const previousBanner = alreadyCompleted && currentIdx === 0 && !answered ? (
    <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
      <IconCheck size={16} />
      <span>You scored <strong>+{previousScore} pts</strong> previously. Retake to earn more!</span>
    </div>
  ) : null;

  // ─── Active Question ─────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BleepxFace size={24} />
          <h2 className="text-lg font-bold text-bleepx-gray">SQL Quiz</h2>
        </div>
        <span className="text-sm text-bleepx-text-secondary font-medium">
          {currentIdx + 1} / {totalQuestions}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-bleepx-blue to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {previousBanner}

      {/* Question card */}
      <div className="bg-bleepx-white rounded-2xl shadow-xl p-5 sm:p-8">
        {/* Skill tag + status */}
        <div className="flex flex-wrap gap-2 mb-3">
          {skills.map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-bleepx-blue/10 text-bleepx-blue font-medium uppercase tracking-wide">{s}</span>
          ))}
          {answered && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${correct ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
              {correct ? <span className="inline-flex items-center gap-1"><IconCheck size={12} /> Mastered</span> : <span className="inline-flex items-center gap-1"><IconX size={12} /> Review</span>}
            </span>
          )}
        </div>

        {/* Question */}
        <h3 className="text-lg sm:text-xl font-semibold text-bleepx-gray mb-5 leading-relaxed">
          {currentQ.question}
        </h3>

        {/* Answer area */}
        {currentQ.type === 'multiple_choice' ? (
          <div className="space-y-3">
            {currentQ.options?.map((opt) => {
              const isSelected = selected === opt;
              const isAnswer = opt === currentQ.answer;
              let classes = 'w-full text-left p-3.5 sm:p-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all duration-200 break-words ';

              if (answered) {
                if (isAnswer) {
                  classes += 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 ring-2 ring-green-400';
                } else if (isSelected && !isAnswer) {
                  classes += 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
                } else {
                  classes += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-60';
                }
              } else if (isSelected) {
                classes += 'border-bleepx-blue bg-bleepx-blue/5 text-bleepx-blue ring-2 ring-bleepx-blue/30';
              } else {
                classes += 'border-gray-200 dark:border-gray-700 text-bleepx-gray hover:border-bleepx-blue/40 hover:bg-bleepx-blue/5 cursor-pointer';
              }

              return (
                <button
                  key={opt}
                  onClick={() => !answered && setSelected(opt)}
                  disabled={answered}
                  className={classes}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="relative">
              <input
                type="text"
                value={textInput}
                onChange={(e) => !answered && setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !answered && handleAnswer()}
                disabled={answered}
                placeholder="Type your answer..."
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-mono font-medium transition-all duration-200 bg-transparent outline-none ${
                  answered
                    ? correct
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'border-gray-200 dark:border-gray-700 text-bleepx-gray focus:border-bleepx-blue focus:ring-2 focus:ring-bleepx-blue/30'
                }`}
              />
              {answered && !correct && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                  Correct answer: <code className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-800/40 font-bold">{currentQ.answer}</code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Explanation (shown after answering) */}
        {answered && (
          <div className={`mt-5 p-4 rounded-xl text-sm leading-relaxed ${
            correct
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
          }`}>
            <strong className="inline-flex items-center gap-1">{correct ? <><IconCheck size={14} /> Correct!</> : <><IconX size={14} /> Not quite.</>}</strong>{' '}
            {currentQ.explanation}
            {correct && <span className="ml-1 font-bold text-bleepx-blue">+{POINTS_PER_CORRECT} pts</span>}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="px-4 py-2 rounded-full border-2 border-bleepx-border text-sm font-bold text-bleepx-text-secondary hover:bg-bleepx-blue/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <div className="text-sm text-bleepx-text-secondary">
            Score: <span className="font-bold text-bleepx-blue">{score} pts</span>
          </div>
          {!answered ? (
            <button
              onClick={handleAnswer}
              disabled={currentQ.type === 'multiple_choice' ? !selected : !textInput.trim()}
              className="px-6 py-2.5 rounded-full bg-bleepx-blue text-white text-sm font-bold hover:bg-bleepx-blue/90 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-sm"
            >
              {currentIdx + 1 >= totalQuestions ? 'See Results' : 'Next →'}
            </button>
          )}
        </div>
      </div>
      <GateComponent />
    </div>
  );
}
