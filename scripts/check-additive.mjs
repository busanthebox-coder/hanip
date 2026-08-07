// Additive-only guard for the thickness phase (orders 20-23).
//
// Phase 1's content audit produced 232 findings about the cards AS THEY EXIST.
// Adding new cards keeps those conclusions valid; editing or silently dropping
// an existing card invalidates them. So this gate proves the old card sequence
// is still a SUBSEQUENCE of the new one: new cards may be inserted anywhere,
// but every previously-audited card must still be there, in order, unchanged.
//
//   node scripts/check-additive.mjs          compare against snapshot-all.json
//   node scripts/check-additive.mjs --diff   list the newly added cards instead
//
// Intended deletions (e.g. the order-22 duplicate orderWords removal) go in
// docs/harness/additive-exceptions.json and are excused by exact card key.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotChapters } from './lib/cardKey.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snapshotFile = join(root, 'docs', 'harness', 'snapshot-all.json');
const exceptionsFile = join(root, 'docs', 'harness', 'additive-exceptions.json');

if (!existsSync(snapshotFile)) {
  console.error('check-additive: docs/harness/snapshot-all.json missing — run `node scripts/baseline.mjs --all` on a known-good build first');
  process.exit(1);
}

const before = JSON.parse(readFileSync(snapshotFile, 'utf8')).chapters;
const after = snapshotChapters({ root });

// Exceptions are keyed "<biteId>#<cardKey>" so excusing a duplicate in one bite
// can't accidentally excuse the same key somewhere it should still exist.
const excused = new Map();
if (existsSync(exceptionsFile)) {
  const parsed = JSON.parse(readFileSync(exceptionsFile, 'utf8'));
  for (const item of parsed.removed || []) {
    if (!item.key || !item.reason) {
      console.error(`check-additive: every exception needs a key and a reason — got ${JSON.stringify(item)}`);
      process.exit(1);
    }
    excused.set(item.key, item.reason);
  }
}

const usedExcuses = new Set();
const problems = [];

// Greedy subsequence walk: for each old card, advance through the new list
// until we find it. Anything we can't find was removed or edited.
function diffBite(biteId, oldCards, newCards) {
  const missing = [];
  const added = [];
  let n = 0;
  for (const oldKey of oldCards) {
    let found = -1;
    for (let probe = n; probe < newCards.length; probe++) {
      if (newCards[probe] === oldKey) { found = probe; break; }
    }
    if (found === -1) {
      missing.push(oldKey);
    } else {
      for (let insert = n; insert < found; insert++) added.push(newCards[insert]);
      n = found + 1;
    }
  }
  for (let tail = n; tail < newCards.length; tail++) added.push(newCards[tail]);
  return { missing, added };
}

const chaptersAfter = new Map(after.map((ch) => [ch.id, ch]));
let addedTotal = 0;
const addedList = [];

for (const oldCh of before) {
  const newCh = chaptersAfter.get(oldCh.id);
  if (!newCh) { problems.push(`${oldCh.id}: chapter disappeared`); continue; }
  const bitesAfter = new Map(newCh.bites.map((b) => [b.id, b]));
  for (const oldBite of oldCh.bites) {
    const newBite = bitesAfter.get(oldBite.id);
    if (!newBite) { problems.push(`${oldBite.id}: bite disappeared`); continue; }
    const { missing, added } = diffBite(oldBite.id, oldBite.cards, newBite.cards);
    for (const key of missing) {
      const excuseKey = `${oldBite.id}#${key}`;
      if (excused.has(excuseKey)) { usedExcuses.add(excuseKey); continue; }
      problems.push(`${oldBite.id}: card removed or edited — ${key}`);
    }
    addedTotal += added.length;
    for (const key of added) addedList.push(`${oldBite.id}\t${key}`);
  }
  // bites that did not exist before are pure additions
  for (const newBite of newCh.bites) {
    if (!oldCh.bites.some((b) => b.id === newBite.id)) {
      addedTotal += newBite.cards.length;
      for (const key of newBite.cards) addedList.push(`${newBite.id}\t${key}`);
    }
  }
}

if (process.argv.includes('--diff')) {
  // Feed for order 23's audit of newly generated cards only.
  for (const line of addedList) console.log(line);
  console.error(`check-additive --diff: ${addedTotal} new card(s)`);
  process.exit(0);
}

const staleExcuses = [...excused.keys()].filter((key) => !usedExcuses.has(key));
for (const key of staleExcuses) problems.push(`stale exception (card is still present, remove the entry): ${key}`);

if (problems.length) {
  console.error(`check-additive: ${problems.length} violation(s) of additive-only:`);
  for (const p of problems.slice(0, 40)) console.error('  ✗ ' + p);
  if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`);
  console.error('Existing cards carry phase-1 audit conclusions. Add cards freely; to remove one,');
  console.error('register it in docs/harness/additive-exceptions.json with a reason.');
  process.exit(1);
}

console.log(`check-additive: OK — every previously-audited card intact, ${addedTotal} card(s) added, ${usedExcuses.size} excused removal(s)`);
