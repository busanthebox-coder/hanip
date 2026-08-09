import { describe, expect, it } from 'vitest';
import {
  LEVEL_GROUPS,
  TAB_BAR_CLEARANCE,
  buildLevelStrip,
  cardNeedsScroll,
  buildShelfGroups,
  buildSnackBlock,
  chapterProgress,
  chapterRangeLabel,
  chapterSealInfo,
  defaultOpenLevels,
  filterShelfGroups,
  parseStoredOpenLevels,
  shelfFocusCard,
  shelfFocusChapter,
  shelfPosition,
  toggleShelfSearch,
} from './shelf.js';
import { findNext } from './nextBite.js';

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

  /* order 33: the open level has to be the card's level, or a learner who
     skipped ahead opens the shelf on a folded level and the card is nowhere. */
  it('opens the level the card is in, even when an earlier level is unfinished', () => {
    const jumped = [
      { id: 'chapter-01', number: 1, level: 'A1', bites: [{ id: 'c1-b1' }, { id: 'c1-b2' }] },
      { id: 'chapter-35', number: 35, level: 'B1', bites: [{ id: 'c35-b1' }, { id: 'c35-b2' }] },
    ];
    expect(defaultOpenLevels(jumped, { 'c35-b1': 1 })).toEqual(['B1']);
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

/* order 33: the course rail is gone — 72 ticks at 2.8px each answered "where am
   I" with a grey band nobody could read. The three numbers it actually carried
   are all this line needs. */
describe('shelfPosition', () => {
  it('names the chapter the learner is standing in, out of the whole course', () => {
    expect(shelfPosition(chapters, { 'chapter-01-b1': 1 })).toEqual({ current: 12, total: 5, done: 1 });
  });

  it('reports no current chapter once the course is closed', () => {
    const done = Object.fromEntries(chapters.map((chapter) => [chapter.bites[0].id, 1]));
    expect(shelfPosition(chapters, done)).toEqual({ current: 0, total: 5, done: 5 });
  });

  it('survives an empty course', () => {
    expect(shelfPosition([], {})).toEqual({ current: 0, total: 0, done: 0 });
  });
});

/* order 33, diagnosis 2: 72 rows of equal weight meant "carry on here" lost the
   scan to every finished chapter above it. Exactly one chapter is promoted to a
   card, and which one it is is a three-way decision. */
describe('shelfFocusChapter / shelfFocusCard', () => {
  const course = [
    { id: 'chapter-01', number: 1, level: 'A1', bites: [{ id: 'c1-b1' }, { id: 'c1-b2' }] },
    { id: 'chapter-02', number: 2, level: 'A1', bites: [{ id: 'c2-b1' }, { id: 'c2-b2' }] },
    { id: 'chapter-12', number: 12, level: 'A2', bites: [{ id: 'c12-b1' }, { id: 'c12-b2' }] },
  ];

  it('branch 1 — the chapter already in progress takes the card', () => {
    const done = { 'c1-b1': 1, 'c1-b2': 1, 'c2-b1': 1 };
    expect(shelfFocusChapter(course, done).id).toBe('chapter-02');
    const card = shelfFocusCard(course, done);
    expect([card.done, card.total, card.state]).toEqual([1, 2, 'active']);
    expect(card.kicker).toBe('In progress');
  });

  /* a learner who jumped ahead has an untouched chapter sitting *above* a
     started one. Course order stops at the untouched one; the card follows the
     hand instead. Order 31's currentChapterId answered the first way and is
     gone — two rival definitions of "the current chapter" is how a card and a
     header start naming different chapters. */
  it('branch 1 beats an earlier untouched chapter — started outranks first', () => {
    const done = { 'c12-b1': 1 };
    const firstUnfinished = course.find((chapter) => chapter.bites.some((bite) => !done[bite.id]));
    expect(firstUnfinished.id).toBe('chapter-01');
    expect(shelfFocusChapter(course, done).id).toBe('chapter-12');
  });

  it('branch 2 — with nothing started, the next chapter to start takes the card', () => {
    const card = shelfFocusCard(course, {});
    expect(card.chapter.id).toBe('chapter-01');
    expect([card.done, card.total, card.state]).toEqual([0, 2, 'idle']);
    expect(card.kicker).toBe('Up next');
  });

  it('branch 3 — a finished course has no card at all', () => {
    const done = Object.fromEntries(course.flatMap((chapter) => chapter.bites.map((bite) => [bite.id, 1])));
    expect(shelfFocusChapter(course, done)).toBe(null);
    expect(shelfFocusCard(course, done)).toBe(null);
    expect(shelfFocusCard([], {})).toBe(null);
  });

  it('never offers an empty chapter as the one to start next', () => {
    const withHole = [{ id: 'chapter-00', number: 0, level: 'A1', bites: [] }, ...course];
    expect(shelfFocusChapter(withHole, {}).id).toBe('chapter-01');
  });

  /* the card's button continues *this chapter*. Home picks the next bite in the
     whole course — same learner, same moment, different destination. */
  it('the CTA opens this chapter\'s next unfinished bite, not the course-wide next', () => {
    const done = { 'c12-b1': 1 };
    expect(shelfFocusCard(course, done).nextBite.id).toBe('c12-b2');
    expect(findNext({ index: { chapters: course, snacks: [] }, done }).biteId).toBe('c1-b1');
  });

  it('holds no next bite once that chapter is closed, so the card cannot dead-end', () => {
    const done = { 'c1-b1': 1, 'c1-b2': 1 };
    const card = shelfFocusCard(course, done);
    expect(card.chapter.id).toBe('chapter-02');
    expect(card.nextBite.id).toBe('c2-b1');
  });
});

/* order 33, diagnosis 1: the rail's five labels could not be tapped and never
   said 2/23. The strip says the fraction in chapters and is a jump control. */
describe('buildLevelStrip', () => {
  it('counts each level in chapters, not bites, and marks where the learner stands', () => {
    const paired = [
      { id: 'chapter-01', number: 1, level: 'A1', bites: [{ id: 'a' }, { id: 'b' }] },
      { id: 'chapter-02', number: 2, level: 'A1', bites: [{ id: 'c' }, { id: 'd' }] },
      { id: 'chapter-12', number: 12, level: 'A2', bites: [{ id: 'e' }] },
    ];
    const strip = buildLevelStrip(paired, { a: 1, b: 1, c: 1 });

    expect(strip.map((cell) => [cell.id, cell.done, cell.total])).toEqual([['A1', 1, 2], ['A2', 0, 1]]);
    expect(strip.map((cell) => cell.here)).toEqual([true, false]);
    expect(strip.map((cell) => cell.percent)).toEqual([50, 0]);
  });

  it('keeps the five course levels in order and drops the ones holding no chapters', () => {
    expect(buildLevelStrip(chapters, {}).map((cell) => cell.id)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
    expect(buildLevelStrip(chapters.filter((chapter) => chapter.level !== 'C1'), {}).map((cell) => cell.id))
      .toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  it('fills a finished level to 100 and marks no level as here once the course closes', () => {
    const done = Object.fromEntries(chapters.map((chapter) => [chapter.bites[0].id, 1]));
    const strip = buildLevelStrip(chapters, done);
    expect(strip.every((cell) => cell.percent === 100)).toBe(true);
    expect(strip.some((cell) => cell.here)).toBe(false);
  });
});

/* order 33: entering the shelf lands on the card, but only when the card is not
   already on screen — scrolling past the title line and the level strip on
   every visit would rebuild the always-on band the strip just replaced. */
describe('cardNeedsScroll', () => {
  const VIEWPORT = 763;          // 390×763 phone
  const FLOOR = VIEWPORT - TAB_BAR_CLEARANCE;   // 685
  const box = (top, height) => ({ top, height, bottom: top + height });

  it('leaves the page alone when the card is fully inside the readable band', () => {
    expect(cardNeedsScroll(box(356, 196), VIEWPORT)).toBe(false);
  });

  it('scrolls when the card is below the fold, where it would never be found', () => {
    expect(cardNeedsScroll(box(1400, 196), VIEWPORT)).toBe(true);
  });

  it('scrolls when the card has been left above the top of the viewport', () => {
    expect(cardNeedsScroll(box(-150, 196), VIEWPORT)).toBe(true);
  });

  /* a card whose CTA is under the tab bar is not "there" either, so the test is
     share visible rather than distance */
  it('holds at exactly four fifths visible and scrolls one pixel past it', () => {
    const height = 200;
    expect(cardNeedsScroll(box(FLOOR - 160, height), VIEWPORT)).toBe(false);   // 160/200 = 80%
    expect(cardNeedsScroll(box(FLOOR - 159, height), VIEWPORT)).toBe(true);    // 159/200 < 80%
  });

  it('counts the tab bar as covered, not as readable', () => {
    // sitting entirely in the 78px strip the tab bar occupies
    expect(cardNeedsScroll(box(VIEWPORT - 70, 60), VIEWPORT)).toBe(true);
  });

  it('asks for no scroll when there is no card to scroll to', () => {
    expect(cardNeedsScroll(null, VIEWPORT)).toBe(false);
    expect(cardNeedsScroll(box(0, 0), VIEWPORT)).toBe(false);
    expect(cardNeedsScroll(box(0, 196), 0)).toBe(false);
  });
});

/* order 33: search is folded to a 44px icon but not killed. Closing it has to
   drop the query too — a filter left running behind a shut field would hide
   chapters with nothing on screen to explain why. */
describe('toggleShelfSearch', () => {
  it('opens the field with whatever was typed before', () => {
    expect(toggleShelfSearch(false, '기로')).toEqual({ open: true, query: '기로' });
  });

  it('clears the query on the way out, so no invisible filter survives', () => {
    expect(toggleShelfSearch(true, '기로')).toEqual({ open: false, query: '' });
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
