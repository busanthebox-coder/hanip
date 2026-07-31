// 한입 bite compiler — turns a fixed chapter JSON (unchanged content) into
// small tap-only rounds. Nothing is authored here: every card is a reordering
// or a cloze of sentences that already exist in the chapter data.

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
  const groups = head.split(/\s+vs\.?\s+|\s*&\s*/i);
  const out = new Set();
  const structural = /[/\-+&(]|(^|\s)[NVA][-가-힣(]|\svs\.?\s/u;
  for (const rawGroup of groups) {
    // a bare Korean word with no morpheme markup ("자음", "덕분에") is a topic
    // name, not a pattern — emitting it would make the hunt highlight a noun
    if (!structural.test(rawGroup) && !structural.test(head)) continue;
    const group = rawGroup
      .replace(/(^|\s)[NVA](?=[-가-힣(])/gu, '$1') // pos markers: N을 → 을, V아 → 아
      .replace(/^-\s*/, '')
      .replace(/[+a-zA-Z?.!]+/g, ' ')             // "안 + verb" → "안"
      .replace(/\s+/g, ' ')
      .trim();
    if (!group) continue;
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

// Find the best variant occurrence in a sentence. Spaceless variants must sit
// at the END of a word token (Korean particles/endings are suffixal) or be a
// standalone token (안). Longest variant wins so 에서 beats 에.
export function findPattern(ko, variants) {
  const sorted = [...variants].sort((a, b) => b.length - a.length);
  for (const variant of sorted) {
    if (variant.includes(' ')) {
      const at = ko.indexOf(variant);
      if (at >= 0) return { variant, start: at, end: at + variant.length };
    } else {
      const tokens = tokenize(ko);
      for (const tok of tokens) {
        const core = tok.text.replace(/[.,!?…"']+$/u, '');
        if (core === variant || (core.endsWith(variant) && core.length > variant.length)) {
          const start = tok.start + core.length - variant.length;
          return { variant, start, end: start + variant.length };
        }
      }
    }
  }
  return null;
}

function tokenize(ko) {
  const tokens = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(ko))) tokens.push({ text: m[0], start: m.index });
  return tokens;
}

// Split a sentence into tappable tokens, marking the ones covering the match.
export function huntTokens(ko, match) {
  return tokenize(ko).map((tok) => {
    const tokEnd = tok.start + tok.text.length;
    const hit = match && tok.start < match.end && tokEnd > match.start;
    let pre = tok.text, mid = '', post = '';
    if (hit) {
      const from = Math.max(match.start - tok.start, 0);
      const to = Math.min(match.end - tok.start, tok.text.length);
      pre = tok.text.slice(0, from);
      mid = tok.text.slice(from, to);
      post = tok.text.slice(to);
    }
    return { pre, mid, post, hit: !!hit };
  });
}

/* ---------------- word bites ---------------- */

function stemOf(word) {
  const ko = word.hangul || '';
  const pos = String(word.partOfSpeech || '').toLowerCase();
  if ((pos.startsWith('verb') || pos.startsWith('adj')) && ko.endsWith('다')) return ko.slice(0, -1);
  return ko;
}

// Does this dialogue line visibly contain the word? Multi-char stems match as
// substrings. A 1-char stem (먹-, 가-) only counts followed by a conjugation
// opener, so 오다's 오 can never claim 오늘. Returns the matched span to
// highlight, or null.
const CONJ_OPENERS = ['아', '어', '여', '으', '고', '지', '면', '세', '요', '습', '을', '는'];
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

function guessOptions(word, pool) {
  const same = pool.filter((w) => w !== word && w.partOfSpeech === word.partOfSpeech && w.english !== word.english);
  const rest = pool.filter((w) => w !== word && w.english !== word.english && !same.includes(w));
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

export function buildWordBites(chapter) {
  const words = chapter.extendedVocabulary || [];
  if (!words.length) return [];
  const biteCount = Math.min(MAX_WORD_BITES, Math.ceil(words.length / WORDS_PER_BITE));
  const per = Math.ceil(words.length / biteCount);
  const dialogueLines = chapter.extendedDialogue?.lines || [];
  const bites = [];
  for (let b = 0; b < biteCount; b++) {
    const chunk = words.slice(b * per, (b + 1) * per);
    if (!chunk.length) break;
    const cards = chunk.map((w) => ({
      kind: 'guess',
      word: { ko: w.hangul, romanization: w.romanization, en: w.english, pos: w.partOfSpeech },
      sentence: w.exampleSentence ? { ko: w.exampleSentence.ko, en: w.exampleSentence.en } : null,
      target: w.exampleSentence ? stemOf(w) : null,
      options: guessOptions(w, words),
      note: w.exampleSentence?.note || '',
    }));
    // payoff: the first dialogue line that contains one of this bite's words
    outer: for (const line of dialogueLines) {
      for (const w of chunk) {
        const hl = stemMatchIn(line.ko, w);
        if (hl) {
          cards.push({ kind: 'payoff', line: { speaker: line.speaker, ko: line.ko, en: line.en || '' }, hl });
          break outer;
        }
      }
    }
    bites.push({ kind: 'words', title: `단어 ${b + 1} · ${chunk[0].hangul}부터`, cards });
  }
  return bites;
}

/* ---------------- pattern bites ---------------- */

export function buildPatternBites(chapter) {
  return (chapter.grammarNotes || []).map((note) => {
    const variants = expandVariants(note.title);
    const examples = note.examples || [];
    const hits = examples
      .map((ex) => ({ ex, match: findPattern(ex.ko, variants) }))
      .filter((h) => h.match);
    const name = note.title.split('—')[0].trim();
    const sub = note.title.includes('—') ? note.title.split('—').slice(1).join('—').trim() : '';
    const more = { func: note.func || '', keyPoint: note.keyPoint || null, pronunciation: note.pronunciation || '' };
    const rows = (note.formTable || []).map((r) => ({ when: r.when, add: r.add, ex: r.ex || '' }));
    const cards = [];

    if (variants.length && hits.length >= 2) {
      // the two hunt lines should CONTRAST when the rule alternates (one 을,
      // one 를) — pick the first hit of each distinct variant before repeats
      const byVariant = [];
      const seen = new Set();
      for (const h of hits) if (!seen.has(h.match.variant)) { seen.add(h.match.variant); byVariant.push(h); }
      for (const h of hits) if (!byVariant.includes(h)) byVariant.push(h);
      const huntPair = byVariant.slice(0, 2);
      cards.push({
        kind: 'hunt',
        name, sub,
        lines: huntPair.map((h) => ({
          tokens: huntTokens(h.ex.ko, h.match),
          ko: h.ex.ko, en: h.ex.en || '', romanization: h.ex.romanization || '',
        })),
        rule: { name, rows },
        more,
      });
      // drill: cloze an example the learner hasn't just tapped
      const spare = hits.find((h) => !huntPair.includes(h));
      const optionSet = [...new Set(hits.map((h) => h.match.variant))];
      if (spare && optionSet.length >= 2) {
        const cloze = spare.ex.ko.slice(0, spare.match.start) + '___' + spare.ex.ko.slice(spare.match.end);
        cards.push({
          kind: 'drill',
          prompt: spare.ex.en ? `${spare.ex.en}` : '빈칸에 들어갈 무늬는?',
          sentence: cloze,
          options: optionSet.slice(0, 3).map((v) => ({ text: v, ok: v === spare.match.variant })),
          explanation: spare.ex.note || '',
        });
      }
    } else {
      // no clean morpheme (e.g. the Hangul chapter) — teach card, still one screen
      cards.push({
        kind: 'teach',
        name, sub, rows,
        examples: examples.slice(0, 2).map((ex) => ({ ko: ex.ko, en: ex.en || '', romanization: ex.romanization || '', note: ex.note || '' })),
        more,
      });
    }
    return { kind: 'pattern', title: `무늬 · ${name}`, cards };
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
  return { kind: 'dialogue', title: '대화 · 진짜 한국어', cards };
}

export function buildReadingBite(chapter) {
  const rt = chapter.readingText;
  if (!rt || !rt.body) return null;
  const sentences = rt.body.match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) || [rt.body];
  const half = Math.ceil(sentences.length / 2);
  const cards = [{
    kind: 'read',
    title: rt.title || '읽기',
    chunks: [sentences.slice(0, half).join(' '), sentences.slice(half).join(' ')].filter(Boolean),
    translation: rt.bodyTranslation || '',
    qas: (rt.comprehensionQuestions || []).map((q) => ({ q: q.question, a: q.answer })),
  }];
  return { kind: 'reading', title: '읽기 · ' + (rt.title || ''), cards };
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
  return { kind: 'boss', title: '보스 한입 · 다 걸어요', cards };
}

/* ---------------- chapter assembly ---------------- */

export function compileChapter(chapter, number) {
  const wordBites = buildWordBites(chapter);
  const patternBites = buildPatternBites(chapter);
  // interleave: words1, pattern1, words2, pattern2, …
  const woven = [];
  const max = Math.max(wordBites.length, patternBites.length);
  for (let i = 0; i < max; i++) {
    if (wordBites[i]) woven.push(wordBites[i]);
    if (patternBites[i]) woven.push(patternBites[i]);
  }
  const bites = [...woven, buildDialogueBite(chapter), buildReadingBite(chapter), buildBossBite(chapter)].filter(Boolean);
  const canDo = chapter.canDo || [];
  bites.forEach((bite, i) => {
    bite.id = `${chapter.id}-b${i + 1}`;
    bite.chapterId = chapter.id;
    bite.index = i;
    bite.canDo = canDo.length ? canDo[i % canDo.length] : '';
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
