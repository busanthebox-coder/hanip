import { describe, expect, it } from 'vitest';
import {
  LEVEL_GROUPS,
  buildShelfGroups,
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
      ['A1', 'A1 기초 Foundation'],
      ['A2', 'A2 쌓기 Builder'],
      ['B1', 'B1 홀로서기 Independent'],
      ['B2', 'B2 정밀 Control'],
      ['C1', 'C1 글말 Written'],
    ]);
  });

  it('counts completed and total bites within each level', () => {
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

  it('places snacks after their chapter and includes them in level progress', () => {
    const snacks = [
      { id: 'snack-survival', afterChapter: 1, level: 'A1', title: 'Survival', cardCount: 4 },
      { id: 'snack-cafe', afterChapter: 12, level: 'A2', title: 'Cafe', cardCount: 5 },
    ];
    const groups = buildShelfGroups(chapters, { 'snack-survival': 1 }, snacks);
    const a1 = groups.find((group) => group.id === 'A1');
    const a2 = groups.find((group) => group.id === 'A2');

    expect(a1.snacks).toEqual([snacks[0]]);
    expect(a1.total).toBe(2);
    expect(a1.done).toBe(1);
    expect(a2.snacks).toEqual([snacks[1]]);
    expect(a2.total).toBe(2);
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
