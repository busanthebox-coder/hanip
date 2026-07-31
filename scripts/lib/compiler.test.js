import { describe, expect, it } from 'vitest';
import {
  expandVariants,
  findPattern,
  huntTokens,
  buildWordBites,
  buildPatternBites,
} from './compiler.mjs';

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
