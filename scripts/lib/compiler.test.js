import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  expandVariants,
  findPattern,
  findAllPatterns,
  huntTokens,
  guessTarget,
  buildWordBites,
  buildPatternBites,
  buildDialogueBite,
  buildReadingBite,
  buildBossBite,
  compileChapter,
} from './compiler.mjs';
import { chapterLevel } from '../../src/lib/levels.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('compiled course data split', () => {
  it('partitions every compiled chapter at the level boundaries without changing card data', async () => {
    expect([1, 11, 12, 34, 35, 56, 57, 63, 64, 65].map(chapterLevel)).toEqual([
      'A1', 'A1', 'A2', 'A2', 'B1', 'B1', 'B2', 'B2', 'C1', 'C1',
    ]);

    const monolithic = JSON.parse(readFileSync(join(root, 'src', 'lib', 'bites.json'), 'utf8'));
    const index = JSON.parse(readFileSync(join(root, 'src', 'lib', 'bites-index.json'), 'utf8'));
    expect(index.chapters).toHaveLength(monolithic.chapters.length);
    for (const [i, chapter] of index.chapters.entries()) {
      expect(chapter.level).toBe(chapterLevel(chapter.number));
      expect(chapter.id).toBe(monolithic.chapters[i].id);
      expect(chapter).not.toHaveProperty('cards');
      expect(chapter.bites).toHaveLength(chapter.biteCount);
      for (const bite of chapter.bites) {
        expect(bite).not.toHaveProperty('cards');
        expect(bite.cardCount).toBeGreaterThan(0);
      }
    }

    // B1 ships split in two halves so no single lazy chunk exceeds the budget
    const chunkRules = {
      a1: (n) => chapterLevel(n) === 'A1',
      a2: (n) => chapterLevel(n) === 'A2',
      b1a: (n) => chapterLevel(n) === 'B1' && n <= 45,
      b1b: (n) => chapterLevel(n) === 'B1' && n > 45,
      b2c1: (n) => ['B2', 'C1'].includes(chapterLevel(n)),
    };
    const partition = [];
    for (const [chunkName, allowed] of Object.entries(chunkRules)) {
      const chunk = JSON.parse(readFileSync(join(root, 'src', 'lib', 'bites', `${chunkName}.json`), 'utf8'));
      expect(chunk.chapters.length).toBeGreaterThan(0);
      for (const chapter of chunk.chapters) {
        expect(allowed(chapter.number)).toBe(true);
        expect(chapter.bites.every((bite) => Array.isArray(bite.cards) && bite.cards.length > 0)).toBe(true);
      }
      partition.push(...chunk.chapters);
    }
    expect(partition).toEqual(monolithic.chapters);
    expect(new Set(partition.map((chapter) => chapter.id)).size).toBe(monolithic.chapters.length);

    const { loadChapterCards } = await import('../../src/lib/courseData.js');
    const [a1First, a1Again, a2First] = await Promise.all([
      loadChapterCards('chapter-01'),
      loadChapterCards('chapter-01'),
      loadChapterCards('chapter-12'),
    ]);
    expect(a1Again).toBe(a1First);
    expect(a1First[0].cards.length).toBe(index.chapters[0].bites[0].cardCount);
    expect(a2First[0].cards.length).toBe(index.chapters[11].bites[0].cardCount);
  });

  it('invalidates an older async selection when a newer one begins', async () => {
    const { createLatestRequest } = await import('../../src/lib/courseData.js');
    const beginRequest = createLatestRequest();
    const first = beginRequest();
    const second = beginRequest();

    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });
});

