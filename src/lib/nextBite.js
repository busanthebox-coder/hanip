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

export function findNext({ index, done = {}, skippedSnacks = new Set() }) {
  const chapters = index.chapters || [];
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
