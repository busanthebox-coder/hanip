// Session mistake note (order 27).
//
// A bite's win screen ends with the cards the learner got wrong, so the last
// thing seen is the thing worth another look. Two deliberate rules:
//
//   * A card that was missed stays on the note even after its requeued retry is
//     answered correctly. The note records what tripped you up, not the score.
//   * Warmup and review misses count. Forgetting an old word is exactly the
//     signal the note exists to surface — excluding it would hide the misses
//     that matter most.
//
// 몰라요 (meta.skipped) is not a miss: it is a no-penalty reveal everywhere else
// in the player, and it has no "you said" to show.

const SCORED_KINDS = new Set(['guess', 'drill', 'order', 'grammar-check']);

function describe(card) {
  if (card.kind === 'guess') {
    if (!card.word?.ko) return null;
    return { key: `guess:${card.word.ko}`, ko: card.word.ko, en: card.word.en || '' };
  }
  if (card.kind === 'order') {
    if (!card.correct) return null;
    return { key: `order:${card.correct}`, ko: card.correct, en: card.prompt || '' };
  }
  // drill and grammar-check both ask a prompt and offer options; the Korean the
  // learner should have picked is the one flagged ok.
  const answer = (card.options || []).find((option) => option?.ok);
  if (!answer?.text) return null;
  return { key: `${card.kind}:${card.prompt || answer.text}`, ko: answer.text, en: card.prompt || '' };
}

export function collectMistake(list, card, correct, meta = {}) {
  const current = list || [];
  if (correct || meta.skipped || !card || !SCORED_KINDS.has(card.kind)) return current;
  const entry = describe(card);
  if (!entry || current.some((item) => item.key === entry.key)) return current;
  return [...current, { ...entry, said: meta.picked || '' }];
}
