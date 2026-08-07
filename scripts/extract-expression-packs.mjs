// Order 26 — situational expression packs.
//
// The parent's authoring shelf carries 889 whole expressions tagged by topic.
// This script lifts six situational packs out of them WITHOUT authoring a single
// Korean sentence: every hangul, english, romanization, example and nuance below
// is the parent's own text, only re-arranged into pack shape.
//
// Two source fields the order's spec expected turned out to be generator
// boilerplate, so this script does not rank on them (both verified on 2026-08-07):
//   * `level`   — literally 'A1' on all 889 entries (parent C0 audit found the bug).
//   * `learnerPriority` — a template, "Memorize {hangul} with one situation and one
//     follow-up phrase...", identical apart from the headword. It carries no order.
// The parent's own `sort` key does carry curriculum priority (transport opens with
// 길 좀 여쭤볼게요 / 여기 어떻게 가요? / 얼마나 걸려요?), so selection ranks on `sort`
// ascending and records that choice in the audit file.
//
// Selection is deterministic: same source in, same packs out. No Date, no random.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadExpressions } from './lib/parentData.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'data', 'expression-packs.json');
const auditFile = join(root, 'docs', 'harness', 'audit', 'pack-selection-26.json');
const legacyPacksFile = join(root, 'data', 'packs.json');
const wordbookFile = join(root, 'src', 'lib', 'wordbook.json');

const TARGET_CARDS = 14;   // the order allows 12–16; 14 is the mid-point
const MIN_CARDS = 12;

// afterChapter is measured against the shipped 65 chapters, not guessed:
//   23 asks the way and picks a transport method (지하철·버스·택시·출구)
//   40 closes the B1 office pair (39 deadline/야근 → 40 manager still in a meeting)
//   48 is the clinic-and-pharmacy chapter (증상·병원·약국) — the spec's "63과(병원)"
//      is chapter 63 in the parent's numbering; hanip's 63 is delivery notices
//   51 is the clothing-store chapter, 52 the restaurant-ordering chapter
//   58 opens B2 service-and-formality speech (확인·처리·도와드리다)
const PACKS = [
  {
    id: 'pack-transport',
    topic: 'transport',
    title: '교통 표현 · Getting Around',
    shortTitle: '교통 Transport',
    afterChapter: 23,
    goal: 'Ask the way, ride, transfer, and get off where you meant to.',
  },
  {
    id: 'pack-restaurant',
    topic: 'food',
    title: '식당·카페 주문 · Ordering Food & Drinks',
    shortTitle: '주문 Ordering',
    afterChapter: 52,
    goal: 'Order, pay, and answer the counter questions without switching to English.',
  },
  {
    id: 'pack-shopping',
    topic: 'shopping',
    title: '쇼핑 표현 · Shopping Talk',
    shortTitle: '쇼핑 Shopping',
    afterChapter: 51,
    goal: 'Pay, keep the receipt, and get a refund or exchange when something is wrong.',
  },
  {
    id: 'pack-clinic',
    topic: 'health',
    title: '병원·약국 · At the Clinic',
    shortTitle: '병원 Clinic',
    afterChapter: 48,
    goal: 'Say what hurts and follow what the clinic and pharmacy tell you.',
  },
  {
    id: 'pack-work',
    topic: 'work',
    title: '직장 표현 · Office Korean',
    shortTitle: '직장 Work',
    afterChapter: 40,
    goal: 'Write the mail, ask for the review, and settle a meeting time politely.',
  },
  {
    id: 'pack-admin',
    topic: 'admin',
    title: '은행·행정 · Bank & Paperwork',
    shortTitle: '행정 Admin',
    afterChapter: 58,
    goal: 'Open an account, move money, and handle the counter questions.',
  },
];

/* ---------------- what the course already teaches ---------------- */

const normalize = (text) => String(text).replace(/[.?!~…,]/g, '').trim();

