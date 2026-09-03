#!/usr/bin/env node

/**
 * scripts/auditDatasets.js
 *
 * Scans public/datasets/*.csv, parses each with PapaParse,
 * then logs row counts and column type summaries.
 */

const fs   = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Directory where your CSVs live
const DATA_DIR = path.join(__dirname, '..', 'public', 'datasets');

function inferTypes(rows, fields) {
  const typeCounts = {};
  fields.forEach(f => {
    typeCounts[f] = {};
  });

  rows.forEach(row => {
    fields.forEach(f => {
      const val = row[f];
      let t = typeof val;
      // Normalize null/empty to 'null'
      if (val === null || val === '') t = 'null';
      // Track
      typeCounts[f][t] = (typeCounts[f][t] || 0) + 1;
    });
  });

  // Reduce to primary type or mixed
  const summary = {};
  for (const f of fields) {
    const counts = typeCounts[f];
    const types  = Object.keys(counts);
    if (types.length === 1) {
      summary[f] = types[0];
    } else {
      summary[f] = `mixed(${types.join('/')})`;
    }
  }
  return summary;
}

fs.readdir(DATA_DIR, (err, files) => {
  if (err) {
    console.error(`[ERROR] Could not read datasets dir:`, err);
    process.exit(1);
  }

  files
    .filter(f => f.endsWith('.csv'))
    .forEach(file => {
      const fullPath = path.join(DATA_DIR, file);
      const content  = fs.readFileSync(fullPath, 'utf8');

      const { data, meta, errors } = Papa.parse(content, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });

      if (errors.length) {
        console.warn(`[WARN]  Parse errors in ${file}:`, errors.slice(0,3));
      }

      const rowCount = data.length;
      const cols     = meta.fields || [];

      console.log(`\n[Dataset] Dataset: ${file}`);
      console.log(`  Rows:   ${rowCount}`);
      console.log(`  Columns (${cols.length}):`);
      const types = inferTypes(data, cols);
      cols.forEach(col => {
        console.log(`    • ${col}: ${types[col]}`);
      });
    });
});