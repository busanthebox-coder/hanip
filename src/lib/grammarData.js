import { expandGrammarBite, findGrammarNote } from './grammarLesson.js';

// Keep the notes inside the one lazily imported grammarData chunk. Bundling the
// 65 small note sets together gives compression enough shared context to stay
// inside the production budget, while vocabulary/dialogue/reading stay out.
const grammarSources = import.meta.glob('../../data/chapters/*.json', {
  eager: true,
  import: 'grammarNotes',
});

export async function loadGrammarCards(chapterId, biteTitle, originalCards = []) {
  const path = `../../data/chapters/${chapterId}.json`;
  const notes = grammarSources[path];
  if (!notes) return null;
  const note = findGrammarNote(notes || [], biteTitle);
  return note ? expandGrammarBite(note, originalCards) : null;
}