describe('guessTarget', () => {
  const w = (hangul, pos) => ({ hangul, partOfSpeech: pos, english: 'x' });
  it('matches fused vowel conjugations', () => {
    expect(guessTarget(w('오다', 'verb'), '오늘 친구가 집에 와요.')).toBe('와요'.slice(0, 1) === '와' ? '와' : null);
    expect(guessTarget(w('마시다', 'verb'), '물을 마셔요.')).toBe('마셔');
    expect(guessTarget(w('기다리다', 'verb'), '여기서 기다릴게요.')).toBe('기다릴');
    expect(guessTarget(w('걸리다', 'verb'), '한 시간쯤 걸려요.')).toBe('걸려');
  });
  it('never lets 오다 claim 오늘', () => {
    // 오늘 contains 오 but no conjugated form of 오다 — must return null, not 오
    expect(guessTarget(w('오다', 'verb'), '오늘 날씨가 좋아요.')).toBeNull();
  });
  it('handles 하다 contraction and ㅂ-irregular', () => {
    expect(guessTarget(w('공부하다', 'verb'), '도서관에서 공부해요.')).toBe('공부해');
    expect(guessTarget(w('반갑다', 'adjective'), '만나서 반가워요.')).toBe('반가워');
  });
  it('splits slashed headwords', () => {
    expect(guessTarget(w('이거 / 이것', 'pronoun'), '이것도 주세요.')).toBe('이것');
  });
  it('returns null when the word truly is not in the sentence', () => {
    expect(guessTarget(w('시간', 'noun'), '몇 시에 만나요?')).toBeNull();
  });
  it('matches the 르-irregular from chapter 26', () => {
    expect(guessTarget(w('모르다', 'verb'), '늦을지도 몰라요.')).toBe('몰라');
  });
  it('matches the ㄷ-irregular from chapter 21', () => {
    expect(guessTarget(w('듣다', 'verb'), '어제 들은 노래를 또 들어요.')).toBe('들은');
    expect(guessTarget(w('듣다', 'verb'), '노래를 다시 들어요.')).toBe('들어');
    expect(guessTarget(w('걷다', 'verb'), '역까지 걸어서 십 분 걸려요.')).toBe('걸어');
  });
  it('does not treat regular ㄷ verb 받다 as irregular', () => {
    expect(guessTarget(w('받다', 'verb'), '발은 아파요.')).toBeNull();
  });
  it('does not treat regular ㄷ verb 닫다 as irregular', () => {
    expect(guessTarget(w('닫다', 'verb'), '달은 밝아요.')).toBeNull();
  });
  it('matches the ㅅ-irregular from chapter 15', () => {
    expect(guessTarget(w('낫다', 'verb'), '내일은 오늘보다 나은 하루이길 바란다.')).toBe('나은');
  });
  it('matches the ㅎ-irregular from chapter 19', () => {
    expect(guessTarget(w('그렇다', 'adjective'), '왜 그래요?')).toBe('그래');
  });
  it('matches the past contraction for 가다 from chapter 17', () => {
    expect(guessTarget(w('가다', 'verb'), '지난주에 부산에 갔어요.')).toBe('갔');
  });
  it('matches the past contraction for 보다 from chapter 17', () => {
    expect(guessTarget(w('보다', 'verb'), '친구랑 영화를 봤어요.')).toBe('봤');
  });
  it('matches the past contraction for 하다 from chapter 17', () => {
    expect(guessTarget(w('하다', 'verb'), '어제 숙제를 했어요.')).toBe('했');
  });
  it('matches the past ㅂ-irregular from chapter 17', () => {
    expect(guessTarget(w('춥다', 'adjective'), '어제 정말 추웠어요.')).toBe('추웠');
  });
  it('matches ㄹ-stem modifiers before -는', () => {
    expect(guessTarget(w('만들다', 'verb'), '발표 자료를 만드는 중이에요.')).toBe('만드는');
    expect(guessTarget(w('살다', 'verb'), '한국에 사는 동안 친구를 만났어요.')).toBe('사는');
    expect(guessTarget(w('머물다', 'verb'), '한국에 머무는 동안 연습할 거예요.')).toBe('머무는');
  });
  it('matches a split 하다 noun and formal -ㅂ니다 fusion', () => {
    expect(guessTarget(w('준비하다', 'verb'), '방학 동안 취업 준비를 할 거예요.')).toBe('준비');
    expect(guessTarget(w('말하다', 'verb'), '격식 있는 자리에서는 천천히 말합니다.')).toBe('말합');
  });
  it('matches guarded one-syllable stems before 게, 기, and past 았/었', () => {
    expect(guessTarget(w('늘다', 'verb'), '한국어를 매일 쓰니까 실력이 늘었어요.')).toBe('늘었');
    expect(guessTarget(w('줄다', 'verb'), '운동을 시작하고 스트레스가 줄었어요.')).toBe('줄었');
    expect(guessTarget(w('살다', 'verb'), '회사 일 때문에 한국에 살게 됐어요.')).toBe('살게');
    expect(guessTarget(w('맡다', 'verb'), '새 일을 맡게 됐어요.')).toBe('맡게');
    expect(guessTarget(w('자다', 'verb'), '오늘부터 일찍 자기로 했어요.')).toBe('자기');
    expect(guessTarget(w('오다', 'verb'), '오늘 날씨가 좋아요.')).toBeNull();
  });
  it('matches a spaced compound verb', () => {
    expect(guessTarget(w('고장 나다', 'verb'), '버스가 고장 나는 바람에 오래 기다렸어요.')).toBe('고장 나');
  });
  it.each([
    ['말을 꺼내다', 'phrase', '자료가 늦어진 이야기는 제가 먼저 말을 꺼낼게요.', '말을 꺼낼'],
    ['알게 되다', 'phrase', '직접 가 보니까 왜 유명한지 알게 됐어요.', '알게 됐'],
    ['다고 했어요', 'reported-speech ending', '선생님이 금요일에 본다고 하셨어요.', '다고'],
    ['는지', 'embedded-question ending', '시험이 언제인지 알아요?', '인지'],
    ['라고 하다', 'reported-command ending', '선생님이 숙제를 제출하라고 하셨어요.', '라고 하셨'],
    ['수밖에 없다', 'bound expression', '마감이 오늘이라서 야근할 수밖에 없어요.', '수밖에 없어'],
    ['리가 없다', 'bound expression', '지금 포기할 리가 없어요.', '리가 없어'],
    ['뿐이다', 'bound expression', '남은 건 이 방법뿐이에요.', '뿐이'],
    ['묻다', 'verb', '모르면 선생님께 물어봐요.', '물어'],
    ['빨갛다', 'adjective', '얼굴이 빨개요.', '빨개'],
    ['파랗다', 'adjective', '오늘 하늘이 파래요.', '파래'],
    ['노랗다', 'adjective', '바나나가 노래요.', '노래'],
    ['알다', 'verb', '이 단어를 아세요?', '아세'],
    ['살다', 'verb', '어디 사세요?', '사세'],
    ['닫다', 'verb', '닫다는 [닫따]처럼 들려요.', '닫다'],
    ['좋다', 'adjective', '좋다는 [조타]처럼 들려요.', '좋다'],
    ['한국어를 잘 못해요', 'expression', '못해요는 [모태요]처럼 들려요.', '못해요'],
    ['싫다', 'adjective', '가기 싫은 건 아니에요.', '싫은'],
    ['오다', 'verb', '어머니께서 오셨어요.', '오셨'],
    ['포함되다', 'verb', '인터넷이 관리비에 포함돼 있어요.', '포함돼'],
  ])('highlights B1 surface form %s in its sentence', (hangul, pos, sentence, target) => {
    expect(guessTarget(w(hangul, pos), sentence)).toBe(target);
  });
  it('keeps B1-only surface expansions behind the advanced-target boundary', () => {
    expect(guessTarget(w('시간이 있다', 'phrase'), '시간이 있어요.', { advanced: false })).toBeNull();
    expect(guessTarget(w('먹을 수 있다', 'verb'), '김치를 먹을 수 있어요.', { advanced: false })).toBe('먹을 수 있');
    expect(guessTarget(w('괜찮다', 'adjective'), '매워도 괜찮아요.', { advanced: false })).toBe('괜찮');
  });
});

describe('findAllPatterns', () => {
  it('marks every instance, not just the first', () => {
    const matches = findAllPatterns('아홉 시부터 여섯 시까지 있어요. 학교까지 가요.', ['부터', '까지']);
    expect(matches.length).toBe(3);
    const tokens = huntTokens('여섯 시까지 있어요. 학교까지 가요.', findAllPatterns('여섯 시까지 있어요. 학교까지 가요.', ['까지']));
    expect(tokens.filter((t) => t.hit).length).toBe(2);
  });

  it('does not mistake the particle 에게 for the V-게 ending', () => {
    const sentence = '선생님이 학생들에게 책을 읽게 했어요.';
    const matches = findAllPatterns(sentence, ['게']);

    expect(matches.map((match) => sentence.slice(match.start, match.end))).toEqual(['게']);
    expect(huntTokens(sentence, matches).filter((token) => token.hit)).toHaveLength(1);
  });

  it('does not mistake standalone demonstrative 이 for the subject particle', () => {
    const sentence = '이 사람이 제 선생님이에요.';
    const matches = findAllPatterns(sentence, ['이']);

    expect(huntTokens(sentence, matches).filter((token) => token.hit).map((token) => token.mid))
      .toEqual(['이']);
  });
});

