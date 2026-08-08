// Progress transfer (order 29).
//
// A progress code moves one learner's work from one device to another. There is
// no server, so the code *is* the transport: the learner copies a string (or
// saves a file) and pastes it into the other phone. A profile number alone moves
// nothing — the UI says so in as many words.
//
// Two constraints shape the format.
//
//  1. It has to be pasteable. The worst progress this course can produce is
//     183kB of JSON, and 75kB even after deflate+base64, because `learned` holds
//     whole guess cards. So `learned` ships as Korean keys only and the cards are
//     rebuilt from the compiled chunks on arrival — every card is already on the
//     device. Measured worst case after that: ~3.8kB (see transfer.test.js).
//  2. It must never destroy what is already on the receiving device. Import is a
//     merge, applied all at once after the whole payload has validated.
//
// Field names are short because the no-CompressionStream fallback ships the JSON
// raw:
//   v at from | d done · dt done stamps · c collected · l learned · s starred
//   r srs · b bowls · p lastPlayed · prf prefs · shf shelf-open

export const CODE_PREFIX = 'HANIP1.';
export const FORMAT_VERSION = 1;
const MINUTE = 60_000;
const DAY = 86_400_000;
const BITE_ID = /^chapter-(\d+)-b(\d+)$/;
const MAX_BITE_BIT = 30;   // beyond this a bitmask is no longer safe — ship the id

export class TransferError extends Error {
  constructor(reason, message) {
    super(message);
    this.name = 'TransferError';
    this.reason = reason;
  }
}

// --- id folding -----------------------------------------------------------
//
// 696 of 696 bite ids are `chapter-NN-bM`, so a chapter collapses to one number
// plus a bitmask of its finished bites. This is derived from the id string, not
// from a position in the compiled index, so a code stays readable after new
// chapters ship. Anything that does not match the shape (snacks, future ids)
// travels literally in the second slot.

export function foldIds(ids) {
  const masks = new Map();
  const literal = [];
  for (const id of ids) {
    const match = typeof id === 'string' ? BITE_ID.exec(id) : null;
    const bit = match ? Number(match[2]) - 1 : -1;
    if (!match || bit < 0 || bit > MAX_BITE_BIT) {
      if (typeof id === 'string' && id) literal.push(id);
      continue;
    }
    const chapter = Number(match[1]);
    masks.set(chapter, (masks.get(chapter) || 0) | (1 << bit));
  }
  const packed = [...masks.entries()].sort((a, b) => a[0] - b[0]).flat();
  return literal.length ? [packed, literal.sort()] : [packed];
}

export function unfoldIds(folded) {
  if (!Array.isArray(folded)) throw new TransferError('shape', 'Malformed id list');
  const [packed = [], literal = []] = folded;
  if (!Array.isArray(packed) || !Array.isArray(literal)) throw new TransferError('shape', 'Malformed id list');
  const ids = [];
  for (let at = 0; at < packed.length; at += 2) {
    const chapter = packed[at];
    const mask = packed[at + 1];
    if (!Number.isInteger(chapter) || !Number.isInteger(mask)) throw new TransferError('shape', 'Malformed id list');
    for (let bit = 0; bit <= MAX_BITE_BIT; bit += 1) {
      if (mask & (1 << bit)) ids.push(`chapter-${String(chapter).padStart(2, '0')}-b${bit + 1}`);
    }
  }
  for (const id of literal) {
    if (typeof id !== 'string') throw new TransferError('shape', 'Malformed id list');
    ids.push(id);
  }
  return ids;
}

// --- packing --------------------------------------------------------------

// Deltas, because both series are near-monotonic: 696 absolute minute stamps
// cost 2.2kB after deflate, the same series as deltas costs 0.17kB.
const deltas = (numbers) => numbers.map((n, i) => (i ? n - numbers[i - 1] : n));
const undelta = (list) => {
  let running = 0;
  return list.map((step) => (running += step));
};

// Day numbers are computed from noon UTC and floored, so the label round-trips
// identically in every timezone — the key is a label, not an instant.
const dayNumber = (key) => Math.floor(Date.parse(`${key}T12:00:00Z`) / DAY);

function packBowls(bowls) {
  const days = Object.keys(bowls || {}).filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key)).sort();
  if (!days.length) return [0, [], []];
  const numbers = days.map(dayNumber);
  return [numbers[0], numbers.slice(1).map((n, i) => n - numbers[i]), days.map((key) => bowls[key])];
}

function unpackBowls(packed) {
  if (!Array.isArray(packed) || packed.length !== 3) throw new TransferError('shape', 'Malformed bowls');
  const [first, deltas, counts] = packed;
  if (!Number.isFinite(first) || !Array.isArray(deltas) || !Array.isArray(counts)) {
    throw new TransferError('shape', 'Malformed bowls');
  }
  if (!counts.length) return {};
  if (deltas.length !== counts.length - 1) throw new TransferError('shape', 'Malformed bowls');
  const bowls = {};
  let day = first;
  counts.forEach((count, index) => {
    if (index) day += deltas[index - 1];
    if (!Number.isFinite(count)) throw new TransferError('shape', 'Malformed bowls');
    const date = new Date(day * DAY);
    bowls[`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`] = count;
  });
  return bowls;
}

