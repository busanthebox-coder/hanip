import courseIndex from './bites-index.json';

const LEVEL_CHUNK = { A1: 'a1', A2: 'a2', B1: 'b1', B2: 'b2c1', C1: 'b2c1' };
const LOAD_CHUNK = {
  a1: () => import('./bites/a1.json'),
  a2: () => import('./bites/a2.json'),
  b1: () => import('./bites/b1.json'),
  b2c1: () => import('./bites/b2c1.json'),
};

const chapterLevels = new Map(courseIndex.chapters.map((chapter) => [chapter.id, chapter.level]));
const levelPromises = {};

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
