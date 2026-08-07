// The single definition of "what a card is", shared by baseline.mjs (did the
// live A1 course change?) and check-additive.mjs (did any existing card change
// or vanish?). Both gates MUST hash cards identically or they'd disagree about
// the same output, so the logic lives here rather than being copied.
//
// The key is structural: it captures what a learner sees and answers, not the
// JSON layout, so reordering fields can't false-alarm while a changed prompt,
// option set, or answer always trips.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function cardKey(card) {
  switch (card.kind) {
    case 'guess': return `guess:${card.word.ko}:${card.target ?? ''}:${card.options.join('|')}`;
    case 'hunt': return `hunt:${card.name}:${card.lines.map((l) => l.tokens.filter((t) => t.hit).map((t) => t.mid).join(',')).join(';')}`;
    case 'teach': return `teach:${card.name}:${(card.examples || []).length}ex`;
    case 'drill': return `drill:${card.prompt}:${card.options.map((o) => o.text + (o.ok ? '*' : '')).join('|')}`;
    case 'order': return `order:${card.correct}`;
    case 'chat': return `chat:${card.lines.length}`;
    case 'read': return `read:${card.chunks.length}:${card.qas.length}qa`;
    case 'payoff': return `payoff:${card.hl}:${card.line.ko}`;
    default: return card.kind;
  }
}

export function readBites(root) {
  return JSON.parse(readFileSync(join(root, 'src', 'lib', 'bites.json'), 'utf8'));
}

// Structural snapshot of chapters: ids, bite identity, and the ordered card keys.
export function snapshotChapters({ root, filter = () => true }) {
  const { chapters } = readBites(root);
  return chapters.filter(filter).map((ch) => ({
    id: ch.id,
    biteCount: ch.biteCount,
    bites: ch.bites.map((b) => ({ id: b.id, kind: b.kind, title: b.title, cards: b.cards.map(cardKey) })),
  }));
}
