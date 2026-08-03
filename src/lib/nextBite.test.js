import { describe, expect, it } from 'vitest';
import { findNext } from './nextBite.js';

const index = {
  chapters: [
    {
      id: 'chapter-01',
      number: 1,
      level: 'A1',
      bites: [
        { id: 'chapter-01-b1', title: 'First bite' },
        { id: 'chapter-01-b2', title: 'Chapter one boss' },
      ],
    },
    {
      id: 'chapter-02',
      number: 2,
      level: 'A1',
      bites: [{ id: 'chapter-02-b1', title: 'Chapter two first' }],
    },
  ],
  snacks: [
    { id: 'snack-one', title: 'Snack one', afterChapter: 1, level: 'A1' },
    { id: 'snack-two', title: 'Snack two', afterChapter: 2, level: 'A1' },
  ],
};

const indexWithA2 = {
  ...index,
  chapters: [
    ...index.chapters,
    {
      id: 'chapter-12',
      number: 12,
      level: 'A2',
      bites: [{ id: 'chapter-12-b1', title: 'A2 first bite' }],
    },
  ],
};

describe('findNext', () => {
  it('returns the first unfinished bite in chapter order', () => {
    expect(findNext({ index, done: {}, skippedSnacks: new Set() })).toMatchObject({
      type: 'bite',
      chapterId: 'chapter-01',
      biteId: 'chapter-01-b1',
    });
  });

  it('prioritizes a pending snack after the chapter just completed', () => {
    const done = { 'chapter-01-b1': 1, 'chapter-01-b2': 1 };
    expect(findNext({ index, done, skippedSnacks: new Set() })).toMatchObject({
      type: 'snack',
      snackId: 'snack-one',
    });
  });

  it('continues to the next chapter when that snack is skipped for the session', () => {
    const done = { 'chapter-01-b1': 1, 'chapter-01-b2': 1 };
    expect(findNext({ index, done, skippedSnacks: new Set(['snack-one']) })).toMatchObject({
      type: 'bite',
      chapterId: 'chapter-02',
      biteId: 'chapter-02-b1',
    });
  });

  it('only recommends snacks at the current completed-chapter boundary', () => {
    const done = { 'chapter-01-b1': 1, 'chapter-01-b2': 1, 'chapter-02-b1': 1 };
    expect(findNext({ index, done, skippedSnacks: new Set() })).toMatchObject({
      type: 'snack',
      snackId: 'snack-two',
    });
  });

  it('returns null when all bites and snacks are complete', () => {
    const done = {
      'chapter-01-b1': 1,
      'chapter-01-b2': 1,
      'chapter-02-b1': 1,
      'snack-one': 1,
      'snack-two': 1,
    };
    expect(findNext({ index, done, skippedSnacks: new Set() })).toBeNull();
  });

  it('starts a new learner at the selected chapter', () => {
    expect(findNext({ index: indexWithA2, done: {}, startChapter: 12 })).toMatchObject({
      type: 'bite',
      chapterId: 'chapter-12',
      biteId: 'chapter-12-b1',
    });
  });

  it('ignores the selected starting chapter after progress exists', () => {
    expect(findNext({
      index: indexWithA2,
      done: { 'chapter-01-b1': 1 },
      startChapter: 12,
    })).toMatchObject({
      type: 'bite',
      chapterId: 'chapter-01',
      biteId: 'chapter-01-b2',
    });
  });
});
