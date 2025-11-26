#!/usr/bin/env node
// Lightweight static check for adminMenu.tsx to ensure no duplicate routes/labels
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/layouts/AdminLayout/adminMenu.tsx');
if (!fs.existsSync(file)) {
  console.error('adminMenu file not found at', file);
  process.exit(2);
}

const src = fs.readFileSync(file, 'utf8');

// crude parsing: find object entries with to: '/admin/xxx' and label: '...'
const toMatches = [...src.matchAll(/to:\s*'([^']+)'/g)].map(m => m[1]);
const labelMatches = [...src.matchAll(/label:\s*'([^']+)'/g)].map(m => m[1]);

const dupes = (arr) => arr.filter((v, i, a) => a.indexOf(v) !== i);
const dupTo = dupes(toMatches);
const dupLabel = dupes(labelMatches);

let ok = true;
if (dupTo.length) {
  console.error('Duplicate route paths found in adminMenu:', dupTo);
  ok = false;
}
if (dupLabel.length) {
  console.error('Duplicate labels found in adminMenu:', dupLabel);
  ok = false;
}

if (ok) {
  console.log('PASS: adminMenu static checks OK — no duplicate routes or labels found.');
  process.exit(0);
}
process.exit(1);
