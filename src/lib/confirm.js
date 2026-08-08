// Order 30, design B — the end-of-bite confirmation.
//
// Teaching a word on first sight means a words bite would otherwise end with
// nothing answered, which breaks the app's own promise that nothing is
// read-only and that a bite ends on something you did. So the bite closes with
// up to two of the words it has just taught, re-asked as ordinary quiz cards —
// the earliest possible review, in the same sitting.
//
// These are the bite's own guess cards with a play-time `confirm` flag, so no
// new card kind, no new compiled data and no new stored field. The picks are the
// *first* words taught: they have had the longest to fade, so they are the ones
// worth checking.
//
// ── This section is meant to be removable on its own. ───────────────────────
// To drop design B entirely: delete this file, its test, and the import plus
// the two `withConfirmations(...)` calls in BitePlayer.svelte. Nothing else in
// the app reads `confirm` except `guessMode`, which treats an absent flag as
// "ask the schedule" — the teach/quiz split keeps working untouched.
// ---------------------------------------------------------------------------
import { GUESS_TEACH, guessMode } from './srs.js';

export const CONFIRM_MAX = 2;

export function withConfirmations(cards, schedule, max = CONFIRM_MAX) {
  const list = cards || [];
  const picks = [];
  const seen = new Set();
  for (const card of list) {
    if (picks.length >= max) break;
    if (guessMode(card, schedule) !== GUESS_TEACH) continue;
    const ko = card.word?.ko;
    if (!ko || seen.has(ko)) continue;
    seen.add(ko);
    picks.push({ ...card, confirm: true });
  }
  if (!picks.length) return list;
  // the payoff stays the last thing the learner sees
  let at = list.length;
  while (at > 0 && list[at - 1]?.kind === 'payoff') at -= 1;
  return [...list.slice(0, at), ...picks, ...list.slice(at)];
}
