import { writable, get } from 'svelte/store';

const KEY = 'hanip.v1';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      done: raw.done || {},
      learned: raw.learned || [],
      bowls: raw.bowls || {},
      lastPlayed: raw.lastPlayed || null,
    };
  } catch {
    return { done: {}, learned: [], bowls: {}, lastPlayed: null };
  }
}

export const progress = writable(load());
progress.subscribe((state) => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
});

export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function markBiteDone(bite) {
  progress.update((state) => {
    const done = { ...state.done, [bite.id]: Date.now() };
    const day = todayKey();
    const bowls = { ...state.bowls, [day]: (state.bowls[day] || 0) + 1 };
    // guessed words join the recall pool so future bites can warm up with them
    const fresh = bite.cards
      .filter((c) => c.kind === 'guess')
      .filter((c) => !state.learned.some((l) => l.word.ko === c.word.ko));
    const learned = [...state.learned, ...fresh].slice(-200);
    return { ...state, done, learned, bowls };
  });
}

export function markLastPlayed(biteOrSnackId, at = Date.now()) {
  progress.update((state) => ({ ...state, lastPlayed: { biteOrSnackId, at } }));
}

// up to 2 recall cards from earlier bites, excluding this bite's own words
export function warmupCards(bite, count = 2) {
  const { learned, done } = get(progress);
  if (Object.keys(done).length === 0) return [];
  const current = new Set(bite.cards.filter((c) => c.kind === 'guess').map((c) => c.word.ko));
  const pool = learned.filter((c) => !current.has(c.word.ko));
  const picks = [];
  const used = new Set();
  while (picks.length < Math.min(count, pool.length) && used.size < pool.length) {
    const at = Math.floor(Math.random() * pool.length);
    if (used.has(at)) continue;
    used.add(at);
    picks.push({ ...pool[at], warmup: true });
  }
  return picks;
}

// this week's bowls: how many of the last 7 days had at least one bite
export function weekBowls(state) {
  let bowls = 0;
  for (let d = 0; d < 7; d++) {
    const day = new Date();
    day.setDate(day.getDate() - d);
    if ((state.bowls[todayKey(day)] || 0) > 0) bowls += 1;
  }
  return bowls;
}
