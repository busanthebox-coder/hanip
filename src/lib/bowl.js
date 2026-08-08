// The bowl is the one metaphor the whole app repeats: home, the win screen, the
// week strip and the Today tab all draw THIS geometry. Sizes change, the path
// never does — so it lives here once and Bowl.svelte is its only renderer.
//
// Coordinates are the 0 0 100 100 viewBox of spec-v5 (frame 8). Inside the bowl
// the rice surface can travel from y=72 (the inner floor) up to y=30 (the rim),
// which is why fill maps linearly onto those two numbers.
export const BOWL_VIEWBOX = '0 0 100 100';
const RICE_FLOOR = 72;
const RICE_RIM = 30;
const RICE_BULGE = 3.2;

// body: a variable-width ink ribbon, not an even stroke — this is what makes it
// read as a brush mark rather than a geometric pictogram
export const BOWL_BODY = 'M10 30C10.6 52 22 78 50 78C78 78 89.4 52 90 30L84.2 30C83.6 50 72.5 72 50 72C27.5 72 16.4 50 15.8 30Z';
// rim (전): a lens that is thick in the middle and vanishes at both ends
export const BOWL_RIM = 'M6.5 29.4C22 25 78 25 93.5 28.6C78 32.8 22 32.8 6.5 29.4Z';
// foot (굽): without it the silhouette reads as a cup, not a rice bowl
export const BOWL_FOOT = 'M38 70V80Q38 83 41.5 83H58.5Q62 83 62 80V70';
// the inner wall, used to clip the rice so it can never spill past the ink
export const BOWL_CLIP = 'M15.8 30C16.4 50 27.5 72 50 72C72.5 72 83.6 50 84.2 30Z';
// 고봉 — the cap that rises over the rim when the day's goal is met
export const BOWL_HEAP = 'M22 31C30 8.5 70 8.5 78 31Z';

// The same silhouette (rim – body – foot) abbreviated to strokes for the tab
// bar, where a filled ink mass would out-weigh the other four icons.
export const BOWL_LINE_VIEWBOX = '0 0 24 24';
export const BOWL_LINE_PATHS = [
  'M2.2 7.4H21.8',
  'M3.2 7.4C3.4 12.5 6.2 18.7 12 18.7C17.8 18.7 20.6 12.5 20.8 7.4',
  'M8.6 17.6V19.9Q8.6 21.2 10 21.2H14Q15.4 21.2 15.4 19.9V17.6',
];

export function clampFill(fill) {
  const value = Number(fill);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(1, value);
}

const round = (value) => Math.round(value * 100) / 100;

// y of the rice surface. Higher fill → smaller y → more gold in the bowl.
export function riceSurface(fill) {
  return round(RICE_FLOOR - (RICE_FLOOR - RICE_RIM) * clampFill(fill));
}

// An empty bowl is a shape branch, not a zero-height rectangle: it draws no
// rice at all, so 0% is ink lines only.
export function ricePath(fill) {
  const filled = clampFill(fill);
  if (filled <= 0) return null;
  const y = riceSurface(filled);
  return `M2 ${y}Q50 ${round(y - RICE_BULGE)} 98 ${y}L98 99 2 99Z`;
}

export function isHeaped(fill) {
  return clampFill(fill) >= 1;
}

// One path at every size; only the stroke weight is corrected, so the
// silhouette survives all the way down to tab-icon scale.
export function bowlScale(size) {
  const px = Number(size) || 0;
  if (px >= 60) return '';
  if (px >= 24) return 'sm';
  return 'xs';
}
