import { expandGrammarBite, findGrammarNote } from './grammarLesson.js';

// Keep the notes out of the entry bundle and away from vocabulary/dialogue/
// reading: only grammar notes ride along, and bundling many small note sets
// together gives compression enough shared context to stay cheap. At 65
// chapters that was one chunk; chapters 66-72 pushed it past the 220kB chunk
// budget, so the notes now ship in two halves (the b1a/b1b precedent) and a
// lesson downloads only the half its chapter lives in.
const halves = [
  { holds: (n) => n <= 39, load: () => import('./grammarNotes-early.js') },
  { holds: (n) => n >= 40, load: () => import('./grammarNotes-late.js') },
];

export async function loadGrammarCards(chapterId, biteTitle, originalCards = []) {
  const path = `../../data/chapters/${chapterId}.json`;
  const half = halves.find((h) => h.holds(Number(String(chapterId).match(/\d+/)?.[0])));
  if (!half) return null;
  const { notes: grammarSources } = await half.load();
  const notes = grammarSources[path];
  if (!notes) return null;
  const note = findGrammarNote(notes || [], biteTitle);
  return note ? expandGrammarBite(note, originalCards) : null;
}
