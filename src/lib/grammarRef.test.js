import { describe, expect, it } from 'vitest';
import { collectExamples, rowsOf, ruleCardOf } from './grammarRef.js';

describe('order 24 — grammar reference assembly', () => {
  const bite = {
    kind: 'pattern',
    cards: [
      {
        kind: 'hunt',
        name: 'N은/는',
        sub: 'topic marker',
        lines: [
          { ko: '저는 마이클이에요.', en: "I'm Michael.", romanization: 'jeoneun maikeurieyo.' },
          { ko: '오늘은 금요일이에요.', en: "Today is Friday.", romanization: 'oneureun geumyoirieyo.' },
        ],
        rule: { name: 'N은/는', rows: [{ when: '받침 O', add: '은', ex: '집 → 집은' }] },
        more: { func: 'Topic.', funcLead: 'Topic.', keyPoint: '', pronunciation: '' },
      },
      { kind: 'drill', prompt: "I'm Michael.", sentence: '저___ 마이클이에요.', options: [{ text: '는', ok: true }, { text: '은', ok: false }] },
      { kind: 'drill', prompt: '어느 쪽이 자연스러워요? · Which one is natural?', sentence: null, options: [{ text: 'A', ok: true }, { text: 'B', ok: false }] },
      { kind: 'order', prompt: '방금 본 문장을 다시 조립하세요 · Rebuild the sentence', tokens: ['오늘은', '금요일이에요.'], correct: '오늘은 금요일이에요.' },
      { kind: 'drill', prompt: 'New cloze.', sentence: '밥___ 먹어요.', options: [{ text: '을', ok: true }, { text: '를', ok: false }] },
    ],
  };

  it('finds the rule card and its form rows on hunt and teach shapes', () => {
    expect(ruleCardOf(bite).name).toBe('N은/는');
    expect(rowsOf(ruleCardOf(bite))).toEqual([{ when: '받침 O', add: '은', ex: '집 → 집은' }]);
    const teach = { cards: [{ kind: 'teach', rows: [{ when: 'w', add: 'a', ex: 'e' }] }] };
    expect(rowsOf(ruleCardOf(teach))).toHaveLength(1);
  });

  it('collects hunted lines, refilled clozes, and tile sentences without duplicates', () => {
    const examples = collectExamples(bite);
    const kos = examples.map((e) => e.ko);
    // the drill refills to 저는 마이클이에요. — already hunted, so deduped;
    // the order tile matches line 2 — deduped; the new cloze survives
    expect(kos).toEqual(['저는 마이클이에요.', '오늘은 금요일이에요.', '밥을 먹어요.']);
    expect(examples[0].en).toBe("I'm Michael.");
    expect(examples[2].en).toBe('New cloze.');
  });
});
