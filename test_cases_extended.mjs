#!/usr/bin/env node
import fs from 'fs';
import yaml from 'yaml';
import duckdb from 'duckdb';

const db = new duckdb.Database(':memory:');
const conn = db.connect();

function loadCSV(name, path) {
  conn.run(\`CREATE OR REPLACE TABLE \${name} AS SELECT * FROM read_csv_auto('\${path}', HEADER=TRUE);\`);
}

for (const domain of fs.readdirSync('./cases')) {
  for (const f of fs.readdirSync(\`./cases/\${domain}\`)) {
    if (!f.endsWith('.yaml')) continue;
    const doc = yaml.parse(fs.readFileSync(\`./cases/\${domain}/\${f}\`, 'utf8'));
    if (doc.tier !== 1) continue; // smoke‑test tier‑1 only

    // Seed the CSV data
    for (const ds of doc.datasets) {
      loadCSV(ds.name, \`./datasets/\${ds.file}\`);
    }

    // Run the seedQuery and confirm it populated at least one row
    const seedRes = conn.all(doc.seedQuery);
    const seedPass = seedRes.length > 0;

    // Run the templateQuery and compare to expected
    const templRes = conn.all(doc.templateQuery);
    const expRows  = (doc.expected || []).map(r => JSON.stringify(r));
    const gotRows  = templRes.map(r => JSON.stringify(r));
    const templPass = expRows.length
      ? (expRows.every(r => gotRows.includes(r)) && gotRows.length === expRows.length)
      : true;

    const status = seedPass && templPass ? 'PASS' : 'FAIL';
    console.log(
      doc.id.padEnd(24),
      \`seed:\${seedPass?'OK':'NO'}\`,
      \`template:\${templPass?'OK':'NO'}\`,
      \`→ \${status}\`
    );
  }
}

conn.close();
