const FORM_ROWS_PER_CARD = 2;
const EXAMPLES_PER_CARD = 2;

export function splitGrammarTitle(title = '') {
  const parts = String(title).split('—').map((part) => part.trim()).filter(Boolean);
  return {
    pattern: parts[0] || String(title).trim(),
    heading: parts.slice(1).join(' — ') || parts[0] || 'Grammar',
  };
}

export function grammarNameFromBiteTitle(title = '') {
  return String(title).split('·').slice(1).join('·').trim() || String(title).trim();
}

export function findGrammarNote(notes = [], biteTitle = '') {
  const wanted = grammarNameFromBiteTitle(biteTitle);
  return notes.find((note) => splitGrammarTitle(note.title).pattern === wanted) || null;
}

function chunks(items, size) {
  const out = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

function lessonCard(section, fields = {}) {
  return { kind: 'grammar-lesson', section, ...fields };
}

export function buildGrammarLesson(note) {
  if (!note) return [];
  const { pattern, heading } = splitGrammarTitle(note.title);
  const examples = note.examples || [];
  const formGroups = chunks(note.formTable || [], FORM_ROWS_PER_CARD);
  const cards = [];

  cards.push(lessonCard('intro', {
    label: 'Meaning',
    heading,
    pattern,
    body: note.func || note.mentalModel || '',
  }));

  if (examples.length) {
    cards.push(lessonCard('pattern', {
      label: 'Pattern first',
      heading: 'See it in real sentences first',
      pattern,
      examples: examples.slice(0, EXAMPLES_PER_CARD),
    }));
  }

  if (note.keyPoint) {
    cards.push(lessonCard('key-point', {
      label: 'Key difference',
      heading: note.keyPoint.label,
      body: note.keyPoint.body,
    }));
  } else if (note.formation) {
    cards.push(lessonCard('formation', {
      label: 'How it is built',
      heading: 'Build the complete message',
      body: note.formation,
    }));
  }

  formGroups.forEach((rows, index) => {
    cards.push(lessonCard('form', {
      label: `Form ${index + 1} of ${formGroups.length}`,
      heading: formGroups.length > 1 ? 'Choose the form by what comes before it' : 'How to build the pattern',
      rows,
    }));
  });

  const laterExamples = examples.slice(EXAMPLES_PER_CARD);
  chunks(laterExamples, EXAMPLES_PER_CARD).forEach((group, index) => {
    cards.push(lessonCard('examples', {
      label: 'Real-life examples',
      heading: index ? 'One more pair to recognize' : 'Read it in everyday Korean',
      examples: group,
    }));
  });

  if (note.pronunciation) {
    cards.push(lessonCard('pronunciation', {
      label: 'Pronunciation',
      heading: 'What you will actually hear',
      body: note.pronunciation,
      examples: examples.slice(0, 1),
    }));
  }

  if (note.exceptions?.length) {
    cards.push(lessonCard('exceptions', {
      label: 'Limits',
      heading: 'Where this rule stops',
      items: note.exceptions,
    }));
  }

  if (note.englishSpeakerPitfall) {
    cards.push(lessonCard('pitfall', {
      label: 'Common mistake',
      heading: 'Avoid the English-shaped sentence',
      wrong: note.englishSpeakerPitfall.wrong,
      right: note.englishSpeakerPitfall.right,
      body: note.englishSpeakerPitfall.explanation,
    }));
  }

  if (note.drill) {
    cards.push(lessonCard('worked', {
      label: 'Worked example',
      heading: note.drill.instruction,
      model: note.drill.model,
      items: note.drill.items || [],
    }));
  }

  if (note.englishSpeakerPitfall?.wrong && note.englishSpeakerPitfall?.right) {
    cards.push({
      kind: 'grammar-check',
      section: 'check',
      label: 'Check yourself',
      heading: 'Which sentence is natural Korean?',
      prompt: `${pattern}: natural sentence`,
      options: [
        { text: note.englishSpeakerPitfall.wrong, ok: false },
        { text: note.englishSpeakerPitfall.right, ok: true },
      ],
      explanation: note.englishSpeakerPitfall.explanation,
    });
  }

  cards.push(lessonCard('recap', {
    label: 'Recap',
    heading: 'Keep the pattern and two examples',
    pattern,
    body: note.keyPoint?.label || note.mentalModel || note.func || '',
    examples: examples.slice(0, EXAMPLES_PER_CARD),
  }));

  return cards;
}

export function expandGrammarBite(note, originalCards = []) {
  const lesson = buildGrammarLesson(note);
  if (!lesson.length) return originalCards;
  const recap = lesson.at(-1)?.section === 'recap' ? lesson.at(-1) : null;
  let learn = recap ? lesson.slice(0, -1) : lesson;
  // order 21 widened the compiled question set: rebuild tiles (kind 'order')
  // must survive into the lesson, and the compiled pitfall pick makes the
  // runtime grammar-check a duplicate — the same wrong/right pair would be
  // asked twice in one bite. Keep the runtime check only as a fallback for
  // notes whose compiled pick was crowded out by the 4-question cap.
  const practice = originalCards.filter(
    (card) => card.kind === 'hunt' || card.kind === 'drill' || card.kind === 'order'
  );
  const pitfallRight = note.englishSpeakerPitfall?.right;
  const compiledPitfallPick = pitfallRight
    && practice.some((card) => card.kind === 'drill'
      && (card.options || []).some((option) => option.text === pitfallRight));
  if (compiledPitfallPick) {
    learn = learn.filter((card) => card.kind !== 'grammar-check');
  }
  return [...learn, ...practice, ...(recap ? [recap] : [])];
}
