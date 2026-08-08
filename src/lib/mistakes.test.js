import { describe, expect, it } from 'vitest';
import { collectMistake } from './mistakes.js';

const guess = {
  kind: 'guess',
  word: { ko: '벌써', en: 'already' },
};

describe('session mistake note', () => {
  it('stays empty while every card is answered correctly or escaped', () => {
    let list = [];
    list = collectMistake(list, guess, true, { picked: 'already' });
    // 몰라요 is a no-penalty reveal, not a wrong answer — it never scores against
    // the learner elsewhere, so it must not appear in the note either.
    list = collectMistake(list, guess, false, { skipped: true });
    // reading and dialogue cards resolve on sight; they have nothing to get wrong
    list = collectMistake(list, { kind: 'read', title: '주말' }, false, {});
    expect(list).toEqual([]);
  });

  it('keeps a missed card listed once, even after the requeued retry is correct', () => {
    let list = collectMistake([], guess, false, { picked: 'soon; in a moment' });
    expect(list).toEqual([
      { key: 'guess:벌써', ko: '벌써', en: 'already', said: 'soon; in a moment' },
    ]);

    list = collectMistake(list, { ...guess, requeued: true }, true, { picked: 'already' });
    list = collectMistake(list, { ...guess, requeued: true }, false, { picked: 'soon; in a moment' });
    expect(list).toHaveLength(1);
  });

  it('collects warmup and review misses too, because a forgotten word is the point', () => {
    const warmup = { ...guess, warmup: true, word: { ko: '아직', en: 'still; yet' } };
    const list = collectMistake([], warmup, false, { picked: 'already' });
    expect(list.map((entry) => entry.ko)).toEqual(['아직']);
  });

  it('describes order and drill misses from their own fields', () => {
    const order = { kind: 'order', correct: '천천히 말해 주세요.', prompt: 'Please speak slowly.' };
    const drill = {
      kind: 'drill',
      prompt: '저___ 마이클이에요.',
      options: [{ text: '는', ok: true }, { text: '은', ok: false }],
    };
    let list = collectMistake([], order, false, { picked: '말해 천천히 주세요.' });
    list = collectMistake(list, drill, false, { picked: '은' });
    expect(list).toEqual([
      { key: 'order:천천히 말해 주세요.', ko: '천천히 말해 주세요.', en: 'Please speak slowly.', said: '말해 천천히 주세요.' },
      { key: 'drill:저___ 마이클이에요.', ko: '는', en: '저___ 마이클이에요.', said: '은' },
    ]);
  });
});
