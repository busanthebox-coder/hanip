function biteItem(chapter, bite) {
  return {
    type: 'bite',
    chapterId: chapter.id,
    biteId: bite.id,
    chapterNumber: chapter.number,
    level: chapter.level,
    title: bite.title,
    chapter,
    bite,
  };
}

function snackItem(snack) {
  return {
    type: 'snack',
    snackId: snack.id,
    afterChapter: snack.afterChapter,
    level: snack.level,
    title: snack.title,
    snack,
  };
}

export function findById({ index, id }) {
  for (const chapter of index.chapters || []) {
    const bite = chapter.bites.find((item) => item.id === id);
    if (bite) return biteItem(chapter, bite);
  }
  const snack = (index.snacks || []).find((item) => item.id === id);
  return snack ? snackItem(snack) : null;
}

// What comes after the bite the learner is finishing right now. The win screen
// names it while that bite is still open, so it has to count as done first.
export function findAfter({ index, done = {}, skippedSnacks = new Set(), startChapter = 1, finishedId }) {
  return findNext({ index, done: { ...done, [finishedId]: 1 }, skippedSnacks, startChapter });
}

export function findNext({ index, done = {}, skippedSnacks = new Set(), startChapter = 1 }) {
  const allChapters = index.chapters || [];
  const selectedIndex = Object.keys(done).length === 0
    ? allChapters.findIndex((chapter) => chapter.number === startChapter)
    : -1;
  const chapters = selectedIndex > 0 ? allChapters.slice(selectedIndex) : allChapters;
  const skipped = skippedSnacks instanceof Set ? skippedSnacks : new Set(skippedSnacks || []);
  const firstUnfinishedChapter = chapters.findIndex((chapter) => (
    chapter.bites.some((bite) => !done[bite.id])
  ));
  const boundaryIndex = firstUnfinishedChapter === -1 ? chapters.length - 1 : firstUnfinishedChapter - 1;
  const boundary = chapters[boundaryIndex];

  if (boundary && boundary.bites.every((bite) => done[bite.id])) {
    const snack = (index.snacks || []).find((item) => (
      item.afterChapter === boundary.number && !done[item.id] && !skipped.has(item.id)
    ));
    if (snack) return snackItem(snack);
  }

  for (const chapter of chapters) {
    const bite = chapter.bites.find((item) => !done[item.id]);
    if (bite) return biteItem(chapter, bite);
  }
  return null;
}
