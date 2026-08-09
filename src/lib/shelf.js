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

// Order 33, diagnosis 2: every one of the 72 rows weighed the same, so "carry on
// here" lost the scan to each finished chapter above it. Exactly one chapter is
// promoted to a card, and choosing it is a three-way decision:
//   1. the chapter already under way — the hand's place, wherever it is;
//   2. failing that, the next chapter to start;
//   3. on a finished course, none — the list stands on its own.
// Branch 1 outranks course order on purpose. currentChapterId walks 1→72 and
// stops at the first chapter still holding an unfinished bite, so a learner who
// skipped ahead gets an untouched chapter named as "current". The card follows
// the hand instead: a started chapter beats an untouched one sitting above it.
export function shelfFocusChapter(chapters, done) {
  const list = chapters || [];
  const started = list.find((chapter) => chapterProgress(chapter, done).state === 'active');
  if (started) return started;
  const next = list.find((chapter) => {
    const progress = chapterProgress(chapter, done);
    return progress.total > 0 && progress.state !== 'done';
  });
  return next || null;
}

// The card's own ledger. `nextBite` is this chapter's next unfinished bite —
// not the course's. Home answers "what are my five minutes" over all 72
// chapters (nextBite.js); the shelf answers "carry on inside this one", and the
// two land in different places for the same learner at the same moment.
export function shelfFocusCard(chapters, done) {
  const chapter = shelfFocusChapter(chapters, done);
  if (!chapter) return null;
  const progress = chapterProgress(chapter, done);
  return {
    chapter,
    done: progress.done,
    total: progress.total,
    state: progress.state,
    kicker: progress.state === 'active' ? 'In progress' : 'Up next',
    nextBite: (chapter.bites || []).find((bite) => !isDone(done, bite)) || null,
  };
}

// Order 33, diagnosis 1: the rail spent the full screen width on 72 ticks of
// 2.8px and still could not say "2 of 23". Five cells say the fraction in
// words, and each one is a 44px tap target that jumps to its level. Counted in
// chapters, like the level header — a level is a stretch of the course, not a
// pile of bites.
export function buildLevelStrip(chapters, done) {
  const focus = shelfFocusChapter(chapters, done);
  return LEVEL_GROUPS
    .map((level) => {
      const owned = (chapters || []).filter((chapter) => chapter.level === level.id);
      const finished = owned.filter((chapter) => chapterProgress(chapter, done).state === 'done').length;
      return {
        id: level.id,
        done: finished,
        total: owned.length,
        percent: owned.length ? Math.round((finished / owned.length) * 100) : 0,
        here: Boolean(focus) && focus.level === level.id,
      };
    })
    .filter((cell) => cell.total > 0);
}

// What survives of the rail: the three numbers the title line carries.
export function shelfPosition(chapters, done) {
  const focus = shelfFocusChapter(chapters, done);
  return {
    current: focus ? focus.number : 0,
    total: (chapters || []).length,
    done: (chapters || []).filter((chapter) => chapterProgress(chapter, done).state === 'done').length,
  };
}

// The tab bar covers the foot of the viewport, so the readable band stops
// short of it. tokens.css reserves the same 78px for `.index-surface`.
export const TAB_BAR_CLEARANCE = 78;

// Order 33: opening the shelf puts the card in reach — but only when it is not
// already there. Centring a card that the learner can see anyway would push the
// title line and the level strip off the top on every single visit, and the
// strip is the control you most want in reach the moment you arrive; scrolling
// past it would rebuild diagnosis 1 by another route. Chapter 14 sits 356px
// down and needs no scroll. Chapter 56 sits 1,400px down and would never be
// found. The threshold is share-of-card-visible, not distance, because a card
// two thirds on screen with its CTA cut off is not "there" either.
export function cardNeedsScroll(box, viewportHeight, clearance = TAB_BAR_CLEARANCE) {
  if (!box || !(box.height > 0) || !(viewportHeight > 0)) return false;
  const floor = viewportHeight - clearance;
  const visible = Math.min(box.bottom, floor) - Math.max(box.top, 0);
  return visible < box.height * 0.8;
}

// Order 33: search folds into a 44px icon on the title line — 56px of vertical
// cost for a field this course rarely needs, when 56px is a chapter row. It is
// folded, not killed: filterShelfGroups below is untouched. Closing clears the
// query, because a filter still running behind a shut field would hide chapters
// with nothing left on screen to explain the gap.
export function toggleShelfSearch(open, query) {
  return open ? { open: false, query: '' } : { open: true, query };
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

// Order 33: the level that opens is the card's level, not the first unfinished
// one — otherwise a learner who skipped ahead lands on a shelf whose card is
// inside a folded level, and the entry scroll has nothing to find.
export function defaultOpenLevels(chapters, done) {
  const focus = shelfFocusChapter(chapters, done);
  return [focus ? focus.level : LEVEL_GROUPS[0].id];
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
