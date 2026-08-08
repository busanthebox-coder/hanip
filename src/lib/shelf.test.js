import { describe, expect, it } from 'vitest';
import {
  LEVEL_GROUPS,
  buildCourseRail,
  buildShelfGroups,
  buildSnackBlock,
  chapterProgress,
  chapterRangeLabel,
  chapterSealInfo,
  currentChapterId,
  defaultOpenLevels,
  filterShelfGroups,
  parseStoredOpenLevels,
} from './shelf.js';

const chapters = [
  {
    id: 'chapter-01',
    number: 1,
    title: '한글 기초',
    level: 'A1',
    bites: [{ id: 'chapter-01-b1', title: '자음' }],
  },
  {
    id: 'chapter-12',
    number: 12,
    title: '추측하기',
    level: 'A2',
    bites: [{ id: 'chapter-12-b1', title: '부탁하다' }],
  },
  {
    id: 'chapter-35',
    number: 35,
    title: '이유 설명',
    level: 'B1',
    bites: [{ id: 'chapter-35-b1', title: '거든요' }],
  },
  {
    id: 'chapter-57',
    number: 57,
    title: '사동 표현',
    level: 'B2',
    bites: [{ id: 'chapter-57-b1', title: '먹이다' }],
  },
  {
    id: 'chapter-64',
    number: 64,
    title: '채팅 줄임말',
    level: 'C1',
    bites: [{ id: 'chapter-64-b1', title: 'ㅋㅋ' }],
  },
];

describe('shelf level grouping', () => {
  it('defines the five ordered course groups with the required labels', () => {
    expect(LEVEL_GROUPS.map(({ id, label }) => [id, label])).toEqual([
      ['A1', 'A1 Foundation'],
      ['A2', 'A2 Builder'],
      ['B1', 'B1 Independent'],
      ['B2', 'B2 Control'],
      ['C1', 'C1 Written'],
    ]);
  });

  /* order 25: from chapter 66 on the course interleaves B2 and C1, so a group's
     chapters are no longer one unbroken run — "Chapters 57–69" would claim 64
     and 65 for B2 when they are C1. */
  it('names a level\'s chapters as runs, so an interleaved group cannot overclaim', () => {
    const numbered = (numbers) => numbers.map((number) => ({ number }));
    expect(chapterRangeLabel(numbered([57, 58, 59, 60, 61, 62, 63, 66, 67, 68, 69])))
      .toBe('Chapters 57–63, 66–69');
    expect(chapterRangeLabel(numbered([64, 65, 70, 71, 72]))).toBe('Chapters 64–65, 70–72');
    expect(chapterRangeLabel(numbered([1, 2, 3]))).toBe('Chapters 1–3');
    expect(chapterRangeLabel(numbered([7]))).toBe('Chapter 7');
    expect(chapterRangeLabel([])).toBe('No chapters');
  });

  it('counts completed and total chapters within each level', () => {
    const groups = buildShelfGroups(chapters, {
      'chapter-01-b1': 1,
      'chapter-57-b1': 1,
    });

    expect(groups.map(({ id, done, total }) => [id, done, total])).toEqual([
      ['A1', 1, 1],
      ['A2', 0, 1],
      ['B1', 0, 1],
      ['B2', 1, 1],
      ['C1', 0, 1],
    ]);
  });

  /* order 31: a level's progress counts chapters, not bites. "11/11 chapters"
     places you on the course; "100/100 bites" only measures labour. Three of
     these four bites are done and still only one chapter has closed. */
  it('counts a level by finished chapters, not by finished bites', () => {
    const paired = [
      { id: 'chapter-01', number: 1, level: 'A1', bites: [{ id: 'a' }, { id: 'b' }] },
      { id: 'chapter-02', number: 2, level: 'A1', bites: [{ id: 'c' }, { id: 'd' }] },
    ];
    const a1 = buildShelfGroups(paired, { a: 1, b: 1, c: 1 }).find((group) => group.id === 'A1');
    expect([a1.done, a1.total]).toEqual([1, 2]);
  });

  it('places snacks after their chapter without counting them as chapters', () => {
    const snacks = [
      { id: 'snack-survival', afterChapter: 1, level: 'A1', title: 'Survival', cardCount: 4 },
      { id: 'snack-cafe', afterChapter: 12, level: 'A2', title: 'Cafe', cardCount: 5 },
    ];
    const groups = buildShelfGroups(chapters, { 'chapter-01-b1': 1, 'snack-survival': 1 }, snacks);
    const a1 = groups.find((group) => group.id === 'A1');
    const a2 = groups.find((group) => group.id === 'A2');

    expect(a1.snacks).toEqual([snacks[0]]);
    expect([a1.done, a1.total]).toEqual([1, 1]);
    expect(a2.snacks).toEqual([snacks[1]]);
    expect([a2.done, a2.total]).toEqual([0, 1]);
  });

  it('opens only the level containing the next unfinished bite by default', () => {
    expect(defaultOpenLevels(chapters, {})).toEqual(['A1']);
    expect(defaultOpenLevels(chapters, { 'chapter-01-b1': 1 })).toEqual(['A2']);
  });

  it('restores only valid persisted level ids and falls back after corrupt data', () => {
    expect(parseStoredOpenLevels('["A2","C1","bogus"]', ['A1'])).toEqual(['A2', 'C1']);
    expect(parseStoredOpenLevels('[]', ['A1'])).toEqual([]);
    expect(parseStoredOpenLevels('{broken', ['A1'])).toEqual(['A1']);
  });

  it('finds a chapter by number, chapter title, or bite title such as 부탁', () => {
    const groups = buildShelfGroups(chapters, {});
    expect(filterShelfGroups(groups, '64').flatMap((group) => group.chapters).map((ch) => ch.number)).toEqual([64]);
    expect(filterShelfGroups(groups, '사동').flatMap((group) => group.chapters).map((ch) => ch.number)).toEqual([57]);
    expect(filterShelfGroups(groups, '부탁').flatMap((group) => group.chapters).map((ch) => ch.number)).toEqual([12]);
  });
});

