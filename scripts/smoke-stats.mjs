import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => JSON.parse(readFileSync(join(root, relative), 'utf8'));

const compiled = read('src/lib/bites.json').chapters;
const index = read('src/lib/bites-index.json');
const snacks = read('src/lib/snacks.json').snacks;
const packs = read('data/packs.json').packs;
const expressionPacks = read('data/expression-packs.json').packs;
const readers = read('data/readers.json').readers;
const clusters = read('src/lib/clusters.json').clusters;
const words = read('src/lib/wordbook.json').words;
const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
const chapterLevels = new Map(index.chapters.map((chapter) => [chapter.id, chapter.level]));

const rows = levels.map((level) => {
  const chapters = compiled.filter((chapter) => chapterLevels.get(chapter.id) === level);
  const bites = chapters.flatMap((chapter) => chapter.bites);
  const cards = bites.flatMap((bite) => bite.cards);
  const levelSnacks = snacks.filter((snack) => snack.level === level);
  return {
    level,
    chapters: chapters.length,
    bites: bites.length,
    cards: cards.length,
    hunt: cards.filter((card) => card.kind === 'hunt').length,
    teach: cards.filter((card) => card.kind === 'teach').length,
    snacks: levelSnacks.length,
    snackCards: levelSnacks.reduce((sum, snack) => sum + snack.cards.length, 0),
  };
});

const totals = rows.reduce((sum, row) => ({
  chapters: sum.chapters + row.chapters,
  bites: sum.bites + row.bites,
  cards: sum.cards + row.cards,
  hunt: sum.hunt + row.hunt,
  teach: sum.teach + row.teach,
  snacks: sum.snacks + row.snacks,
  snackCards: sum.snackCards + row.snackCards,
}), { chapters: 0, bites: 0, cards: 0, hunt: 0, teach: 0, snacks: 0, snackCards: 0 });

console.log('| Level | Chapters | Chapter bites | Chapter cards | hunt | teach | Snacks | Snack cards |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|');
for (const row of rows) {
  console.log(`| ${row.level} | ${row.chapters} | ${row.bites} | ${row.cards} | ${row.hunt} | ${row.teach} | ${row.snacks} | ${row.snackCards} |`);
}
console.log(`| Total | ${totals.chapters} | ${totals.bites} | ${totals.cards} | ${totals.hunt} | ${totals.teach} | ${totals.snacks} | ${totals.snackCards} |`);
console.log('');
console.log(`all learning bites: ${totals.bites + totals.snacks}`);
console.log(`all learning cards: ${totals.cards + totals.snackCards}`);
console.log(`vocab packs: ${packs.length} · joined members: ${packs.reduce((sum, pack) => sum + pack.words.length, 0)}`);
console.log(`expression packs: ${expressionPacks.length} · expressions: ${expressionPacks.reduce((sum, pack) => sum + pack.words.length, 0)}`);
console.log(`readers: ${readers.length} · clusters: ${clusters.length} · wordbook: ${words.length}`);

// Counts as measured on 2026-08-07 (order 26). chapterCards/words had been left
// at their pre-thickness figures, so this check could not run; they are synced
// to what the compiler actually emits.
const expected = {
  chapters: 65,
  chapterBites: 619,
  chapterCards: 2977,
  snacks: 18,
  snackCards: 257,
  allBites: 637,
  allCards: 3234,
  packs: 12,
  joinedMembers: 173,
  expressionPacks: 6,
  expressions: 84,
  readers: 20,
  clusters: 32,
  words: 720,
};
const actual = {
  chapters: totals.chapters,
  chapterBites: totals.bites,
  chapterCards: totals.cards,
  snacks: totals.snacks,
  snackCards: totals.snackCards,
  allBites: totals.bites + totals.snacks,
  allCards: totals.cards + totals.snackCards,
  packs: packs.length,
  joinedMembers: packs.reduce((sum, pack) => sum + pack.words.length, 0),
  expressionPacks: expressionPacks.length,
  expressions: expressionPacks.reduce((sum, pack) => sum + pack.words.length, 0),
  readers: readers.length,
  clusters: clusters.length,
  words: words.length,
};

for (const [name, value] of Object.entries(expected)) {
  if (actual[name] !== value) throw new Error(`smoke-stats: ${name} expected ${value}, got ${actual[name]}`);
}
if (index.chapters.length !== totals.chapters || index.snacks.length !== totals.snacks) {
  throw new Error('smoke-stats: bites index does not match compiled artifacts');
}
console.log('smoke-stats: OK');
