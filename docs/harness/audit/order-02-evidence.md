# Order 02 evidence — extractor and guess-target expansion

Date: 2026-08-01

Starting revision: `c67fa826ef45b81bec9f0aa846466bea3666f0fa` (`main` and `origin/main`, clean)

Evidence artifact: `docs/harness/audit/order-02-evidence.md`

## Baseline and failing-first proof

- Baseline invocation: `npm run baseline`; exit `0`; observable: `baseline: OK — A1 output identical to snapshot (11 chapters)`.
- Before metrics invocation: `node scripts/report-gaps.mjs 12 34`; exit `0`; observable: 59 patterns, 31 hunt, 28 teach, 73 sentence cards with null target.
- First red invocation, before production edits: `npx vitest run scripts/lib/compiler.test.js`; exit `1`; observable: 9 failed / 25 passed. The failures were eight real A2 target cases (`모르다→몰라`, `듣다→들은`, `낫다→나은`, `그렇다→그래`, `가다→갔`, `보다→봤`, `하다→했`, `춥다→추웠`) plus nested `A/V-(으)ㄴ/는데도` expansion.
- Second red invocation, before the hunt-rate parser batch: `npx vitest run scripts/lib/compiler.test.js`; exit `1`; observable: 6 failed / 34 passed for `N 때문에`, `N 동안`, `-기로 하다`, `-냐고 하다`, `-는 척하다`, and `-는 것 같다`.
- Test inventory invocation: `rg -c "\\bit\\(" scripts/lib/compiler.test.js`; observable: 21 before, 40 after, therefore 19 new tests.

The required parser probes for single `잖아요`/`거든요`, `못 + verb`, `따라서 / 그러므로`, and empty headings were also added before production edits. They passed in the first red run, confirming those existing behaviors while the nine newly exposed gaps failed.

## Actual source cases

- Chapter 25: `A/V-(으)ㄴ/는데도`, including `비싼데도` and `공부하는데도`.
- Chapter 12: `-잖아(요) vs -거든(요)`, including `없잖아요` and `많거든요`.
- Chapter 30: `시간이 없어서 못 갔어요.` for the standalone `못` boundary.
- Chapter 26: `모르다` in `늦을지도 몰라요.`
- Chapter 21: `어제 들은 노래를 또 들어요.`; direct `듣다→들어` is asserted too.
- Chapter 15 reading: `내일은 오늘보다 나은 하루이길 바란다.`
- Chapter 19: `왜 그래요?`
- Chapters 12, 13, 14, 15, 30, and 31 supply the six teach-to-hunt improvements.

## Implementation and observed metrics

- `expandVariants` now composes nested optional-final endings, accepts spaced POS markers, and exposes stable visible pieces for selected auxiliary constructions. Empty or English-only headings still produce teach cards.
- `guessTarget` now covers 르/ㄷ/ㅅ/ㅎ irregulars, past contractions, and noun-modifier forms. Advanced target generation is used only for chapter 12 and above during compilation, preserving A1 output byte-for-byte.
- Final report invocation: `node scripts/report-gaps.mjs 12 34`; exit `0`; observable: hunt 31/59 (52.5%) → 37/59 (62.7%), teach 28 → 22, null target 73 → 36.
- Independent reconciliation invocation: direct `compileChapter` traversal over chapters 12–34 with hard failure thresholds; exit `0`; observable JSON: `{"patterns":59,"hunt":37,"teach":22,"huntPercent":62.7,"nullTargets":36}`.
- The six new hunts are chapter 12 `-는 것 같다`, chapter 13 `-냐고 하다`, chapter 14 `-기로 하다`, chapter 15 `-는 척하다`, chapter 30 `N 때문에`, and chapter 31 `N 동안`.

## Gates and adversarial QA

| Scenario | Invocation | Binary observable |
|---|---|---|
| Final repository gate | `npm run guard` | exit `0`; 34 chapters / 285 bites valid; A1 identical; 40/40 tests pass |
| Final gap report | `node scripts/report-gaps.mjs 12 34` | exit `0`; 37 hunt, 22 teach, 36 null targets |
| Independent metric check | direct `compileChapter` traversal with assertions | exit `0`; exact JSON shown above |
| Malformed and boundary headings | Node assertions over empty/null/`V/A-(`/`N /`, empty titles, `못` vs `잘못`, discourse pair, nested ending | exit `0`; 15 assertions OK |
| Deterministic regeneration | compile twice and compare `src/lib/bites.json` SHA-256 | exit `0`; both `29212d54d06da09a2d86a73119d12697a18ba0b07e586936d27b8d68ccc392b0` |
| Flake probe | targeted test twice, full test twice | all four exits `0`; 40/40 on every run |
| Immutable inputs | diff from starting revision plus SHA-256 | exit `0`; chapter manifest `7f478a974543d99f6a27baff443c05cd2f023b182b8b75579f51db2f0ef58f5d`; A1 baseline `904e30e1eec0151c60ca29acdd01522900d8f92e074ef521eb1797791f9d8303` |
| Misleading-success defense | every scenario used `set -e` or explicit process assertions, and exit code plus expected content were checked | all required checks exited `0`; both red runs exited `1` as expected |

`data/chapters/*.json` and `docs/harness/baseline-a1.json` are unchanged from the starting revision. No baseline resnapshot, validation weakening, budget change, `guard:full`, or deploy was performed.

## Cleanup and scope

- Temporary logs under `.omo/evidence/order-02` were summarized here and removed before staging; no `.omo` file is committed.
- Final staging is restricted to the compiler, compiler tests, refreshed gap report, progress row, and this evidence file.
- Remaining risk: target generation is deliberately conservative. Thirty-six A2 sentence cards still have no safe target, and morphologically empty headings remain teach cards by design.
