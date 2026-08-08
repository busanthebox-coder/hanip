import { get, writable } from 'svelte/store';

export const SRS_KEY = 'hanip.srs-v1';
export const INTERVALS = Object.freeze([1, 3, 7, 14, 30, 60]);
const DAY_MS = 86_400_000;

function timestamp(now) {
  return now instanceof Date ? now.getTime() : Number(now);
}

function normalize(raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return {};
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => (
    value && Number.isFinite(value.due) && Number.isFinite(value.interval) && value.interval > 0
  )).map(([ko, value]) => [ko, { due: value.due, interval: value.interval }]));
}

function load() {
  try { return normalize(JSON.parse(localStorage.getItem(SRS_KEY) || '{}')); }
  catch { return {}; }
}

export const srs = writable(load());
srs.subscribe((state) => {
  try { localStorage.setItem(SRS_KEY, JSON.stringify(normalize(state))); } catch { /* private mode */ }
});

export function nextInterval(currentInterval) {
  if (!currentInterval) return INTERVALS[0];
  return INTERVALS.find((interval) => interval > currentInterval) || INTERVALS.at(-1);
}

// The one place the ladder is walked. record() writes what this returns and the
// reveal line reads it, so "Next review in N days" can never drift from reality.
export function nextIntervalDays(schedule, ko, correct, starred = false) {
  if (correct) return nextInterval(schedule?.[ko]?.interval);
  return starred ? 0.5 : 1;
}

export function applyRecord(schedule, ko, correct, now = Date.now(), starred = false) {
  if (!ko) return { ...schedule };
  const at = timestamp(now);
  const interval = nextIntervalDays(schedule, ko, correct, starred);
  return {
    ...(schedule || {}),
    [ko]: { interval, due: at + interval * DAY_MS },
  };
}

export function record(ko, correct, now = Date.now(), starred = false) {
  let recorded = null;
  srs.update((schedule) => {
    const next = applyRecord(schedule, ko, correct, now, starred);
    recorded = next[ko] || null;
    return next;
  });
  return recorded;
}

export function dueCards(now = Date.now(), schedule = get(srs)) {
  const at = timestamp(now);
  return Object.entries(schedule || {})
    .filter(([, value]) => value.due <= at)
    .map(([ko, value]) => ({ ko, ...value }))
    .sort((a, b) => a.due - b.due || a.ko.localeCompare(b.ko));
}

export function learnedDueEntries(learned, schedule = get(srs), now = Date.now()) {
  const learnedWords = new Set((learned || []).map((card) => card.word?.ko).filter(Boolean));
  return dueCards(now, schedule).filter((entry) => learnedWords.has(entry.ko));
}

function reverseOptions(card, pool, index) {
  const seen = new Set([card.word.ko]);
  const candidates = (pool || [])
    .map((item) => item.word)
    .filter((word) => {
      if (!word?.ko || seen.has(word.ko)) return false;
      seen.add(word.ko);
      return true;
    });
  const samePart = candidates.filter((word) => word.pos && word.pos === card.word.pos);
  const others = candidates.filter((word) => !samePart.includes(word));
  const distractors = [...samePart, ...others].slice(0, 2).map((word) => word.ko);
  if (distractors.length < 2) return null;
  const options = [card.word.ko, ...distractors];
  const shift = index % options.length;
  return [...options.slice(shift), ...options.slice(0, shift)];
}

export function prepareReviewCards(cards, learnedPool = cards) {
  return (cards || []).map((card, index) => {
    const base = { ...card, review: true, direction: 'ko→en' };
    if (index % 2 === 0) return base;
    const options = reverseOptions(card, learnedPool, index);
    return options ? { ...base, direction: 'en→ko', options } : base;
  });
}

export function buildDueReviewCards(learned, schedule = get(srs), now = Date.now(), count = 8) {
  const byWord = new Map((learned || []).map((card) => [card.word?.ko, card]));
  const cards = learnedDueEntries(learned, schedule, now)
    .map((entry) => byWord.get(entry.ko))
    .filter(Boolean)
    .slice(0, count);
  return prepareReviewCards(cards, learned || []);
}

export function backfillLearnedSchedules(schedule, learned, now = Date.now()) {
  const at = timestamp(now);
  const next = { ...(schedule || {}) };
  for (const card of learned || []) {
    const ko = card.word?.ko;
    if (ko && !next[ko]) next[ko] = { interval: 1, due: at };
  }
  return next;
}

export function migrateLearnedSchedules(learned, now = Date.now()) {
  srs.update((schedule) => {
    const next = backfillLearnedSchedules(schedule, learned, now);
    return Object.keys(next).length === Object.keys(schedule).length ? schedule : next;
  });
}

export function resetSrs() {
  srs.set({});
}
