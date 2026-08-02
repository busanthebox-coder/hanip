export function chapterLevel(number) {
  if (number <= 11) return 'A1';
  if (number <= 34) return 'A2';
  if (number <= 56) return 'B1';
  if (number <= 63) return 'B2';
  return 'C1';
}
