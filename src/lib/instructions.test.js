import { describe, expect, it } from 'vitest';
import bites from './bites.json';
import snacks from './snacks.json';
import { biteLevel, instructionLead, instructionLeadFor } from './instructions.js';

describe('biteLevel', () => {
  it('reads a chapter bite off its chapterId', () => {
    expect(biteLevel({ id: 'chapter-01-b1', chapterId: 'chapter-01' })).toBe('A1');
    expect(biteLevel({ id: 'chapter-40-b3', chapterId: 'chapter-40' })).toBe('B1');
    expect(biteLevel({ id: 'chapter-70-b2', chapterId: 'chapter-70' })).toBe('C1');
  });

  it('falls back to the bite id when chapterId is absent', () => {
    expect(biteLevel({ id: 'chapter-12-b8' })).toBe('A2');
  });

  // Snacks are vocab packs, not chapters: they carry their own level and are
  // anchored after a chapter rather than inside one.
  it('prefers a snack’s own level field over any id parsing', () => {
    expect(biteLevel({ id: 'snack-survival-basics', afterChapter: 1, level: 'A1' })).toBe('A1');
    expect(biteLevel({ id: 'snack-work-life', afterChapter: 52, level: 'B1' })).toBe('B1');
  });

  it('returns null for a bite it cannot place instead of guessing', () => {
    expect(biteLevel({ id: 'pack-transport' })).toBe(null);
    expect(biteLevel({})).toBe(null);
    expect(biteLevel(null)).toBe(null);
  });
});

describe('instructionLead', () => {
  // Order 34: at A1 the learner cannot yet read a Korean instruction, so the
  // language they can act on leads. From A2 the Korean instruction leads again
  // (tab-contract 언어 정책 rule 4).
  it('leads with English through A1 and with Korean from A2 on', () => {
    expect(['A1', 'A2', 'B1', 'B2', 'C1'].map(instructionLead)).toEqual([
      'en', 'ko', 'ko', 'ko', 'ko',
    ]);
  });

  it('covers every A1 chapter and no chapter past it', () => {
    for (let n = 1; n <= 11; n += 1) {
      expect([n, instructionLead(biteLevel({ id: `chapter-${String(n).padStart(2, '0')}-b1` }))]).toEqual([n, 'en']);
    }
    for (let n = 12; n <= 72; n += 1) {
      expect([n, instructionLead(biteLevel({ id: `chapter-${String(n).padStart(2, '0')}-b1` }))]).toEqual([n, 'ko']);
    }
  });

  // An unplaceable bite must not silently switch the UI language: order 27's
  // Korean-led instruction stays the default.
  it('keeps the order-27 default when the level is unknown', () => {
    expect(instructionLead(null)).toBe('ko');
    expect(instructionLead(undefined)).toBe('ko');
  });
});

// The unit cases above are only worth anything if the shipped bites actually
// carry what biteLevel reads. This walks the compiled course instead of a
// fixture, so a compiler change that drops chapterId fails here rather than
// silently flipping every instruction to English.
describe('the compiled course', () => {
  const allBites = bites.chapters.flatMap((ch) => ch.bites.map((b) => [ch.number, b]));

  it('gives every bite a level, and A1 is exactly chapters 1-11', () => {
    const unplaceable = allBites.filter(([, b]) => biteLevel(b) === null);
    expect(unplaceable.map(([, b]) => b.id)).toEqual([]);

    const wrong = allBites.filter(([number, b]) => instructionLeadFor(b) !== (number <= 11 ? 'en' : 'ko'));
    expect(wrong.map(([number, b]) => `${b.id}@ch${number}`)).toEqual([]);
  });

  it('leads English on the A1 bites and Korean on everything above', () => {
    const en = allBites.filter(([, b]) => instructionLeadFor(b) === 'en');
    expect(en.length).toBe(allBites.filter(([number]) => number <= 11).length);
    expect(en.length).toBeGreaterThan(0);
    expect(en.length).toBeLessThan(allBites.length);
  });

  it('places every snack off its own level field', () => {
    const packs = Array.isArray(snacks) ? snacks : (snacks.snacks || Object.values(snacks));
    expect(packs.length).toBeGreaterThan(0);
    for (const pack of packs) {
      expect([pack.id, biteLevel(pack)]).toEqual([pack.id, pack.level]);
    }
  });
});
