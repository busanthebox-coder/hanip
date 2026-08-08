import { describe, expect, it } from 'vitest';
import courseIndex from './bites-index.json';
import {
  CODE_PREFIX,
  TransferError,
  decodeCode,
  encodeCode,
  foldIds,
  packState,
  planImport,
  unfoldIds,
} from './transfer.js';

const card = (ko, en) => ({
  kind: 'guess',
  word: { ko, en, pos: 'verb' },
  sentence: { ko: `${ko} 예문.`, en: `${en} example.` },
  target: ko,
  options: [en, 'something else', 'a third meaning'],
});
const resolver = (known) => (ko) => known.get(ko) || null;

const AT = Date.parse('2026-08-08T09:00:00Z');
const DAY = 86_400_000;

function state(overrides = {}) {
  return {
    progress: {
      done: {}, learned: [], bowls: {}, lastPlayed: null, collected: [], starred: [], ...overrides.progress,
    },
    srs: overrides.srs || {},
  };
}

describe('order 29 — progress code round trip', () => {
  it('carries a learner back out of a code exactly as it went in', async () => {
    const words = new Map([['가다', card('가다', 'to go')], ['먹다', card('먹다', 'to eat')]]);
    const before = state({
      progress: {
        done: { 'chapter-01-b1': AT - DAY, 'chapter-12-b4': AT - 2 * DAY, 'snack-survival-help': AT },
        learned: [...words.values()],
        bowls: { '2026-08-06': 3, '2026-08-07': 1 },
        collected: ['chapter-12-b4'],
        starred: ['가다'],
        lastPlayed: { biteOrSnackId: 'chapter-12-b4', at: AT },
      },
      srs: { 가다: { interval: 7, due: AT + 3 * DAY }, 먹다: { interval: 1, due: AT - DAY } },
    });

    const code = await encodeCode(packState(before, { name: '민수', code: '4821', now: AT }));
    expect(code.startsWith(CODE_PREFIX)).toBe(true);

    const { progress, srs } = planImport(state(), await decodeCode(code), resolver(words));

    expect(progress.done).toEqual(before.progress.done);
    expect(progress.collected.sort()).toEqual(before.progress.collected.sort());
    expect(progress.starred.sort()).toEqual(before.progress.starred.sort());
    expect(progress.bowls).toEqual(before.progress.bowls);
    expect(progress.learned.map((item) => item.word.ko).sort()).toEqual(['가다', '먹다']);
    expect(progress.lastPlayed).toEqual(before.progress.lastPlayed);
    expect(srs).toEqual(before.srs);
  });

  it('names the profile the code came from so the learner can see whose it is', async () => {
    const payload = await decodeCode(await encodeCode(packState(state(), { name: '민수', code: '4821', now: AT })));
    expect(planImport(state(), payload, () => null).summary.from).toEqual({ name: '민수', code: '4821' });
  });

  it('survives the uncompressed path used by browsers without CompressionStream', async () => {
    const before = state({ progress: { done: { 'chapter-03-b2': AT }, starred: ['가다'] } });
    const code = await encodeCode(packState(before, { name: 'A', code: '0001', now: AT }), { compress: false });

    const { progress } = planImport(state(), await decodeCode(code), () => null);
    expect(Object.keys(progress.done)).toEqual(['chapter-03-b2']);
    expect(progress.starred).toEqual(['가다']);
  });

  it('folds and unfolds every real bite id in the compiled course', () => {
    const ids = [
      ...courseIndex.chapters.flatMap((chapter) => chapter.bites.map((bite) => bite.id)),
      ...(courseIndex.snacks || []).map((snack) => snack.id),
    ];
    expect(unfoldIds(foldIds(ids)).sort()).toEqual([...ids].sort());
  });
});

