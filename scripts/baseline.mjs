// A1 no-regression gate. The 11 shipped A1 chapters are LIVE — any change to
// the compiler (new title parsers, new conjugation rules for later levels)
// must leave their compiled output structurally identical.
//
//   node scripts/baseline.mjs --write   snapshot current A1 output as the baseline
//   node scripts/baseline.mjs           compare current output against it (exit 1 on drift)
//   node scripts/baseline.mjs --all     snapshot ALL 65 chapters → snapshot-all.json
//                                       (the additive guard's reference; see check-additive.mjs)
//
// The snapshot is structural (bite/card/kind/hunt counts + per-card kind+key
// sequence), not byte-for-byte, so cosmetic JSON reordering can't false-alarm
// while any real change to what a learner sees still trips it.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotChapters } from './lib/cardKey.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselineFile = join(root, 'docs', 'harness', 'baseline-a1.json');
const allFile = join(root, 'docs', 'harness', 'snapshot-all.json');

const A1 = new Set(Array.from({ length: 11 }, (_, i) => `chapter-${String(i + 1).padStart(2, '0')}`));

function snapshot() {
  const chapters = snapshotChapters({ root, filter: (ch) => A1.has(ch.id) });
  if (chapters.length !== 11) throw new Error(`expected 11 A1 chapters in bites.json, found ${chapters.length}`);
  return chapters;
}

// --all writes the whole-course reference the additive guard compares against.
// It is a separate file from baseline-a1.json on purpose: baseline answers
// "did the live A1 course change?", snapshot-all answers "did any existing
// card anywhere change or disappear?".
if (process.argv.includes('--all')) {
  const chapters = snapshotChapters({ root });
  writeFileSync(allFile, JSON.stringify({ writtenFor: 'all chapters', chapters }, null, 1));
  const cards = chapters.reduce((n, ch) => n + ch.bites.reduce((m, b) => m + b.cards.length, 0), 0);
  console.log(`baseline: wrote ${chapters.length} chapters / ${cards} cards → docs/harness/snapshot-all.json`);
  process.exit(0);
}

const current = snapshot();

if (process.argv.includes('--write')) {
  writeFileSync(baselineFile, JSON.stringify({ writtenFor: 'A1 chapters 01-11', chapters: current }, null, 1));
  console.log(`baseline: wrote ${current.length} chapters → docs/harness/baseline-a1.json`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(baselineFile, 'utf8')).chapters;
} catch {
  console.error('baseline: docs/harness/baseline-a1.json missing — run `node scripts/baseline.mjs --write` on a known-good build first');
  process.exit(1);
}

const drifts = [];
for (const [i, base] of baseline.entries()) {
  const now = current[i];
  if (!now || now.id !== base.id) { drifts.push(`chapter order/id: expected ${base.id}, got ${now?.id}`); continue; }
  if (now.biteCount !== base.biteCount) drifts.push(`${base.id}: biteCount ${base.biteCount} → ${now.biteCount}`);
  const maxBites = Math.max(base.bites.length, now.bites.length);
  for (let b = 0; b < maxBites; b++) {
    const bb = base.bites[b], nb = now.bites[b];
    if (!bb || !nb) { drifts.push(`${base.id}: bite #${b + 1} ${bb ? 'removed' : 'added'}`); continue; }
    if (bb.title !== nb.title) drifts.push(`${nb.id}: title "${bb.title}" → "${nb.title}"`);
    const maxCards = Math.max(bb.cards.length, nb.cards.length);
    for (let c = 0; c < maxCards; c++) {
      if (bb.cards[c] !== nb.cards[c]) {
        drifts.push(`${nb.id}#${c}: ${bb.cards[c] ?? '(none)'}  →  ${nb.cards[c] ?? '(none)'}`);
      }
    }
  }
}

if (drifts.length) {
  console.error(`baseline: A1 output DRIFTED in ${drifts.length} place(s) — the live course changed:`);
  for (const d of drifts.slice(0, 40)) console.error('  ✗ ' + d);
  if (drifts.length > 40) console.error(`  … and ${drifts.length - 40} more`);
  console.error('If every drift is an INTENDED improvement, re-snapshot with --write and say so in the commit message.');
  process.exit(1);
}
console.log(`baseline: OK — A1 output identical to snapshot (${baseline.length} chapters)`);