export function packState({ progress, srs }, { name, code, now = Date.now() } = {}) {
  const at = Math.round(now / MINUTE);
  const schedule = srs || {};
  const words = Object.keys(schedule);
  const done = progress.done || {};
  // unfoldIds defines the canonical order, so the stamps are built by running the
  // fold back through it — the two arrays cannot drift apart by construction
  const folded = foldIds(Object.keys(done));
  const order = unfoldIds(folded);
  return {
    v: FORMAT_VERSION,
    at,
    from: [name ?? '', code ?? ''],
    d: folded,
    dt: deltas(order.map((id) => Math.round(done[id] / MINUTE) - at)),
    c: foldIds(progress.collected || []),
    // the expensive field, reduced to its keys — cards are rebuilt on arrival
    l: (progress.learned || []).map((item) => item.word?.ko).filter(Boolean),
    s: [...(progress.starred || [])],
    r: [words, words.map((ko) => schedule[ko].interval), words.map((ko) => Math.round(schedule[ko].due / MINUTE) - at)],
    b: packBowls(progress.bowls),
    p: progress.lastPlayed ? [progress.lastPlayed.biteOrSnackId, Math.round(progress.lastPlayed.at / MINUTE)] : null,
    prf: null,
    shf: null,
  };
}

// --- codec ----------------------------------------------------------------

const toBase64Url = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text) => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const canCompress = () => typeof CompressionStream === 'function' && typeof Response === 'function';

async function through(transform, bytes) {
  const writer = transform.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Uint8Array(await new Response(transform.readable).arrayBuffer());
}

// `compress: false` is the honest fallback for a browser without
// CompressionStream — the code still works, it is simply about three times longer.
export async function encodeCode(payload, { compress = canCompress() } = {}) {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  if (!compress) return `${CODE_PREFIX}p${toBase64Url(json)}`;
  return `${CODE_PREFIX}z${toBase64Url(await through(new CompressionStream('deflate'), json))}`;
}

export async function decodeCode(raw) {
  const text = String(raw ?? '').trim().replace(/\s+/g, '');
  if (!text.startsWith(CODE_PREFIX)) throw new TransferError('prefix', 'That does not look like a Hanip progress code.');
  const flag = text[CODE_PREFIX.length];
  const body = text.slice(CODE_PREFIX.length + 1);
  if ((flag !== 'z' && flag !== 'p') || !body) throw new TransferError('garbled', 'This code is incomplete or damaged.');

  let json;
  try {
    const bytes = fromBase64Url(body);
    const plain = flag === 'p' ? bytes : await through(new DecompressionStream('deflate'), bytes);
    json = new TextDecoder().decode(plain);
  } catch {
    throw new TransferError('garbled', 'This code is incomplete or damaged.');
  }

  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    throw new TransferError('garbled', 'This code is incomplete or damaged.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TransferError('shape', 'This code is incomplete or damaged.');
  }
  if (payload.v !== FORMAT_VERSION) {
    throw new TransferError('version', 'This code was made by a different version of Hanip.');
  }
  return payload;
}

// --- merge ----------------------------------------------------------------
//
// Rules, from the order. `srs` has no `reps` field in this app; `interval` is the
// rung of the fixed ladder [1,3,7,14,30,60] and only a correct answer climbs it,
// so a larger interval means strictly more successful reviews — it stands in for
// reps exactly. A wrong answer drops back to 1 (0.5 when starred), which is why
// the comparison is on the interval and not on the due date.
//
//   done / collected / starred / learned  union
//   bowls                                 the larger count for each day
//   srs                                   the whole entry from the larger
//                                         interval; tie → the earlier due
//   prefs / shelf-open                    this device keeps its own
//   lastPlayed                            this device keeps its own — it points
//                                         at a screen this device was on

function requireStringArray(value, what) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TransferError('shape', `Malformed ${what}`);
  }
  return value;
}

