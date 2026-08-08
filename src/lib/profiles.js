// Student profiles (order 29).
//
// One phone, several learners. Every profile owns a private copy of the four
// keys the app already writes, under `hanip.p.<id>.<base>`. Nothing here talks
// to a server: a name is a local label and a #number only tells two learners
// apart *on this device*. Carrying progress to another device is the job of
// `transfer.js`.
//
// The migration below is the one operation in this app that can destroy a
// learner's work, so it runs strictly copy → verify → clean: the legacy keys
// are removed only after every copy has been read back and compared byte for
// byte. Any failure at any step leaves storage exactly as it was found, and the
// app then keeps reading the legacy key names (see `resolveKey`) — degraded to
// pre-order-29 behaviour rather than empty.

import { get, writable } from 'svelte/store';

export const REGISTRY_KEY = 'hanip.profiles-v1';
export const ACTIVE_KEY = 'hanip.active-v1';

// the four stores that belong to a learner, by their key suffix
export const DATA_KEYS = Object.freeze(['v1', 'prefs-v1', 'srs-v1', 'shelf-open-v1']);
export const LEGACY_KEYS = Object.freeze(DATA_KEYS.map((base) => `hanip.${base}`));

export const DEFAULT_NAME = 'Learner';
const MAX_NAME = 24;

export const namespacedKey = (id, base) => `hanip.p.${id}.${base}`;

// No profile yet (fresh boot, private mode, or a migration that refused to run)
// means the legacy names — the app must never silently start from zero.
export function resolveKey(id, base) {
  return id ? namespacedKey(id, base) : `hanip.${base}`;
}

function readJson(storage, key) {
  const raw = storage.getItem(key);
  if (raw === null || raw === undefined) return { present: false };
  try {
    return { present: true, raw, value: JSON.parse(raw) };
  } catch {
    return { present: true, raw, broken: true };
  }
}

export function readRegistry(storage) {
  const found = readJson(storage, REGISTRY_KEY);
  if (!found.present || found.broken || !Array.isArray(found.value)) return [];
  return found.value
    .filter((entry) => entry && typeof entry.id === 'string' && entry.id)
    .map((entry) => ({
      id: entry.id,
      name: typeof entry.name === 'string' ? entry.name : DEFAULT_NAME,
      code: /^\d{4}$/.test(entry.code) ? entry.code : '0000',
      createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : 0,
      lastSeenAt: Number.isFinite(entry.lastSeenAt) ? entry.lastSeenAt : 0,
    }));
}

export function writeRegistry(storage, list) {
  storage.setItem(REGISTRY_KEY, JSON.stringify(list));
}

export function readActiveId(storage) {
  const raw = storage.getItem(ACTIVE_KEY);
  return typeof raw === 'string' && raw ? raw : null;
}

// The learner-facing "내 번호". Random so it does not read as a queue position,
// but a stuck generator must still terminate — hence the linear sweep.
export function freshCode(taken, random = Math.random) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = String(Math.floor(random() * 10_000)).padStart(4, '0');
    if (!taken.has(code)) return code;
  }
  for (let n = 0; n < 10_000; n += 1) {
    const code = String(n).padStart(4, '0');
    if (!taken.has(code)) return code;
  }
  return '0000';
}

export function cleanName(name) {
  const trimmed = String(name ?? '').trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, MAX_NAME) : DEFAULT_NAME;
}

function newId(now, random) {
  return `${now.toString(36)}${Math.floor(random() * 46_656).toString(36).padStart(3, '0')}`;
}

// lastSeenAt is 0 until a bite is finished, so a learner who has not started yet
// reads as "Not started" instead of claiming to have studied on the day they
// were added. The migrated profile is the exception: its progress is real and
// its owner is holding the phone right now.
function makeProfile(storage, name, now, random, lastSeenAt = 0) {
  const registry = readRegistry(storage);
  return {
    id: newId(now, random),
    name: cleanName(name),
    code: freshCode(new Set(registry.map((profile) => profile.code)), random),
    createdAt: now,
    lastSeenAt,
  };
}

export function addProfile(storage, name, now = Date.now(), random = Math.random) {
  const profile = makeProfile(storage, name, now, random);
  writeRegistry(storage, [...readRegistry(storage), profile]);
  return profile;
}

export function renameProfile(storage, id, name) {
  writeRegistry(storage, readRegistry(storage)
    .map((profile) => (profile.id === id ? { ...profile, name: cleanName(name) } : profile)));
}

