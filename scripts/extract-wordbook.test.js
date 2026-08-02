import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { compileChapter } from './lib/compiler.mjs';

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

describe('wordbook extraction artifacts', () => {
  const list = readJson('../src/lib/wordbook.json').words;

  it('emits all normalized expression clusters without a member self marker', () => {
    const file = new URL('../src/lib/clusters.json', import.meta.url);
    expect(existsSync(file)).toBe(true);
    if (!existsSync(file)) return;

    const clusters = readJson('../src/lib/clusters.json').clusters;
    const allowedFields = ['en', 'example', 'hint', 'ko', 'romanization', 'when'];

    expect(clusters).toHaveLength(32);
    expect(clusters.every((cluster) => cluster.title && Array.isArray(cluster.members) && cluster.members.length > 1)).toBe(true);
    expect(clusters.flatMap((cluster) => cluster.members).every((member) => (
      JSON.stringify(Object.keys(member).sort()) === JSON.stringify(allowedFields)
      && !Object.hasOwn(member, 'self')
    ))).toBe(true);
  });

  it('emits one slim list row per Korean form', () => {
    const allowedFields = [
      'chapter',
      'chapters',
      'depthShard',
      'en',
      'hasCluster',
      'hasDepth',
      'ko',
      'pos',
      'romanization',
    ];

    expect(new Set(list.map((word) => word.ko)).size).toBe(list.length);
    expect([...new Set(list.flatMap((word) => Object.keys(word)))].sort()).toEqual(allowedFields);
    expect(list.every((word) => Array.isArray(word.chapters) && word.chapters.length > 0)).toBe(true);
    expect(list.find((word) => word.chapters.length > 1).chapter).toMatch(/^\d+(?:·\d+)+$/);

    const occurrences = new Map();
    const chapterFiles = readdirSync(new URL('../data/chapters/', import.meta.url))
      .filter((file) => file.endsWith('.json'))
      .sort();
    for (const file of chapterFiles) {
      const chapter = Number(file.match(/(\d+)/)[1]);
      for (const word of readJson(`../data/chapters/${file}`).extendedVocabulary || []) {
        const chapters = occurrences.get(word.hangul) || new Set();
        chapters.add(chapter);
        occurrences.set(word.hangul, chapters);
      }
    }
    const duplicateUnions = [...occurrences.values()].filter((chapters) => chapters.size > 1);
    expect(duplicateUnions).toHaveLength(185);
    for (const word of list) {
      expect(word.chapters).toEqual([...(occurrences.get(word.ko) || [])].sort((a, b) => a - b));
    }
  });

  it('keeps complete detail outside the eager list payload', () => {
    const depth = readJson('../src/lib/wordbook-depth.json');
    const detailed = Object.values(depth);

    expect(Object.keys(depth).length).toBe(list.length);
    expect(detailed.some((word) => word.nuance && word.forms)).toBe(true);
    expect(detailed.some((word) => word.cluster)).toBe(true);
    expect(detailed.some((word) => word.ex && word.collocations.length)).toBe(true);
    expect(gzipSync(JSON.stringify(list)).length).toBeLessThan(80_000);
  });

  it('applies local detail patches without changing protected word fields', () => {
    const depth = readJson('../src/lib/wordbook-depth.json');
    const patch = readJson('../data/wordbook-patches/a2-batch02.json');
    const allowedFields = [
      'commonMistakes',
      'conjugationTips',
      'examples',
      'explanation',
      'nuance',
      'shortExplanation',
      'usagePhrases',
    ];

    expect(Object.keys(patch)).toHaveLength(38);
    for (const [ko, fields] of Object.entries(patch)) {
      expect(Object.keys(fields).sort()).toEqual(expect.arrayContaining([
        'commonMistakes',
        'examples',
        'explanation',
        'nuance',
        'shortExplanation',
        'usagePhrases',
      ]));
      expect(Object.keys(fields).every((field) => allowedFields.includes(field))).toBe(true);
      expect(depth[ko]).toMatchObject(fields);
    }
  });

  it('keeps every lazy depth shard inside the global runtime asset budget', () => {
    const directory = new URL('../src/lib/wordbook-depth/', import.meta.url);
    const shardFiles = readdirSync(directory).filter((file) => file.endsWith('.json'));
    const shards = new Map(shardFiles.map((file) => [file.replace(/\.json$/, ''), readJson(`../src/lib/wordbook-depth/${file}`)]));

    expect(shardFiles.length).toBeGreaterThan(1);
    expect(shardFiles.every((file) => gzipSync(readFileSync(new URL(file, directory))).length <= 220_000)).toBe(true);
    expect(list.every((word) => shards.get(word.depthShard)?.[word.ko])).toBe(true);
  });

  it('fails clearly rather than emitting an unenriched production wordbook', () => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./extract-wordbook.mjs', import.meta.url))], {
      encoding: 'utf8',
      env: { ...process.env, HANIP_PARENT_DATA_DIR: '/definitely-missing-hanip-parent-data' },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('required parent enrichment source not found');
  });

  it('preserves guess-card nuance enrichment through the canonical detail map', () => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./compile-bites.mjs', import.meta.url))], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    const depth = readJson('../src/lib/wordbook-depth.json');
    const compiled = readJson('../src/lib/bites.json');
    const overrides = readJson('../data/overrides.json');
    const chapterFiles = readdirSync(new URL('../data/chapters/', import.meta.url))
      .filter((file) => file.endsWith('.json'))
      .sort();
    let attachmentCount = 0;

    for (const [chapterIndex, file] of chapterFiles.entries()) {
      const before = compileChapter(readJson(`../data/chapters/${file}`), chapterIndex + 1, overrides);
      const after = compiled.chapters[chapterIndex];
      const beforeCards = before.bites.flatMap((bite) => bite.cards);
      const afterCards = after.bites.flatMap((bite) => bite.cards);
      for (const [cardIndex, card] of beforeCards.entries()) {
        if (card.kind !== 'guess' || card.word.nuance || !depth[card.word.ko]?.nuance) continue;
        expect(afterCards[cardIndex].word.nuance).toBe(depth[card.word.ko].nuance);
        attachmentCount += 1;
      }
    }

    expect(attachmentCount).toBe(1015);
  });
});
