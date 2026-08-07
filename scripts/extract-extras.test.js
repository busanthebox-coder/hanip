import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const files = {
  packs: new URL('../data/packs.json', import.meta.url),
  readers: new URL('../data/readers.json', import.meta.url),
  snacks: new URL('../src/lib/snacks.json', import.meta.url),
};

const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'));

describe('pack, reader, and snack extraction artifacts', () => {
  it('extracts every parent pack member and all readers into dedicated artifacts', () => {
    const present = Object.fromEntries(Object.entries(files).map(([name, url]) => [name, existsSync(url)]));
    expect(present).toEqual({ packs: true, readers: true, snacks: true });
    if (!Object.values(present).every(Boolean)) return;

    const packs = readJson(files.packs);
    const readers = readJson(files.readers);

    expect(packs.packs).toHaveLength(12);
    expect(packs.joinedMembers).toBe(173);
    expect(packs.totalMembers).toBe(173);
    expect(packs.packs.every((pack) => pack.words.length > 0)).toBe(true);
    expect(packs.packs.flatMap((pack) => pack.words)).toHaveLength(173);
    expect(readers.readers).toHaveLength(20);
    expect(readers.readers.every((reader) => reader.body.length === reader.bodyTranslation.length)).toBe(true);
  });

  it('compiles one lazy snack bite per pack without a payoff card', async () => {
    const present = Object.fromEntries(Object.entries(files).map(([name, url]) => [name, existsSync(url)]));
    expect(present).toEqual({ packs: true, readers: true, snacks: true });
    if (!Object.values(present).every(Boolean)) return;

    const packs = readJson(files.packs);
    const expressionPacks = readJson(new URL('../data/expression-packs.json', import.meta.url));
    const allPacks = [...packs.packs, ...expressionPacks.packs];
    const snacks = readJson(files.snacks);
    const index = readJson(new URL('../src/lib/bites-index.json', import.meta.url));

    // 12 vocab packs (order 09) + 6 situational expression packs (order 26)
    expect(index.snacks).toHaveLength(18);
    expect(snacks.snacks).toHaveLength(18);
    expect(snacks.snacks.map((snack) => snack.id)).toEqual(index.snacks.map((snack) => snack.id));
    for (const snack of snacks.snacks) {
      const pack = allPacks.find((candidate) => candidate.id === snack.packId);
      expect(pack).toBeTruthy();
      expect(snack.kind).toBe('snack');
      expect(snack.cards).toHaveLength(pack.words.length);
      expect(snack.cards.some((card) => card.kind === 'payoff')).toBe(false);
      expect(snack.cards.every((card) => card.kind === 'guess' && card.options.includes(card.word.en))).toBe(true);
    }

    const courseData = await import('../src/lib/courseData.js');
    expect(typeof courseData.loadSnackCards).toBe('function');
    if (typeof courseData.loadSnackCards !== 'function') return;
    const [first, again] = await Promise.all([
      courseData.loadSnackCards(index.snacks[0].id),
      courseData.loadSnackCards(index.snacks[0].id),
    ]);
    expect(again).toBe(first);
    expect(first).toHaveLength(index.snacks[0].cardCount);
  });
});
