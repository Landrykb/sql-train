# GROUP

Here you’ll learn how to group rows in SQL and compute aggregates over each group.

---

## Syntax

\`\`\`sql
SELECT
  <grouping_col1>,
  <grouping_col2>,
  AGG_FUNC(<expr>) AS alias
FROM table_name
WHERE <conditions>
GROUP BY <grouping_col1>, <grouping_col2>
HAVING <aggregate_condition>
ORDER BY <grouping_col1>;
\`\`\`

---

## Common Aggregates

- \`SUM(col)\` — add up numeric values  
- \`COUNT(*)\` — count rows  
- \`AVG(col)\` — average  
- \`MIN(col)\` / \`MAX(col)\`  

---

## Tips & Tricks

1. **Filter before you group** (use \`WHERE\`) to limit your input rows.  
2. **Filter after grouping** with \`HAVING\` (e.g. \`HAVING SUM(sales) > 1000\`).  
3. **Group on expressions** too: you can \`GROUP BY DATE(created_at)\` to bucket by day.  
4. **Combine with JOINs** to group across tables.

---

<aside>
Tip: **Warm‑up:**  
- Preview 5 random rows:  
  \`\`\`sql
  SELECT * FROM main ORDER BY RANDOM() LIMIT 5;
  \`\`\`
- Count total rows:  
  \`\`\`sql
  SELECT COUNT(*) FROM main;
  \`\`\`
</aside>
