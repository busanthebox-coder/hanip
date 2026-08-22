// Which language leads a learning instruction ("무슨 뜻일까요?" / "What does the
// highlighted word mean?").
//
// Order 27 made the Korean instruction the hero with a small English line under
// it, on the reasoning that instructions are part of the immersion. Order 34
// keeps that from A2 on but flips it for A1: through chapter 11 the learner is
// still being taught to read Hangul, so an instruction they cannot decode is
// not immersion, it is a blank. The pair is never broken — only its order and
// its two type sizes swap.
//
// The level is read here rather than compiled into the cards on purpose: it is
// a property of where the learner is, not of the card, and putting it in the
// compiler would move a UI decision into the frozen bites.json.
import { chapterLevel } from './levels.js';

const CHAPTER_ID = /chapter-(\d+)/;

export function biteLevel(bite) {
  if (!bite) return null;
  // Snacks are vocab packs anchored after a chapter, not inside one, so they
  // carry their own level and must not be parsed out of an id.
  if (bite.level) return bite.level;
  const found = CHAPTER_ID.exec(bite.chapterId || bite.id || '');
  return found ? chapterLevel(Number(found[1])) : null;
}

export function instructionLead(level) {
  return level === 'A1' ? 'en' : 'ko';
}

export function instructionLeadFor(bite) {
  return instructionLead(biteLevel(bite));
}
