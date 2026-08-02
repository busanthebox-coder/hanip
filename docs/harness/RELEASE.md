# Hanip v2 migration release

Released: 2026-08-02

## Shipped content

| Level | Chapters | Chapter bites | Chapter cards | hunt | teach | Snacks | Snack cards |
|---|---:|---:|---:|---:|---:|---:|---:|
| A1 | 11 | 89 | 335 | 18 | 5 | 11 | 161 |
| A2 | 23 | 196 | 663 | 37 | 22 | 1 | 12 |
| B1 | 22 | 242 | 740 | 65 | 48 | 0 | 0 |
| B2 | 7 | 74 | 244 | 26 | 7 | 0 | 0 |
| C1 | 2 | 18 | 57 | 1 | 7 | 0 | 0 |
| **Total** | **65** | **619** | **2,039** | **147** | **89** | **12** | **173** |

- Total playable items: 631 (619 chapter bites + 12 snacks)
- Total playable cards: 2,212 (2,039 chapter cards + 173 snack cards)
- Wordbook: 718 words, including 48 course words linked to a confusable set
- Confusable-set browser: 32 sets / 89 members
- Readers: 20
- Vocab packs: 12 / 173 of 173 members joined / 0 excluded

The canonical count command is `node scripts/smoke-stats.mjs`.

## Audit and regression receipt

- Content audit: 232 findings, including 63 blockers; 0 findings remain unfixed.
- Polish: 1 finding recorded, 1 fixed, **0 outstanding**.
- A1 baseline: unchanged since the intentional order-03 resnapshot recorded in `PROGRESS.md`.
- Final guard: compile, validation, baseline, 104 tests, production build, and bundle budget all pass.
- Browser coverage: A1 start, A2 pattern hunt, C1 entry, snack/reader/cluster, and Continue; console errors 0.

## Remaining teach fallbacks

Teach cards are the intentional fallback when a grammar title cannot be safely converted into a tap hunt. There are 89 in the shipped course. The complete generated lists are recorded in:

- A1 (5): Ch. 1 `자음 (Consonants)`, Ch. 1 `모음 (Vowels)`, Ch. 5 `자연스럽게 말하기`, Ch. 11 `-아서/어서`, Ch. 11 `-고 / -(으)면 / -(으)ㄹ게요`
- A2 (22): [chapters 12–34 gap report](audit/gap-report-12-34.md)
- B1 (48): [chapters 35–56 gap report](audit/gap-report-35-56.md)
- B2/C1 (14): [chapters 57–65 gap report](audit/gap-report-57-65.md)

The same reports record 17 remaining guess examples whose sentence target is null (15 in chapters 12–34, 0 in 35–56, 2 in 57–65). They are reported as extraction limits, not hidden as successful hunts.

## Production receipt

- Deployment command: `npm run deploy` (its bundled `guard:full` passed before publish).
- Deployment source: clean committed runtime at `f01113f2bf86fbce77191d0d2fb3234cd56552a8`; unrelated local showcase work was excluded.
- Local entry: `assets/index-PzFaCE37.js`.
- Cache-busted live entry: `assets/index-PzFaCE37.js` (matched after two 20-second checks).
- Live browser: A1 chapter 1 first word bite and C1 chapter 64 first word bite both loaded and rendered.
- Live browser warnings/errors: 0.

## Known limits

- The 89 teach fallbacks above remain read-confirmation cards rather than morpheme hunts.
- The 17 null-target guess examples remain visible in the generated gap reports.
- Progress and `lastPlayed` are browser-local; session snack skips intentionally reset on a new app session.
- No vocab-pack member was excluded and no audit or polish finding remains unfixed.
