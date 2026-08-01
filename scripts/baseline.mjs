// A1 no-regression gate. The 11 shipped A1 chapters are LIVE — any change to
// the compiler (new title parsers, new conjugation rules for later levels)
// must leave their compiled output structurally identical.
//
//   node scripts/baseline.mjs --write   snapshot current A1 output as the baseline
//   node scripts/baseline.mjs           compare current output against it (exit 1 on drift)
//
// The snapshot is structural (bite/card/kind/hunt counts + per-card kind+key
// sequence), not byte-for-byte, so cosmetic JSON reordering can't false-alarm
// while any real change to what a learner sees still trips it.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bitesFile = join(root, 'src', 'lib', 'bites.json');
const baselineFile = join(root, 'docs', 'harness', 'baseline-a1.json');

const A1 = new Set(Array.from({ length: 11 }, (_, i) => `chapter-${String(i + 1).padStart(2, '0')}`));

function cardKey(card) {
  switch (card.kind) {
    case 'guess': return `guess:${card.word.ko}:${card.target ?? ''}:${card.options.join('|')}`;
    case 'hunt': return `hunt:${card.name}:${card.lines.map((l) => l.tokens.filter((t) => t.hit).map((t) => t.mid).join(',')).join(';')}`;
    case 'teach': return `teach:${card.name}:${(card.examples || []).length}ex`;
    case 'drill': return `drill:${card.prompt}:${card.options.map((o) => o.text + (o.ok ? '*' : '')).join('|')}`;
    case 'order': return `order:${card.correct}`;
    case 'chat': return `chat:${card.lines.length}`;
    case 'read': return `read:${card.chunks.length}:${card.qas.length}qa`;
    case 'payoff': return `payoff:${card.hl}:${card.line.ko}`;
    default: return card.kind;
  }
}

function snapshot() {
  const { chapters } = JSON.parse(readFileSync(bitesFile, 'utf8'));
  const a1 = chapters.filter((ch) => A1.has(ch.id));
  if (a1.length !== 11) throw new Error(`expected 11 A1 chapters in bites.json, found ${a1.length}`);
  return a1.map((ch) => ({
    id: ch.id,
    biteCount: ch.biteCount,
    bites: ch.bites.map((b) => ({ id: b.id, kind: b.kind, title: b.title, cards: b.cards.map(cardKey) })),
  }));
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