describe('expandVariants', () => {
  it('splits whole-segment particle pairs', () => {
    expect(expandVariants('N을/를 — the object particle')).toEqual(expect.arrayContaining(['을', '를']));
    expect(expandVariants('N이에요/예요 — polite "to be"')).toEqual(expect.arrayContaining(['이에요', '예요']));
    expect(expandVariants('N부터 / N까지 — from … to …')).toEqual(expect.arrayContaining(['부터', '까지']));
  });
  it('alternates single syllables with a shared tail', () => {
    expect(expandVariants('V-아/어야 해요')).toEqual(expect.arrayContaining(['아야 해요', '어야 해요']));
  });
  it('emits the shared tail for fused conjugations', () => {
    expect(expandVariants('V아/어 주세요 — asking someone')).toEqual(expect.arrayContaining(['주세요']));
  });
  it('strips latin and plus from mixed titles', () => {
    expect(expandVariants('안 + verb — the short negative')).toContain('안');
  });
  it('returns nothing for morpheme-free titles', () => {
    expect(expandVariants('자음 (Consonants) — Ten Core Shapes')).toEqual([]);
  });
  it('drops a lone single-syllable segment among longer ones', () => {
    const v = expandVariants('-고 / -(으)면 / -(으)ㄹ게요');
    expect(v).not.toContain('고');
  });
  it('expands the nested optional slash ending from chapter 25', () => {
    expect(expandVariants('A/V-(으)ㄴ/는데도 — even though, and still'))
      .toEqual(expect.arrayContaining(['은데도', 'ㄴ데도', '는데도']));
  });
  it('extracts single 잖아요 and 거든요 endings used in chapter 12', () => {
    expect(expandVariants('V/A-잖아요 / -거든요'))
      .toEqual(expect.arrayContaining(['잖아요', '거든요']));
  });
  it('treats 못 plus a verb like the existing 안 plus a verb shape', () => {
    expect(expandVariants('못 + verb')).toEqual(['못']);
    expect(findPattern('시간이 없어서 못 갔어요.', expandVariants('못 + verb')))
      .toMatchObject({ variant: '못' });
  });
  it('keeps discourse words in a slash pair whole', () => {
    expect(expandVariants('따라서 / 그러므로'))
      .toEqual(expect.arrayContaining(['따라서', '그러므로']));
  });
  it('keeps morphologically empty A2 headings on the teach fallback', () => {
    for (const title of ['Question words (누구, 뭐, 어디)', 'Choosing the style', 'Written endings', 'Boundary check']) {
      const [bite] = buildPatternBites({ grammarNotes: [{ title, formTable: [], examples: [{ ko: '실제 예문입니다.' }] }] });
      expect(bite.cards[0].kind).toBe('teach');
    }
  });
  it('extracts the noun connector 때문에 from chapter 30', () => {
    expect(expandVariants('N 때문에 — because of a noun')).toContain('때문에');
  });
  it('extracts the noun duration marker 동안 from chapter 31', () => {
    expect(expandVariants('N 동안 — for or during N')).toContain('동안');
  });
  it('extracts the stable decision ending from chapter 14', () => {
    expect(expandVariants('-기로 하다 — deciding')).toContain('기로');
  });
  it('extracts the stable reported-question ending from chapter 13', () => {
    expect(expandVariants('-냐고 하다 — reporting a question')).toContain('냐고');
  });
  it('extracts the stable pretend phrase from chapter 15', () => {
    expect(expandVariants('-는 척하다 — pretend')).toContain('는 척');
  });
  it('extracts the stable soft-opinion phrase from chapter 12', () => {
    expect(expandVariants('-는 것 같다 — soft opinions')).toContain('것 같');
  });
  it('extracts both sides of an ellipsis-separated past counterfactual', () => {
    const variants = expandVariants('V-았/었더라면 … -았/었을 거예요');

    expect(variants).toEqual(expect.arrayContaining(['더라면', '을 거예요']));
  });
  it('strips an English descriptor after a colon from each contrast ending', () => {
    expect(expandVariants('-군요 vs -네요: both react, but not the same way'))
      .toEqual(expect.arrayContaining(['군요', '네요']));
  });
});

describe('findPattern', () => {
  it('matches a particle only at token end', () => {
    const m = findPattern('학교에 가요.', ['에']);
    expect(m).toMatchObject({ variant: '에' });
    // 에서 must NOT count as an 에 hit
    expect(findPattern('학교에서 공부해요.', ['에'])).toBeNull();
  });
  it('prefers the longest variant', () => {
    expect(findPattern('학교에서 공부해요.', ['에', '에서']).variant).toBe('에서');
  });
  it('matches standalone tokens like 안', () => {
    expect(findPattern('아침을 안 먹어요.', ['안'])).toMatchObject({ variant: '안' });
  });
  it('matches spaceful endings anywhere', () => {
    expect(findPattern('천천히 말해 주세요.', ['주세요'])).toBeTruthy();
  });
});

describe('huntTokens', () => {
  it('marks only the covering token and splits around the match', () => {
    const match = findPattern('밥을 먹어요.', ['을', '를']);
    const tokens = huntTokens('밥을 먹어요.', match);
    expect(tokens[0]).toMatchObject({ pre: '밥', mid: '을', hit: true });
    expect(tokens[1].hit).toBe(false);
  });
});

const fakeChapter = {
  id: 'chapter-99',
  extendedVocabulary: [
    { hangul: '먹다', romanization: 'meokda', english: 'to eat', partOfSpeech: 'verb', exampleSentence: { ko: '점심을 먹어요.', en: 'I eat lunch.' } },
    { hangul: '마시다', romanization: 'masida', english: 'to drink', partOfSpeech: 'verb', exampleSentence: { ko: '물을 마셔요.', en: 'I drink water.' } },
    { hangul: '학교', romanization: 'hakgyo', english: 'school', partOfSpeech: 'noun', exampleSentence: { ko: '학교에 가요.', en: 'I go to school.' } },
  ],
  extendedDialogue: { lines: [{ speaker: '민호', ko: '아침을 먹어요?', en: 'Do you eat breakfast?' }] },
  grammarNotes: [{
    title: 'N을/를 — object',
    formTable: [{ when: '받침 O', add: '을', ex: '밥 → 밥을' }, { when: '받침 X', add: '를', ex: '커피 → 커피를' }],
    examples: [
      { ko: '밥을 먹어요.', en: 'I eat rice.' },
      { ko: '커피를 마셔요.', en: 'I drink coffee.' },
      { ko: '책을 읽어요.', en: 'I read a book.', note: '받침 → 을' },
    ],
  }],
};