/* order 31, defect 5: the three states used to be a 24px seal, a "5/8 + 38px
   bar" and a faded "0/8" — three widths, three shapes, no column to compare in.
   One judgement now names all three so they can share one 22px cell. */
describe('chapterProgress', () => {
  const chapter = { id: 'chapter-01', number: 1, bites: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };

  it('reads an untouched chapter as idle', () => {
    expect(chapterProgress(chapter, {})).toEqual({ done: 0, total: 3, state: 'idle' });
  });

  it('reads a started chapter as active with its exact fraction', () => {
    expect(chapterProgress(chapter, { a: 1, b: 1 })).toEqual({ done: 2, total: 3, state: 'active' });
  });

  it('reads a finished chapter as done', () => {
    expect(chapterProgress(chapter, { a: 1, b: 1, c: 1 })).toEqual({ done: 3, total: 3, state: 'done' });
  });

  it('never calls an empty chapter done — nothing was closed', () => {
    expect(chapterProgress({ id: 'chapter-99', bites: [] }, {})).toEqual({ done: 0, total: 0, state: 'idle' });
    expect(chapterProgress(null, {})).toEqual({ done: 0, total: 0, state: 'idle' });
  });
});

/* order 31, decision (i): the goal sentence and the exact fraction belong to one
   row in 72 — the one the learner is standing in. A finished chapter's goal is a
   memory and an untouched chapter's goal is a spoiler. */
describe('currentChapterId', () => {
  it('names the first chapter that still holds an unfinished bite', () => {
    expect(currentChapterId(chapters, {})).toBe('chapter-01');
    expect(currentChapterId(chapters, { 'chapter-01-b1': 1 })).toBe('chapter-12');
  });

  it('returns null once the whole course is closed, so no row claims to be current', () => {
    const done = Object.fromEntries(chapters.map((chapter) => [chapter.bites[0].id, 1]));
    expect(currentChapterId(chapters, done)).toBe(null);
    expect(currentChapterId([], {})).toBe(null);
  });
});

/* order 31, defect 6: 72 chapters as 72 ticks, so "where am I" is answered by a
   length instead of a sentence. */
