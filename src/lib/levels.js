// Chapters 1-65 were ingested while the parent course still ran contiguous
// level bands, so their verdicts stay range-derived and frozen. From 66 on the
// parent interleaves B2 and C1, so each new chapter carries its own entry —
// mirrored from the parent's `level` field for that rich-chapter id (order 25).
const explicitLevels = {
  66: 'B2', 67: 'B2', 68: 'B2', 69: 'B2',
  70: 'C1', 71: 'C1', 72: 'C1',
};

export function chapterLevel(number) {
  if (number <= 11) return 'A1';
  if (number <= 34) return 'A2';
  if (number <= 56) return 'B1';
  if (number <= 63) return 'B2';
  if (number <= 65) return 'C1';
  return explicitLevels[number] || 'C1';
}