describe('buildWordBites', () => {
  it('builds guess cards whose options contain exactly one correct answer', () => {
    const bites = buildWordBites(fakeChapter);
    const guesses = bites[0].cards.filter((c) => c.kind === 'guess');
    expect(guesses.length).toBe(3);
    for (const g of guesses) {
      expect(g.options).toContain(g.word.en);
      expect(new Set(g.options).size).toBe(g.options.length);
    }
  });
  it('appends a payoff card from a dialogue line containing a taught word stem', () => {
    const bites = buildWordBites(fakeChapter);
    const payoff = bites[0].cards.at(-1);
    expect(payoff.kind).toBe('payoff');
    expect(payoff.line.ko).toBe('아침을 먹어요?');
    // 1-char stem 먹- matches only with a conjugation opener, so the
    // highlighted span is 먹어 — 오다's 오 can never claim 오늘 this way
    expect(payoff.hl).toBe('먹어');
  });
  it('preserves a local source nuance for the compiled guess reveal', () => {
    const chapter = structuredClone(fakeChapter);
    chapter.extendedVocabulary[0].nuance = 'Local correction wins.';
    const guess = buildWordBites(chapter)[0].cards.find((c) => c.kind === 'guess');
    expect(guess.word.nuance).toBe('Local correction wins.');
  });
  it('does not turn a deliberately wrong conjugation into a payoff highlight', () => {
    const chapter = JSON.parse(readFileSync(join(root, 'data', 'chapters', 'chapter-41.json'), 'utf8'));
    const overrides = JSON.parse(readFileSync(join(root, 'data', 'overrides.json'), 'utf8'));
    const wrongPayoffs = buildWordBites(chapter, overrides)
      .flatMap((bite) => bite.cards)
      .filter((card) => card.kind === 'payoff' && card.hl === '춥어');

    expect(wrongPayoffs).toEqual([]);
  });
});

describe('buildPatternBites', () => {
  it('produces a contrasting hunt pair plus a cloze drill from the spare example', () => {
    const [bite] = buildPatternBites(fakeChapter);
    expect(bite.title).toBe('문법 Grammar · N을/를');
    const hunt = bite.cards.find((c) => c.kind === 'hunt');
    const variants = hunt.lines.map((l) => l.tokens.find((t) => t.hit).mid);
    expect(new Set(variants).size).toBe(2); // 을 and 를, not 을 twice
    const drill = bite.cards.find((c) => c.kind === 'drill');
    expect(drill.sentence).toContain('___');
    expect(drill.options.filter((o) => o.ok).length).toBe(1);
  });
  it('falls back to a teach card when no morpheme is extractable', () => {
    const [bite] = buildPatternBites({ grammarNotes: [{ title: '자음 (Consonants) — Shapes', formTable: [], examples: [] }] });
    expect(bite.cards[0].kind).toBe('teach');
  });
  it('does not build a cloze whose optional longer variant is also correct', () => {
    const [bite] = buildPatternBites({
      grammarNotes: [{
        title: 'N보다 (더)',
        formTable: [],
        examples: [
          { ko: '이 치마가 저 치마보다 길어요.', en: 'This skirt is longer.' },
          { ko: '이 신발이 저 신발보다 더 편해요.', en: 'These shoes are more comfortable.' },
          { ko: '이 바지가 저 바지보다 짧아요.', en: 'These pants are shorter.' },
        ],
      }],
    });

    expect(bite.cards.some((card) => card.kind === 'drill')).toBe(false);
  });
  it('does not build a cloze when 서 is optional in V-기 위해(서)', () => {
    const [bite] = buildPatternBites({
      grammarNotes: [{
        title: 'V-기 위해(서)',
        formTable: [],
        examples: [
          { ko: '건강해지기 위해서 운동해요.' },
          { ko: '일하기 위해 한국어를 배워요.' },
          { ko: '합격하기 위해서 공부해요.' },
        ],
      }],
    });

    expect(bite.cards.some((card) => card.kind === 'drill')).toBe(false);
  });
  it('does not make -아/어 놓다 and -아/어 두다 mutually exclusive answers', () => {
    // order 21 refinement: the audit's conclusion is that this PAIR must never
    // be offered as mutually exclusive options — not that the bite may carry
    // no questions at all (pitfall picks and rebuild tiles are fine).
    const chapter = JSON.parse(readFileSync(join(root, 'data', 'chapters', 'chapter-65.json'), 'utf8'));
    const overrides = JSON.parse(readFileSync(join(root, 'data', 'overrides.json'), 'utf8'));
    const bite = buildPatternBites(chapter, overrides)
      .find((candidate) => candidate.title.includes('V-아/어 놓다 / V-아/어 두다'));

    for (const card of bite.cards.filter((c) => c.kind === 'drill')) {
      const texts = card.options.map((o) => o.text);
      const hasNota = texts.some((t) => t.includes('놓'));
      const hasDuda = texts.some((t) => t.includes('두'));
      expect(hasNota && hasDuda).toBe(false);
    }
  });
  it('does not make -군요 and -네요 mutually exclusive in a natural reaction', () => {
    // order 21 refinement — see the 놓다/두다 test above for the reasoning.
    const chapter = JSON.parse(readFileSync(join(root, 'data', 'chapters', 'chapter-61.json'), 'utf8'));
    const overrides = JSON.parse(readFileSync(join(root, 'data', 'overrides.json'), 'utf8'));
    const bite = buildPatternBites(chapter, overrides)
      .find((candidate) => candidate.title.includes('-군요 vs -네요'));

    for (const card of bite.cards.filter((c) => c.kind === 'drill')) {
      if (!card.sentence?.includes('___')) continue; // pitfall picks are fine
      const texts = card.options.map((o) => o.text);
      expect(texts.includes('군요') && texts.includes('네요')).toBe(false);
    }
  });
  it('does not offer a fused past ending beside its valid longer form', () => {
    // order 21 refinement: cloze options must never pair a form with its own
    // substring/extension (았더라면 beside 더라면) — other question types are fine.
    const chapter = JSON.parse(readFileSync(join(root, 'data', 'chapters', 'chapter-59.json'), 'utf8'));
    const bite = buildPatternBites(chapter)
      .find((candidate) => candidate.title.includes('-았/었더라면 …'));

    for (const card of bite.cards.filter((c) => c.kind === 'drill')) {
      const texts = card.options.map((o) => o.text);
      for (const a of texts) for (const b of texts) {
        if (a !== b) expect(a.includes(b)).toBe(false);
      }
    }
  });
  it('highlights the condition and result in a past-counterfactual hunt', () => {
    const [bite] = buildPatternBites({
      grammarNotes: [{
        title: 'V-았/었더라면 … -았/었을 거예요',
        formTable: [],
        examples: [
          { ko: '일찍 도착했더라면 시험을 봤을 거예요.' },
          { ko: '지도를 봤더라면 길을 안 잃었을 거예요.' },
        ],
      }],
    });
    const hunt = bite.cards.find((card) => card.kind === 'hunt');

    expect(hunt.lines[0].tokens.filter((token) => token.hit).map((token) => token.mid))
      .toEqual(['더라면', '을', '거예요']);
  });
});

