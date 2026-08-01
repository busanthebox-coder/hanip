import { describe, expect, it } from 'vitest';
import {
  expandVariants,
  findPattern,
  findAllPatterns,
  huntTokens,
  guessTarget,
  buildWordBites,
  buildPatternBites,
} from './compiler.mjs';

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
});

describe('findAllPatterns', () => {
  it('marks every instance, not just the first', () => {
    const matches = findAllPatterns('아홉 시부터 여섯 시까지 있어요. 학교까지 가요.', ['부터', '까지']);
    expect(matches.length).toBe(3);
    const tokens = huntTokens('여섯 시까지 있어요. 학교까지 가요.', findAllPatterns('여섯 시까지 있어요. 학교까지 가요.', ['까지']));
    expect(tokens.filter((t) => t.hit).length).toBe(2);
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
});
