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

// Order 31: three states share one 22px cell — an empty ring, a gold arc, a
// seal. Naming the state here is what lets the level header, the chapter row
// and the course rail all compare in the same column.
export function chapterProgress(chapter, done) {
  const bites = (chapter && chapter.bites) || [];
  const total = bites.length;
  const finished = bites.filter((bite) => isDone(done, bite)).length;
  return { done: finished, total, state: total && finished >= total ? 'done' : finished ? 'active' : 'idle' };
}

// The one chapter the learner is standing in: the first still holding an
// unfinished bite. Exactly one row in 72 earns the ink rail, the goal sentence
// and the exact fraction — a finished chapter's goal is a memory and an
// untouched one's is a spoiler.
export function currentChapterId(chapters, done) {
  const chapter = (chapters || []).find((item) => (item.bites || []).some((bite) => !isDone(done, bite)));
  return chapter ? chapter.id : null;
}

export function buildShelfGroups(chapters, done, snacks = []) {
  return LEVEL_GROUPS.map((level) => {
    const groupedChapters = (chapters || []).filter((chapter) => chapter.level === level.id);
    const groupedSnacks = (snacks || []).filter((snack) => snack.level === level.id);
    return {
      ...level,
      chapters: groupedChapters,
      snacks: groupedSnacks,
      // Order 31: count chapters, not bites. "3 of 22 done" places you on the
      // course; "100/100 bites" is a workload. Snacks are listed beside the
      // chapters but are recommendations, not course positions, so they do not
      // move this number — the bite counts live one tap down, inside a chapter.
      done: groupedChapters.filter((chapter) => chapterProgress(chapter, done).state === 'done').length,
      total: groupedChapters.length,
    };
  });
}

// Order 31, defect 6: 72 chapters drawn as 72 ticks, so "where am I in the
// course" is answered by a length instead of a sentence. Grouped by level
// rather than by course order — the rail gives a sense of which stretch you are
// in, and B2/C1 interleave from 66 on, which a single run could not show.
export function buildCourseRail(chapters, done) {
  const currentId = currentChapterId(chapters, done);
  let current = 0;
  const levels = LEVEL_GROUPS
    .map((level) => ({
      id: level.id,
      ticks: (chapters || [])
        .filter((chapter) => chapter.level === level.id)
        .map((chapter) => {
          const finished = chapterProgress(chapter, done).state === 'done';
          const state = chapter.id === currentId ? 'now' : finished ? 'done' : 'idle';
          if (state === 'now') current = chapter.number;
          return { number: chapter.number, state };
        }),
    }))
    .filter((level) => level.ticks.length > 0);
  return {
    levels,
    total: (chapters || []).length,
    done: (chapters || []).filter((chapter) => chapterProgress(chapter, done).state === 'done').length,
    current,
  };
}

// Order 31, defect 2: a snack was reading as a sibling of the chapter, and the
// cause was the `border-top`, not the type size. It now rides inside the
// chapter block — collapsed to one summary line by default, expanded into rows
// on tap. Expanded, the rows carry no "Snack" label: sitting inside the block
// is the label.
export function buildSnackBlock(snacks, chapterNumber, expanded = []) {
  const items = (snacks || []).filter((snack) => snack.afterChapter === chapterNumber);
  if (!items.length) return null;
  const open = (expanded || []).includes(chapterNumber);
  return {
    open,
    count: items.length,
    label: `Snacks ${items.length}`,
    summary: items.map((snack) => snack.title).join(', '),
    items: open ? items : [],
  };
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
  const currentId = currentChapterId(chapters, done);
  const nextChapter = (chapters || []).find((chapter) => chapter.id === currentId);
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
