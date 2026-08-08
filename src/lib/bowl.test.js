import { describe, expect, it } from 'vitest';
import {
  BOWL_HEAP,
  bowlScale,
  clampFill,
  isHeaped,
  riceSurface,
  ricePath,
} from './bowl.js';

describe('bowl fill geometry', () => {
  it('draws no rice at all when the bowl is empty', () => {
    // 0% is a shape branch, not a zero-height rectangle: the empty bowl is
    // ink lines only, so nothing gold may render.
    expect(ricePath(0)).toBe(null);
    expect(ricePath(-1)).toBe(null);
    expect(isHeaped(0)).toBe(false);
  });

  it('heaps the rice over the rim at 100%', () => {
    // 고봉: the surface reaches the rim line (y=30) and the heap cap appears.
    expect(riceSurface(1)).toBe(30);
    expect(isHeaped(1)).toBe(true);
    expect(ricePath(1)).toBe('M2 30Q50 26.8 98 30L98 99 2 99Z');
    expect(BOWL_HEAP).toContain('M22 31');
  });

  it('rises monotonically between the two branches', () => {
    // spec-v5 frame 8 quotes 40% at y=55.2 and the week strip 50% at y=51
    expect(riceSurface(0.4)).toBe(55.2);
    expect(riceSurface(0.5)).toBe(51);
    expect(riceSurface(0.25)).toBe(61.5);
    expect(riceSurface(0.4)).toBeGreaterThan(riceSurface(0.5));
    // the surface bulges: the quadratic control point sits above the edges
    expect(ricePath(0.4)).toBe('M2 55.2Q50 52 98 55.2L98 99 2 99Z');
  });

  it('clamps fills that come from a goal the learner already passed', () => {
    expect(clampFill(3)).toBe(1);
    expect(clampFill(-2)).toBe(0);
    expect(clampFill(undefined)).toBe(0);
    expect(clampFill(0.5)).toBe(0.5);
    expect(isHeaped(2)).toBe(true);
  });
});

describe('bowl optical correction by size', () => {
  it('leaves large bowls unstroked and thickens the small ones', () => {
    // one path at every size; only the stroke weight is corrected so the
    // silhouette survives at tab-icon scale.
    expect(bowlScale(132)).toBe('');
    expect(bowlScale(112)).toBe('');
    expect(bowlScale(86)).toBe('');
    expect(bowlScale(60)).toBe('');
    expect(bowlScale(44)).toBe('sm');
    expect(bowlScale(34)).toBe('sm');
    expect(bowlScale(26)).toBe('sm');
    expect(bowlScale(23)).toBe('xs');
    expect(bowlScale(16)).toBe('xs');
  });
});
