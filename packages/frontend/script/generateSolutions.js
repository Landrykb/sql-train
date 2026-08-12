#!/usr/bin/env node
/**
 * packages/frontend/scripts/generateSolutions.js
 *
 * Regenerates entries in cases/solutions.yaml by pulling
 * solutionQuery and expected from each case’s own YAML.
 */

const fs = require('fs');
const path = require('path');
const { load, dump } = require('js-yaml');
const glob = require('glob');

// Paths
const CASES_DIR = path.resolve(__dirname, '../cases');
const SOL_PATH = path.join(CASES_DIR, 'solutions.yaml');
const CASE_PATTERN = path.join(CASES_DIR, '*', '*.yaml');

// 1) Load or init central solutions object
let central = {};
if (fs.existsSync(SOL_PATH)) {
  central = load(fs.readFileSync(SOL_PATH, 'utf8')) || {};
}

// 2) Find all case YAMLs, except the central file itself
const files = glob.sync(CASE_PATTERN).filter(p => !p.endsWith('solutions.yaml'));

files.forEach(filePath => {
  const doc = load(fs.readFileSync(filePath, 'utf8'));
  if (!doc.id || !doc.datasets) return; // skip malformed

  const domain = path.basename(path.dirname(filePath));
  const exId = doc.id;

  // Ensure domain exists
  if (!central[domain]) central[domain] = {};

  // Always overwrite with correct solutionQuery
  central[domain][exId] = {
    solutionQuery: doc.solutionQuery || doc.templateQuery || doc.seedQuery || '',
    expected: Array.isArray(doc.expected) ? doc.expected : [],
  };

  console.log(`✅ Updated entry for ${domain}/${exId}`);
});

// 3) Write back sorted YAML
const dump = dump(central, {
  sortKeys: true,
  lineWidth: 120,
});
fs.writeFileSync(SOL_PATH, dump, 'utf8');
console.log(`\n✅ Fully regenerated ${SOL_PATH}`);