export function unpackPayload(payload) {
  const at = Number(payload.at);
  if (!Number.isFinite(at)) throw new TransferError('shape', 'Malformed timestamp');
  const [words, intervals, dues] = Array.isArray(payload.r) ? payload.r : [];
  if (!Array.isArray(words) || !Array.isArray(intervals) || !Array.isArray(dues)
    || words.length !== intervals.length || words.length !== dues.length) {
    throw new TransferError('shape', 'Malformed review schedule');
  }
  const srs = {};
  words.forEach((ko, index) => {
    const interval = intervals[index];
    const due = dues[index];
    if (typeof ko !== 'string' || !Number.isFinite(interval) || interval <= 0 || !Number.isFinite(due)) {
      throw new TransferError('shape', 'Malformed review schedule');
    }
    srs[ko] = { interval, due: (at + due) * MINUTE };
  });
  const doneIds = unfoldIds(payload.d);
  // dt is optional: a code without it simply dates every bite to the export
  const stamps = new Map();
  if (payload.dt !== undefined && payload.dt !== null) {
    if (!Array.isArray(payload.dt) || payload.dt.length !== doneIds.length
      || payload.dt.some((step) => !Number.isFinite(step))) {
      throw new TransferError('shape', 'Malformed completion dates');
    }
    undelta(payload.dt).forEach((offset, index) => stamps.set(doneIds[index], (at + offset) * MINUTE));
  }

  return {
    at: at * MINUTE,
    from: { name: String(payload.from?.[0] ?? ''), code: String(payload.from?.[1] ?? '') },
    done: doneIds,
    doneAt: stamps,
    lastPlayed: Array.isArray(payload.p) && typeof payload.p[0] === 'string' && Number.isFinite(payload.p[1])
      ? { biteOrSnackId: payload.p[0], at: payload.p[1] * MINUTE }
      : null,
    collected: unfoldIds(payload.c),
    learned: requireStringArray(payload.l, 'word list'),
    starred: requireStringArray(payload.s, 'saved words'),
    bowls: unpackBowls(payload.b),
    srs,
  };
}

// Builds the whole next state and hands it back. Nothing is written here: the
// caller commits both stores in one go, so a payload that fails halfway through
// validation leaves the device untouched.
export function planImport({ progress, srs }, payload, resolveCard = () => null) {
  const incoming = unpackPayload(payload);

  const done = { ...(progress.done || {}) };
  let newBites = 0;
  for (const id of incoming.done) {
    if (done[id]) continue;
    done[id] = incoming.doneAt.get(id) ?? incoming.at;
    newBites += 1;
  }

  const localCollected = progress.collected || [];
  const collected = [...new Set([...localCollected, ...incoming.collected])];
  const starred = [...new Set([...(progress.starred || []), ...incoming.starred])];

  const learned = [...(progress.learned || [])];
  const have = new Set(learned.map((item) => item.word?.ko).filter(Boolean));
  let newWords = 0;
  let unresolved = 0;
  for (const ko of incoming.learned) {
    if (have.has(ko)) continue;
    const card = resolveCard(ko);
    if (!card) { unresolved += 1; continue; }
    have.add(ko);
    learned.push(card);
    newWords += 1;
  }

  const bowls = { ...(progress.bowls || {}) };
  for (const [day, count] of Object.entries(incoming.bowls)) {
    bowls[day] = Math.max(bowls[day] || 0, count);
  }

  const schedule = { ...(srs || {}) };
  for (const [ko, entry] of Object.entries(incoming.srs)) {
    const mine = schedule[ko];
    if (!mine) { schedule[ko] = entry; continue; }
    if (entry.interval > mine.interval) schedule[ko] = entry;
    else if (entry.interval === mine.interval && entry.due < mine.due) schedule[ko] = entry;
  }

  return {
    // lastPlayed points at a screen, so this device keeps its own — but a device
    // with nothing to continue may as well adopt the one that came with the code
    progress: { ...progress, done, learned, bowls, collected, starred, lastPlayed: progress.lastPlayed || incoming.lastPlayed },
    srs: schedule,
    summary: {
      bites: newBites,
      words: newWords,
      grammar: collected.length - localCollected.length,
      unresolved,
      from: incoming.from,
    },
  };
}

// --- rebuilding learned cards ---------------------------------------------
//
// Every guess card the course can produce is already in the compiled chunks, so
// the rebuild is a local lookup — no network, even offline. The chunks are large
// and this only runs on an explicit import, hence the dynamic imports.

let cardIndex;

export function loadCardIndex(chunkLoaders) {
  if (cardIndex) return cardIndex;
  const loaders = chunkLoaders || [
    () => import('./bites/a1.json'),
    () => import('./bites/a2.json'),
    () => import('./bites/b1a.json'),
    () => import('./bites/b1b.json'),
    () => import('./bites/b2c1.json'),
    () => import('./snacks.json'),
  ];
  cardIndex = Promise.all(loaders.map((load) => load().then((module) => module.default))).then((chunks) => {
    const byWord = new Map();
    const collect = (cards) => {
      for (const card of cards || []) {
        if (card.kind === 'guess' && card.word?.ko && !byWord.has(card.word.ko)) byWord.set(card.word.ko, card);
      }
    };
    for (const chunk of chunks) {
      for (const chapter of chunk.chapters || []) for (const bite of chapter.bites || []) collect(bite.cards);
      for (const snack of chunk.snacks || []) collect(snack.cards);
    }
    return byWord;
  });
  cardIndex.catch(() => { cardIndex = undefined; });
  return cardIndex;
}
