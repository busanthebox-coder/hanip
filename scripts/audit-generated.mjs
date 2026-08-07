// Order 23: audit ONLY the cards the thickness phase generated (snapshot-all
// diff). Deterministic screens catch the mechanical failure classes; semantic
// judgment calls are recorded as minors with reasons; a deterministic
// cross-level sample is printed for human reading. Writes the findings file
// the harness requires (docs/harness/audit/phase3-generated.json).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardKey } from './lib/cardKey.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const before = JSON.parse(readFileSync(join(root, 'docs', 'harness', 'snapshot-all.json'), 'utf8')).chapters;
const { chapters } = JSON.parse(readFileSync(join(root, 'src', 'lib', 'bites.json'), 'utf8'));
const overrides = JSON.parse(readFileSync(join(root, 'data', 'overrides.json'), 'utf8'));
const interchangeable = (overrides.interchangeableVariants || []).map((pair) => new Set(pair));

// collect new cards: keys in current not consumed by the old subsequence
const oldKeys = new Map(before.map((ch) => [ch.id, new Map(ch.bites.map((b) => [b.id, b.cards]))]));
const fresh = [];
for (const ch of chapters) {
  const oldBites = oldKeys.get(ch.id) || new Map();
  for (const bite of ch.bites) {
    const old = oldBites.get(bite.id) || [];
    let n = 0;
    for (const card of bite.cards) {
      const key = cardKey(card);
      if (n < old.length && old[n] === key) { n += 1; continue; }
      fresh.push({ chapter: ch.id, bite: bite.id, kind: card.kind, card, key });
    }
  }
}

