import { describe, expect, it } from 'vitest';
import { biteHeadwords, hydrateChapterRomanization } from './courseData.js';

describe('chapter runtime data', () => {
  it('reuses a dialogue romanization for the matching payoff line without mutating compiled data', () => {
    const bites = [
      {
        id: 'dialogue',
        cards: [{ kind: 'chat', lines: [{ ko: '안녕하세요.', romanization: 'annyeonghaseyo.' }] }],
      },
      {
        id: 'payoff',
        cards: [{ kind: 'payoff', line: { ko: '안녕하세요.', en: 'Hello.' } }],
      },
    ];

    const hydrated = hydrateChapterRomanization(bites);

    expect(hydrated[1].cards[0].line.romanization).toBe('annyeonghaseyo.');
    expect(bites[1].cards[0].line).not.toHaveProperty('romanization');
  });
});

describe('biteHeadwords', () => {
  // Home lists what today's bite will put in front of the learner. It shows
  // Korean only: the meaning still has to be guessed on the card itself.
  it('lists the guess words of a vocabulary bite in card order', () => {
    const bite = {
      cards: [
        { kind: 'guess', word: { ko: '먹다', en: 'to eat' } },
        { kind: 'guess', word: { ko: '마시다', en: 'to drink' } },
        { kind: 'payoff', line: { ko: '삼겹살 먹고 싶어요?' } },
      ],
    };
    expect(biteHeadwords(bite)).toEqual(['먹다', '마시다']);
  });

  it('uses the pattern name for a grammar hunt and never repeats a form', () => {
    const bite = {
      cards: [
        { kind: 'hunt', name: '-고 싶어요' },
        { kind: 'guess', word: { ko: '-고 싶어요' } },
        { kind: 'order', tokens: ['저는', '물을'] },
      ],
    };
    expect(biteHeadwords(bite)).toEqual(['-고 싶어요']);
  });

  it('caps the list so the row of words cannot push the bowl off screen', () => {
    const bite = {
      cards: Array.from({ length: 9 }, (_, n) => ({ kind: 'guess', word: { ko: `단어${n}` } })),
    };
    expect(biteHeadwords(bite)).toHaveLength(6);
    expect(biteHeadwords(bite, 3)).toEqual(['단어0', '단어1', '단어2']);
  });

  it('survives a bite whose cards have not loaded yet', () => {
    expect(biteHeadwords(null)).toEqual([]);
    expect(biteHeadwords({})).toEqual([]);
    expect(biteHeadwords({ cards: [{ kind: 'read', passage: {} }] })).toEqual([]);
  });
});
