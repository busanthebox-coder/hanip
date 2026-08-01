import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileChapter } from './lib/compiler.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'data', 'chapters');
const outFile = join(root, 'src', 'lib', 'bites.json');

const overrides = JSON.parse(readFileSync(join(root, 'data', 'overrides.json'), 'utf8'));
const files = readdirSync(srcDir).filter((f) => f.endsWith('.json')).sort();
const chapters = files.map((f, i) => {
  const raw = JSON.parse(readFileSync(join(srcDir, f), 'utf8'));
  return compileChapter(raw, i + 1, overrides);
});

// The moment a learner has just guessed a word is the moment its nuance
// lands — attach it to the guess card so the reveal can teach, not just
// confirm. (extract-wordbook.mjs must run first; npm scripts order it.)
const wordbookPath = join(root, 'src', 'lib', 'wordbook.json');
let nuanceAttached = 0;
if (existsSync(wordbookPath)) {
  const byKo = new Map();
  for (const w of JSON.parse(readFileSync(wordbookPath, 'utf8')).words) {
    if (!byKo.has(w.ko)) byKo.set(w.ko, w);
  }
  for (const chapter of chapters) {
    for (const bite of chapter.bites) {
      for (const card of bite.cards) {
        if (card.kind !== 'guess') continue;
        const w = byKo.get(card.word.ko);
        if (!w?.nuance || card.word.nuance) continue;
        card.word.nuance = w.nuance;
        nuanceAttached += 1;
      }
    }
  }
}

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
console.log(
  `compiled ${chapters.length} chapters → ${totals.bites} bites, ${totals.cards} cards (${nuanceAttached} guess cards carry nuance)`,
  totals.kinds
);