describe('order 29 — import merges, it never overwrites', () => {
  it('unions done, collected, starred and learned', async () => {
    const mine = card('가다', 'to go');
    const theirs = card('먹다', 'to eat');
    const local = state({
      progress: {
        done: { 'chapter-01-b1': 100 },
        collected: ['chapter-02-b2'],
        starred: ['가다'],
        learned: [mine],
      },
    });
    const incoming = packState(state({
      progress: {
        done: { 'chapter-01-b1': 999, 'chapter-04-b3': 200 },
        collected: ['chapter-05-b2'],
        starred: ['먹다'],
        learned: [theirs],
      },
    }), { name: 'B', code: '0002', now: AT });

    const { progress, summary } = planImport(local, incoming, resolver(new Map([['먹다', theirs]])));

    expect(Object.keys(progress.done).sort()).toEqual(['chapter-01-b1', 'chapter-04-b3']);
    expect(progress.done['chapter-01-b1']).toBe(100);        // the local record is kept
    expect(progress.collected.sort()).toEqual(['chapter-02-b2', 'chapter-05-b2']);
    expect(progress.starred.sort()).toEqual(['가다', '먹다']);
    expect(progress.learned.map((item) => item.word.ko).sort()).toEqual(['가다', '먹다']);
    expect(summary).toMatchObject({ bites: 1, words: 1, grammar: 1, unresolved: 0 });
  });

  it('keeps the larger count for a day both devices studied', () => {
    const local = state({ progress: { bowls: { '2026-08-01': 3, '2026-08-02': 1 } } });
    const incoming = packState(state({ progress: { bowls: { '2026-08-02': 4, '2026-08-03': 2 } } }), { name: 'B', code: '2', now: AT });

    const { progress } = planImport(local, incoming, () => null);

    expect(progress.bowls).toEqual({ '2026-08-01': 3, '2026-08-02': 4, '2026-08-03': 2 });
  });

  it('takes the whole schedule entry from the side that has come further', () => {
    const local = state({
      srs: {
        가다: { interval: 14, due: AT + 5 * DAY },   // local is further along
        먹다: { interval: 3, due: AT + 9 * DAY },    // tie on interval, later due
        보다: { interval: 1, due: AT },
      },
    });
    const incoming = packState(state({
      srs: {
        가다: { interval: 3, due: AT },
        먹다: { interval: 3, due: AT + 2 * DAY },    // tie on interval, earlier due wins
        새말: { interval: 30, due: AT + DAY },
      },
    }), { name: 'B', code: '2', now: AT });

    const { srs } = planImport(local, incoming, () => null);

    expect(srs.가다).toEqual({ interval: 14, due: AT + 5 * DAY });
    expect(srs.먹다).toEqual({ interval: 3, due: AT + 2 * DAY });
    expect(srs.보다).toEqual({ interval: 1, due: AT });
    expect(srs.새말).toEqual({ interval: 30, due: AT + DAY });
  });

  it('leaves this device its own settings and its own shelf', () => {
    const local = state();
    const incoming = packState(state(), { name: 'B', code: '2', now: AT });
    incoming.prf = { theme: 'dark', dailyGoal: 3 };
    incoming.shf = ['C1'];

    const plan = planImport(local, incoming, () => null);

    expect(plan.prefs).toBeUndefined();
    expect(plan.shelf).toBeUndefined();
    expect(Object.keys(plan).sort()).toEqual(['progress', 'srs', 'summary']);
  });

  it('reports words it could not rebuild instead of dropping them silently', () => {
    const known = card('가다', 'to go');
    const incoming = packState(state({ progress: { learned: [known, card('없는말', 'gone')] } }), { name: 'B', code: '2', now: AT });

    const { progress, summary } = planImport(state(), incoming, resolver(new Map([['가다', known]])));

    expect(progress.learned.map((item) => item.word.ko)).toEqual(['가다']);
    expect(summary).toMatchObject({ words: 1, unresolved: 1 });
  });

  it('keeps the local last-played pointer — it names a bite on this device', () => {
    const local = state({ progress: { lastPlayed: { biteOrSnackId: 'chapter-01-b1', at: 5 } } });
    const incoming = packState(state({ progress: { lastPlayed: { biteOrSnackId: 'chapter-09-b9', at: 9 } } }), { name: 'B', code: '2', now: AT });

    expect(planImport(local, incoming, () => null).progress.lastPlayed).toEqual({ biteOrSnackId: 'chapter-01-b1', at: 5 });
  });
});

describe('order 29 — a code that is not a code changes nothing', () => {
  const local = () => state({ progress: { done: { 'chapter-01-b1': 1 }, starred: ['가다'] }, srs: { 가다: { interval: 3, due: 9 } } });

  it.each([
    ['no prefix', 'just some text a learner pasted'],
    ['right prefix, junk body', `${CODE_PREFIX}z!!!!not-base64!!!!`],
    ['right prefix, empty body', `${CODE_PREFIX}z`],
    ['unknown compression flag', `${CODE_PREFIX}qeyJ2IjoxfQ`],
    ['empty string', ''],
  ])('rejects %s', async (_label, code) => {
    await expect(decodeCode(code)).rejects.toBeInstanceOf(TransferError);
  });

  it('rejects a future format version rather than guessing at it', async () => {
    const payload = packState(state(), { name: 'B', code: '2', now: AT });
    const code = await encodeCode({ ...payload, v: 99 }, { compress: false });
    await expect(decodeCode(code)).rejects.toMatchObject({ reason: 'version' });
  });

  it('applies nothing at all when one field of an otherwise valid payload is wrong', () => {
    const before = local();
    const snapshot = JSON.stringify(before);
    const incoming = packState(state({ progress: { done: { 'chapter-02-b1': AT } } }), { name: 'B', code: '2', now: AT });
    incoming.b = 'not an encoded bowl list';

    expect(() => planImport(before, incoming, () => null)).toThrow(TransferError);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('order 29 — the code has to be short enough to paste', () => {
  it('stays under 10KB on the worst progress the course can produce', async () => {
    const biteIds = courseIndex.chapters.flatMap((chapter) => chapter.bites.map((bite) => bite.id));
    const patternIds = courseIndex.chapters
      .flatMap((chapter) => chapter.bites)
      .filter((bite) => bite.kind === 'pattern')
      .map((bite) => bite.id);
    const word = (n) => `단어${n}번째말`;

    const done = Object.fromEntries(biteIds.map((id, i) => [id, AT - i * 3_600_000]));
    const learned = Array.from({ length: 200 }, (_, i) => card(word(i), `meaning ${i}`));
    const bowls = Object.fromEntries(Array.from({ length: 180 }, (_, d) => {
      const date = new Date(AT - d * DAY);
      return [`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, (d % 3) + 1];
    }));
    const srs = Object.fromEntries(Array.from({ length: 400 }, (_, i) => [word(i), { interval: [1, 3, 7, 14, 30, 60][i % 6], due: AT + (i % 40) * DAY }]));

    const worst = state({
      progress: { done, learned, bowls, collected: patternIds, starred: Array.from({ length: 60 }, (_, i) => word(i)) },
      srs,
    });
    const code = await encodeCode(packState(worst, { name: '민수', code: '4821', now: AT }));

    expect(code.length).toBeLessThan(10 * 1024);
    // and it still round-trips at that size
    const { progress } = planImport(state(), await decodeCode(code), () => null);
    expect(Object.keys(progress.done)).toHaveLength(biteIds.length);
    expect(progress.collected).toHaveLength(patternIds.length);
  });
});
