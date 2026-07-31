import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileChapter } from './lib/compiler.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'data', 'chapters');
const outFile = join(root, 'src', 'lib', 'bites.json');

const files = readdirSync(srcDir).filter((f) => f.endsWith('.json')).sort();
const chapters = files.map((f, i) => {
  const raw = JSON.parse(readFileSync(join(srcDir, f), 'utf8'));
  return compileChapter(raw, i + 1);
});

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ generatedFrom: files.length + ' chapters', chapters }, null, 1));

const totals = chapters.reduce(
  (acc, ch) => {
    acc.bites += ch.biteCount;
    for (const b of ch.bites) { acc.cards += b.cards.length; acc.kinds[b.kind] = (acc.kinds[b.kind] || 0) + 1; }
    return acc;
  },
  { bites: 0, cards: 0, kinds: {} }
);
console.log(`compiled ${chapters.length} chapters → ${totals.bites} bites, ${totals.cards} cards`, totals.kinds);
