// Chapters 1-39 (filenames chapter-0x…chapter-3x). Half of the grammar-note
// payload — see grammarData.js for why the notes ship in two chunks.
export const notes = import.meta.glob('../../data/chapters/chapter-[0-3]*.json', {
  eager: true,
  import: 'grammarNotes',
});