const legacyPacks = JSON.parse(readFileSync(legacyPacksFile, 'utf8')).packs;
const wordbook = JSON.parse(readFileSync(wordbookFile, 'utf8')).words;
const existing = new Map();
for (const pack of legacyPacks) {
  for (const word of pack.words) if (!existing.has(normalize(word.hangul))) existing.set(normalize(word.hangul), 'snack-pack');
}
for (const word of wordbook) if (!existing.has(normalize(word.ko))) existing.set(normalize(word.ko), 'wordbook');
const existingHeads = [...existing.keys()];
// A headword that already teaches a whole chunk (감사합니다, 잘 모르겠어요). Re-teaching
// an expression that swallows one of those is the duplication the order guards against;
// swallowing a plain noun the wordbook happens to list (택시 inside 택시 좀 불러 주세요)
// is NOT — the wordbook teaches the word, the pack teaches the request.
const existingPhrases = existingHeads.filter((head) => head.includes(' ') || [...head].length >= 4);

/* ---------------- fair-distractor model (mirrors compiler guessOptions) ---------------- */

const contentWords = (text) => new Set(
  String(text).toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 2 && !['the', 'and', 'for', 'you', 'your'].includes(word))
);
function sharesContentWord(a, b) {
  const first = contentWords(a);
  for (const word of contentWords(b)) if (first.has(word)) return true;
  return false;
}
const fairPair = (a, b) => a !== b && a.english !== b.english && !sharesContentWord(a.english, b.english);

/* ---------------- selection ---------------- */

// The expression is the sentence. Prefer a parent example that literally contains
// it (so the guess card can highlight the whole phrase in context); fall back to
// a usage phrase, then to the first example.
function pickExample(entry) {
  const pools = [entry.examples || [], entry.usagePhrases || []];
  for (const pool of pools) {
    const anchored = pool.find((item) => item?.ko?.includes(entry.hangul) && item?.en);
    if (anchored) return anchored;
  }
  const first = (entry.examples || []).find((item) => item?.ko && item?.en);
  return first || null;
}

const { entries, file: sourceFile } = loadExpressions({ root, label: 'expression-packs' });
const excluded = [];
const packs = [];
const auditPacks = [];

for (const spec of PACKS) {
  const pool = entries
    .filter((entry) => (entry.topic || []).includes(spec.topic))
    .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));

  const drop = (entry, reason, detail) => {
    excluded.push({ packId: spec.id, topic: spec.topic, id: entry.id, hangul: entry.hangul, reason, ...(detail ? { detail } : {}) });
  };

  const candidates = [];
  const seenHangul = new Set();
  for (const entry of pool) {
    const head = normalize(entry.hangul);
    if (/[○◯●□*—]/.test(entry.hangul)) { drop(entry, 'placeholder-hangul'); continue; }
    // Two sentences in one headword (드시고 가세요? 가져가세요?) cannot be highlighted
    // whole: the parent's example writes them with a comma, so the guess card would
    // mark up half the phrase and ask for the meaning of the pair.
    if (/[?!.]\s*\S/.test(entry.hangul)) { drop(entry, 'multi-sentence-hangul'); continue; }
    if (seenHangul.has(head)) { drop(entry, 'duplicate-hangul-in-source'); continue; }
    seenHangul.add(head);
    if (existing.has(head)) { drop(entry, 'exact-duplicate', `${existing.get(head)}: ${head}`); continue; }
    const swallowedBy = existingHeads.find((other) => other !== head && [...other].length >= 2 && other.includes(head));
    if (swallowedBy) { drop(entry, 'inside-existing-headword', `${existing.get(swallowedBy)}: ${swallowedBy}`); continue; }
    const swallows = existingPhrases.find((phrase) => phrase !== head && head.includes(phrase));
    if (swallows) { drop(entry, 'contains-existing-phrase', `${existing.get(swallows)}: ${swallows}`); continue; }
    if (!pickExample(entry)) { drop(entry, 'no-example-sentence'); continue; }
    candidates.push(entry);
  }

  // Fill to quota, then repair: a card whose meaning overlaps every other member
  // of its pack cannot get two fair distractors, so it leaves and the next
  // candidate takes its place. Deterministic — the pool order never changes.
  let selected = [];
  let next = 0;
  const seenEnglish = new Set();
  const admit = () => {
    while (selected.length < TARGET_CARDS && next < candidates.length) {
      const entry = candidates[next++];
      if (seenEnglish.has(entry.english)) { drop(entry, 'duplicate-english-in-pack', entry.english); continue; }
      seenEnglish.add(entry.english);
      selected.push(entry);
      return true;
    }
    return false;
  };
  while (admit());
  for (let guard = 0; guard < candidates.length + TARGET_CARDS; guard += 1) {
    const weak = selected.filter((entry) => selected.filter((other) => fairPair(entry, other)).length < 2);
    if (!weak.length) break;
    const victim = weak.at(-1);
    selected = selected.filter((entry) => entry !== victim);
    seenEnglish.delete(victim.english);
    drop(victim, 'no-fair-distractors', victim.english);
    admit();
  }
  for (const entry of candidates.slice(next)) drop(entry, 'over-quota');

  if (selected.length < MIN_CARDS) {
    throw new Error(`expression-packs: ${spec.id} only found ${selected.length} usable expressions (minimum ${MIN_CARDS})`);
  }

  const words = selected.map((entry) => {
    const example = pickExample(entry);
    return {
      sourceId: entry.id,
      hangul: entry.hangul,
      english: entry.english,
      romanization: entry.romanization || '',
      partOfSpeech: entry.partOfSpeech || 'expression',
      nuance: entry.nuance || entry.shortExplanation || '',
      example: example ? { ko: example.ko, en: example.en, romanization: example.romanization || '' } : null,
    };
  });

  packs.push({
    id: spec.id,
    topic: spec.topic,
    title: spec.title,
    shortTitle: spec.shortTitle,
    afterChapter: spec.afterChapter,
    order: legacyPacks.length + packs.length + 1,
    goal: spec.goal,
    context: selected[0].contextHint || '',
    words,
  });
  auditPacks.push({
    id: spec.id,
    topic: spec.topic,
    title: spec.title,
    afterChapter: spec.afterChapter,
    pool: pool.length,
    selectedCount: selected.length,
    selected: selected.map((entry) => ({ id: entry.id, hangul: entry.hangul, english: entry.english })),
  });
  console.log(`expression-packs: ${spec.id} — ${selected.length} of ${pool.length} ${spec.topic} expressions (${pool.length - selected.length} excluded)`);
}

