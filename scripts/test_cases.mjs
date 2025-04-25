#!/usr/bin/env node
import fs from 'fs';
import yaml from 'yaml';
import duckdb from 'duckdb';
const db = new duckdb.Database(':memory:');
const conn = db.connect();

function loadCSV(name, path) {
  conn.run(`CREATE OR REPLACE TABLE ${name} AS SELECT * FROM read_csv_auto('${path}', HEADER=TRUE);`);
}

for (const domain of fs.readdirSync('./cases')) {
  for (const f of fs.readdirSync(`./cases/${domain}`)) {
    if (!f.endsWith('.yaml')) continue;
    const doc = yaml.parse(fs.readFileSync(`./cases/${domain}/${f}`, 'utf8'));
    if (doc.tier !== 1) continue; // quick smoke‑test tier‑1 only
    for (const ds of doc.datasets) {
      loadCSV(ds.name, `./datasets/${ds.file}`);
    }
    const res = conn.all(doc.seedQuery);
    console.log(doc.id.padEnd(24), res.length ? 'PASS' : 'FAIL');
  }
}
conn.close();