describe('buildReadingBite', () => {
  it('does not insert whitespace before a closing quotation mark', () => {
    const bite = buildReadingBite({
      readingText: {
        body: '발표가 끝난 뒤에는 “질문 있으십니까?”라고 물을 수 있어요. 다음 문장입니다.',
      },
    });
    const text = bite.cards[0].chunks.join(' ');
    expect(text).toContain('“질문 있으십니까?”라고');
    expect(text).not.toContain('“질문 있으십니까? ”라고');
  });
});

describe('compileChapter', () => {
  it('keeps each woven word/pattern pair on the same canDo skill', () => {
    const chapter = {
      id: 'chapter-99',
      canDo: ['A', 'B', 'C'],
      extendedVocabulary: Array.from({ length: 13 }, (_, i) => ({
        hangul: `단어${i}`,
        romanization: `word${i}`,
        english: `word ${i}`,
        partOfSpeech: 'noun',
        exampleSentence: { ko: `단어${i} 예문이에요.`, en: `Example ${i}.` },
      })),
      grammarNotes: ['첫째', '둘째', '셋째'].map((name) => ({
        title: `${name} 무늬`,
        formTable: [],
        examples: [{ ko: `${name} 예문이에요.`, en: `${name} example.` }],
      })),
      extendedDialogue: { lines: [{ speaker: 'A', ko: '대화예요.', en: 'Dialogue.' }] },
      readingText: { body: '읽기예요.', comprehensionQuestions: [] },
      inlineExercises: [{ type: 'multipleChoice', prompt: '고르세요.', options: ['가', '나'], correct: '가' }],
    };
    const compiled = compileChapter(chapter, 99);
    expect(compiled.bites.slice(0, 6).map((bite) => bite.canDo)).toEqual(['A', 'A', 'B', 'B', 'C', 'C']);
    expect(compiled.bites.slice(6).map((bite) => bite.canDo)).toEqual(['A', 'B', 'C']);
  });
});

/* ---------------- order 21: grammar bites must end in questions ---------------- */

const QUESTION_KINDS = new Set(['drill', 'order']);
const questionsOf = (bite) => bite.cards.filter((c) => QUESTION_KINDS.has(c.kind));

// A fully-loaded note: two variants, four examples, a suffix-decomposable
// form table, and a pitfall — every generator has material here.
const richChapter = {
  id: 'chapter-97',
  inlineExercises: [],
  grammarNotes: [{
    title: 'N을/를 — the object particle',
    func: '을/를 marks the object of a verb. It attaches after the noun that receives the action.',
    formTable: [
      { when: 'Noun ends in a consonant (받침)', add: '을', ex: '밥 → 밥을' },
      { when: 'Noun ends in a vowel', add: '를', ex: '커피 → 커피를' },
    ],
    examples: [
      { ko: '밥을 먹어요.', en: 'I eat rice.' },
      { ko: '커피를 마셔요.', en: 'I drink coffee.' },
      { ko: '책을 읽어요.', en: 'I read a book.', note: '받침 → 을' },
      { ko: '한국어를 공부해요.', en: 'I study Korean.' },
    ],
    englishSpeakerPitfall: {
      wrong: '저는 밥 먹어요를 좋아해요.',
      right: '저는 밥 먹는 것을 좋아해요.',
      explanation: 'Attach 을/를 to nouns, not to finished sentences.',
    },
  }],
};

