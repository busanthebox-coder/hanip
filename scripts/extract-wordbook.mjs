// Rebuilds src/lib/wordbook.json from two sources:
//   1. the chapter files (which words this course actually teaches, in order)
//   2. the parent course's dictionary export (the nuance layer: why this word,
//      how it differs from its neighbours, what learners get wrong, every form)
//
// The chapter files carry a word's *place in the course*; the dictionary carries
// its *depth*. Neither alone is enough for a wordbook you can actually study
// from, so this joins them on 한글 and keeps the depth fields verbatim.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chaptersDir = join(root, 'data', 'chapters');
const outFile = join(root, 'src', 'lib', 'wordbook.json');

// The parent course is a sibling checkout; when it's absent we still emit a
// valid (shallow) wordbook rather than failing the build.
const PARENT = join(root, '..', 'korean-core-starter', 'public', 'data');
const hasParent = existsSync(PARENT);

/* ---------- load the dictionary ---------- */

function loadDictionary() {
  if (!hasParent) return { byHangul: new Map(), clusters: [] };
  const byHangul = new Map();
  let clusters = [];
  for (const file of readdirSync(PARENT)) {
    if (!file.startsWith('app-') || file.includes('index') || file.includes('manifest')) continue;
    const json = JSON.parse(readFileSync(join(PARENT, file), 'utf8'));
    if (Array.isArray(json.expressionClusters)) clusters = json.expressionClusters;
    const lists = Array.isArray(json) ? [json] : Object.values(json);
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const entry of list) {
        if (!entry || typeof entry !== 'object' || !entry.hangul) continue;
        // richer entry wins when the same 한글 appears twice
        const prev = byHangul.get(entry.hangul);
        if (!prev || score(entry) > score(prev)) byHangul.set(entry.hangul, entry);
      }
    }
  }
  return { byHangul, clusters };
}

const DEPTH_FIELDS = ['nuance', 'explanation', 'commonMistakes', 'conjugationTips', 'usagePhrases', 'examples', 'forms'];
const score = (e) => DEPTH_FIELDS.filter((f) => {
  const v = e[f];
  return Array.isArray(v) ? v.length : v && Object.keys(v).length !== 0;
}).length;

// 이거 / 이것 → try each half; 시간이 있다 → try the head noun and the verb
function lookupKeys(ko) {
  const keys = [ko];
  for (const part of ko.split('/').map((s) => s.trim())) if (part) keys.push(part);
  const words = ko.split(/\s+/);
  if (words.length > 1) {
    keys.push(words.at(-1));                                  // 시간이 있다 → 있다
    keys.push(words[0].replace(/[은는이가을를]$/u, ''));        // 시간이 있다 → 시간
  }
  return [...new Set(keys.filter(Boolean))];
}

/* ---------- build ---------- */

const { byHangul, clusters } = loadDictionary();

// cluster lookup: 한글 → the cluster it belongs to, with its siblings
const clusterOf = new Map();
for (const cluster of clusters) {
  for (const member of cluster.members || []) {
    if (!member.hangul || clusterOf.has(member.hangul)) continue;
    clusterOf.set(member.hangul, {
      title: cluster.title,
      rule: cluster.rule,
      members: (cluster.members || []).map((m) => ({
        ko: m.hangul,
        en: m.entryEnglish || '',
        romanization: m.entryRomanization || '',
        when: m.when || '',
        hint: m.hint || '',
        example: m.example || null,
        self: m.hangul === member.hangul,
      })),
    });
  }
}

const trim = (v) => (typeof v === 'string' ? v.trim() : v);
const arr = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

const words = [];
const seen = new Set();
const files = readdirSync(chaptersDir).filter((f) => f.endsWith('.json')).sort();

for (const [index, file] of files.entries()) {
  const chapter = JSON.parse(readFileSync(join(chaptersDir, file), 'utf8'));
  for (const w of chapter.extendedVocabulary || []) {
    const key = `${w.hangul}::${index + 1}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let entry = null;
    for (const k of lookupKeys(w.hangul)) {
      if (byHangul.has(k)) { entry = byHangul.get(k); break; }
    }
    const cluster = lookupKeys(w.hangul).map((k) => clusterOf.get(k)).find(Boolean) || null;

    words.push({
      ko: w.hangul,
      romanization: w.romanization,
      en: w.english,
      pos: w.partOfSpeech,
      chapter: index + 1,
      ex: w.exampleSentence ? { ko: w.exampleSentence.ko, en: w.exampleSentence.en, note: w.exampleSentence.note || '' } : null,
      collocations: arr(w.collocations),
      // depth layer — present only when the dictionary knows this word
      nuance: trim(entry?.nuance) || '',
      explanation: trim(entry?.explanation) || '',
      shortExplanation: trim(entry?.shortExplanation) || '',
      commonMistakes: arr(entry?.commonMistakes),
      conjugationTips: arr(entry?.conjugationTips).map((t) => ({ title: t.title || '', body: t.body || '' })),
      usagePhrases: arr(entry?.usagePhrases).map((p) => ({ ko: p.ko, romanization: p.romanization || '', en: p.en || '', note: p.note || '' })),
      examples: arr(entry?.examples).map((x) => ({ ko: x.ko, romanization: x.romanization || '', en: x.en || '', note: x.note || '' })),
      forms: entry?.forms && Object.keys(entry.forms).length ? entry.forms : null,
      irregular: entry?.irregular || null,
      level: entry?.level || '',
      cluster,
    });
  }
}

writeFileSync(outFile, JSON.stringify({ words }, null, 1));

const withDepth = words.filter((w) => w.nuance || w.explanation).length;
const withCluster = words.filter((w) => w.cluster).length;
const withForms = words.filter((w) => w.forms).length;
console.log(
  `wordbook: ${words.length} words · ${withDepth} with nuance/explanation · ${withForms} with conjugation forms · ${withCluster} in a contrast set` +
  (hasParent ? '' : ' (parent dictionary not found — shallow build)')
);
