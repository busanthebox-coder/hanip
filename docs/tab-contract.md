# Hanip tab-component contract

Every new tab is one self-contained Svelte 4 component. Follow this exactly so
four components built in parallel integrate without edits.

## Hard rules

- **Svelte 4, plain JS** — no TypeScript syntax, no stores you invent, no router.
- **Write ONLY your assigned file.** Never touch App.svelte, package.json,
  existing components, scripts, or data files.
- **Do NOT run** npm dev/build/test — the integrator verifies compilation.
- Read these before writing: `src/styles/tokens.css` (design tokens),
  `src/components/Shelf.svelte` (style reference), your data file.

## Design language (Hanip)

- Tokens only — no hard-coded colors: `--bg --ink --ink-2 --ink-3 --card --wash
  --line --line-2 --accent --accent-deep --accent-soft --gold --gold-soft
  --good --good-deep --good-soft --r-card --r-chip --shadow-1 --ease`.
- Section shell: `max-width: 480px; margin: 0 auto; padding: 30px 20px 40px;`
- Section header: caps label 11.5px/850/letter-spacing .2em/uppercase in
  `--accent`, then a one-line sub in `--ink-3` 13.5px.
- Cards: `background: var(--card); border: 1px solid var(--line);
  border-radius: 18px; box-shadow: var(--shadow-1);`
- Korean text: `word-break: keep-all`. Interactive rows ≥44px tall.
- **Bilingual everywhere**: labels and instructions are `한국어 · English`
  (e.g. "한글 · The Korean alphabet"). Content English comes from data.
- Transitions: explicit properties only (never `transition: all`).

## Shared utilities

- Audio: `import AudioDot from './cards/AudioDot.svelte';` →
  `<AudioDot text={'한국어 텍스트'} size={26} />` (speaks via TTS).
  Or `import { speak } from '../lib/tts.js'; speak('가')`.
- Learned-word state (Wordbook only):
  `import { progress } from '../lib/store.js';` — `$progress.learned` is an
  array of guess-cards; `$progress.learned.some((c) => c.word.ko === ko)`
  means the learner has met that word.

## Acceptance

- Component renders top-level (no required props unless listed in your brief).
- All interactive elements are real `<button>`s with visible focus.
- No console errors, no undefined-variable references, no missing imports.
- Long lists stay usable: your tab must not freeze with its full dataset.
