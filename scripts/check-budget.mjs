// Bundle budget gate. The A1 app boots at ~107kB gzip for the entry chunk;
// migrating 54 more chapters must not quietly turn first paint into a
// megabyte download. Run AFTER `vite build`.
//
// Budgets (gzip):
//   entry  (index-*.js + index-*.css)  ≤ 150 kB   — what every visitor pays
//   chunk  (any single lazy chunk)     ≤ 220 kB   — forces per-level splitting
//   total  (all dist assets)           ≤ 2.5 MB   — the whole offline course
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ENTRY_MAX = 150_000;
const CHUNK_MAX = 220_000;
const TOTAL_MAX = 2_500_000;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ENTRY_EXCLUDE = /^(?:sw\.js|icons\/)/;

function walk(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const name = prefix ? `${prefix}/${item.name}` : item.name;
    return item.isDirectory() ? walk(join(dir, item.name), name) : [name];
  });
}

let entry = 0, total = 0;
const offenders = [];
const rows = [];
for (const file of walk(dist)) {
  const gz = gzipSync(readFileSync(join(dist, file))).length;
  total += gz;
  const isEntry = /^assets\/index-/.test(file) && !ENTRY_EXCLUDE.test(file);
  if (isEntry) entry += gz;
  rows.push({ file, gz, isEntry });
  if (file.startsWith('assets/') && !isEntry && gz > CHUNK_MAX) offenders.push(`${file}: ${(gz / 1024).toFixed(0)}kB gzip > chunk budget ${(CHUNK_MAX / 1024).toFixed(0)}kB`);
}
rows.sort((a, b) => b.gz - a.gz);
for (const r of rows) console.log(`  ${(r.gz / 1024).toFixed(1).padStart(7)} kB gz  ${r.isEntry ? '[entry] ' : ''}${r.file}`);

if (entry > ENTRY_MAX) offenders.push(`entry chunks: ${(entry / 1024).toFixed(0)}kB gzip > entry budget ${(ENTRY_MAX / 1024).toFixed(0)}kB`);
if (total > TOTAL_MAX) offenders.push(`total: ${(total / 1024).toFixed(0)}kB gzip > total budget ${(TOTAL_MAX / 1024).toFixed(0)}kB`);

if (offenders.length) {
  console.error('check-budget: FAIL');
  for (const o of offenders) console.error('  ✗ ' + o);
  process.exit(1);
}
console.log(`check-budget: OK — entry ${(entry / 1024).toFixed(0)}kB gz, total ${(total / 1024).toFixed(0)}kB gz`);