const excludedByReason = {};
for (const item of excluded) excludedByReason[item.reason] = (excludedByReason[item.reason] || 0) + 1;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({
  generatedFrom: `${sourceFile.split('/').slice(-3).join('/')} — ${entries.length} expressions`,
  selected: packs.reduce((total, pack) => total + pack.words.length, 0),
  packs,
}, null, 1));

mkdirSync(dirname(auditFile), { recursive: true });
writeFileSync(auditFile, JSON.stringify({
  order: 26,
  scope: 'situational expression packs lifted from the parent expressions corpus',
  source: { file: 'korean-core-starter/korean/data/expressions.json', entries: entries.length },
  ranking: 'parent `sort` ascending',
  rankingNote: '`learnerPriority` is generator boilerplate ("Memorize {hangul} with one situation…") on all 889 entries and `level` is \'A1\' on all of them, so neither can rank. The parent\'s own `sort` key does order each topic by teaching priority and is used instead.',
  existingHeadwords: {
    snackPackWords: new Set(legacyPacks.flatMap((pack) => pack.words.map((word) => normalize(word.hangul)))).size,
    wordbookWords: new Set(wordbook.map((word) => normalize(word.ko))).size,
    merged: existing.size,
  },
  exclusionRules: {
    'placeholder-hangul': 'headword carries a ○ placeholder or is a two-turn Q—A pair',
    'duplicate-hangul-in-source': 'the same expression appears twice in the topic (parent duplication)',
    'exact-duplicate': 'headword already taught by a snack pack or the wordbook',
    'inside-existing-headword': 'an existing headword literally contains this expression',
    'contains-existing-phrase': 'this expression swallows an existing phrase headword (감사합니다 → 정말 감사합니다)',
    'no-example-sentence': 'parent entry ships no usable example',
    'duplicate-english-in-pack': 'another selected expression already answers with this meaning',
    'no-fair-distractors': 'meaning overlaps every other pack member, so the card cannot get two fair distractors',
    'over-quota': 'passes every rule but ranks below the pack quota',
  },
  packs: auditPacks,
  excludedByReason,
  excluded,
}, null, 1) + '\n');

console.log(`expression-packs: wrote ${packs.length} packs / ${packs.reduce((n, pack) => n + pack.words.length, 0)} expressions, excluded ${excluded.length}`);
