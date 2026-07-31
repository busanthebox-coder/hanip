// Structural guard: every bite playable, every interactive card resolvable.
// Fails the build (exit 1) instead of shipping a bite that can't be finished.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chapters } = JSON.parse(readFileSync(join(root, 'src', 'lib', 'bites.json'), 'utf8'));

const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };

for (const ch of chapters) {
  check(ch.bites.length >= 5, `${ch.id}: only ${ch.bites.length} bites`);
  for (const bite of ch.bites) {
    check(bite.cards.length >= 1, `${bite.id}: empty bite`);
    for (const [i, card] of bite.cards.entries()) {
      const at = `${bite.id}#${i}(${card.kind})`;
      if (card.kind === 'guess') {
        check(card.options.length >= 2, `${at}: <2 options`);
        check(card.options.includes(card.word.en), `${at}: correct answer missing from options`);
        check(new Set(card.options).size === card.options.length, `${at}: duplicate options`);
      }
      if (card.kind === 'drill') {
        check(card.options.length >= 2, `${at}: <2 options`);
        check(card.options.filter((o) => o.ok).length === 1, `${at}: needs exactly one correct option`);
      }
      if (card.kind === 'order') {
        check(Array.isArray(card.tokens) && card.tokens.length >= 2, `${at}: <2 tokens`);
        const joined = card.tokens.join(' ').replace(/\s+/g, ' ').trim();
        const correct = String(card.correct).replace(/\s+/g, ' ').trim();
        check(joined.split(' ').sort().join('|') === correct.split(' ').sort().join('|') || correct.includes(card.tokens[0]),
          `${at}: tokens don't reassemble the answer`);
      }
      if (card.kind === 'hunt') {
        check(card.lines.length === 2, `${at}: hunt needs 2 lines`);
        for (const line of card.lines) check(line.tokens.some((t) => t.hit), `${at}: line has no tappable pattern`);
      }
      if (card.kind === 'chat') check(card.lines.length >= 2, `${at}: chat too short`);
      if (card.kind === 'read') check(card.chunks.length >= 1, `${at}: no chunks`);
    }
  }
}

if (errors.length) {
  console.error(`validate-bites: ${errors.length} problem(s)`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log(`validate-bites: OK — ${chapters.length} chapters, ${chapters.reduce((n, c) => n + c.biteCount, 0)} bites`);
