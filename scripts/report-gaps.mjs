// Report compiler fallbacks for a chapter range. The output is deterministic so
// rerunning compile + report makes stale generated state easy to detect.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [startArg, endArg, ...extraArgs] = process.argv.slice(2);
const start = Number(startArg);
const end = Number(endArg);

if (extraArgs.length || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
  console.error('Usage: node scripts/report-gaps.mjs <start-chapter> <end-chapter>');
  process.exit(1);
}

const { chapters } = JSON.parse(readFileSync(join(root, 'src', 'lib', 'bites.json'), 'utf8'));
const selected = chapters.filter((chapter) => chapter.number >= start && chapter.number <= end);
const expectedCount = end - start + 1;

if (selected.length !== expectedCount) {
  const found = new Set(selected.map((chapter) => chapter.number));
  const missing = Array.from({ length: expectedCount }, (_, index) => start + index)
    .filter((number) => !found.has(number));
  console.error(`gap-report: missing compiled chapter(s): ${missing.join(', ')}`);
  process.exit(1);
}

const patternRows = [];
const guessGaps = [];
let biteCount = 0;

for (const chapter of selected) {
  biteCount += chapter.bites.length;
  for (const bite of chapter.bites) {
    if (bite.kind === 'pattern') {
      const hunt = bite.cards.find((card) => card.kind === 'hunt');
      const teach = bite.cards.find((card) => card.kind === 'teach');
      if (!hunt && !teach) {
        console.error(`gap-report: ${bite.id} is a pattern bite without a hunt or teach card`);
        process.exit(1);
      }
      patternRows.push({
        chapter: chapter.number,
        bite: bite.id,
        result: hunt ? 'hunt' : 'teach fallback',
        grammar: hunt?.name ?? teach.name ?? bite.title.replace(/^.*?·\s*/, ''),
      });
    }

    for (const card of bite.cards) {
      if (card.kind === 'guess' && card.sentence && card.target == null) {
        guessGaps.push({
          chapter: chapter.number,
          bite: bite.id,
          word: card.word?.ko ?? '',
          exampleKo: card.sentence.ko ?? '',
          exampleEn: card.sentence.en ?? '',
        });
      }
    }
  }
}

const huntCount = patternRows.filter((row) => row.result === 'hunt').length;
const teachCount = patternRows.length - huntCount;
const escapeCell = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
const lines = [
  `# Gap report — chapters ${start}–${end}`,
  '',
  '## Summary',
  '',
  `- Chapters: ${selected.length}`,
  `- Bites: ${biteCount}`,
  `- Pattern bites: ${patternRows.length}`,
  `- hunt: ${huntCount}`,
  `- teach fallback: ${teachCount}`,
  `- Guess cards with a sentence and null target: ${guessGaps.length}`,
  '',
  '## Pattern bites',
  '',
  '| Chapter | Bite | Result | Grammar title |',
  '|---:|---|---|---|',
  ...patternRows.map((row) => `| ${row.chapter} | ${escapeCell(row.bite)} | ${row.result} | ${escapeCell(row.grammar)} |`),
  '',
  '## Guess cards with a sentence and null target',
  '',
];

if (guessGaps.length) {
  lines.push(
    '| Chapter | Bite | Word | Example |',
    '|---:|---|---|---|',
    ...guessGaps.map((gap) => `| ${gap.chapter} | ${escapeCell(gap.bite)} | ${escapeCell(gap.word)} | ${escapeCell(gap.exampleKo)}<br>${escapeCell(gap.exampleEn)} |`),
  );
} else {
  lines.push('None.');
}
lines.push('');

const reportRelative = join('docs', 'harness', 'audit', `gap-report-${start}-${end}.md`);
const reportFile = join(root, reportRelative);
mkdirSync(dirname(reportFile), { recursive: true });
writeFileSync(reportFile, lines.join('\n'));

console.log(`gap-report: chapters ${start}–${end} — ${selected.length} chapters, ${biteCount} bites`);
console.log(`patterns: ${patternRows.length} total · hunt ${huntCount} · teach ${teachCount}`);
console.log(`guess gaps: ${guessGaps.length} sentence card(s) with null target`);
console.log(`wrote ${reportRelative}`);
