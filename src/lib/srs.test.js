import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyRecord,
  backfillLearnedSchedules,
  buildDueReviewCards,
  dueCards,
  INTERVALS,
  nextIntervalDays,
  prepareReviewCards,
  record,
  srs,
} from './srs.js';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 7, 5, 3);

describe('spaced repetition schedule', () => {
  beforeEach(() => srs.set({}));

  it('schedules a newly correct word for one day later', () => {
    const next = applyRecord({}, '한글', true, NOW);
    expect(next.한글).toEqual({ interval: 1, due: NOW + DAY });
  });

  it('promotes correct answers through the interval ladder', () => {
    let schedule = { 한글: { interval: 1, due: NOW } };
    schedule = applyRecord(schedule, '한글', true, NOW);
    expect(schedule.한글.interval).toBe(3);
    schedule = applyRecord({ 한글: { interval: 30, due: NOW } }, '한글', true, NOW);
    expect(schedule.한글.interval).toBe(60);
    schedule = applyRecord(schedule, '한글', true, NOW);
    expect(schedule.한글.interval).toBe(INTERVALS.at(-1));
  });

  it('resets a wrong answer to one day', () => {
    const next = applyRecord({ 한글: { interval: 14, due: NOW } }, '한글', false, NOW);
    expect(next.한글).toEqual({ interval: 1, due: NOW + DAY });
  });

  it('resets a starred wrong answer to half a day', () => {
    const result = record('한글', false, NOW, true);
    expect(result).toEqual({ interval: 0.5, due: NOW + DAY / 2 });
  });

  it('includes the exact boundary time and sorts the oldest cards first', () => {
    const schedule = {
      미래: { interval: 1, due: NOW + 1 },
      경계: { interval: 1, due: NOW },
      오래됨: { interval: 1, due: NOW - DAY },
    };
    expect(dueCards(NOW, schedule).map((card) => card.ko)).toEqual(['오래됨', '경계']);
  });

  it('returns an empty queue for an empty map or future cards', () => {
    expect(dueCards(NOW, {})).toEqual([]);
    expect(dueCards(NOW, { 내일: { interval: 1, due: NOW + DAY } })).toEqual([]);
  });

  it('alternates forward and reverse review cards with three Korean choices', () => {
    const learned = [
      { kind: 'guess', word: { ko: '가다', en: 'to go', pos: 'verb' }, options: ['to go', 'to eat', 'to see'] },
      { kind: 'guess', word: { ko: '먹다', en: 'to eat', pos: 'verb' }, options: ['to eat', 'to go', 'to see'] },
      { kind: 'guess', word: { ko: '보다', en: 'to see', pos: 'verb' }, options: ['to see', 'to go', 'to eat'] },
    ];
    const cards = prepareReviewCards(learned, learned);
    expect(cards.map((card) => card.direction)).toEqual(['ko→en', 'en→ko', 'ko→en']);
    expect(cards[1].options).toHaveLength(3);
    expect(cards[1].options).toContain('먹다');
  });

  it('builds a due review bite in overdue order and caps its size', () => {
    const learned = Array.from({ length: 10 }, (_, index) => ({
      kind: 'guess', word: { ko: `단어${index}`, en: `word ${index}`, pos: 'noun' }, options: [`word ${index}`],
    }));
    const schedule = Object.fromEntries(learned.map((card, index) => [card.word.ko, { interval: 1, due: NOW - (10 - index) }]));
    const cards = buildDueReviewCards(learned, schedule, NOW, 8);
    expect(cards).toHaveLength(8);
    expect(cards[0].word.ko).toBe('단어0');
  });

  // order 27: the reveal tells the learner when the word comes back. It must be
  // the exact number record() is about to write, never a second guess at it.
  it('previews the same interval record would store for a first correct answer', () => {
    expect(nextIntervalDays({}, '한글', true)).toBe(INTERVALS[0]);
    expect(nextIntervalDays({ 한글: { interval: 1, due: NOW } }, '한글', true)).toBe(INTERVALS[1]);
    expect(nextIntervalDays({}, '한글', true)).toBe(applyRecord({}, '한글', true, NOW).한글.interval);
  });

  it('previews the reset interval after a miss, halved for a starred word', () => {
    const schedule = { 한글: { interval: 30, due: NOW } };
    expect(nextIntervalDays(schedule, '한글', false)).toBe(1);
    expect(nextIntervalDays(schedule, '한글', false, true)).toBe(0.5);
    expect(nextIntervalDays(schedule, '한글', false)).toBe(applyRecord(schedule, '한글', false, NOW).한글.interval);
  });

  it('backfills existing learned words as immediately due without replacing schedules', () => {
    const learned = [
      { word: { ko: '한글' } },
      { word: { ko: '문법' } },
    ];
    const schedule = { 한글: { interval: 7, due: NOW + DAY } };
    const next = backfillLearnedSchedules(schedule, learned, NOW);

    expect(next.한글).toEqual(schedule.한글);
    expect(next.문법).toEqual({ interval: 1, due: NOW });
  });
});
