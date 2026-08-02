export const SHELF_OPEN_KEY = 'hanip.shelf-open-v1';

export const LEVEL_GROUPS = [
  { id: 'A1', label: 'A1 기초 Foundation' },
  { id: 'A2', label: 'A2 쌓기 Builder' },
  { id: 'B1', label: 'B1 홀로서기 Independent' },
  { id: 'B2', label: 'B2 정밀 Control' },
  { id: 'C1', label: 'C1 글말 Written' },
];

function isDone(done, bite) {
  return Boolean(done && done[bite.id]);
}

export function buildShelfGroups(chapters, done) {
  return LEVEL_GROUPS.map((level) => {
    const groupedChapters = chapters.filter((chapter) => chapter.level === level.id);
    const bites = groupedChapters.flatMap((chapter) => chapter.bites);
    return {
      ...level,
      chapters: groupedChapters,
      done: bites.filter((bite) => isDone(done, bite)).length,
      total: bites.length,
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
    .map((group) => ({
      ...group,
      chapters: group.chapters.filter((chapter) => chapterMatches(chapter, normalized)),
    }))
    .filter((group) => group.chapters.length > 0);
}