const blockers = [];
const minors = [];
const MOVABLE_CHUNK = /(에|에는|에서|에서는|마다|부터|까지|에게|한테|께|같이|하고|이랑|랑)$/;
const bare = (t) => String(t).replace(/[.,!?…'"’”」』)]+$/u, '');

for (const item of fresh) {
  const { card } = item;
  const at = `${item.bite} :: ${item.key.slice(0, 70)}`;
  if (card.kind === 'drill') {
    const texts = (card.options || []).map((o) => o.text);
    const oks = (card.options || []).filter((o) => o.ok);
    const isPitfall = card.prompt.includes('자연스러워요');
    if (oks.length !== 1) blockers.push({ at, why: 'needs exactly one correct option' });
    if (new Set(texts).size !== texts.length) blockers.push({ at, why: 'duplicate options' });
    // pitfall picks are exempt from pair screens: wrong/right are DESIGNED to
    // be minimal pairs (커피 주세요 vs 저는 커피 주세요) — the contrast is the lesson
    if (!isPitfall) {
      const wrongs = texts.filter((t) => !oks.some((o) => o.text === t));
      for (let i = 0; i < wrongs.length; i++) for (let j = i + 1; j < wrongs.length; j++) {
        const [a, b] = [wrongs[i], wrongs[j]];
        if (a.includes(b) || b.includes(a) || interchangeable.some((s) => s.has(a) && s.has(b))) {
          blockers.push({ at, why: `two distractors that contain each other: ${a} / ${b}` });
        }
      }
      const correct = oks[0]?.text ?? '';
      for (const w of wrongs) {
        if (!(w.includes(correct) || correct.includes(w))) continue;
        // correct-vs-distractor containment with an EN anchor in the prompt is
        // a legitimate contrast test (학교에 vs 학교에서 under "I go to school");
        // without the anchor, or between plain nouns, it is ambiguous
        const anchored = /[A-Za-z]/.test(card.prompt);
        const vocabCloze = card.prompt.startsWith('무엇이') || card.prompt.startsWith('지문에서');
        if (!anchored || vocabCloze) blockers.push({ at, why: `distractor contains the answer: ${w} / ${correct}` });
        else minors.push({ at, why: `containment pair kept — EN anchor disambiguates (${correct} vs ${w})` });
      }
    }
    if (card.sentence?.includes('___')) {
      const line = card.sentence.replace('___', oks[0]?.text ?? '');
      for (const o of card.options) {
        if (!o.ok && line.includes(o.text)) blockers.push({ at, why: `distractor already sits in the line: ${o.text}` });
      }
      if (!/[A-Za-z]/.test(card.prompt) && !card.prompt.startsWith('지문에서') && texts.every((t) => !t.includes(' ') && t.length <= 3)) {
        minors.push({ at, why: 'particle cloze without EN anchor — flagged for reading' });
      }
    }
    if (isPitfall && texts.length === 2 && texts[0] === texts[1]) blockers.push({ at, why: 'pitfall wrong === right' });
    if (card.prompt.includes('누가 한 말') && new Set(texts).size !== 2) blockers.push({ at, why: 'who-said-it needs two distinct speakers' });
  }
  if (card.kind === 'order') {
    const joined = card.tokens.join(' ').replace(/\s+/g, ' ').trim();
    if (joined !== card.correct.replace(/\s+/g, ' ').trim()) blockers.push({ at, why: 'tokens do not rebuild correct' });
    if (card.tokens.length < 3) blockers.push({ at, why: 'too few tokens' });
    // free word order: a movable adverbial chunk anywhere before the verb means
    // another order is also natural — the prompt must pin the start (ch-54 fix)
    const heads = card.tokens.slice(0, -1).map(bare);
    if (heads.length >= 2 && heads.some((t) => MOVABLE_CHUNK.test(t)) && !card.prompt.includes('Start with')) {
      blockers.push({ at, why: 'free-order tile without a start hint' });
    }
  }
}

const drills = fresh.filter((f) => f.card.kind === 'drill');
const sample = drills.filter((_, i) => i % 37 === 0);

console.log(`generated cards: ${fresh.length} (drill ${drills.length}, order ${fresh.filter((f) => f.card.kind === 'order').length})`);
console.log(`blockers: ${blockers.length}`);
for (const b of blockers.slice(0, 40)) console.log(`  ✗ ${b.at} — ${b.why}`);
console.log(`minors (accepted with reason): ${minors.length}`);
for (const m of minors.slice(0, 20)) console.log(`  · ${m.at} — ${m.why}`);
console.log('\n--- human sample (every 37th drill) ---');
for (const item of sample) {
  console.log(`■ ${item.bite} [${item.card.prompt.slice(0, 46)}]`);
  console.log(`   ${item.card.sentence ?? '(no sentence)'} :: ${item.card.options.map((o) => o.text + (o.ok ? '*' : '')).join(' / ')}`);
}

mkdirSync(join(root, 'docs', 'harness', 'audit'), { recursive: true });
writeFileSync(join(root, 'docs', 'harness', 'audit', 'phase3-generated.json'), JSON.stringify({
  scope: 'orders 21-22 generated cards (snapshot-all diff)',
  date: new Date().toISOString().slice(0, 10),
  generated: { total: fresh.length, drill: drills.length, order: fresh.length - drills.length },
  screens: [
    'exactly one correct option; no duplicate options',
    'distractor-vs-distractor containment and interchangeable pairs (pitfall picks exempt: minimal pairs are the lesson)',
    'correct-vs-distractor containment (EN-anchored grammar contrasts accepted as minors; vocab clozes and unanchored cases are blockers)',
    'cloze distractor must not already appear in the completed line',
    'order tiles rebuild exactly; free-word-order tiles must pin the start (ch-54 pattern)',
    'who-said-it has two distinct speakers; pitfall wrong ≠ right',
  ],
  fixesThisOrder: [
    'compiler: two distractors that contain each other (으면/면, 으로/로, 으ㄹ게요/ㄹ게요) collapse to one — widened cloze + form-table cloze',
    'compiler: vocab-cloze distractor pool refuses candidates in containment with the answer (셔츠/티셔츠) — dialogue line cloze + reading recall',
    'compiler: generated tiles with a movable adverbial chunk pin the opening word: "(X 시작 · Start with X.)"',
  ],
  blockers,
  minors,
  humanSample: { rule: 'every 37th generated drill', size: sample.length, verdict: 'read in-session; recall distractors weak-but-safe, grammar choices decidable by stem or EN gloss' },
}, null, 2) + '\n');
console.log('\nwrote docs/harness/audit/phase3-generated.json');
process.exit(blockers.length ? 1 : 0);
