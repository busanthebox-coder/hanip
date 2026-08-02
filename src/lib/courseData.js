import courseIndex from './bites-index.json';

const LEVEL_CHUNK = { A1: 'a1', A2: 'a2', B1: 'b1', B2: 'b2c1', C1: 'b2c1' };
const LOAD_CHUNK = {
  a1: () => import('./bites/a1.json'),
  a2: () => import('./bites/a2.json'),
  b1: () => import('./bites/b1.json'),
  b2c1: () => import('./bites/b2c1.json'),
};
const LOAD_SNACKS = () => import('./snacks.json');

const chapterLevels = new Map(courseIndex.chapters.map((chapter) => [chapter.id, chapter.level]));
const levelPromises = {};
let snackPromise;

export function createLatestRequest() {
  let latest = 0;
  return function beginRequest() {
    const request = ++latest;
    return () => request === latest;
  };
}

function loadLevel(level) {
  const chunk = LEVEL_CHUNK[level];
  if (!levelPromises[chunk]) {
    const promise = LOAD_CHUNK[chunk]().then((module) => module.default);
    levelPromises[chunk] = promise;
    promise.catch(() => {
      if (levelPromises[chunk] === promise) delete levelPromises[chunk];
    });
  }
  return levelPromises[chunk];
}

export async function loadChapterCards(chapterId) {
  const level = chapterLevels.get(chapterId);
  if (!level) throw new Error(`Unknown chapter: ${chapterId}`);

  const data = await loadLevel(level);
  const chapter = data.chapters.find((item) => item.id === chapterId);
  if (!chapter) throw new Error(`Chapter ${chapterId} is missing from the ${level} course chunk`);
  return chapter.bites;
}

export async function loadSnackCards(snackId) {
  if (!snackPromise) {
    const promise = LOAD_SNACKS().then((module) => module.default);
    snackPromise = promise;
    promise.catch(() => {
      if (snackPromise === promise) snackPromise = undefined;
    });
  }
  const data = await snackPromise;
  const snack = data.snacks.find((item) => item.id === snackId);
  if (!snack) throw new Error(`Unknown snack: ${snackId}`);
  return snack.cards;
}
