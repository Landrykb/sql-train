#!/usr/bin/env node
/**
 * packages/frontend/scripts/fixExpected.js
 *
 * For each domain/case in cases/solutions.yaml:
 * - Loads the corresponding case YAML to find its datasets
 * - Builds an in‐memory SQL.js DB from those CSVs
 * - Executes solutionQuery
 * - Replaces the central expected[][] with the actual result
 * - Writes back solutions.yaml
 */

const fs      = require('fs');
const path    = require('path');
const { load, dump } = require('js-yaml');
const Papa    = require('papaparse');
const initSql = require('sql.js');

;(async () => {
  // ─── Paths ─────────────────────────────────────────────────────────────────
  const CASES_DIR    = path.resolve(__dirname, '../cases');
  const SOL_PATH     = path.join(CASES_DIR, 'solutions.yaml');
  const DATASETS_DIR = path.resolve(__dirname, '../public/datasets');
  const CASE_PATTERN = path.join(CASES_DIR, '*', '*.yaml');

  if (!fs.existsSync(SOL_PATH)) {
    console.error(`❌ solutions.yaml not found at ${SOL_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(DATASETS_DIR)) {
    console.error(`❌ datasets dir not found at ${DATASETS_DIR}`);
    process.exit(1);
  }

  // ─── Load central solutions.yaml ───────────────────────────────────────────
  let central = load(fs.readFileSync(SOL_PATH, 'utf8')) || {};

  // ─── Init SQL.js ───────────────────────────────────────────────────────────
  const SQL = await initSql();

  // ─── Helper: run a solutionQuery with its datasets and return rows ────────
  async function getActualRows(domain, caseId, solutionQuery) {
    // 1) Read case YAML to find datasets
    const caseYamlPath = path.join(CASES_DIR, domain, `${caseId}.yaml`);
    if (!fs.existsSync(caseYamlPath)) {
      throw new Error(`Missing case YAML: ${caseYamlPath}`);
    }
    const doc = load(fs.readFileSync(caseYamlPath, 'utf8'));
    // 2) Build in-memory DB
    const db = new SQL.Database();
    for (const ds of doc.datasets || []) {
      const csvPath = path.join(DATASETS_DIR, ds.file);
      if (!fs.existsSync(csvPath)) {
        throw new Error(`Missing CSV ${ds.file} for ${domain}/${caseId}`);
      }
      const raw    = fs.readFileSync(csvPath, 'utf8');
      const parsed = Papa.parse(raw, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      const cols   = parsed.meta.fields || [];
      const colDefs= cols.map(c => `"${c}" TEXT`).join(', ');
      db.run(`CREATE TABLE "${ds.name}" (${colDefs});`);
      const placeholder = cols.map(() => '?').join(',');
      const stmt = db.prepare(`INSERT INTO "${ds.name}" VALUES (${placeholder});`);
      parsed.data.forEach(r => stmt.run(cols.map(c => r[c])));
      stmt.free();
    }
    // 3) Execute the query
    const actual = [];
    try {
      const stmt = db.prepare(solutionQuery);
      while (stmt.step()) {
        actual.push(stmt.get());
      }
      stmt.free();
    } finally {
      db.close();
    }
    return actual;
  }

  // ─── Iterate every domain & case in central ───────────────────────────────
  for (const [domain, cases] of Object.entries(central)) {
    for (const [caseId, entry] of Object.entries(cases)) {
      const sql = entry.solutionQuery?.trim();
      if (!sql) {
        console.warn(`⚠️  Skipping ${domain}/${caseId} (no solutionQuery)`);
        continue;
      }
      process.stdout.write(`⏳  Running ${domain}/${caseId}… `);
      try {
        const rows = await getActualRows(domain, caseId, sql);
        // Overwrite expected
        central[domain][caseId].expected = rows;
        console.log(`✔️  ${rows.length} rows`);
      } catch (err) {
        console.error(`❌  Failed: ${err.message}`);
      }
    }
  }

  // ─── Write back central solutions.yaml ────────────────────────────────────
  const yamlStr = dump(central, {
    sortKeys: true,
    lineWidth: 120,
  });
  fs.writeFileSync(SOL_PATH, yamlStr, 'utf8');
  console.log(`\n✅ Wrote updated solutions to ${SOL_PATH}`);
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});