import { describe, expect, it } from 'vitest';
import { bowlFill, goalMet, streak, weekActivity } from './stats.js';

const NOW = new Date(2026, 7, 5, 12); // Wednesday

describe('learning stats', () => {
  it('counts a streak ending today', () => {
    expect(streak({ '2026-08-03': 1, '2026-08-04': 2, '2026-08-05': 1 }, NOW)).toBe(3);
  });

  it('stops at the first missed day', () => {
    expect(streak({ '2026-08-03': 1, '2026-08-05': 1 }, NOW)).toBe(1);
  });

  it('keeps yesterday streak visible before todays first bite', () => {
    expect(streak({ '2026-08-02': 1, '2026-08-03': 1, '2026-08-04': 1 }, NOW)).toBe(3);
  });

  it('returns zero when neither today nor yesterday has a bowl', () => {
    expect(streak({ '2026-08-03': 1 }, NOW)).toBe(0);
  });

  it('uses the saved daily goal for full-day status', () => {
    const bowls = { '2026-08-05': 1 };
    expect(goalMet('2026-08-05', bowls, 1)).toBe(true);
    expect(goalMet('2026-08-05', bowls, 2)).toBe(false);
  });

  it('builds a Monday-to-Sunday heatmap with empty, partial, full, and today states', () => {
    const week = weekActivity({ '2026-08-03': 1, '2026-08-04': 2 }, 2, NOW);
    expect(week.map((day) => day.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(week.slice(0, 3).map((day) => day.state)).toEqual(['partial', 'full', 'empty']);
    expect(week.find((day) => day.today)?.key).toBe('2026-08-05');
  });

  // order 27: the home bowl fills against the same daily goal the week strip uses,
  // read straight from the existing bowls map — no new stored field.
  it('fills the home bowl in proportion to the daily goal', () => {
    expect(bowlFill(0, 1)).toBe(0);
    expect(bowlFill(1, 1)).toBe(1);
    expect(bowlFill(1, 2)).toBe(0.5);
    expect(bowlFill(1, 3)).toBeCloseTo(1 / 3, 5);
  });

  it('never overfills the bowl or divides by a missing goal', () => {
    expect(bowlFill(9, 2)).toBe(1);
    expect(bowlFill(2, 0)).toBe(1);
    expect(bowlFill(undefined, undefined)).toBe(0);
    expect(bowlFill(-3, 2)).toBe(0);
  });
});
