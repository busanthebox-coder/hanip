import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const files = {
  expressionPacks: new URL('../data/expression-packs.json', import.meta.url),
  selection: new URL('../docs/harness/audit/pack-selection-26.json', import.meta.url),
  legacyPacks: new URL('../data/packs.json', import.meta.url),
  wordbook: new URL('../src/lib/wordbook.json', import.meta.url),
  snacks: new URL('../src/lib/snacks.json', import.meta.url),
  index: new URL('../src/lib/bites-index.json', import.meta.url),
};

const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
const present = () => Object.fromEntries(Object.entries(files).map(([name, url]) => [name, existsSync(url)]));
const norm = (text) => String(text).replace(/[.?!~…,]/g, '').trim();

describe('order 26 — situational expression packs', () => {
  it('extracts six situational packs of 12 to 16 expressions each', () => {
    expect(present().expressionPacks).toBe(true);
    const { packs } = readJson(files.expressionPacks);

    expect(packs.map((pack) => pack.id)).toEqual([
      'pack-transport', 'pack-restaurant', 'pack-shopping', 'pack-clinic', 'pack-work', 'pack-admin',
    ]);
    for (const pack of packs) {
      expect(pack.words.length).toBeGreaterThanOrEqual(12);
      expect(pack.words.length).toBeLessThanOrEqual(16);
      // bilingual product string (harness rule 6)
      expect(pack.title).toMatch(/·/);
      expect(pack.title).toMatch(/[가-힣]/);
      expect(pack.title).toMatch(/[A-Za-z]/);
      // every word carries the parent's own text — nothing authored here
      for (const word of pack.words) {
        expect(word.sourceId).toMatch(/^expr-/);
        expect(word.hangul).toBeTruthy();
        expect(word.english).toBeTruthy();
        expect(word.nuance).toBeTruthy();
      }
      // one headword may only appear once inside a pack
      const heads = pack.words.map((word) => word.hangul);
      expect(new Set(heads).size).toBe(heads.length);
      const glosses = pack.words.map((word) => word.english);
      expect(new Set(glosses).size).toBe(glosses.length);
    }
  });

  it('never repeats a headword the wordbook or an existing snack pack already teaches', () => {
    expect(present().expressionPacks && present().legacyPacks && present().wordbook).toBe(true);
    const { packs } = readJson(files.expressionPacks);
    const legacy = readJson(files.legacyPacks).packs.flatMap((pack) => pack.words.map((word) => word.hangul));
    const wordbook = readJson(files.wordbook).words.map((word) => word.ko);
    const existing = new Set([...legacy, ...wordbook].map(norm));
    const phrases = [...existing].filter((head) => head.includes(' ') || [...head].length >= 4);

    for (const pack of packs) {
      for (const word of pack.words) {
        const head = norm(word.hangul);
        expect(existing.has(head)).toBe(false);
        expect([...existing].some((other) => other !== head && other.includes(head))).toBe(false);
        expect(phrases.some((phrase) => phrase !== head && head.includes(phrase))).toBe(false);
      }
    }
  });

  it('records both the selection and every exclusion with a reason', () => {
    expect(present().selection).toBe(true);
    const selection = readJson(files.selection);
    const { packs } = readJson(files.expressionPacks);

    expect(selection.packs).toHaveLength(6);
    for (const [i, record] of selection.packs.entries()) {
      expect(record.id).toBe(packs[i].id);
      expect(record.selected.map((item) => item.id)).toEqual(packs[i].words.map((word) => word.sourceId));
    }
    expect(selection.excluded.length).toBeGreaterThan(0);
    for (const item of selection.excluded) {
      expect(item.id).toMatch(/^expr-/);
      expect(item.reason).toBeTruthy();
    }
    const reasons = new Set(selection.excluded.map((item) => item.reason));
    expect(reasons.has('exact-duplicate')).toBe(true);
    expect(Object.values(selection.excludedByReason).reduce((n, count) => n + count, 0))
      .toBe(selection.excluded.length);
  });

  it('joins the six packs into the snack index and the lazy snack chunk', () => {
    expect(present().snacks && present().index).toBe(true);
    const { packs } = readJson(files.expressionPacks);
    const snacks = readJson(files.snacks).snacks;
    const index = readJson(files.index);

    expect(snacks).toHaveLength(18);
    expect(index.snacks).toHaveLength(18);
    expect(snacks.map((snack) => snack.id)).toEqual(index.snacks.map((snack) => snack.id));

    for (const pack of packs) {
      const snack = snacks.find((item) => item.packId === pack.id);
      expect(snack).toBeTruthy();
      expect(snack.id).toBe(pack.id.replace(/^pack-/, 'snack-'));
      expect(snack.afterChapter).toBe(pack.afterChapter);
      expect(snack.cards).toHaveLength(pack.words.length);
      expect(snack.cards.some((card) => card.kind === 'payoff')).toBe(false);
      const listed = index.snacks.find((item) => item.id === snack.id);
      expect(listed.cardCount).toBe(snack.cards.length);
      expect(listed.level).toBeTruthy();
    }
  });

  it('gives every expression card three options, one correct meaning, and the parent nuance', () => {
    expect(present().snacks && present().expressionPacks).toBe(true);
    const packs = readJson(files.expressionPacks).packs;
    const packIds = new Set(packs.map((pack) => pack.id));
    const snacks = readJson(files.snacks).snacks.filter((snack) => packIds.has(snack.packId));
    expect(snacks).toHaveLength(6);

    for (const snack of snacks) {
      for (const card of snack.cards) {
        expect(card.kind).toBe('guess');
        expect(card.options).toHaveLength(3);
        expect(card.options.filter((option) => option === card.word.en)).toHaveLength(1);
        expect(new Set(card.options).size).toBe(3);
        expect(card.word.nuance).toBeTruthy();
        // the whole expression is the thing being taught, so a highlight that
        // covers only part of it would ask about a phrase it does not gloss
        expect(card.word.ko).toBeTruthy();
        if (card.target) expect(card.target).toBe(card.word.ko);
      }
    }
  });

  it('never offers a distractor that is also a fair reading of the expression', () => {
    expect(present().snacks && present().expressionPacks).toBe(true);
    const packs = readJson(files.expressionPacks).packs;
    const snacks = readJson(files.snacks).snacks;
    const bare = (text) => String(text).replace(/[?!.]/g, '').trim();

    for (const pack of packs) {
      const headByGloss = new Map(pack.words.map((word) => [word.english, word.hangul]));
      const snack = snacks.find((item) => item.packId === pack.id);
      for (const card of snack.cards) {
        for (const option of card.options) {
          if (option === card.word.en) continue;
          const distractorHead = headByGloss.get(option);
          // distractors come from this pack only …
          expect(distractorHead).toBeTruthy();
          // … and a shorter expression the headword contains (아파요 ⊂ 머리가 아파요)
          // would be a correct partial reading, so it must never be offered
          expect(bare(card.word.ko).includes(bare(distractorHead))).toBe(false);
        }
      }
    }
  });
});
