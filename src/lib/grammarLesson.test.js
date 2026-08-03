import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildGrammarLesson,
  expandGrammarBite,
  findGrammarNote,
  splitGrammarTitle,
} from './grammarLesson.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function allGrammarNotes() {
  return readdirSync(join(root, 'data', 'chapters'))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) => JSON.parse(readFileSync(join(root, 'data', 'chapters', file), 'utf8')).grammarNotes || []);
}

function chapterGrammarEntries() {
  const index = JSON.parse(readFileSync(join(root, 'src', 'lib', 'bites-index.json'), 'utf8'));
  return readdirSync(join(root, 'data', 'chapters'))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const chapterId = file.replace(/\.json$/, '');
      const source = JSON.parse(readFileSync(join(root, 'data', 'chapters', file), 'utf8'));
      const compiled = index.chapters.find((chapter) => chapter.id === chapterId);
      return {
        chapterId,
        notes: source.grammarNotes || [],
        bites: compiled?.bites.filter((bite) => bite.kind === 'pattern') || [],
      };
    });
}

describe('grammar lesson expansion', () => {
  it('puts meaning and pattern examples before form rules', () => {
    const note = {
      title: 'N은/는 — topic marker',
      func: 'Marks what the sentence is about.',
      examples: [
        { ko: '저는 학생이에요.', en: 'I am a student.' },
        { ko: '오늘은 바빠요.', en: 'I am busy today.' },
      ],
      keyPoint: { label: 'Topic vs contrast', body: 'It can quietly contrast one topic with another.' },
      formTable: [{ when: 'consonant', add: '은', ex: '이름 → 이름은' }],
    };
    const cards = buildGrammarLesson(note);

    expect(cards.map((card) => card.section).slice(0, 4)).toEqual(['intro', 'pattern', 'key-point', 'form']);
    expect(cards[0].heading).toBe('topic marker');
    expect(cards.at(-1).section).toBe('recap');
  });

  it('keeps active practice after teaching and before the recap', () => {
    const note = {
      title: 'N이에요/예요 — polite to be',
      func: 'Says what a person or thing is.',
      examples: [{ ko: '학생이에요.', en: 'It is a student.' }],
    };
    const original = [{ kind: 'hunt' }, { kind: 'teach' }, { kind: 'drill' }];
    const cards = expandGrammarBite(note, original);

    expect(cards.slice(-3).map((card) => card.kind)).toEqual(['hunt', 'drill', 'grammar-lesson']);
    expect(cards.at(-1).section).toBe('recap');
  });

  it('matches a compiled bite title back to its source note', () => {
    const notes = [{ title: 'V-고 싶어요 — saying what you want' }];
    expect(findGrammarNote(notes, '문법 Grammar · V-고 싶어요')).toBe(notes[0]);
    expect(splitGrammarTitle(notes[0].title)).toEqual({ pattern: 'V-고 싶어요', heading: 'saying what you want' });
  });

  it('matches every compiled grammar bite to exactly one source note', () => {
    const entries = chapterGrammarEntries();
    expect(entries.flatMap((entry) => entry.bites)).toHaveLength(236);

    for (const { chapterId, notes, bites } of entries) {
      expect(bites, chapterId).toHaveLength(notes.length);
      for (const bite of bites) expect(findGrammarNote(notes, bite.title), `${chapterId}: ${bite.title}`).not.toBeNull();
    }
  });

  it('expands all 236 source notes without dropping examples or form rows', () => {
    const notes = allGrammarNotes();
    expect(notes).toHaveLength(236);

    for (const note of notes) {
      const cards = buildGrammarLesson(note);
      expect(cards[0].section, note.title).toBe('intro');
      expect(cards.at(-1).section, note.title).toBe('recap');

      const lessonExamples = cards
        .filter((card) => card.section === 'pattern' || card.section === 'examples')
        .flatMap((card) => card.examples || [])
        .map((example) => example.ko);
      expect(lessonExamples, note.title).toEqual((note.examples || []).map((example) => example.ko));

      const lessonRows = cards
        .filter((card) => card.section === 'form')
        .flatMap((card) => card.rows || []);
      expect(lessonRows, note.title).toEqual(note.formTable || []);

      const patternIndex = cards.findIndex((card) => card.section === 'pattern');
      const formIndex = cards.findIndex((card) => card.section === 'form');
      if (patternIndex >= 0 && formIndex >= 0) expect(patternIndex, note.title).toBeLessThan(formIndex);
      if (note.englishSpeakerPitfall?.wrong && note.englishSpeakerPitfall?.right) {
        expect(cards.some((card) => card.kind === 'grammar-check'), note.title).toBe(true);
      }
    }
  });
});
