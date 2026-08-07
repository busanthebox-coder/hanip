// Order 24: assemble a static grammar reference from a compiled pattern bite.
// Nothing here re-derives data — it only rearranges what the compiler already
// shipped inside the bite's own cards (rule card, drills, tiles).

export function ruleCardOf(bite) {
  return (bite?.cards || []).find((c) => c.kind === 'hunt' || c.kind === 'teach') || null;
}

export function rowsOf(rule) {
  if (!rule) return [];
  if (rule.kind === 'teach') return rule.rows || [];
  return rule.rule?.rows || [];
}

const norm = (text) => String(text || '').replace(/\s+/g, ' ').trim();

// every example the bite carries: hunted lines, teach examples, drill
// sentences (blank refilled with the answer), and order-tile sentences —
// deduplicated by their Korean text, in the order the learner met them
export function collectExamples(bite) {
  const out = [];
  const seen = new Set();
  const push = (ko, en, romanization) => {
    const key = norm(ko);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ ko: norm(ko), en: en || '', romanization: romanization || '' });
  };

  for (const card of bite?.cards || []) {
    if (card.kind === 'hunt') {
      for (const line of card.lines || []) push(line.ko, line.en, line.romanization);
    } else if (card.kind === 'teach') {
      for (const ex of card.examples || []) push(ex.ko, ex.en, ex.romanization);
    } else if (card.kind === 'drill') {
      if (!card.sentence || !card.sentence.includes('___')) continue;
      const ok = (card.options || []).find((o) => o.ok);
      if (!ok) continue;
      // an English prompt IS the sentence's translation on generated clozes
      const en = /[A-Za-z]/.test(card.prompt) && !card.prompt.includes('·') ? card.prompt : '';
      push(card.sentence.replace('___', ok.text), en, '');
    } else if (card.kind === 'order') {
      push(card.correct, '', '');
    }
  }
  return out;
}
