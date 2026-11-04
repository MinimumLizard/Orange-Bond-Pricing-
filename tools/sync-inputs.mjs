// Regenerates data/inputs.js from data/inputs.json (the single source of truth).
// inputs.js exists only so that index.html also works when opened straight from
// disk (file://), where browsers block fetch() of local JSON. Run after any edit:
//   node tools/sync-inputs.mjs
// tests/model.test.mjs fails if the two files differ.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const json = JSON.parse(readFileSync(join(root, 'data/inputs.json'), 'utf8'));
const out =
  '// GENERATED from data/inputs.json by tools/sync-inputs.mjs. Do not edit by hand.\n' +
  'window.OB_INPUTS = ' + JSON.stringify(json, null, 2) + ';\n';
writeFileSync(join(root, 'data/inputs.js'), out);
console.log('data/inputs.js written');
