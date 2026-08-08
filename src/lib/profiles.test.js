import { describe, expect, it } from 'vitest';
import {
  ACTIVE_KEY,
  DATA_KEYS,
  LEGACY_KEYS,
  REGISTRY_KEY,
  addProfile,
  freshCode,
  migrateStorage,
  namespacedKey,
  readActiveId,
  readRegistry,
  removeProfile,
  renameProfile,
  resolveKey,
  touchProfile,
} from './profiles.js';

class MemoryStorage {
  constructor(seed = {}) {
    this.values = new Map(Object.entries(seed));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  keys() {
    return [...this.values.keys()].sort();
  }
}

const LEGACY_PROGRESS = JSON.stringify({
  done: { 'chapter-01-b1': 1_754_600_000_000, 'chapter-01-b2': 1_754_600_100_000 },
  learned: [{ kind: 'guess', word: { ko: '한글', en: 'Hangul', pos: 'noun' }, options: ['a', 'b', 'Hangul'] }],
  bowls: { '2026-08-01': 2, '2026-08-02': 1 },
  lastPlayed: { biteOrSnackId: 'chapter-01-b2', at: 1_754_600_100_000 },
  collected: ['chapter-01-b2'],
  starred: ['한글'],
});
const LEGACY_PREFS = JSON.stringify({ romaja: 'shown', theme: 'dark', dailyGoal: 2, onboardingDone: true });
const LEGACY_SRS = JSON.stringify({ 한글: { interval: 3, due: 1_754_900_000_000 } });
const LEGACY_SHELF = JSON.stringify(['A1', 'A2']);

function legacySeed() {
  return {
    'hanip.v1': LEGACY_PROGRESS,
    'hanip.prefs-v1': LEGACY_PREFS,
    'hanip.srs-v1': LEGACY_SRS,
    'hanip.shelf-open-v1': LEGACY_SHELF,
  };
}

describe('order 29 — profile migration (the one place progress can be lost)', () => {
  it('①  moves an existing learner under a new profile with every byte intact', () => {
    const storage = new MemoryStorage(legacySeed());

    const result = migrateStorage(storage, { now: 1_754_700_000_000 });

    expect(result.status).toBe('moved');
    expect(result.moved).toEqual([...DATA_KEYS]);

    const registry = readRegistry(storage);
    expect(registry).toHaveLength(1);
    const { id } = registry[0];
    expect(readActiveId(storage)).toBe(id);

    // byte-for-byte, not merely structurally equal
    expect(storage.getItem(namespacedKey(id, 'v1'))).toBe(LEGACY_PROGRESS);
    expect(storage.getItem(namespacedKey(id, 'prefs-v1'))).toBe(LEGACY_PREFS);
    expect(storage.getItem(namespacedKey(id, 'srs-v1'))).toBe(LEGACY_SRS);
    expect(storage.getItem(namespacedKey(id, 'shelf-open-v1'))).toBe(LEGACY_SHELF);

    // and the legacy keys are cleaned up only after the copies verified
    for (const key of LEGACY_KEYS) expect(storage.getItem(key)).toBeNull();
  });

  it('②  creates a starter profile on an empty device without writing progress keys', () => {
    const storage = new MemoryStorage();

    const result = migrateStorage(storage, { now: 1_754_700_000_000 });

    expect(result.status).toBe('created');
    expect(result.moved).toEqual([]);
    const registry = readRegistry(storage);
    expect(registry).toHaveLength(1);
    expect(registry[0].code).toMatch(/^\d{4}$/);
    expect(readActiveId(storage)).toBe(registry[0].id);
    expect(storage.keys()).toEqual([ACTIVE_KEY, REGISTRY_KEY].sort());
  });

  it('③  does nothing when the device already has profiles', () => {
    const storage = new MemoryStorage(legacySeed());
    migrateStorage(storage, { now: 1_754_700_000_000 });
    const before = storage.keys().map((key) => [key, storage.getItem(key)]);

    const result = migrateStorage(storage, { now: 1_754_800_000_000 });

    expect(result.status).toBe('noop');
    expect(storage.keys().map((key) => [key, storage.getItem(key)])).toEqual(before);
    expect(readRegistry(storage)).toHaveLength(1);
  });

  it('④  keeps broken legacy progress exactly where it is and reports the failure', () => {
    const seed = legacySeed();
    seed['hanip.v1'] = '{"done":{"chapter-01-b1":175460000000';   // truncated write
    const storage = new MemoryStorage(seed);

    const result = migrateStorage(storage, { now: 1_754_700_000_000 });

    expect(result.status).toBe('failed');
    expect(result.broken).toEqual(['hanip.v1']);
    // nothing was created, nothing was copied, nothing was deleted
    expect(storage.getItem(REGISTRY_KEY)).toBeNull();
    expect(storage.getItem(ACTIVE_KEY)).toBeNull();
    expect(storage.keys()).toEqual([...LEGACY_KEYS].sort());
    expect(storage.getItem('hanip.v1')).toBe(seed['hanip.v1']);
    expect(storage.getItem('hanip.srs-v1')).toBe(LEGACY_SRS);
  });

  it('④b keeps the copies out of storage when a write cannot be verified', () => {
    const storage = new MemoryStorage(legacySeed());
    storage.setItem = function setItem(key, value) {
      // a quota-exhausted device that silently drops the third copy
      if (key.endsWith('.srs-v1') && key !== 'hanip.srs-v1') return;
      MemoryStorage.prototype.setItem.call(this, key, value);
    };

    const result = migrateStorage(storage, { now: 1_754_700_000_000 });

    expect(result.status).toBe('failed');
    expect(result.broken).toEqual(['hanip.srs-v1']);
    expect(storage.getItem(REGISTRY_KEY)).toBeNull();
    expect(storage.keys()).toEqual([...LEGACY_KEYS].sort());
  });

  it('falls back to the legacy key names while no profile is active', () => {
    expect(resolveKey(null, 'v1')).toBe('hanip.v1');
    expect(resolveKey('abc', 'v1')).toBe('hanip.p.abc.v1');
    expect(resolveKey('abc', 'shelf-open-v1')).toBe('hanip.p.abc.shelf-open-v1');
  });
});

describe('order 29 — the profile registry', () => {
  it('gives every profile its own four-digit number, even when the names match', () => {
    const storage = new MemoryStorage();
    migrateStorage(storage, { now: 1 });
    addProfile(storage, '민수', 2);
    addProfile(storage, '민수', 3);

    const registry = readRegistry(storage);
    expect(registry).toHaveLength(3);
    // a learner who has not started yet must not claim to have studied today
    expect(registry.slice(1).map((profile) => profile.lastSeenAt)).toEqual([0, 0]);
    const codes = registry.map((profile) => profile.code);
    expect(new Set(codes).size).toBe(3);
    for (const code of codes) expect(code).toMatch(/^\d{4}$/);
    expect(registry.slice(1).map((profile) => profile.name)).toEqual(['민수', '민수']);
  });

  it('never reissues a number that is already on the device', () => {
    // a stuck generator that always asks for 0000 must still terminate on a free number
    const taken = new Set(['0000', '0001', '0002']);
    const code = freshCode(taken, () => 0);
    expect(taken.has(code)).toBe(false);
    expect(code).toMatch(/^\d{4}$/);
  });

  it('renames in place and deletes a profile with all four of its keys', () => {
    const storage = new MemoryStorage();
    migrateStorage(storage, { now: 1 });
    const second = addProfile(storage, '지우', 2);
    for (const base of DATA_KEYS) storage.setItem(namespacedKey(second.id, base), '{"kept":1}');

    renameProfile(storage, second.id, '  지우 B  ');
    expect(readRegistry(storage)[1].name).toBe('지우 B');

    removeProfile(storage, second.id);
    expect(readRegistry(storage).map((profile) => profile.id)).not.toContain(second.id);
    for (const base of DATA_KEYS) expect(storage.getItem(namespacedKey(second.id, base))).toBeNull();
  });

  it('moves the last-studied date forward only', () => {
    const storage = new MemoryStorage();
    migrateStorage(storage, { now: 1 });
    const [first] = readRegistry(storage);

    touchProfile(storage, first.id, 5_000);
    expect(readRegistry(storage)[0].lastSeenAt).toBe(5_000);

    touchProfile(storage, first.id, 2_000);   // importing older progress
    expect(readRegistry(storage)[0].lastSeenAt).toBe(5_000);
  });

  it('refuses to delete the active profile — switching away comes first', () => {
    const storage = new MemoryStorage();
    migrateStorage(storage, { now: 1 });
    const [first] = readRegistry(storage);

    expect(() => removeProfile(storage, first.id)).toThrow(/active/i);
    expect(readRegistry(storage)).toHaveLength(1);
  });
});
