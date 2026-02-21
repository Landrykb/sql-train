#!/usr/bin/env node
/**
 * packages/frontend/script/auditExercises.js
 *
 * Scans every case under packages/frontend/cases/<domain>/*.yaml,
 * loads tables from packages/frontend/public/datasets,
 * runs each solutionQuery, and compares to expected[][]
 * (from cases/solutions.yaml or inline).
 */

const fs      = require('fs');
const path    = require('path');
const YAML    = require('js-yaml');
const Papa    = require('papaparse');
const initSql = require('sql.js');

;(async () => {
  // ─── CORRECT PATHS ─────────────────────────────────────────────────────────
  // __dirname === …/packages/frontend/script
  // CASES_DIR is one level up: …/packages/frontend/cases
  const CASES_DIR    = path.resolve(__dirname, '../cases');
  const SOL_PATH     = path.join(CASES_DIR, 'solutions.yaml');
  // DATASETS_DIR is two levels up + public/datasets
  const DATASETS_DIR = path.resolve(__dirname, '../public/datasets');

  if (!fs.existsSync(CASES_DIR)) {
    console.error(`❌ Cannot find cases directory at ${CASES_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(DATASETS_DIR)) {
    console.error(`❌ Cannot find datasets directory at ${DATASETS_DIR}`);
    process.exit(1);
  }

  // ─── Load central solutions.yaml ───────────────────────────────────────────
  let centralSols = {};
  if (fs.existsSync(SOL_PATH)) {
    centralSols = YAML.load(fs.readFileSync(SOL_PATH, 'utf8')) || {};
  }

  // ─── Initialize SQL.js ─────────────────────────────────────────────────────
  const SQL = await initSql();

  // ─── Iterate each domain folder in packages/frontend/cases ─────────────────
  for (const domain of fs.readdirSync(CASES_DIR)) {
    const domainDir = path.join(CASES_DIR, domain);
    if (!fs.statSync(domainDir).isDirectory()) continue;

    // ── Iterate each exercise YAML in that domain ────────────────────────────
    for (const file of fs.readdirSync(domainDir).filter(f => f.endsWith('.yaml'))) {
      if (file === 'solutions.yaml') continue;

      const yamlPath = path.join(domainDir, file);
      const doc      = YAML.load(fs.readFileSync(yamlPath, 'utf8'));
      const exId     = doc.id;

      // 1) Merge solutionQuery & expected[][] from central or inline
      const solEntry      = centralSols[domain]?.[exId] || {};
      const solutionQuery = solEntry.solutionQuery || doc.solutionQuery;
      const expected      = solEntry.expected      || doc.expected;

      if (!solutionQuery) {
        console.warn(`⚠️  No solutionQuery for ${domain}/${exId}`);
        continue;
      }
      if (!Array.isArray(expected)) {
        console.warn(`⚠️  No expected[][] for ${domain}/${exId}`);
        continue;
      }

      // 2) Build in-memory DB & load each dataset as table
      const db = new SQL.Database();
      for (const ds of doc.datasets || []) {
        const csvPath = path.join(DATASETS_DIR, ds.file);
        if (!fs.existsSync(csvPath)) {
          console.error(`❌ Missing CSV ${ds.file} for ${domain}/${exId}`);
          continue;
        }
        const raw    = fs.readFileSync(csvPath, 'utf8');
        const parsed = Papa.parse(raw, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        if (parsed.errors.length) {
          console.warn(`⚠️  Parse errors in ${ds.file}:`, parsed.errors.slice(0,3));
        }
        const cols    = parsed.meta.fields || [];
        const colDefs = cols.map(c => `"${c}" TEXT`).join(', ');
        db.run(`CREATE TABLE "${ds.name}" (${colDefs});`);
        const placeholders = cols.map(() => '?').join(',');
        const stmt = db.prepare(`INSERT INTO "${ds.name}" VALUES (${placeholders});`);
        parsed.data.forEach(row => stmt.run(cols.map(c => row[c])));
        stmt.free();
      }

      // 3) Execute the solutionQuery
      let actualRows = [];
      try {
        const stmt = db.prepare(solutionQuery);
        while (stmt.step()) actualRows.push(stmt.get());
        stmt.free();
      } catch (err) {
        console.error(`❌ Query error in ${domain}/${exId}:`, err.message);
        db.close();
        continue;
      }
      db.close();

      // 4) Compare actualRows to expected[][]
      const got = actualRows.map(r => r.map(v => (v === null ? null : v)));
      const exp = expected;
      let ok = got.length === exp.length;
      if (ok) {
        for (let i = 0; i < got.length; i++) {
          if (got[i].length !== exp[i].length) { ok = false; break; }
          for (let j = 0; j < got[i].length; j++) {
            if (String(got[i][j]) !== String(exp[i][j])) {
              ok = false;
              break;
            }
          }
          if (!ok) break;
        }
      }

      // 5) Log the result
      if (ok) {
        console.log(`✅ ${domain}/${exId} OK (${got.length} rows)`);
      } else {
        console.error(`❌ MISMATCH in ${domain}/${exId}`);
        console.log('  Query:\n', solutionQuery);
        console.log('  Expected:\n', JSON.stringify(exp, null, 2));
        console.log('  Got:\n',      JSON.stringify(got, null, 2));
      }
    }
  }
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});