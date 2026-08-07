// 한입 bite compiler — turns a fixed chapter JSON (unchanged content) into
// small tap-only rounds. Nothing is authored here: every card is a reordering
// or a cloze of sentences that already exist in the chapter data.
import { chapterLevel } from '../../src/lib/levels.js';

const WORDS_PER_BITE = 6;
const MAX_WORD_BITES = 3;

/* ---------------- pattern extraction ---------------- */

// "N을/를 — the object particle" → ["을", "를"]
// "V-아/어야 해요" → ["아야 해요", "어야 해요"]
// "N이에요/예요" → ["이에요", "예요"]   (whole-segment split)
// "(으)로 — by / with" → ["으로", "로"]
// Titles with no extractable Korean morpheme (e.g. the Hangul chapter) return [].
//
// A slash in a grammar title means one of two things and the title alone can't
// say which: whole alternatives (이에요/예요, 부터/까지) or a single alternating
// syllable with a shared tail (아/어야 해요). We generate candidates from BOTH
// readings; downstream verification against the note's own examples discards
// whichever reading produced strings that never occur.
export function expandVariants(title) {
  let head = String(title || '').split('—')[0].trim();
  head = head.replace(/\([A-Za-z][^)]*\)/g, '').trim(); // "(Consonants)" etc.
  if (!/[가-힣]/.test(head)) return [];
  const groups = head.split(/\s+vs\.?\s+|\s*&\s*|\s*…\s*/i);
  const out = new Set();
  const structural = /[/\-+&(]|(^|\s)[NVA](?:[-가-힣(]|\s+[가-힣])|\svs\.?\s/u;
  for (const rawGroup of groups) {
    // a bare Korean word with no morpheme markup ("자음", "덕분에") is a topic
    // name, not a pattern — emitting it would make the hunt highlight a noun
    if (!structural.test(rawGroup) && !structural.test(head)) continue;
    const group = rawGroup
      .replace(/(^|\s)[NVA](?=[-가-힣(]|\s+[가-힣])/gu, '$1') // pos markers: N을/N 동안 → 을/동안
      .replace(/^-\s*/, '')
      .replace(/[+a-zA-Z?.!,:;"'“”‘’]+/g, ' ')    // "안 + verb" → "안"
      .replace(/\s+/g, ' ')
      .trim();
    if (!group) continue;
    if (group.endsWith('하다')) out.add(group.slice(0, -2).trim());
    if (group.endsWith('같다')) {
      const visible = group.slice(0, -1).trim();
      const words = visible.split(/\s+/);
      out.add(words.length > 2 ? words.slice(1).join(' ') : visible);
    }
    // Nested endings share the tail after the slash: (으)ㄴ/는데도 means
    // 은데도, ㄴ데도, or 는데도, rather than the unrelated pieces 으ㄴ/ㄴ.
    const nested = group.match(/\(으\)([ㄱ-ㅎ])\/([가-힣])([가-힣]+)/u);
    if (nested) {
      const [, final, second, tail] = nested;
      out.add(composeSyl('ㅇ', 'ㅡ', final) + tail);
      out.add(final + tail);
      out.add(second + tail);
    }
    // A) whole-segment split — drop bare 1-syllable segments unless ALL are
    //    1-syllable (은/는), so "-고 / -(으)면" can't emit a false-hit-prone 고
    const segs = group.split('/').map((s) => s.trim().replace(/^-\s*/, '')).filter(Boolean);
    const allShort = segs.every((s) => stripParens(s).length <= 1);
    for (const seg of segs) {
      if (stripParens(seg).length >= 2 || allShort) {
        for (const v of expandOptional(seg)) out.add(v);
      }
    }
    // B) single-syllable alternation with shared tail (아/어야 해요)
    for (const alt of syllableAlternates(group)) {
      for (const v of expandOptional(alt)) {
        out.add(v);
        // conjugation fuses the alternating syllable into the stem (하+아→해),
        // so "아 주세요" never appears literally in 말해 주세요 — the shared
        // multi-char tail ("주세요") is the reliably visible part
        const spaceAt = v.indexOf(' ');
        if (spaceAt > 0 && v.length - spaceAt - 1 >= 2) out.add(v.slice(spaceAt + 1));
      }
    }
  }
  return [...out]
    .map((v) => v.replace(/^-\s*/, '').replace(/[?.!]+$/, '').trim())
    .filter((v) => /[가-힣]/.test(v));
}

function stripParens(text) {
  return text.replace(/\([^)]*\)/g, '').trim();
}

// "아/어야 해요" → ["아야 해요","어야 해요"] — the slash alternates ONE syllable,
// the tail is shared. Returns [] when the group has no adjacent-syllable slash.
function syllableAlternates(text) {
  const m = text.trim().match(/^(.*?)([가-힣])\/([가-힣])(.*)$/u);
  if (!m) return [];
  const [, pre, a, b, post] = m;
  const tails = syllableAlternates(post || '');
  const out = [];
  for (const tail of tails.length ? tails : [post || '']) {
    out.push(`${pre}${a}${tail}`);
    out.push(`${pre}${b}${tail}`);
  }
  // Past markers fuse into the preceding stem (하다 → 했-, 보다 → 봤-), so
  // their shared remainder is the stable surface learners can actually tap.
  if ((a === '았' && b === '었') || (a === '었' && b === '았')) out.push(post || '');
  return out;
}

// "(으)로" → ["으로","로"]; "(으)ㄹ 수 있어요" → ["으ㄹ 수 있어요","ㄹ 수 있어요"] —
// the ㄹ-fused forms won't match sentences, so we also emit the bare tail
// after the first space ("수 있어요"), which does.
function expandOptional(text) {
  const t = text.trim();
  const out = new Set();
  if (t.includes('(')) {
    out.add(t.replace(/\(([^)]*)\)/g, '$1'));
    out.add(t.replace(/\([^)]*\)\s*/g, ''));
  } else {
    out.add(t);
  }
  for (const v of [...out]) {
    if (/[ㄱ-ㅎ]/.test(v) && v.includes(' ')) out.add(v.slice(v.indexOf(' ') + 1));
  }
  return [...out].filter(Boolean);
}

// Find EVERY variant occurrence in a sentence. Spaceless variants must sit
// at the END of a word token (Korean particles/endings are suffixal) or be a
// standalone token (안). Longest variant wins at any given position, so 에서
// beats 에 and a sentence with two 까지 gets both marked — a learner tapping
// the second instance must not be told they're wrong.
export function findAllPatterns(ko, variants) {
  const matches = [];
  const add = (m) => {
    if (!matches.some((x) => x.start < m.end && m.start < x.end)) matches.push(m);
  };
  const sorted = [...variants].sort((a, b) => b.length - a.length);
  for (const variant of sorted) {
    if (variant.includes(' ')) {
      let from = 0, at;
      while ((at = ko.indexOf(variant, from)) >= 0) {
        add({ variant, start: at, end: at + variant.length });
        from = at + 1;
      }
    } else {
      for (const tok of tokenize(ko)) {
        const core = tok.text.replace(/[.,!?…"']+$/u, '');
        // The V-게 ending is productive, but the identical final syllable in
        // the dative particle 에게 is unrelated (학생들에게 is not a V-게 hit).
        if (variant === '게' && core.endsWith('에게')) continue;
        // One-syllable particles/endings cannot stand as their own eojeol.
        // Keep the two productive negative adverbs as the deliberate exception.
        if (variant.length === 1 && core === variant && !['안', '못'].includes(variant)) continue;
        if (core === variant || (core.endsWith(variant) && core.length > variant.length)) {
          const start = tok.start + core.length - variant.length;
          add({ variant, start, end: start + variant.length });
        }
      }
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

export function findPattern(ko, variants) {
  return findAllPatterns(ko, variants)[0] || null;
}

function tokenize(ko) {
  const tokens = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(ko))) tokens.push({ text: m[0], start: m.index });
  return tokens;
}

// Split a sentence into tappable tokens, marking every token covering ANY of
// the matches (a line can contain the pattern twice — both must be tappable).
export function huntTokens(ko, matches) {
  const list = Array.isArray(matches) ? matches : matches ? [matches] : [];
  return tokenize(ko).map((tok) => {
    const tokEnd = tok.start + tok.text.length;
    const match = list.find((m) => tok.start < m.end && tokEnd > m.start);
    let pre = tok.text, mid = '', post = '';
    if (match) {
      const from = Math.max(match.start - tok.start, 0);
      const to = Math.min(match.end - tok.start, tok.text.length);
      pre = tok.text.slice(0, from);
      mid = tok.text.slice(from, to);
      post = tok.text.slice(to);
    }
    return { pre, mid, post, hit: !!match };
  });
}

/* ---------------- hangul jamo helpers ---------------- */

const L_LIST = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
const V_LIST = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
const T_LIST = ['', ...'ㄱㄲ', 'ㄳ', ...'ㄴ', 'ㄵ', 'ㄶ', ...'ㄷㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', ...'ㅁㅂ', 'ㅄ', ...'ㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];

function decomposeSyl(ch) {
  const code = ch.codePointAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  const T = code % 28;
  const V = ((code - T) / 28) % 21;
  const L = Math.floor((code - T) / 28 / 21);
  return { L: L_LIST[L], V: V_LIST[V], T: T_LIST[T] };
}
function composeSyl(L, V, T = '') {
  return String.fromCodePoint(0xac00 + (L_LIST.indexOf(L) * 21 + V_LIST.indexOf(V)) * 28 + T_LIST.indexOf(T));
}

/* ---------------- word bites ---------------- */

function stemOf(word) {
  const ko = word.hangul || '';
  const pos = String(word.partOfSpeech || '').toLowerCase();
  if ((pos.startsWith('verb') || pos.startsWith('adj')) && ko.endsWith('다')) return ko.slice(0, -1);
  return ko;
}

// The span of the sentence to highlight as "this word". Conjugation fuses
// stems (오+아→와요, 공부하+어→공부해요, 기다리+ㄹ게요→기다릴게요, ㅂ-irregular
// 반갑+어→반가워요), so a plain indexOf on the stem misses — or worse, hits the
// wrong word (오다's 오 inside 오늘). Try the fused forms, longest first;
// return null when the word genuinely isn't in the sentence.
const V_FUSE = { 'ㅣ': 'ㅕ', 'ㅗ': 'ㅘ', 'ㅚ': 'ㅙ', 'ㅜ': 'ㅝ', 'ㅡ': 'ㅓ' };
const H_FUSE = { 'ㅏ': 'ㅐ', 'ㅓ': 'ㅐ', 'ㅑ': 'ㅒ' };
const D_IRREGULAR_LEMMAS = new Set(['걷다', '듣다', '묻다']);
export function guessTarget(word, sentenceKo, { advanced = true } = {}) {
  const pos = String(word.partOfSpeech || '').toLowerCase();
  const conjugates = pos.startsWith('verb') || pos.startsWith('adj');
  // plain forms need ≥2 chars (a bare 오 would claim 오늘); fused products
  // (와, 올, 해) are distinctive conjugation syllables, allowed at 1 char
  const plain = new Set();
  const fused = new Set();
  const addFused = (form) => {
    if (!form) return;
    fused.add(form);
    const last = decomposeSyl(form.at(-1));
    if (advanced && last && !last.T) {
      fused.add(form.slice(0, -1) + composeSyl(last.L, last.V, 'ㅆ'));
    }
  };
  const addPast = (form) => {
    const last = decomposeSyl(form.at(-1));
    if (last && !last.T) fused.add(form.slice(0, -1) + composeSyl(last.L, last.V, 'ㅆ'));
  };
  for (const rawKo of String(word.hangul).split('/').map((s) => s.trim()).filter(Boolean)) {
    let stem = rawKo;
    if (conjugates && rawKo.endsWith('다')) stem = rawKo.slice(0, -1);
    if (advanced && conjugates && rawKo.length >= 2) plain.add(rawKo);
    if (stem.length >= 2) plain.add(stem);
    if (conjugates && rawKo.endsWith('하다')) {
      const nounBase = rawKo.slice(0, -2);
      if (nounBase.length >= 2) plain.add(nounBase);
    }
    if (!conjugates) {
      if (advanced) {
        for (const token of rawKo.split(/\s+/)) {
          if (token.length >= 2) plain.add(token);
        }
        if (rawKo.endsWith('이다')) {
          const noun = rawKo.slice(0, -2);
          for (const ending of ['이', '인', '일', '였']) addFused(noun + ending);
        }
        if (rawKo === '는지') {
          for (const form of ['인지', '은지', 'ㄴ지']) plain.add(form);
        }
        const pieces = rawKo.split(/\s+/);
        if (pieces.length > 1) {
          const tail = pieces.at(-1);
          const prefix = rawKo.slice(0, -tail.length);
          const tailMatch = guessTarget(
            { hangul: tail, partOfSpeech: 'verb' },
            sentenceKo,
            { advanced },
          );
          if (tailMatch && sentenceKo.includes(prefix + tailMatch)) {
            plain.add(prefix + tailMatch);
          }
        }
      }
      continue;
    }
    const base = stem.slice(0, -1);
    const d = decomposeSyl(stem.at(-1));
    if (!d) continue;
    if (!d.T) {
      if (advanced) addPast(stem);                             // 가→갔 without accepting bare 가
      if (V_FUSE[d.V] && (advanced || d.V !== 'ㅚ')) {
        addFused(base + composeSyl(d.L, V_FUSE[d.V]));
      }
      addFused(base + composeSyl(d.L, d.V, 'ㄹ'));             // future/promise 갈·올·릴
      if (advanced) addFused(base + composeSyl(d.L, d.V, 'ㄴ')); // modifier 간·본·큰
      if (stem.at(-1) === '하') {
        addFused(base + '해');
        if (advanced) addFused(base + '합');
      }
      if (advanced && stem.at(-1) === '르') {
        const before = decomposeSyl(base.at(-1));
        if (before) {
          const doubled = base.slice(0, -1) + composeSyl(before.L, before.V, 'ㄹ');
          addFused(doubled + (['ㅏ', 'ㅗ'].includes(before.V) ? '라' : '러'));
        }
      }
    } else if (d.T === 'ㅂ') {
      addFused(base + composeSyl(d.L, d.V) + '워');            // ㅂ-irregular 반가워·추웠
    } else if (advanced && d.T === 'ㄷ' && D_IRREGULAR_LEMMAS.has(rawKo)) {
      const irregular = base + composeSyl(d.L, d.V, 'ㄹ');
      addFused(irregular + '어');                              // 듣다→들어
      addFused(irregular + '은');                              // 듣다→들은
    } else if (advanced && d.T === 'ㅅ') {
      const irregular = base + composeSyl(d.L, d.V);
      addFused(irregular + (['ㅏ', 'ㅗ'].includes(d.V) ? '아' : '어'));
      addFused(irregular + '은');                              // 낫다→나은
    } else if (advanced && d.T === 'ㅎ' && H_FUSE[d.V]) {
      addFused(base + composeSyl(d.L, H_FUSE[d.V]));           // 그렇다→그래
    } else if (advanced) {
      addFused(stem + (['ㅏ', 'ㅗ'].includes(d.V) ? '아' : '어'));
    }
    if (advanced && d.T === 'ㄹ') {
      addFused(base + composeSyl(d.L, d.V) + '는');             // 만들다→만드는, 머물다→머무는
      addFused(base + composeSyl(d.L, d.V) + '세');             // 알다→아세요, 살다→사세요
    } else if (advanced && d.T) {
      addFused(stem + '은');                                   // 싫다→싫은
    }
    if (advanced && !d.T) {
      addFused(stem + '셔');                                   // 오다→오셔·오셨
    }
    if (stem.length === 1) for (const o of CONJ_OPENERS) plain.add(stem + o);
  }
  // a 1-char NOUN (집, 물) appears literally in its own example sentence and
  // can't be mistaken for a conjugation fragment — allow it; 1-char verb
  // stems stay excluded (오 must never claim 오늘)
  if (!conjugates) {
    const bare = String(word.hangul).trim();
    if (bare.length === 1) plain.add(bare);
  }
  const candidates = [...new Set([...plain, ...fused])]
    .filter((form) => fused.has(form) || form.length >= 2 || !conjugates)
    .map((form) => ({ form, at: sentenceKo.indexOf(form) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => b.form.length - a.form.length || a.at - b.at);
  return candidates[0]?.form || null;
}

// Does this dialogue line visibly contain the word? Multi-char stems match as
// substrings. A 1-char stem (먹-, 가-) only counts followed by a conjugation
// opener, so 오다's 오 can never claim 오늘. Returns the matched span to
// highlight, or null.
const CONJ_OPENERS = ['아', '어', '여', '으', '고', '지', '면', '세', '요', '습', '을', '는', '게', '기', '았', '었'];
function stemMatchIn(lineKo, word) {
  const stem = stemOf(word);
  if (stem.length >= 2) return lineKo.includes(stem) ? stem : null;
  if (!stem) return null;
  for (const opener of CONJ_OPENERS) {
    const candidate = stem + opener;
    if (lineKo.includes(candidate)) return candidate;
  }
  return null;
}

// A distractor that would ALSO be a fair answer teaches nothing. Two guards:
// shared content words (consonant ⊂ "final consonant …") and the audit-built
// ban list for semantically interchangeable pairs (천천히↔다시, 학생↔선생님…).
function sharesContentWord(a, b) {
  const words = (s) => new Set(
    String(s).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !['the', 'and', 'for', 'you', 'your'].includes(w))
  );
  const A = words(a);
  for (const w of words(b)) if (A.has(w)) return true;
  return false;
}

function guessOptions(word, pool, overrides = {}) {
  const bans = (overrides.guessDistractorBans || {})[word.hangul] || [];
  const banned = (en) =>
    sharesContentWord(en, word.english) ||
    bans.some((b) => en.toLowerCase().includes(b.toLowerCase()));
  const usable = pool.filter((w) => w !== word && w.english !== word.english && !banned(w.english));
  const same = usable.filter((w) => w.partOfSpeech === word.partOfSpeech);
  const rest = usable.filter((w) => !same.includes(w));
  const picks = [];
  const seen = new Set([word.english]);
  for (const cand of [...same, ...rest]) {
    if (picks.length >= 2) break;
    if (seen.has(cand.english)) continue;
    seen.add(cand.english);
    picks.push(cand.english);
  }
  // deterministic order: correct answer's slot varies by word length so it
  // isn't always first (no Date/random — compiler output must be stable)
  const options = [...picks];
  options.splice((word.hangul.length + word.english.length) % (picks.length + 1), 0, word.english);
  return options;
}

export function compileSnack(pack, overrides = {}) {
  const words = pack.words || [];
  const cards = words.map((word) => ({
    kind: 'guess',
    word: {
      ko: word.hangul,
      romanization: word.romanization,
      en: word.english,
      pos: word.partOfSpeech,
    },
    sentence: word.example ? { ko: word.example.ko, en: word.example.en } : null,
    target: word.example?.ko
      ? guessTarget(word, word.example.ko, { advanced: pack.afterChapter >= 12 })
      : null,
    options: guessOptions(word, words, overrides),
    note: '',
  }));
  return {
    id: `snack-${pack.id.replace(/^pack-/, '')}`,
    packId: pack.id,
    kind: 'snack',
    title: pack.title,
    shortTitle: pack.shortTitle,
    afterChapter: pack.afterChapter,
    level: chapterLevel(pack.afterChapter),
    canDo: pack.goal,
    index: 0,
    cardCount: cards.length,
    cards,
  };
}

export function buildWordBites(chapter, overrides = {}) {
  const words = chapter.extendedVocabulary || [];
  if (!words.length) return [];
  const biteCount = Math.min(MAX_WORD_BITES, Math.ceil(words.length / WORDS_PER_BITE));
  const per = Math.ceil(words.length / biteCount);
  const dialogueLines = chapter.extendedDialogue?.lines || [];
  const payoffBans = overrides.payoffBans || [];
  const chapterNumber = Number(String(chapter.id || '').match(/\d+/)?.[0]);
  const advancedTargets = Number.isFinite(chapterNumber) && chapterNumber >= 12;
  const bites = [];
  for (let b = 0; b < biteCount; b++) {
    const chunk = words.slice(b * per, (b + 1) * per);
    if (!chunk.length) break;
    const cards = chunk.map((w) => ({
      kind: 'guess',
      word: {
        ko: w.hangul,
        romanization: w.romanization,
        en: w.english,
        pos: w.partOfSpeech,
        ...(w.nuance ? { nuance: w.nuance } : {}),
      },
      sentence: w.exampleSentence ? { ko: w.exampleSentence.ko, en: w.exampleSentence.en } : null,
      target: w.exampleSentence ? guessTarget(w, w.exampleSentence.ko, { advanced: advancedTargets }) : null,
      options: guessOptions(w, words, overrides),
      note: w.exampleSentence?.note || '',
    }));
    // payoff: the first dialogue line that contains one of this bite's words
    outer: for (const line of dialogueLines) {
      for (const w of chunk) {
        if (payoffBans.some((ban) => ban.word === w.hangul && line.ko.includes(ban.contains))) continue;
        const hl = stemMatchIn(line.ko, w);
        if (hl) {
          cards.push({ kind: 'payoff', line: { speaker: line.speaker, ko: line.ko, en: line.en || '' }, hl });
          break outer;
        }
      }
    }
    bites.push({ kind: 'words', title: `단어 Words ${b + 1} · ${chunk[0].hangul}~`, cards });
  }
  return bites;
}

/* ---------------- pattern bites ---------------- */

// The first sentence of the note's concept paragraph — shown on the rule card
// by default (order 21: a two-word tag like "topic marker" can't carry the
// concept alone, and no beginner opens a disclosure they have no reason to).
function funcLeadOf(func) {
  const clean = String(func || '').trim();
  if (!clean) return '';
  const at = clean.search(/(?<=[.!?])\s/);
  const lead = at >= 0 ? clean.slice(0, at + 1).trim() : clean;
  return lead.length > 160 ? lead.slice(0, 159).trimEnd() + '…' : lead;
}

// "밥 → 밥을 (rice)" pairs from a formTable ex cell. Only pairs where the
// result literally extends the base (particle tables) decompose; fused
// conjugations (가다 → 가야 해요) don't and are skipped — composing those
// mechanically is how you teach a wrong form.
function suffixPairs(exCell) {
  const pairs = [];
  for (const piece of String(exCell || '').split('·')) {
    const m = piece.match(/(\S+)\s*→\s*([^(]+)/u);
    if (!m) continue;
    const base = m[1].trim();
    const result = m[2].split('/')[0].trim();
    if (result.startsWith(base) && result.length > base.length) {
      pairs.push({ base, suffix: result.slice(base.length).trim() || result.slice(base.length) });
    }
  }
  return pairs;
}

// Deterministic option placement, same trick guessOptions uses: the correct
// answer's slot varies with content so it isn't always first, and identical
// input always compiles to identical output.
function placeOptions(correct, distractors, seed) {
  const options = distractors.map((text) => ({ text, ok: false }));
  options.splice(seed % (options.length + 1), 0, { text: correct, ok: true });
  return options;
}

const normalizeOrderText = (text) => String(text).replace(/\s+/g, ' ').trim();

export function buildPatternBites(chapter, overrides = {}) {
  const exampleBans = overrides.huntExampleBans || [];
  const notes = chapter.grammarNotes || [];
  // sibling variants feed widened-cloze distractors when a note has one variant
  const variantsByNote = notes.map((note) => expandVariants(note.title));
  // the chapter's own orderWords must not be re-served as a grammar tile
  const chapterOrderCorrects = new Set(
    (chapter.inlineExercises || [])
      .filter((e) => e.type === 'orderWords')
      .map((e) => normalizeOrderText(e.correct))
  );
  return notes.map((note, noteIndex) => {
    const variants = variantsByNote[noteIndex];
    const examples = note.examples || [];
    const hits = examples
      .filter((ex) => !exampleBans.some((ban) => ex.ko.includes(ban)))
      .map((ex) => ({ ex, matches: findAllPatterns(ex.ko, variants), match: findPattern(ex.ko, variants) }))
      .filter((h) => h.match);
    const name = note.title.split('—')[0].trim();
    const sub = note.title.includes('—') ? note.title.split('—').slice(1).join('—').trim() : '';
    const more = {
      func: note.func || '',
      funcLead: funcLeadOf(note.func),
      keyPoint: note.keyPoint || null,
      pronunciation: note.pronunciation || '',
      ...(note.englishSpeakerPitfall ? { pitfall: note.englishSpeakerPitfall } : {}),
    };
    const rows = (note.formTable || []).map((r) => ({ when: r.when, add: r.add, ex: r.ex || '' }));
    const cards = [];

    let huntPair = [];
    let legacySpare = null;
    const hunted = variants.length && hits.length >= 2;
    if (hunted) {
      // the two hunt lines should CONTRAST when the rule alternates (one 을,
      // one 를) — pick the first hit of each distinct variant before repeats
      const byVariant = [];
      const seen = new Set();
      for (const h of hits) if (!seen.has(h.match.variant)) { seen.add(h.match.variant); byVariant.push(h); }
      for (const h of hits) if (!byVariant.includes(h)) byVariant.push(h);
      huntPair = byVariant.slice(0, 2);
      cards.push({
        kind: 'hunt',
        name, sub,
        lines: huntPair.map((h) => ({
          tokens: huntTokens(h.ex.ko, h.matches),
          ko: h.ex.ko, en: h.ex.en || '', romanization: h.ex.romanization || '',
        })),
        rule: { name, rows },
        more,
      });
      // drill: cloze an example the learner hasn't just tapped
      const spare = hits.find((h) => !huntPair.includes(h));
      const optionSet = [...new Set(hits.map((h) => h.match.variant))];
      const hasOptionalLongerVariant = optionSet.some((shorter) =>
        optionSet.some((longer) => longer !== shorter
          && (longer.startsWith(shorter)
            || (/^[았었]/u.test(longer) && longer.endsWith(shorter))))
      );
      if (spare && optionSet.length >= 2 && !hasOptionalLongerVariant) {
        legacySpare = spare;
        const cloze = spare.ex.ko.slice(0, spare.match.start) + '___' + spare.ex.ko.slice(spare.match.end);
        cards.push({
          kind: 'drill',
          prompt: spare.ex.en ? `${spare.ex.en}` : '빈칸에 들어갈 문법 형태는?',
          sentence: cloze,
          options: optionSet.slice(0, 3).map((v) => ({ text: v, ok: v === spare.match.variant })),
          explanation: spare.ex.note || '',
        });
      }
    } else {
      // no clean morpheme (e.g. the Hangul chapter) — teach card, still one
      // screen. With no form table the examples ARE the content, so show all.
      cards.push({
        kind: 'teach',
        name, sub, rows,
        examples: examples.slice(0, rows.length ? 2 : 4).map((ex) => ({ ko: ex.ko, en: ex.en || '', romanization: ex.romanization || '', note: ex.note || '' })),
        more,
      });
    }

    /* ---- order 21: the rule check must be followed by questions (2-4) ----
       Every generated question derives from material the note already carries
       (examples, formTable, pitfall) — no new Korean is ever authored. New
       cards are APPENDED so every pre-existing card key survives (additive). */
    const QUESTION_KINDS = new Set(['drill', 'order']);
    const questionCount = () => cards.filter((c) => QUESTION_KINDS.has(c.kind)).length;
    const room = () => questionCount() < 4;
    const seedOf = (text) => [...String(text)].reduce((sum, ch) => sum + ch.codePointAt(0), 0);

    // ① widened cloze — every unused example with a pattern hit becomes a
    // cloze; when the note has a single variant, distractors come from the
    // note's own table suffixes first, then (for short particles only)
    // sibling notes' variants. Guards, in audit order of importance:
    //   - a candidate appearing in the sentence would also fit → excluded
    //   - substring relations (기 위해 ⊂ 기 위해서) → excluded
    //   - pairs the audit ruled interchangeable (군요↔네요, 어 놓다↔어 두다)
    //     live in overrides.interchangeableVariants → excluded
    //   - sibling variants only distract SHORT SPACELESS particles; offering
    //     another note's ending against a spaced ending is either garbage or,
    //     worse, occasionally also correct
    const interchangeable = (overrides.interchangeableVariants || []).map((pair) => new Set(pair));
    const clash = (a, b) =>
      a === b || a.includes(b) || b.includes(a)
      || interchangeable.some((set) => set.has(a) && set.has(b));
    if (hunted) {
      const noteVariants = [...new Set(hits.map((h) => h.match.variant))];
      const tableSuffixes = rows.flatMap((r) => suffixPairs(r.ex).map((p) => p.suffix));
      const siblingVariants = variantsByNote.flatMap((vs, i) => (i === noteIndex ? [] : vs));
      for (const h of hits) {
        if (!room()) break;
        if (huntPair.includes(h) || h === legacySpare) continue;
        const correct = h.match.variant;
        const shortParticle = !correct.includes(' ') && correct.length <= 3;
        const pool = [...noteVariants, ...tableSuffixes, ...(shortParticle ? siblingVariants : [])];
        const distractors = [];
        for (const cand of pool) {
          if (distractors.length >= 2) break;
          if (distractors.includes(cand)) continue;
          if (h.ex.ko.includes(cand)) continue;
          if (clash(correct, cand)) continue;
          if (cand.includes(' ') !== correct.includes(' ')) continue;
          distractors.push(cand);
        }
        if (!distractors.length) continue;
        const cloze = h.ex.ko.slice(0, h.match.start) + '___' + h.ex.ko.slice(h.match.end);
        cards.push({
          kind: 'drill',
          prompt: h.ex.en ? h.ex.en : '빈칸에 들어갈 문법 형태는? · Which form completes it?',
          sentence: cloze,
          options: placeOptions(correct, distractors.slice(0, 2), seedOf(h.ex.ko)),
          explanation: h.ex.note || '',
        });
      }
    }

    // ② order tiles — rebuild a sentence the learner just hunted (or, on
    // teach bites, one of the note's own examples). 3-6 words, and never a
    // sentence the chapter already serves as its own orderWords exercise.
    const tileSources = hunted ? huntPair.map((h) => h.ex) : examples.slice(0, 2);
    const usedTileCorrects = new Set();
    for (const ex of tileSources) {
      if (!room()) break;
      if (ex.ko.includes('/')) continue; // syllable rows (가 / 고 / 구) aren't sentences
      const tokens = ex.ko.trim().split(/\s+/);
      if (tokens.length < 3 || tokens.length > 6) continue;
      const correct = ex.ko.trim();
      const normalized = normalizeOrderText(correct);
      if (chapterOrderCorrects.has(normalized) || usedTileCorrects.has(normalized)) continue;
      usedTileCorrects.add(normalized);
      cards.push({
        kind: 'order',
        prompt: ex.en
          ? `방금 본 문장을 다시 조립하세요 · Rebuild: "${ex.en}"`
          : '방금 본 문장을 다시 조립하세요 · Rebuild the sentence',
        tokens,
        correct,
        explanation: '',
      });
    }

    // ③ pitfall pick — the English-speaker trap the note already documents,
    // served as a two-way judgement. Ahead of the form-table cloze because
    // it's the most valuable question in the set and must not be crowded out
    // by the 4-question cap; it also works when nothing else does (the
    // Hangul chapter), which is exactly where the teach fallback lives.
    const pitfall = note.englishSpeakerPitfall;
    if (room() && pitfall?.wrong && pitfall?.right) {
      cards.push({
        kind: 'drill',
        prompt: '어느 쪽이 자연스러워요? · Which one is natural?',
        sentence: null,
        options: placeOptions(pitfall.right, [pitfall.wrong], seedOf(pitfall.wrong)),
        explanation: pitfall.explanation || '',
      });
    }

    // ④ form-table cloze — 밥 → 밥__? with the other rows' suffixes as
    // distractors. Only suffix-decomposable rows qualify (see suffixPairs),
    // and interchangeable pairs are excluded here too.
    const rowPairs = rows
      .map((r) => ({ row: r, pair: suffixPairs(r.ex)[0] }))
      .filter((entry) => entry.pair);
    if (rowPairs.length >= 2) {
      for (const { row, pair } of rowPairs.slice(0, 2)) {
        if (!room()) break;
        const distractors = rowPairs
          .filter((other) => other.pair.suffix !== pair.suffix && !clash(pair.suffix, other.pair.suffix))
          .map((other) => other.pair.suffix)
          .slice(0, 2);
        if (!distractors.length) continue;
        cards.push({
          kind: 'drill',
          prompt: `빈칸을 채우세요 · Complete the form — ${row.when}`,
          sentence: `${pair.base}___`,
          options: placeOptions(pair.suffix, distractors, seedOf(pair.base)),
          explanation: row.ex,
        });
      }
    }

    // ⑤ reading pick (teach fallback only) — the Hangul notes pair syllable
    // rows with romanization ("가 / 고 / 구" ↔ "ga / go / gu"); asking "how do
    // you read 가?" is derived entirely from that pairing.
    if (!hunted && rows.length === 0 && questionCount() < 2) {
      const readings = examples
        .map((ex) => ({
          syllables: String(ex.ko || '').split('/').map((s) => s.trim()).filter(Boolean),
          sounds: String(ex.romanization || '').split('/').map((s) => s.trim()).filter(Boolean),
        }))
        .filter((r) => r.syllables.length >= 2 && r.syllables.length === r.sounds.length);
      for (const [i, reading] of readings.entries()) {
        if (!room() || questionCount() >= 3) break;
        const correct = reading.sounds[0];
        const distractors = readings
          .filter((_, j) => j !== i)
          .map((other) => other.sounds[0])
          .filter((sound) => sound !== correct)
          .slice(0, 2);
        if (!distractors.length) continue;
        cards.push({
          kind: 'drill',
          prompt: '어떻게 읽어요? · How do you read it?',
          sentence: reading.syllables[0],
          options: placeOptions(correct, distractors, seedOf(reading.syllables[0])),
          explanation: `${reading.syllables.join(' / ')} = ${reading.sounds.join(' / ')}`,
        });
      }
    }

    return { kind: 'pattern', title: `문법 Grammar · ${name}`, cards };
  });
}

/* ---------------- dialogue / reading / boss ---------------- */

export function buildDialogueBite(chapter) {
  const lines = chapter.extendedDialogue?.lines || [];
  if (!lines.length) return null;
  const cards = [{
    kind: 'chat',
    setting: chapter.extendedDialogue.setting || '',
    lines: lines.map((l) => ({ speaker: l.speaker, ko: l.ko, en: l.en || '', romanization: l.romanization || '' })),
  }];
  const order = (chapter.inlineExercises || []).find((e) => e.type === 'orderWords');
  if (order) {
    cards.push({ kind: 'order', prompt: order.prompt, tokens: order.tokens, correct: order.correct, explanation: order.explanation || '' });
  }
  return { kind: 'dialogue', title: '대화 Dialogue · 진짜 한국어', cards };
}

export function buildReadingBite(chapter) {
  const rt = chapter.readingText;
  if (!rt || !rt.body) return null;
  const sentences = splitReadingSentences(rt.body);
  const half = Math.ceil(sentences.length / 2);
  const cards = [{
    kind: 'read',
    title: rt.title || '읽기',
    chunks: [sentences.slice(0, half).join(' '), sentences.slice(half).join(' ')].filter(Boolean),
    translation: rt.bodyTranslation || '',
    qas: (rt.comprehensionQuestions || []).map((q) => ({ q: q.question, a: q.answer })),
  }];
  return { kind: 'reading', title: '읽기 Reading · ' + (rt.title || ''), cards };
}

function splitReadingSentences(body) {
  const sentences = [];
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    if (!'.!?'.includes(body[i])) continue;
    let end = i + 1;
    while (/[”"']/.test(body[end] || '')) end += 1;
    if (end < body.length && !/\s/.test(body[end])) continue;
    const sentence = body.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    while (/\s/.test(body[end] || '')) end += 1;
    start = end;
    i = end - 1;
  }
  const tail = body.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences.length ? sentences : [body];
}

const BOSS_TYPES = new Set(['multipleChoice', 'particleChoice', 'orderWords']);

export function buildBossBite(chapter) {
  const items = (chapter.inlineExercises || []).filter((e) => BOSS_TYPES.has(e.type));
  if (!items.length) return null;
  const cards = items.map((ex) => {
    if (ex.type === 'orderWords') {
      return { kind: 'order', prompt: ex.prompt, tokens: ex.tokens, correct: ex.correct, explanation: ex.explanation || '' };
    }
    return {
      kind: 'drill',
      prompt: ex.prompt,
      sentence: null,
      options: (ex.options || []).map((opt) => ({ text: opt, ok: opt === ex.correct })),
      explanation: ex.explanation || '',
    };
  });
  return { kind: 'boss', title: '보스 Boss bite · 다 걸어요', cards };
}

/* ---------------- chapter assembly ---------------- */

export function compileChapter(chapter, number, overrides = {}) {
  const wordBites = buildWordBites(chapter, overrides);
  const patternBites = buildPatternBites(chapter, overrides);
  const canDo = chapter.canDo || [];
  // interleave: words1, pattern1, words2, pattern2, …
  const woven = [];
  const max = Math.max(wordBites.length, patternBites.length);
  for (let i = 0; i < max; i++) {
    const skill = canDo.length ? canDo[i % canDo.length] : '';
    if (wordBites[i]) woven.push({ ...wordBites[i], canDo: skill });
    if (patternBites[i]) woven.push({ ...patternBites[i], canDo: skill });
  }
  const tail = [buildDialogueBite(chapter), buildReadingBite(chapter), buildBossBite(chapter)]
    .filter(Boolean)
    .map((bite, i) => ({ ...bite, canDo: canDo.length ? canDo[i % canDo.length] : '' }));
  const bites = [...woven, ...tail];
  bites.forEach((bite, i) => {
    bite.id = `${chapter.id}-b${i + 1}`;
    bite.chapterId = chapter.id;
    bite.index = i;
  });
  return {
    id: chapter.id,
    number,
    title: chapter.hook?.situation ? chapterTitle(chapter) : chapter.id,
    goal: chapter.hook?.objectives?.[0] || '',
    biteCount: bites.length,
    bites,
  };
}

function chapterTitle(chapter) {
  // chapters don't carry a short title in the rich JSON; derive from grammar
  const names = (chapter.grammarNotes || []).map((n) => n.title.split('—')[0].trim()).slice(0, 2);
  return names.join(' · ') || chapter.id;
}
