import courseIndex from './bites-index.json';

const LEVEL_CHUNK = { A1: 'a1', A2: 'a2', B2: 'b2c1', C1: 'b2c1' };
const LOAD_CHUNK = {
  a1: () => import('./bites/a1.json'),
  a2: () => import('./bites/a2.json'),
  b1a: () => import('./bites/b1a.json'),
  b1b: () => import('./bites/b1b.json'),
  b2c1: () => import('./bites/b2c1.json'),
};
const LOAD_SNACKS = () => import('./snacks.json');

// B1 ships as two half-chunks (chapters 35-45 / 46-56) to stay under the
// per-chunk download budget; every other level maps straight from its name
const chunkOf = (chapter) =>
  chapter.level === 'B1' ? (chapter.number <= 45 ? 'b1a' : 'b1b') : LEVEL_CHUNK[chapter.level];
const chapterChunks = new Map(courseIndex.chapters.map((chapter) => [chapter.id, chunkOf(chapter)]));
const levelPromises = {};
const hydratedChapters = new Map();
let snackPromise;

export function createLatestRequest() {
  let latest = 0;
  return function beginRequest() {
    const request = ++latest;
    return () => request === latest;
  };
}

export function hydrateChapterRomanization(bites) {
  const romanizationByLine = new Map();
  for (const card of bites.flatMap((bite) => bite.cards || [])) {
    if (card.kind !== 'chat') continue;
    for (const line of card.lines || []) {
      if (line.ko && line.romanization && !romanizationByLine.has(line.ko)) {
        romanizationByLine.set(line.ko, line.romanization);
      }
    }
  }

  return bites.map((bite) => {
    let changed = false;
    const cards = (bite.cards || []).map((card) => {
      if (card.kind !== 'payoff' || card.line?.romanization) return card;
      const romanization = romanizationByLine.get(card.line?.ko);
      if (!romanization) return card;
      changed = true;
      return { ...card, line: { ...card.line, romanization } };
    });
    return changed ? { ...bite, cards } : bite;
  });
}

// The Korean forms today's bite will put in front of the learner, in the order
// the cards will ask for them. Meanings are deliberately left out — guessing
// first is the whole method, so Home may name the words but never gloss them.
export function biteHeadwords(bite, limit = 6) {
  const seen = new Set();
  for (const card of bite?.cards || []) {
    const ko = card.kind === 'guess' ? card.word?.ko : card.kind === 'hunt' ? card.name : '';
    if (ko && !seen.has(ko)) seen.add(ko);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

function loadChunk(chunk) {
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
  const chunk = chapterChunks.get(chapterId);
  if (!chunk) throw new Error(`Unknown chapter: ${chapterId}`);

  const data = await loadChunk(chunk);
  const chapter = data.chapters.find((item) => item.id === chapterId);
  if (!chapter) throw new Error(`Chapter ${chapterId} is missing from the ${chunk} course chunk`);
  if (!hydratedChapters.has(chapterId)) {
    hydratedChapters.set(chapterId, hydrateChapterRomanization(chapter.bites));
  }
  return hydratedChapters.get(chapterId);
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
