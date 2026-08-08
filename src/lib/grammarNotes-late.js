// Chapters 40-99 (filenames chapter-4x…chapter-9x). Half of the grammar-note
// payload — see grammarData.js for why the notes ship in two chunks.
export const notes = import.meta.glob('../../data/chapters/chapter-[4-9]*.json', {
  eager: true,
  import: 'grammarNotes',
});