describe('order 21 — grammar bites end in questions', () => {
  it('appends 2-4 questions after the rule card and keeps the rule first', () => {
    const [bite] = buildPatternBites(richChapter);
    expect(bite.cards[0].kind).toBe('hunt');
    const questions = questionsOf(bite);
    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(questions.length).toBeLessThanOrEqual(4);
    // every question sits after the rule card
    expect(bite.cards.findIndex((c) => QUESTION_KINDS.has(c.kind))).toBeGreaterThan(0);
  });

  it('keeps the legacy hunt and drill cards byte-identical (additive rule)', () => {
    const [bite] = buildPatternBites(richChapter);
    const hunt = bite.cards[0];
    const variants = hunt.lines.map((l) => l.tokens.find((t) => t.hit).mid).sort();
    expect(variants).toEqual(['를', '을']);
    const legacy = bite.cards[1];
    expect(legacy.kind).toBe('drill');
    expect(legacy.prompt).toBe('I read a book.');
    expect(legacy.options.map((o) => o.text).sort()).toEqual(['를', '을']);
  });

  it('widened cloze pulls a sibling variant for short particles only, excluding candidates already in the sentence', () => {
    const chapter = {
      id: 'chapter-96',
      inlineExercises: [],
      grammarNotes: [
        {
          // spaced ending, single variant → NO sibling-based cloze (a sibling
          // ending as distractor is garbage or accidentally valid); this note
          // gets its questions from tiles/pitfall instead
          title: 'V-고 싶어요 — want to',
          func: 'States what the speaker wants to do.',
          formTable: [],
          examples: [
            { ko: '물을 마시고 싶어요.', en: 'I want to drink water.' },
            { ko: '친구를 만나고 싶어요.', en: 'I want to meet a friend.' },
            { ko: '영화를 보고 싶어요.', en: 'I want to watch a movie.' },
          ],
        },
        {
          // short spaceless particle, single variant → sibling variants OK
          title: 'N도 — also',
          func: 'Adds "also".',
          formTable: [],
          examples: [
            { ko: '물도 주세요.', en: 'Water too, please.' },
            { ko: '저도 가요.', en: 'I go too.' },
            { ko: '빵도 먹어요.', en: 'I eat bread too.' },
          ],
        },
        {
          title: 'N만 — only',
          func: 'Limits to only.',
          formTable: [],
          examples: [{ ko: '물만 마셔요.', en: 'I only drink water.' }],
        },
      ],
    };
    const bites = buildPatternBites(chapter);
    const wantBite = bites[0];
    const wantClozes = wantBite.cards.filter((c) => c.kind === 'drill' && c.sentence?.includes('___'));
    expect(wantClozes).toHaveLength(0);
    // …but it still ends with questions via rebuild tiles
    expect(wantBite.cards.filter((c) => c.kind === 'order').length).toBeGreaterThanOrEqual(1);

    const doBite = bites[1];
    const doClozes = doBite.cards.filter((c) => c.kind === 'drill' && c.sentence?.includes('___'));
    expect(doClozes.length).toBeGreaterThanOrEqual(1);
    for (const cloze of doClozes) {
      expect(cloze.options.filter((o) => o.ok)).toHaveLength(1);
      expect(cloze.options.length).toBeGreaterThanOrEqual(2);
      // sibling 만 may appear; nothing already in the sentence may
      for (const opt of cloze.options) {
        if (!opt.ok) expect(cloze.sentence.includes(opt.text)).toBe(false);
      }
    }
  });

  it('turns hunt sentences into order tiles but never duplicates the chapter orderWords', () => {
    const chapter = {
      ...richChapter,
      inlineExercises: [{ type: 'orderWords', prompt: 'x', tokens: ['밥을', '먹어요.'], correct: '밥을 먹어요.' }],
    };
    const [bite] = buildPatternBites(chapter);
    const orders = bite.cards.filter((c) => c.kind === 'order');
    // 밥을 먹어요 is the chapter's own orderWords — must not reappear here
    for (const order of orders) expect(order.correct).not.toBe('밥을 먹어요.');
    for (const order of orders) {
      expect(order.tokens.join(' ')).toBe(order.correct);
      expect(order.tokens.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('builds a form-table cloze from suffix-decomposable rows and skips fused rows', () => {
    const [bite] = buildPatternBites(richChapter);
    const formCloze = bite.cards.find((c) => c.kind === 'drill' && c.sentence === '밥___');
    expect(formCloze).toBeTruthy();
    expect(formCloze.options.find((o) => o.ok).text).toBe('을');
    expect(formCloze.options.map((o) => o.text)).toContain('를');

    const fusedOnly = {
      id: 'chapter-95',
      inlineExercises: [],
      grammarNotes: [{
        title: 'V-아/어야 해요 — must',
        func: 'Obligation.',
        formTable: [
          { when: 'ㅏ/ㅗ stems', add: '-아야 해요', ex: '가다 → 가야 해요' },
          { when: 'other stems', add: '-어야 해요', ex: '먹다 → 먹어야 해요' },
        ],
        examples: [{ ko: '집에 가야 해요.', en: 'I must go home.' }],
      }],
    };
    const [fusedBite] = buildPatternBites(fusedOnly);
    // 가다 → 가야 해요 is not X+suffix (다 is replaced), so no form cloze may exist
    expect(fusedBite.cards.some((c) => c.kind === 'drill' && /다___$/.test(c.sentence || ''))).toBe(false);
  });

  it('offers the pitfall as a two-way natural-or-not pick and preserves it in more', () => {
    const [bite] = buildPatternBites(richChapter);
    const pick = bite.cards.find((c) => c.kind === 'drill' && c.options.length === 2
      && c.options.some((o) => o.text === richChapter.grammarNotes[0].englishSpeakerPitfall.right));
    expect(pick).toBeTruthy();
    expect(pick.options.find((o) => o.ok).text).toBe(richChapter.grammarNotes[0].englishSpeakerPitfall.right);
    expect(pick.explanation).toContain('Attach 을/를');
    const ruleCard = bite.cards[0];
    expect(ruleCard.more.pitfall).toEqual(richChapter.grammarNotes[0].englishSpeakerPitfall);
  });

  it('gives the Hangul-style teach fallback questions from readings and pitfall', () => {
    const chapter = {
      id: 'chapter-94',
      inlineExercises: [],
      grammarNotes: [{
        title: '자음 (Consonants) — Ten Core Shapes',
        func: '',
        formTable: [],
        examples: [
          { ko: '가 / 고 / 구', romanization: 'ga / go / gu', en: 'k/g row' },
          { ko: '나 / 노 / 누', romanization: 'na / no / nu', en: 'n row' },
          { ko: '마 / 모 / 무', romanization: 'ma / mo / mu', en: 'm row' },
        ],
        englishSpeakerPitfall: {
          wrong: "Reading 이 as 'ee' exactly like English",
          right: '이 is close but shorter',
          explanation: 'Vowel length differs.',
        },
      }],
    };
    const [bite] = buildPatternBites(chapter);
    expect(bite.cards[0].kind).toBe('teach');
    const questions = questionsOf(bite);
    expect(questions.length).toBeGreaterThanOrEqual(2);
    const reading = questions.find((c) => c.options?.some((o) => o.text === 'ga'));
    expect(reading).toBeTruthy();
    expect(reading.options.find((o) => o.ok).text).toBe('ga');
  });

  it('exposes the first sentence of func as funcLead, clamped', () => {
    const [bite] = buildPatternBites(richChapter);
    expect(bite.cards[0].more.funcLead).toBe('을/를 marks the object of a verb.');
    const longFunc = {
      ...richChapter,
      grammarNotes: [{ ...richChapter.grammarNotes[0], func: 'x'.repeat(300) + '. tail.' }],
    };
    const [longBite] = buildPatternBites(longFunc);
    expect(longBite.cards[0].more.funcLead.length).toBeLessThanOrEqual(160);
  });
});

/* ---------------- order 22: dialogue/reading thickness + order dedup ---------------- */

describe('order 22 — dialogue and reading end in questions, orders serve once', () => {
  const talkChapter = {
    id: 'chapter-93',
    extendedVocabulary: [
      { hangul: '아침', romanization: 'achim', english: 'morning; breakfast', partOfSpeech: 'noun', exampleSentence: { ko: '아침을 먹어요.', en: 'I eat breakfast.' } },
      { hangul: '저녁', romanization: 'jeonyeok', english: 'evening; dinner', partOfSpeech: 'noun', exampleSentence: { ko: '저녁을 먹어요.', en: 'I eat dinner.' } },
      { hangul: '커피', romanization: 'keopi', english: 'coffee', partOfSpeech: 'noun', exampleSentence: { ko: '커피를 마셔요.', en: 'I drink coffee.' } },
    ],
    extendedDialogue: {
      setting: 'lunch chat',
      lines: [
        { speaker: '지희', ko: '민호 씨, 매일 아침을 먹어요?', en: 'Minho, do you eat breakfast every day?' },
        { speaker: '민호', ko: '아니요, 잘 안 먹어요.', en: 'No, I usually skip it.' },
        { speaker: '지희', ko: '그럼 커피를 마셔요?', en: 'Then do you drink coffee?' },
      ],
    },
    inlineExercises: [
      { type: 'orderWords', prompt: 'build', tokens: ['아침을', '먹어요.'], correct: '아침을 먹어요.', explanation: '' },
      { type: 'multipleChoice', prompt: 'pick', options: ['하나', '둘'], correct: '하나', explanation: '' },
    ],
    readingText: {
      title: '아침 일기',
      body: '저는 매일 아침을 먹어요. 주말에는 커피를 마셔요. 오늘도 좋은 하루예요.',
      bodyTranslation: 'I eat breakfast every day. On weekends I drink coffee. Today is a good day too.',
      comprehensionQuestions: [{ question: 'What does the writer eat?', answer: '아침' }],
    },
  };

  it('gives the dialogue bite a who-said-it and a line cloze after the chat', () => {
    const bite = buildDialogueBite(talkChapter, {});
    expect(bite.cards[0].kind).toBe('chat');
    const who = bite.cards.find((c) => c.kind === 'drill' && c.options.some((o) => o.text === '지희'));
    expect(who).toBeTruthy();
    expect(who.options).toHaveLength(2);
    expect(who.options.find((o) => o.ok)).toBeTruthy();
    const cloze = bite.cards.find((c) => c.kind === 'drill' && c.sentence?.includes('___'));
    expect(cloze).toBeTruthy();
    expect(cloze.options.filter((o) => o.ok)).toHaveLength(1);
    // distractors must not already sit in the clozed line
    for (const opt of cloze.options) {
      if (!opt.ok) expect(cloze.sentence.includes(opt.text)).toBe(false);
    }
  });

  it('skips who-said-it when the dialogue has a single speaker', () => {
    const solo = {
      ...talkChapter,
      extendedDialogue: { lines: [
        { speaker: '나', ko: '아침을 먹어요.', en: 'I eat breakfast.' },
        { speaker: '나', ko: '커피를 마셔요.', en: 'I drink coffee.' },
      ] },
    };
    const bite = buildDialogueBite(solo, {});
    expect(bite.cards.some((c) => c.kind === 'drill' && c.options?.some((o) => o.text === '나'))).toBe(false);
  });

  it('adds two passage clozes to the reading bite, after the read card', () => {
    const bite = buildReadingBite(talkChapter, {});
    expect(bite.cards[0].kind).toBe('read');
    const clozes = bite.cards.filter((c) => c.kind === 'drill' && c.sentence?.includes('___'));
    expect(clozes.length).toBe(2);
    for (const cloze of clozes) {
      expect(cloze.options.filter((o) => o.ok)).toHaveLength(1);
      for (const opt of cloze.options) {
        if (!opt.ok) expect(cloze.sentence.includes(opt.text)).toBe(false);
      }
    }
    // two different target words, not the same blank twice
    const answers = clozes.map((c) => c.options.find((o) => o.ok).text);
    expect(new Set(answers).size).toBe(2);
  });

  it('drops the dialogue-served orderWords from the boss bite, keeping the rest', () => {
    const dialogue = buildDialogueBite(talkChapter, {});
    const served = new Set(
      dialogue.cards.filter((c) => c.kind === 'order').map((c) => c.correct.replace(/\s+/g, ' ').trim())
    );
    const boss = buildBossBite(talkChapter, {}, { excludeOrderCorrects: served });
    expect(boss.cards.some((c) => c.kind === 'order' && c.correct === '아침을 먹어요.')).toBe(false);
    expect(boss.cards.some((c) => c.kind === 'drill')).toBe(true);
  });

  it('end-to-end: no order sentence appears in both dialogue and boss (real chapter 5)', () => {
    const chapter = JSON.parse(readFileSync(join(root, 'data', 'chapters', 'chapter-05.json'), 'utf8'));
    const overrides = JSON.parse(readFileSync(join(root, 'data', 'overrides.json'), 'utf8'));
    const compiled = compileChapter(chapter, 5, overrides);
    const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
    const inDialogue = compiled.bites.filter((b) => b.kind === 'dialogue')
      .flatMap((b) => b.cards).filter((c) => c.kind === 'order').map((c) => norm(c.correct));
    const inBoss = compiled.bites.filter((b) => b.kind === 'boss')
      .flatMap((b) => b.cards).filter((c) => c.kind === 'order').map((c) => norm(c.correct));
    for (const correct of inDialogue) expect(inBoss).not.toContain(correct);
    expect(inDialogue.length).toBeGreaterThan(0);
  });
});

describe('order 22 — reading fallback', () => {
  it('rebuilds a passage line as tiles when no vocabulary matches literally', () => {
    const bite = buildReadingBite({
      extendedVocabulary: [
        { hangul: '가다', romanization: 'gada', english: 'to go', partOfSpeech: 'verb' },
        { hangul: '오다', romanization: 'oda', english: 'to come', partOfSpeech: 'verb' },
      ],
      readingText: {
        title: '주말',
        body: '지은: 이번 주말에 같이 가고 싶어요. 유진: 저도 갈 수 있어요.',
        bodyTranslation: 'x',
        comprehensionQuestions: [],
      },
    }, {});
    expect(bite.cards.length).toBeGreaterThanOrEqual(2);
    const order = bite.cards.find((c) => c.kind === 'order');
    expect(order).toBeTruthy();
    expect(order.correct.startsWith('지은')).toBe(false); // speaker prefix stripped
    expect(order.tokens.length).toBeGreaterThanOrEqual(3);
  });
});

/* ---------------- order 23: distractor hygiene on generated questions ---------------- */

describe('order 23 — no redundant or mutually-inclusive distractors', () => {
  const mutualSubstring = (card) => {
    const texts = (card.options || []).map((o) => o.text);
    return texts.some((a) => texts.some((b) => a !== b && (a.includes(b) || b.includes(a))));
  };

  it('form-table cloze never offers two allomorphs of the same ending together', () => {
    const chapter = {
      id: 'chapter-92',
      inlineExercises: [],
      grammarNotes: [{
        title: 'V-지만 — but',
        func: 'Contrast.',
        formTable: [
          { when: 'contrast', add: '지만', ex: '먹 → 먹지만' },
          { when: 'vowel stem', add: '면', ex: '가 → 가면' },
          { when: 'consonant stem', add: '으면', ex: '먹 → 먹으면' },
        ],
        examples: [{ ko: '먹지만 좋아요.', en: 'I eat it but like it.' }],
      }],
    };
    const [bite] = buildPatternBites(chapter);
    const formClozes = bite.cards.filter((c) => c.kind === 'drill' && c.prompt.startsWith('빈칸을 채우세요'));
    expect(formClozes.length).toBeGreaterThanOrEqual(1);
    for (const card of formClozes) expect(mutualSubstring(card)).toBe(false);
  });

  it('widened cloze never picks two table suffixes that contain each other', () => {
    const chapter = {
      id: 'chapter-91',
      inlineExercises: [],
      grammarNotes: [
        {
          title: 'N도 — also',
          func: 'Adds "also".',
          formTable: [
            { when: 'vowel', add: '로', ex: '학교 → 학교로' },
            { when: 'consonant', add: '으로', ex: '집 → 집으로' },
          ],
          examples: [
            { ko: '물도 주세요.', en: 'Water too, please.' },
            { ko: '저도 가요.', en: 'I go too.' },
            { ko: '빵도 먹어요.', en: 'I eat bread too.' },
          ],
        },
        {
          title: 'N만 — only',
          func: 'Limits to only.',
          formTable: [],
          examples: [{ ko: '물만 마셔요.', en: 'I only drink water.' }],
        },
      ],
    };
    const bites = buildPatternBites(chapter);
    for (const bite of bites) {
      for (const card of bite.cards) {
        if (card.kind !== 'drill' || !card.sentence?.includes('___')) continue;
        expect(mutualSubstring(card)).toBe(false);
      }
    }
  });

  it('vocab clozes refuse distractors that contain (or sit inside) the answer', () => {
    const chapter = {
      id: 'chapter-90',
      extendedVocabulary: [
        { hangul: '셔츠', romanization: 'syeocheu', english: 'shirt', partOfSpeech: 'noun', exampleSentence: { ko: '이 셔츠 입어 봐도 돼요?', en: 'May I try on this shirt?' } },
        { hangul: '티셔츠', romanization: 'tisyeocheu', english: 't-shirt', partOfSpeech: 'noun', exampleSentence: { ko: '티셔츠를 샀어요.', en: 'I bought a t-shirt.' } },
        { hangul: '바지', romanization: 'baji', english: 'pants', partOfSpeech: 'noun', exampleSentence: { ko: '바지가 길어요.', en: 'The pants are long.' } },
        { hangul: '모자', romanization: 'moja', english: 'hat', partOfSpeech: 'noun', exampleSentence: { ko: '모자를 써요.', en: 'I wear a hat.' } },
      ],
      extendedDialogue: {
        setting: 'shop',
        lines: [
          { speaker: '손님', ko: '저기요, 안녕하세요.', en: 'Excuse me, hello.' },
          { speaker: '점원', ko: '네, 어서 오세요. 천천히 둘러보세요, 손님.', en: 'Yes, welcome. Take your time looking around.' },
          { speaker: '손님', ko: '이 셔츠 입어 봐도 돼요?', en: 'May I try on this shirt?' },
        ],
      },
      inlineExercises: [],
    };
    const bite = buildDialogueBite(chapter, {});
    const cloze = bite.cards.find((c) => c.kind === 'drill' && c.sentence?.includes('___'));
    expect(cloze).toBeTruthy();
    expect(cloze.options.find((o) => o.ok).text).toBe('셔츠');
    expect(cloze.options.some((o) => o.text === '티셔츠')).toBe(false);
    expect(cloze.options.length).toBeGreaterThanOrEqual(3);
  });
});

describe('order 23 — free-word-order tiles carry a start hint', () => {
  it('adds "(X 시작)" when a movable adverbial makes other orders valid, and stays quiet otherwise', () => {
    const chapter = {
      id: 'chapter-89',
      inlineExercises: [],
      grammarNotes: [{
        title: 'N에 — time/place',
        func: 'Marks time.',
        formTable: [],
        examples: [
          { ko: '주말에 영화를 봐요.', en: 'I watch a movie on the weekend.' },
          { ko: '아침에 커피를 마셔요.', en: 'I drink coffee in the morning.' },
          { ko: '저녁에 책을 읽어요.', en: 'I read a book in the evening.' },
        ],
      }, {
        title: 'N을/를 — object',
        func: 'Marks the object.',
        formTable: [],
        examples: [
          { ko: '저는 사과를 먹어요.', en: 'I eat an apple.' },
          { ko: '저는 물을 마셔요.', en: 'I drink water.' },
          { ko: '저는 책을 읽어요.', en: 'I read a book.' },
        ],
      }],
    };
    const bites = buildPatternBites(chapter);
    const tiles = bites.flatMap((b) => b.cards).filter((c) => c.kind === 'order');
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    for (const tile of tiles) {
      if (/(에|에서|마다)$/.test(tile.tokens[0].replace(/[.,!?]+$/u, '')) && tile.tokens.length >= 3) {
        expect(tile.prompt).toContain('시작 · Start with');
        expect(tile.prompt).toContain(tile.tokens[0].replace(/[.,!?]+$/u, ''));
      }
    }
    const plain = tiles.find((c) => c.correct.startsWith('저는'));
    expect(plain).toBeTruthy();
    expect(plain.prompt).not.toContain('Start with');
  });

  it('reading-passage fallback tiles get the same hint when needed', () => {
    const chapter = {
      id: 'chapter-88',
      extendedVocabulary: [
        { hangul: '걷다', romanization: 'geotda', english: 'to walk', partOfSpeech: 'verb', exampleSentence: { ko: '공원에서 걸어요.', en: 'I walk in the park.' } },
      ],
      inlineExercises: [],
      readingText: {
        title: '산책',
        body: '아침에 공원에서 천천히 걸어요.',
        bodyTranslation: 'In the morning I walk slowly in the park.',
        comprehensionQuestions: [],
      },
    };
    const bite = buildReadingBite(chapter, {});
    const tile = bite.cards.find((c) => c.kind === 'order');
    expect(tile).toBeTruthy();
    expect(tile.prompt).toContain('아침에 시작 · Start with 아침에');
  });
});
