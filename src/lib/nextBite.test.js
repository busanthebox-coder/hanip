import { describe, expect, it } from 'vitest';
import { findAfter, findNext } from './nextBite.js';

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

describe('findAfter', () => {
  // The win screen names what comes next while the bite it announces is still
  // open, so the finished bite has to count as done before the search runs.
  it('looks past the bite that is being finished right now', () => {
    expect(findAfter({ index, done: {}, finishedId: 'chapter-01-b1' })).toMatchObject({
      type: 'bite',
      biteId: 'chapter-01-b2',
    });
  });

  it('announces the boundary snack once the chapter closes', () => {
    expect(findAfter({
      index,
      done: { 'chapter-01-b1': 1 },
      finishedId: 'chapter-01-b2',
    })).toMatchObject({ type: 'snack', snackId: 'snack-one' });
  });

  it('returns null when the finished bite was the last one', () => {
    const done = {
      'chapter-01-b1': 1,
      'chapter-01-b2': 1,
      'snack-one': 1,
      'snack-two': 1,
    };
    expect(findAfter({ index, done, finishedId: 'chapter-02-b1' })).toBeNull();
  });

  it('does not mutate the progress map it was handed', () => {
    const done = { 'chapter-01-b1': 1 };
    findAfter({ index, done, finishedId: 'chapter-01-b2' });
    expect(done).toEqual({ 'chapter-01-b1': 1 });
  });
});
