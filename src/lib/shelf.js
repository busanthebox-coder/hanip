export const SHELF_OPEN_KEY = 'hanip.shelf-open-v1';

export const LEVEL_GROUPS = [
  { id: 'A1', label: 'A1 Foundation' },
  { id: 'A2', label: 'A2 Builder' },
  { id: 'B1', label: 'B1 Independent' },
  { id: 'B2', label: 'B2 Control' },
  { id: 'C1', label: 'C1 Written' },
];

function isDone(done, bite) {
  return Boolean(done && done[bite.id]);
}

// A level used to own one unbroken run of chapters; from 66 on the course
// interleaves B2 and C1, so the header names each run instead of spanning the
// gap and claiming chapters that belong to the neighbouring level.
export function chapterRangeLabel(chapters) {
  const numbers = [...new Set((chapters || []).map((chapter) => chapter.number))].sort((a, b) => a - b);
  if (!numbers.length) return 'No chapters';
  const runs = [];
  for (const number of numbers) {
    const last = runs[runs.length - 1];
    if (last && number === last[1] + 1) last[1] = number;
    else runs.push([number, number]);
  }
  const body = runs.map(([from, to]) => (from === to ? `${from}` : `${from}–${to}`)).join(', ');
  return `${numbers.length === 1 ? 'Chapter' : 'Chapters'} ${body}`;
}

export function buildShelfGroups(chapters, done, snacks = []) {
  return LEVEL_GROUPS.map((level) => {
    const groupedChapters = chapters.filter((chapter) => chapter.level === level.id);
    const bites = groupedChapters.flatMap((chapter) => chapter.bites);
    const groupedSnacks = snacks.filter((snack) => snack.level === level.id);
    return {
      ...level,
      chapters: groupedChapters,
      snacks: groupedSnacks,
      done: bites.filter((bite) => isDone(done, bite)).length
        + groupedSnacks.filter((snack) => isDone(done, snack)).length,
      total: bites.length + groupedSnacks.length,
    };
  });
}

// Order 28: finishing the last bite of a chapter stamps it. Called from the win
// screen while the closing bite is still open, so that bite counts as done here
// — and the ordinal says how many seals the level has collected, because a
// completion the learner can see stacking up is a trace, not a number.
export function chapterSealInfo(chapters, chapterId, done, finishedId) {
  const chapter = (chapters || []).find((item) => item.id === chapterId);
  if (!chapter?.bites?.length) return null;
  const closed = (item) => isDone(done, item) || item.id === finishedId;
  if (!chapter.bites.every(closed)) return null;
  const ordinal = (chapters || [])
    .filter((item) => item.level === chapter.level && item.number <= chapter.number)
    .filter((item) => (item.bites || []).length && item.bites.every(closed))
    .length;
  return { number: chapter.number, level: chapter.level, ordinal };
}

export function defaultOpenLevels(chapters, done) {
  const nextChapter = chapters.find((chapter) => chapter.bites.some((bite) => !isDone(done, bite)));
  return [nextChapter ? nextChapter.level : LEVEL_GROUPS[0].id];
}

export function parseStoredOpenLevels(raw, fallback) {
  if (raw === null || raw === undefined) return [...fallback];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...fallback];
    const valid = new Set(LEVEL_GROUPS.map((level) => level.id));
    return [...new Set(parsed.filter((level) => valid.has(level)))];
  } catch {
    return [...fallback];
  }
}

function chapterMatches(chapter, query) {
  const searchable = [
    chapter.number,
    chapter.title,
    chapter.goal,
    ...chapter.bites.flatMap((bite) => [bite.title, bite.firstWord]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  return searchable.includes(query);
}

export function filterShelfGroups(groups, query) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return groups;
  return groups
    .map((group) => {
      const chapters = group.chapters.filter((chapter) => chapterMatches(chapter, normalized));
      const numbers = new Set(chapters.map((chapter) => chapter.number));
      return { ...group, chapters, snacks: group.snacks.filter((snack) => numbers.has(snack.afterChapter)) };
    })
    .filter((group) => group.chapters.length > 0);
}
