import { describe, expect, it } from 'vitest';
import { hydrateChapterRomanization } from './courseData.js';

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