describe('buildCourseRail', () => {
  it('gives every chapter one tick, grouped by level, and marks exactly one as now', () => {
    const rail = buildCourseRail(chapters, { 'chapter-01-b1': 1 });

    expect(rail.levels.map((level) => level.id)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
    expect(rail.levels.flatMap((level) => level.ticks.map((tick) => tick.state)))
      .toEqual(['done', 'now', 'idle', 'idle', 'idle']);
    expect(rail.levels.flatMap((level) => level.ticks).length).toBe(chapters.length);
    expect([rail.done, rail.total, rail.current]).toEqual([1, 5, 12]);
  });

  it('drops a level that owns no chapters instead of drawing an empty run', () => {
    const rail = buildCourseRail(chapters.filter((chapter) => chapter.level !== 'C1'), {});
    expect(rail.levels.map((level) => level.id)).toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  it('leaves no now tick when the course is finished', () => {
    const done = Object.fromEntries(chapters.map((chapter) => [chapter.bites[0].id, 1]));
    const rail = buildCourseRail(chapters, done);
    expect(rail.levels.flatMap((level) => level.ticks).every((tick) => tick.state === 'done')).toBe(true);
    expect([rail.done, rail.current]).toEqual([5, 0]);
  });
});

/* order 31, defect 2: a snack stopped being a sibling of the chapter. Collapsed
   it is one summary line inside the chapter block; expanded it becomes rows and
   drops the label, because by then its position says what it is. */
describe('buildSnackBlock', () => {
  const snacks = [
    { id: 'snack-a', afterChapter: 2, title: 'Survival Help', cardCount: 10 },
    { id: 'snack-b', afterChapter: 2, title: 'Family Words', cardCount: 14 },
    { id: 'snack-c', afterChapter: 3, title: 'Numbers Starter', cardCount: 23 },
  ];

  it('collapses to one summary line by default', () => {
    expect(buildSnackBlock(snacks, 2)).toEqual({
      open: false,
      count: 2,
      label: 'Snacks 2',
      summary: 'Survival Help, Family Words',
      items: [],
    });
  });

  it('hands back the individual snacks once that chapter is expanded', () => {
    const block = buildSnackBlock(snacks, 2, [2]);
    expect(block.open).toBe(true);
    expect(block.items.map((snack) => snack.id)).toEqual(['snack-a', 'snack-b']);
  });

  it('expands one chapter at a time, not every chapter with snacks', () => {
    expect(buildSnackBlock(snacks, 3, [2]).open).toBe(false);
  });

  it('draws nothing for a chapter with no snacks', () => {
    expect(buildSnackBlock(snacks, 9, [9])).toBe(null);
    expect(buildSnackBlock([], 2)).toBe(null);
  });
});

describe('chapterSealInfo', () => {
  const sealChapters = [
    { id: 'chapter-01', number: 1, level: 'A1', bites: [{ id: 'c1-b1' }, { id: 'c1-b2' }] },
    { id: 'chapter-02', number: 2, level: 'A1', bites: [{ id: 'c2-b1' }] },
    { id: 'chapter-12', number: 12, level: 'A2', bites: [{ id: 'c12-b1' }] },
  ];

  it('stays silent while the chapter still has bites left', () => {
    expect(chapterSealInfo(sealChapters, 'chapter-01', {}, 'c1-b1')).toBe(null);
  });

  it('seals the chapter on the bite that closes it', () => {
    expect(chapterSealInfo(sealChapters, 'chapter-01', { 'c1-b1': 1 }, 'c1-b2'))
      .toEqual({ number: 1, level: 'A1', ordinal: 1 });
  });

  it('counts the seal among the ones already earned in that level', () => {
    const done = { 'c1-b1': 1, 'c1-b2': 1 };
    expect(chapterSealInfo(sealChapters, 'chapter-02', done, 'c2-b1'))
      .toEqual({ number: 2, level: 'A1', ordinal: 2 });
    // a different level counts its own seals, not the whole course
    expect(chapterSealInfo(sealChapters, 'chapter-12', done, 'c12-b1'))
      .toEqual({ number: 12, level: 'A2', ordinal: 1 });
  });

  it('ignores snacks and reviews, which belong to no chapter', () => {
    expect(chapterSealInfo(sealChapters, 'snack-food-basic', {}, 'snack-food-basic')).toBe(null);
    expect(chapterSealInfo(sealChapters, 'review', {}, 'review-2026-08-08')).toBe(null);
  });
});