// Monotonic: "last studied" is the newest study this profile can account for, so
// importing older progress must never drag the date backwards.
export function touchProfile(storage, id, now = Date.now()) {
  const registry = readRegistry(storage);
  const current = registry.find((profile) => profile.id === id);
  if (!current || !(now > current.lastSeenAt)) return;
  writeRegistry(storage, registry
    .map((profile) => (profile.id === id ? { ...profile, lastSeenAt: now } : profile)));
}

export function removeProfile(storage, id) {
  if (readActiveId(storage) === id) throw new Error('Switch away before deleting the active profile');
  writeRegistry(storage, readRegistry(storage).filter((profile) => profile.id !== id));
  for (const base of DATA_KEYS) storage.removeItem(namespacedKey(id, base));
}

// --- migration ------------------------------------------------------------

export function migrateStorage(storage, { now = Date.now(), random = Math.random } = {}) {
  if (readRegistry(storage).length > 0) return { status: 'noop', moved: [] };

  // 1. read every legacy key that exists and prove it parses. A truncated write
  //    is reported, never discarded — the raw key stays for a human to rescue.
  const sources = [];
  const broken = [];
  for (const base of DATA_KEYS) {
    const legacy = `hanip.${base}`;
    const found = readJson(storage, legacy);
    if (!found.present) continue;
    if (found.broken) broken.push(legacy);
    else sources.push({ base, legacy, raw: found.raw });
  }
  if (broken.length) return { status: 'failed', reason: 'unreadable', broken, moved: [] };

  const profile = makeProfile(storage, DEFAULT_NAME, now, random, sources.length ? now : 0);

  // 2. copy, then read every copy back and compare. Only an exact string match
  //    counts — a device that silently drops writes must not reach step 3.
  const written = [];
  for (const source of sources) {
    const target = namespacedKey(profile.id, source.base);
    try {
      storage.setItem(target, source.raw);
    } catch {
      /* verified below either way */
    }
    written.push(target);
    if (storage.getItem(target) !== source.raw) {
      for (const key of written) storage.removeItem(key);
      return { status: 'failed', reason: 'unverified', broken: [source.legacy], moved: [] };
    }
  }

  // 3. only now does the device gain a profile, and only now do the originals go
  writeRegistry(storage, [profile]);
  storage.setItem(ACTIVE_KEY, profile.id);
  for (const source of sources) storage.removeItem(source.legacy);

  return {
    status: sources.length ? 'moved' : 'created',
    profile,
    moved: sources.map((source) => source.base),
  };
}

// --- live layer -----------------------------------------------------------

function browserStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;   // private mode can throw on access alone
  }
}

// Runs as a module side effect on purpose: store.js / prefs.js / srs.js read
// their key the moment they are imported, and they import this module, so ESM
// evaluation order guarantees the namespace exists before the first read.
const boot = (() => {
  const storage = browserStorage();
  if (!storage) return { id: null, status: 'unavailable', broken: [], registry: [] };
  let result;
  try {
    result = migrateStorage(storage);
  } catch {
    result = { status: 'failed', reason: 'threw', broken: [] };
  }
  const registry = readRegistry(storage);
  const stored = readActiveId(storage);
  const id = registry.some((profile) => profile.id === stored) ? stored : (registry[0]?.id ?? null);
  return { id, status: result.status, broken: result.broken || [], registry };
})();

export const migration = Object.freeze({ status: boot.status, broken: boot.broken });
export const profiles = writable(boot.registry);
export const activeId = writable(boot.id);

export function activeKey(base) {
  return resolveKey(get(activeId), base);
}

export function activeProfile() {
  const id = get(activeId);
  return get(profiles).find((profile) => profile.id === id) || null;
}

function commit(mutate) {
  const storage = browserStorage();
  if (!storage) return null;
  let outcome = null;
  try {
    outcome = mutate(storage);
    profiles.set(readRegistry(storage));
  } catch (error) {
    profiles.set(readRegistry(storage));
    throw error;
  }
  return outcome;
}

export function createProfile(name) {
  return commit((storage) => addProfile(storage, name));
}

export function rename(id, name) {
  commit((storage) => renameProfile(storage, id, name));
}

export function remove(id) {
  commit((storage) => removeProfile(storage, id));
}

export function touchActive(now = Date.now()) {
  const id = get(activeId);
  if (id) commit((storage) => touchProfile(storage, id, now));
}

// Switching writes the pointer and reloads rather than re-reading the stores in
// place. Every store here loads once at module init and a dozen components hold
// derived state off it; a full reload is the only way to be certain no screen is
// still showing the previous learner's progress. Correctness beats the flicker.
export function switchProfile(id, reload = () => window.location.reload()) {
  const storage = browserStorage();
  if (!storage) return;
  if (!readRegistry(storage).some((profile) => profile.id === id)) return;
  storage.setItem(ACTIVE_KEY, id);
  reload();
}
