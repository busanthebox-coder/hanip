// Learning-density gauge for the thickness phase. Orders 21-22 change these
// numbers; order 23 gates on them.
//
//   node scripts/report-density.mjs before     writes docs/harness/density-before.md
//
// "Content cards" here means the compiled cards in a bite — SRS warmups are
// added at play time and are deliberately not counted, because the complaint
// being measured is that the lesson itself is thin.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBites } from './lib/cardKey.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tag = process.argv[2] || 'now';
const { chapters } = readBites(root);

const median = (nums) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const avg = (nums) => (nums.length ? nums.reduce((t, n) => t + n, 0) / nums.length : 0);

const allBites = chapters.flatMap((ch) => ch.bites);
const byKind = new Map();
for (const bite of allBites) {
  if (!byKind.has(bite.kind)) byKind.set(bite.kind, []);
  byKind.get(bite.kind).push(bite.cards.length);
}

// A "question" is a card the learner must answer to advance.
const QUESTION_KINDS = new Set(['drill', 'order', 'guess']);
const grammar = { huntOnly: 0, huntQuestions: 0, teachOnly: 0, teachQuestions: 0, withTwoPlus: 0, withNone: 0, total: 0 };
const zeroQuestionBites = [];
for (const bite of allBites) {
  if (bite.kind !== 'pattern') continue;
  grammar.total += 1;
  const kinds = bite.cards.map((c) => c.kind);
  const questions = bite.cards.filter((c) => QUESTION_KINDS.has(c.kind)).length;
  const hunted = kinds.includes('hunt');
  if (hunted) questions ? (grammar.huntQuestions += 1) : (grammar.huntOnly += 1);
  else questions ? (grammar.teachQuestions += 1) : (grammar.teachOnly += 1);
  if (questions >= 2) grammar.withTwoPlus += 1;
  if (questions === 0) { grammar.withNone += 1; zeroQuestionBites.push(bite.id); }
}

// orderWords served twice: once in the dialogue bite, again in the boss bite.
let orderDupes = 0;
const dupeChapters = [];
for (const ch of chapters) {
  const inDialogue = ch.bites.filter((b) => b.kind === 'dialogue').flatMap((b) => b.cards).filter((c) => c.kind === 'order').map((c) => c.correct);
  const inBoss = new Set(ch.bites.filter((b) => b.kind === 'boss').flatMap((b) => b.cards).filter((c) => c.kind === 'order').map((c) => c.correct));
  const dupes = inDialogue.filter((correct) => inBoss.has(correct));
  if (dupes.length) { orderDupes += dupes.length; dupeChapters.push(ch.id); }
}

const sizes = allBites.map((b) => b.cards.length);
const oneCard = sizes.filter((n) => n === 1).length;
const twoOrFewer = sizes.filter((n) => n <= 2).length;

const lines = [];
const say = (text = '') => lines.push(text);

say(`# 학습 밀도 리포트 — \`${tag}\``);
say();
say(`총 ${chapters.length}챕터 · ${allBites.length}바이트 · ${sizes.reduce((t, n) => t + n, 0)}카드 (워밍업 제외)`);
say();
say('## 바이트 종류별 본편 카드 수');
say();
say('| 종류 | 개수 | 최소 | 중간값 | 평균 | 최대 |');
say('|---|---|---|---|---|---|');
for (const [kind, nums] of byKind) {
  say(`| ${kind} | ${nums.length} | ${Math.min(...nums)} | ${median(nums)} | ${avg(nums).toFixed(1)} | ${Math.max(...nums)} |`);
}
say();
say('## 전체 분포');
say();
say(`- 전체 중간값: **${median(sizes)}장** (목표 ≥5)`);
say(`- 본편 1장 바이트: **${oneCard}개** (목표 0)`);
say(`- 본편 2장 이하: ${twoOrFewer}개`);
say();
say('## 문법 바이트 구성');
say();
say(`총 ${grammar.total}개`);
say();
say('| 구성 | 개수 |');
say('|---|---|');
say(`| 헌트만 (문제 0) | ${grammar.huntOnly} |`);
say(`| 헌트 + 문제 | ${grammar.huntQuestions} |`);
say(`| 티치만 (문제 0) | ${grammar.teachOnly} |`);
say(`| 티치 + 문제 | ${grammar.teachQuestions} |`);
say();
const twoPlusPct = grammar.total ? ((grammar.withTwoPlus / grammar.total) * 100).toFixed(1) : '0.0';
say(`- **문제 ≥2 비율: ${twoPlusPct}%** (목표 100%)`);
say(`- 문제 0개 바이트: **${grammar.withNone}개** (목표 0)`);
if (zeroQuestionBites.length) {
  say();
  say('<details><summary>문제 0개 바이트 목록</summary>');
  say();
  say('```');
  for (const id of zeroQuestionBites) say(id);
  say('```');
  say('</details>');
}
say();
say('## 어순 이중 출제');
say();
say(`- 대화 ∩ 보스 중복: **${orderDupes}건** (목표 0), 해당 챕터 ${dupeChapters.length}개`);

const body = lines.join('\n') + '\n';
writeFileSync(join(root, 'docs', 'harness', `density-${tag}.md`), body);

console.log(`밀도 리포트 → docs/harness/density-${tag}.md`);
console.log(`  전체 중간값 ${median(sizes)}장 · 1장 바이트 ${oneCard}개`);
console.log(`  문법 문제 ≥2 비율 ${twoPlusPct}% · 문제 0개 ${grammar.withNone}개`);
console.log(`  어순 중복 ${orderDupes}건`);
