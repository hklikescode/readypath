// Copies the starter data (../data/*.json) into app/data so Metro and the tests can import it.
// Runs automatically before start, android, test, eval and typecheck.
const fs = require('fs');
const path = require('path');
const from = path.resolve(__dirname, '..', '..', 'data');
const to = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(to, { recursive: true });
let n = 0;
for (const f of fs.readdirSync(from)) {
  if (f.endsWith('.json')) { fs.copyFileSync(path.join(from, f), path.join(to, f)); n++; }
}
console.log(`sync-data: copied ${n} json files from ../data`);
