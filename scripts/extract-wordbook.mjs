// Rebuilds the eager wordbook list and the lazy detail payload from:
//   1. chapter vocabulary (course placement and course examples)
//   2. the parent course dictionary (nuance, forms, mistakes, and clusters)
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chapterLevel } from '../src/lib/levels.js';
import { DEPTH_FIELDS, depthScore, loadDictionary } from './lib/parentData.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chaptersDir = join(root, 'data', 'chapters');
const listFile = join(root, 'src', 'lib', 'wordbook.json');
const depthFile = join(root, 'src', 'lib', 'wordbook-depth.json');
const clustersFile = join(root, 'src', 'lib', 'clusters.json');
const shardsDir = join(root, 'src', 'lib', 'wordbook-depth');
const SHARD_GZIP_MAX = 210_000;
function lookupKeys(ko) {
  const keys = [ko];
  for (const part of ko.split('/').map((value) => value.trim())) if (part) keys.push(part);
  const words = ko.split(/\s+/);
  if (words.length > 1) {
    keys.push(words.at(-1));
    keys.push(words[0].replace(/[은는이가을를]$/u, ''));
  }
  return [...new Set(keys.filter(Boolean))];
}

const trim = (value) => (typeof value === 'string' ? value.trim() : value);
const arr = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const { byHangul, clusters } = loadDictionary({ root, label: 'wordbook' });

const normalizedClusters = clusters.map((cluster) => ({
  title: cluster.title,
  rule: cluster.rule,
  members: (cluster.members || []).map((candidate) => ({
    ko: candidate.hangul,
    en: candidate.entryEnglish || '',
    romanization: candidate.entryRomanization || '',
    when: candidate.when || '',
    hint: candidate.hint || '',
    example: candidate.example || null,
  })),
}));
const clusterOf = new Map();
for (const cluster of normalizedClusters) {
  for (const member of cluster.members) {
    if (!member.ko || clusterOf.has(member.ko)) continue;
    clusterOf.set(member.ko, {
      title: cluster.title,
      rule: cluster.rule,
      members: cluster.members.map((candidate) => ({ ...candidate, self: candidate.ko === member.ko })),
    });
  }
}

const grouped = new Map();
const files = readdirSync(chaptersDir).filter((file) => file.endsWith('.json')).sort();

for (const file of files) {
  const chapter = Number(file.match(/(\d+)/)?.[1]);
  if (!Number.isInteger(chapter)) throw new Error(`wordbook: cannot determine chapter number from ${file}`);
  const source = JSON.parse(readFileSync(join(chaptersDir, file), 'utf8'));

  for (const word of source.extendedVocabulary || []) {
    let entry = null;
    for (const key of lookupKeys(word.hangul)) {
      if (byHangul.has(key)) {
        entry = byHangul.get(key);
        break;
      }
    }
    const cluster = lookupKeys(word.hangul).map((key) => clusterOf.get(key)).find(Boolean) || null;
    const detail = {
      ko: word.hangul,
      romanization: word.romanization,
      en: word.english,
      pos: word.partOfSpeech,
      chapter,
      ex: word.exampleSentence
        ? { ko: word.exampleSentence.ko, en: word.exampleSentence.en, note: word.exampleSentence.note || '' }
        : null,
      collocations: arr(word.collocations),
      nuance: trim(entry?.nuance) || '',
      explanation: trim(entry?.explanation) || '',
      shortExplanation: trim(entry?.shortExplanation) || '',
      commonMistakes: arr(entry?.commonMistakes),
      conjugationTips: arr(entry?.conjugationTips).map((tip) => ({ title: tip.title || '', body: tip.body || '' })),
      usagePhrases: arr(entry?.usagePhrases).map((phrase) => ({
        ko: phrase.ko,
        romanization: phrase.romanization || '',
        en: phrase.en || '',
        note: phrase.note || '',
      })),
      examples: arr(entry?.examples).map((example) => ({
        ko: example.ko,
        romanization: example.romanization || '',
        en: example.en || '',
        note: example.note || '',
      })),
      forms: entry?.forms && Object.keys(entry.forms).length ? entry.forms : null,
      irregular: entry?.irregular || null,
      level: entry?.level || chapterLevel(chapter),
      cluster,
    };

    const group = grouped.get(word.hangul) || { chapters: new Set(), candidates: [] };
    group.chapters.add(chapter);
    group.candidates.push(detail);
    grouped.set(word.hangul, group);
  }
}

const words = [];
const depth = {};
const detailByLevel = new Map();

for (const [ko, group] of grouped) {
  const chapters = [...group.chapters].sort((a, b) => a - b);
  const representative = group.candidates.reduce((best, candidate) =>
    depthScore(candidate) > depthScore(best) ? candidate : best
  );
  const chapter = chapters.join('·');
  const complete = { ...representative, chapter, chapters };
  const hasDepth = DEPTH_FIELDS.some((field) => field !== 'cluster' && field !== 'ex'
    && (Array.isArray(complete[field]) ? complete[field].length : complete[field]));

  const listWord = {
    ko,
    romanization: representative.romanization,
    en: representative.en,
    pos: representative.pos,
    chapter,
    chapters,
    depthShard: '',
    hasDepth: Boolean(hasDepth),
    hasCluster: Boolean(representative.cluster),
  };
  words.push(listWord);
  depth[ko] = complete;

  const level = chapterLevel(representative.chapter).toLowerCase();
  if (!detailByLevel.has(level)) detailByLevel.set(level, []);
  detailByLevel.get(level).push({ listWord, complete });
}

mkdirSync(dirname(listFile), { recursive: true });
mkdirSync(shardsDir, { recursive: true });
const listByKo = new Map(words.map((word) => [word.ko, word]));
for (const file of readdirSync(shardsDir)) {
  if (file.endsWith('.json')) unlinkSync(join(shardsDir, file));
}

let shardCount = 0;
for (const [level, details] of detailByLevel) {
  const chunks = [];
  let current = {};
  for (const { listWord, complete } of details) {
    const candidate = { ...current, [listWord.ko]: complete };
    if (Object.keys(current).length && gzipSync(JSON.stringify(candidate)).length > SHARD_GZIP_MAX) {
      chunks.push(current);
      current = { [listWord.ko]: complete };
    } else {
      current = candidate;
    }
  }
  if (Object.keys(current).length) chunks.push(current);

  for (const [index, entries] of chunks.entries()) {
    const name = chunks.length === 1 ? level : `${level}-${index + 1}`;
    if (gzipSync(JSON.stringify(entries)).length > SHARD_GZIP_MAX) {
      throw new Error(`wordbook: ${name}.json cannot fit the depth shard budget`);
    }
    for (const ko of Object.keys(entries)) listByKo.get(ko).depthShard = name;
    writeFileSync(join(shardsDir, `${name}.json`), JSON.stringify(entries, null, 1));
    shardCount += 1;
  }
}
writeFileSync(listFile, JSON.stringify({ words }, null, 1));
writeFileSync(depthFile, JSON.stringify(depth, null, 1));
writeFileSync(clustersFile, JSON.stringify({ clusters: normalizedClusters }, null, 1));

const withDepth = words.filter((word) => word.hasDepth).length;
const withCluster = words.filter((word) => word.hasCluster).length;
console.log(
  `wordbook: ${words.length} unique words from ${files.length} chapters · ${withDepth} with detail · `
  + `${withCluster} in a contrast set · ${shardCount} lazy depth shards`,
);
