import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileChapter, compileSnack } from './lib/compiler.mjs';
import { chapterLevel } from '../src/lib/levels.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'data', 'chapters');
const outFile = join(root, 'src', 'lib', 'bites.json');
const indexFile = join(root, 'src', 'lib', 'bites-index.json');
const chunksDir = join(root, 'src', 'lib', 'bites');
const packsFile = join(root, 'data', 'packs.json');
const expressionPacksFile = join(root, 'data', 'expression-packs.json');
const snacksFile = join(root, 'src', 'lib', 'snacks.json');

function firstWord(bite) {
  const guess = bite.cards.find((card) => card.kind === 'guess');
  if (guess) return guess.word.ko;
  const named = bite.cards.find((card) => card.kind === 'hunt' || card.kind === 'teach');
  if (named?.name) return named.name;
  return bite.title.split('·').pop().trim();
}

const overrides = JSON.parse(readFileSync(join(root, 'data', 'overrides.json'), 'utf8'));
const files = readdirSync(srcDir).filter((f) => f.endsWith('.json')).sort();
const chapters = files.map((f, i) => {
  const raw = JSON.parse(readFileSync(join(srcDir, f), 'utf8'));
  return compileChapter(raw, i + 1, overrides);
});
// The 12 vocab packs (order 09) and the 6 situational expression packs (order 26)
// compile through the same snack path — an expression pack is just a pack whose
// words happen to be whole sentences. Expression packs are appended, never
// interleaved, so the shipped snack order stays exactly as it was.
const packs = JSON.parse(readFileSync(packsFile, 'utf8')).packs;
const expressionPacks = existsSync(expressionPacksFile)
  ? JSON.parse(readFileSync(expressionPacksFile, 'utf8')).packs
  : [];
const allPacks = [...packs, ...expressionPacks];
const snacks = allPacks.map((pack) => compileSnack(pack, overrides));

// The moment a learner has just guessed a word is the moment its nuance
// lands — attach it to the guess card so the reveal can teach, not just
// confirm. (extract-wordbook.mjs must run first; npm scripts order it.)
const wordbookPath = join(root, 'src', 'lib', 'wordbook-depth.json');
let nuanceAttached = 0;
if (existsSync(wordbookPath)) {
  const byKo = new Map();
  for (const w of Object.values(JSON.parse(readFileSync(wordbookPath, 'utf8')))) {
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
  for (const snack of snacks) {
    for (const card of snack.cards) {
      if (card.kind !== 'guess') continue;
      const w = byKo.get(card.word.ko);
      if (!w?.nuance || card.word.nuance) continue;
      card.word.nuance = w.nuance;
      nuanceAttached += 1;
    }
  }
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ generatedFrom: files.length + ' chapters', chapters }, null, 1));

const indexChapters = chapters.map((chapter) => ({
  id: chapter.id,
  number: chapter.number,
  title: chapter.title,
  goal: chapter.goal,
  level: chapterLevel(chapter.number),
  biteCount: chapter.biteCount,
  bites: chapter.bites.map((bite) => ({
    id: bite.id,
    kind: bite.kind,
    title: bite.title,
    cardCount: bite.cards.length,
    canDo: bite.canDo,
    firstWord: firstWord(bite),
  })),
}));
const indexSnacks = snacks.map((snack) => ({
  id: snack.id,
  packId: snack.packId,
  title: snack.title,
  shortTitle: snack.shortTitle,
  afterChapter: snack.afterChapter,
  level: snack.level,
  cardCount: snack.cardCount,
  canDo: snack.canDo,
}));
writeFileSync(indexFile, JSON.stringify({
  generatedFrom: `${files.length} chapters + ${snacks.length} snacks`,
  chapters: indexChapters,
  snacks: indexSnacks,
}, null, 1));
writeFileSync(snacksFile, JSON.stringify({
  generatedFrom: `${packs.length} vocab packs + ${expressionPacks.length} expression packs`,
  snacks,
}, null, 1));

mkdirSync(chunksDir, { recursive: true });
// B1 is the largest level (22 chapters) — as one lazy chunk it blew the
// 220kB chunk budget after the thickness phase, so it ships in two halves.
const chunkPick = {
  a1: (n) => chapterLevel(n) === 'A1',
  a2: (n) => chapterLevel(n) === 'A2',
  b1a: (n) => chapterLevel(n) === 'B1' && n <= 45,
  b1b: (n) => chapterLevel(n) === 'B1' && n > 45,
  b2c1: (n) => ['B2', 'C1'].includes(chapterLevel(n)),
};
for (const [name, picks] of Object.entries(chunkPick)) {
  const chunkChapters = chapters.filter((chapter) => picks(chapter.number));
  writeFileSync(
    join(chunksDir, `${name}.json`),
    JSON.stringify({ generatedFrom: files.length + ' chapters', chapters: chunkChapters }, null, 1),
  );
}

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
