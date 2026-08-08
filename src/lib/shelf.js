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
