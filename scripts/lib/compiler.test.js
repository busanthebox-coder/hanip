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
  buildReadingBite,
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

    const chunkLevels = { a1: ['A1'], a2: ['A2'], b1: ['B1'], b2c1: ['B2', 'C1'] };
    const partition = [];
    for (const [chunkName, levels] of Object.entries(chunkLevels)) {
      const chunk = JSON.parse(readFileSync(join(root, 'src', 'lib', 'bites', `${chunkName}.json`), 'utf8'));
      for (const chapter of chunk.chapters) {
        expect(levels).toContain(chapterLevel(chapter.number));
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
  it('does not make 따라서 and 그러므로 mutually exclusive answers', () => {
    const chapter = JSON.parse(readFileSync(join(root, 'data', 'chapters', 'chapter-63.json'), 'utf8'));
    const overrides = JSON.parse(readFileSync(join(root, 'data', 'overrides.json'), 'utf8'));
    const bite = buildPatternBites(chapter, overrides)
      .find((candidate) => candidate.title.includes('따라서 / 그러므로'));

    expect(bite.cards.some((card) => card.kind === 'drill')).toBe(false);
  });
  it('does not make -군요 and -네요 mutually exclusive in a natural reaction', () => {
    const chapter = JSON.parse(readFileSync(join(root, 'data', 'chapters', 'chapter-61.json'), 'utf8'));
    const overrides = JSON.parse(readFileSync(join(root, 'data', 'overrides.json'), 'utf8'));
    const bite = buildPatternBites(chapter, overrides)
      .find((candidate) => candidate.title.includes('-군요 vs -네요'));

    expect(bite.cards.some((card) => card.kind === 'drill')).toBe(false);
  });
  it('does not offer a fused past ending beside its valid longer form', () => {
    const chapter = JSON.parse(readFileSync(join(root, 'data', 'chapters', 'chapter-59.json'), 'utf8'));
    const bite = buildPatternBites(chapter)
      .find((candidate) => candidate.title.includes('-았/었더라면 …'));

    expect(bite.cards.some((card) => card.kind === 'drill')).toBe(false);
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
