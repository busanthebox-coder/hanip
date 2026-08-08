import { describe, expect, it } from 'vitest';
import { CONFIRM_MAX, withConfirmations } from './confirm.js';
import { GUESS_QUIZ, guessMode } from './srs.js';

const NOW = Date.UTC(2026, 7, 8, 3);
const guess = (ko) => ({ kind: 'guess', word: { ko, en: `${ko}-en` }, options: ['a', 'b', ko] });
const payoff = { kind: 'payoff', line: { ko: '안녕하세요.', en: 'Hello.' } };
const scheduled = (...words) => Object.fromEntries(words.map((ko) => [ko, { interval: 1, due: NOW }]));

describe('order 30 design B — a words bite still ends with questions', () => {
  it('re-asks two of the words it just taught, in front of the payoff', () => {
    const cards = [guess('한글'), guess('문법'), guess('단어'), payoff];
    const out = withConfirmations(cards, {});

    expect(out).toHaveLength(6);
    expect(out.slice(0, 3)).toEqual(cards.slice(0, 3));
    expect(out.at(-1)).toBe(payoff);
    expect(out.slice(3, 5).map((c) => c.word.ko)).toEqual(['한글', '문법']);
    expect(out.slice(3, 5).every((c) => c.confirm === true)).toBe(true);
  });

  it('adds one card to a bite with a single new word', () => {
    // 문법 is already on the schedule, so only 한글 is a first meeting
    const cards = [guess('한글'), guess('문법'), payoff];
    const out = withConfirmations(cards, scheduled('문법'));

    expect(out.map((c) => c.kind)).toEqual(['guess', 'guess', 'guess', 'payoff']);
    expect(out[2].word.ko).toBe('한글');
    expect(out[2].confirm).toBe(true);
  });

  it('adds nothing when every word is already on the schedule', () => {
    const cards = [guess('한글'), guess('문법'), payoff];
    const out = withConfirmations(cards, scheduled('한글', '문법'));

    expect(out).toBe(cards);
  });

  it('adds nothing to a bite that has no guess cards at all', () => {
    const cards = [{ kind: 'hunt' }, { kind: 'drill' }, payoff];
    expect(withConfirmations(cards, {})).toBe(cards);
  });

  it('never adds more than two, however many words the bite taught', () => {
    const cards = [guess('가'), guess('나'), guess('다'), guess('라'), guess('마'), guess('바'), payoff];
    expect(withConfirmations(cards, {}).filter((c) => c.confirm)).toHaveLength(CONFIRM_MAX);
  });

  it('counts a word once even when the bite teaches it twice', () => {
    const cards = [guess('한글'), guess('한글'), payoff];
    const out = withConfirmations(cards, {});
    expect(out.filter((c) => c.confirm)).toHaveLength(1);
  });

  it('appends at the end when a bite has no payoff — a snack pack', () => {
    const cards = [guess('한글'), guess('문법')];
    const out = withConfirmations(cards, {});
    expect(out.map((c) => c.confirm)).toEqual([undefined, undefined, true, true]);
  });

  it('carries no new data: a confirmation is the bite s own card, asked as a quiz', () => {
    const source = guess('한글');
    const out = withConfirmations([source, payoff], {});
    const copy = out.find((c) => c.confirm);

    expect(copy.word).toBe(source.word);
    expect(copy.options).toBe(source.options);
    expect(guessMode(copy, {})).toBe(GUESS_QUIZ);
  });
});
