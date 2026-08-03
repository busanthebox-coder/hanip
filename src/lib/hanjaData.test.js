import { describe, expect, it } from 'vitest';
import original from '../../data/hanja.json';
import core80 from '../../data/hanja-core-80.json';
import expansion80 from '../../data/hanja-expansion-80.json';

describe('hanja root data', () => {
  const additions = [...core80.roots, ...expansion80.roots];
  const all = [...original.roots, ...additions];

  it('expands the original 40 roots to exactly 200', () => {
    expect(original.roots).toHaveLength(40);
    expect(core80.roots).toHaveLength(80);
    expect(expansion80.roots).toHaveLength(80);
    expect(all).toHaveLength(200);
  });

  it('keeps ids and hanja characters unique', () => {
    expect(new Set(all.map((root) => root.id)).size).toBe(all.length);
    expect(new Set(all.map((root) => root.hanja)).size).toBe(all.length);
  });

  it('provides complete English-centered word families', () => {
    for (const root of additions) {
      expect(root).toMatchObject({
        id: expect.any(String),
        hanja: expect.any(String),
        reading: expect.any(String),
        gloss: expect.any(String),
        note: expect.any(String),
        level: expect.stringMatching(/^(A2|B1)$/),
      });
      expect(root.members.length).toBeGreaterThanOrEqual(4);
      for (const member of root.members) {
        expect(member).toMatchObject({
          hangul: expect.any(String),
          breakdown: expect.any(String),
          english: expect.any(String),
          romanization: expect.any(String),
        });
      }
    }
  });

  it('only omits the regular reading for explicitly taught sound-change exceptions', () => {
    const exceptions = additions.flatMap((root) => root.members
      .filter((member) => !member.hangul.includes(root.reading))
      .map((member) => `${root.hanja}:${member.hangul}`));

    expect(exceptions).toEqual([
      '六:유월',
      '十:시월',
      '錄:녹음',
      '錄:녹화',
      '療:요양',
      '女:여자',
      '女:여성',
    ]);
  });
});
