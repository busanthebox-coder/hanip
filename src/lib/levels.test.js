import { describe, expect, it } from 'vitest';
import { chapterLevel } from './levels.js';

// The first 65 chapters were ingested while the level boundaries were contiguous
// ranges, so their verdicts are frozen: this table is the pre-order-25 function
// written out longhand. Any change here means a shipped chapter changed level.
const legacyRanges = (n) => {
  if (n <= 11) return 'A1';
  if (n <= 34) return 'A2';
  if (n <= 56) return 'B1';
  if (n <= 63) return 'B2';
  return 'C1';
};

describe('chapterLevel', () => {
  it('leaves every shipped chapter (1-65) on the level it was ingested with', () => {
    for (let n = 1; n <= 65; n += 1) {
      expect([n, chapterLevel(n)]).toEqual([n, legacyRanges(n)]);
    }
  });

  it('keeps the range boundaries exact', () => {
    expect([1, 11, 12, 34, 35, 56, 57, 63, 64, 65].map(chapterLevel)).toEqual([
      'A1', 'A1', 'A2', 'A2', 'B1', 'B1', 'B2', 'B2', 'C1', 'C1',
    ]);
  });

  // Order 25: 66+ breaks the contiguous ranges — the parent course interleaves
  // B2 (66-69) and C1 (70-72), so the level comes from an explicit table that
  // mirrors the parent's `level` field per rich-chapter id.
  it('reads 66-72 from the explicit table, not from the 64+ range fallback', () => {
    expect([66, 67, 68, 69, 70, 71, 72].map(chapterLevel)).toEqual([
      'B2', 'B2', 'B2', 'B2', 'C1', 'C1', 'C1',
    ]);
  });

  it('falls back to C1 for chapters that have not been ingested yet', () => {
    expect(chapterLevel(73)).toBe('C1');
  });
});
