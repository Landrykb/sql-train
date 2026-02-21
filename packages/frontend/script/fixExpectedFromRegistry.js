#!/usr/bin/env node
/**
 * packages/frontend/script/fixExpectedFromRegistry.js
 *
 * Finds your dataset_registry.yaml and your central solutions.yaml,
 * fetches & transforms the full datasets, runs each solutionQuery in SQL.js,
 * and overwrites the expected[][] blocks in solutions.yaml with the real rows.
 *
 * Usage (from repo root):
 *   node packages/frontend/script/fixExpectedFromRegistry.js
 */

const fs      = require('fs');
const path    = require('path');
const YAML    = require('js-yaml');
const Papa    = require('papaparse');
const initSql = require('sql.js');
const fetch   = require('node-fetch');

// ─── Resolve paths ───────────────────────────────────────────────────────────
// __dirname is .../packages/frontend/script
// Go up 3 levels to repo root
const ROOT      = path.resolve(__dirname, '../../..');
const REG_PATH  = path.join(ROOT, 'dataset_registry.yaml');
const SOL_PATH  = path.join(ROOT, 'packages', 'frontend', 'cases', 'solutions.yaml');
const CASES_DIR = path.dirname(SOL_PATH);

// ─── Debug logs ──────────────────────────────────────────────────────────────
console.log('DEBUG: Looking for registry at', REG_PATH);
console.log('DEBUG: Looking for solutions.yaml at', SOL_PATH);

// ─── Verify existence ───────────────────────────────────────────────────────
if (!fs.existsSync(REG_PATH)) {
  console.error(`❌ dataset_registry.yaml not found at ${REG_PATH}`);
  process.exit(1);
}
if (!fs.existsSync(SOL_PATH)) {
  console.error(`❌ solutions.yaml not found at ${SOL_PATH}`);
  process.exit(1);
}

// ─── Load registry & central solutions ──────────────────────────────────────
const registry = YAML.load(fs.readFileSync(REG_PATH, 'utf8')).datasets;
const central  = YAML.load(fs.readFileSync(SOL_PATH, 'utf8')) || {};

// ─── Main async function ────────────────────────────────────────────────────
;(async () => {
  const SQL = await initSql();

  // Helper: fetch & transform dataset by registry key
  async function loadDataset(key) {
    const meta = registry[key];
    if (!meta) throw new Error(`No registry entry for '${key}'`);

    // Fetch CSV text
    let csvText;
    if (meta.url.startsWith('file://')) {
      const local = meta.url.replace(/^file:\/\//, '');
      const full  = path.resolve(ROOT, local);
      if (!fs.existsSync(full)) throw new Error(`Local file not found: ${full}`);
      csvText = fs.readFileSync(full, 'utf8');
    } else {
      const res = await fetch(meta.url);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${meta.url}`);
      csvText = await res.text();
    }

    // Parse CSV
    const parsed = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    let rows = parsed.data;
    let cols = parsed.meta.fields || [];

    // Apply transforms
    for (const t of meta.transforms || []) {
      if (t.rename) {
        rows = rows.map(r => {
          for (const [oldK, newK] of Object.entries(t.rename)) {
            if (r.hasOwnProperty(oldK)) {
              r[newK] = r[oldK];
              delete r[oldK];
            }
          }
          return r;
        });
        cols = cols.map(c => t.rename[c] || c);
      }
      if (t.select) {
        rows = rows.map(r => {
          const o = {};
          for (const c of t.select) o[c] = r[c];
          return o;
        });
        cols = t.select.slice();
      }
      if (t.filter) {
        if (typeof t.filter === 'string') {
          // Caution: eval per-row
          rows = rows.filter(r => eval(t.filter));
        } else {
          rows = rows.filter(r =>
            Object.entries(t.filter).every(([c, v]) => r[c] === v)
          );
        }
      }
    }

    return { rows, cols };
  }

  // Iterate each domain & case in central solutions.yaml
  for (const [domain, cases] of Object.entries(central)) {
    for (const [caseId, entry] of Object.entries(cases)) {
      const sql = (entry.solutionQuery || '').trim();
      if (!sql) {
        console.warn(`⚠️  Skipping ${domain}/${caseId} (no solutionQuery)`);
        continue;
      }

      process.stdout.write(`⏳  ${domain}/${caseId}… `);
      try {
        // Load the case YAML to determine dataset_key
        const caseYamlPath = path.join(CASES_DIR, domain, `${caseId}.yaml`);
        if (!fs.existsSync(caseYamlPath)) {
          throw new Error(`Case YAML not found: ${caseYamlPath}`);
        }
        const caseDoc = YAML.load(fs.readFileSync(caseYamlPath, 'utf8'));
        const key = caseDoc.dataset_key
                  || caseDoc.datasets?.[0]?.file.replace(/\.csv$/, '');
        if (!key) throw new Error('Cannot determine dataset key');

        // Fetch & transform the dataset
        const { rows, cols } = await loadDataset(key);

        // Build in-memory DB and load table "main"
        const db = new SQL.Database();
        db.run(`CREATE TABLE main (${cols.map(c => `"${c}" TEXT`).join(',')});`);
        const placeholders = cols.map(() => '?').join(',');
        const stmt = db.prepare(`INSERT INTO main VALUES (${placeholders});`);
        rows.forEach(r => stmt.run(cols.map(c => r[c])));
        stmt.free();

        // Execute the solutionQuery
        const actual = [];
        const stmtExec = db.prepare(sql);
        while (stmtExec.step()) actual.push(stmtExec.get());
        stmtExec.free();
        db.close();

        // Overwrite expected in central YAML
        central[domain][caseId].expected = actual;
        console.log(`✔️  ${actual.length} rows`);
      } catch (err) {
        console.error(`❌  Error: ${err.message}`);
      }
    }
  }

  // Write back updated solutions.yaml
  fs.writeFileSync(
    SOL_PATH,
    YAML.dump(central, { sortKeys: true, lineWidth: 120 }),
    'utf8'
  );
  console.log('\n✅ Updated solutions.yaml');
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});