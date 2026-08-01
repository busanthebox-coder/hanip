# Order 01 execution evidence

Date: 2026-08-01

## Starting state and baseline

- Scenario: confirm the requested base before edits.
- Invocation: `git branch --show-current && git rev-parse HEAD && git status --short`
- Observable: branch `main`; HEAD `b791044404e0d355f07973cf21753d8ff0417a36`; empty status output.
- Scenario: establish the pre-import gate.
- Invocation: `npm run guard`
- Observable: exit 0; 11 chapters, 89 bites, 334 cards; structural validation OK; A1 snapshot identical; 21/21 tests passed.

## Source-copy integrity

- Scenario: prove chapters 12–34 are unchanged copies and the destination contains exactly chapters 01–34.
- Invocation: `for n in $(seq 12 34); do cmp -s "../korean-core-starter/scripts/rich-chapters/chapter-$n.json" "data/chapters/chapter-$n.json" || mismatches=$((mismatches+1)); done` plus file-count assertions.
- Observable: exit 0; `chapter_files=34 copied_12_34=23 byte_mismatches=0`.

## Compilation and required verification

- Scenario: compile all imported content.
- Invocation: `npm run compile`
- Observable: exit 0; wordbook 563 words; 34 chapters, 285 bites, 996 cards; no compiler failure and therefore no compiler change was needed.
- Scenario: run the full Order 01 automated gate after the import.
- Invocation: `npm run guard`
- Observable: exit 0; 34 chapters, 285 bites, 996 cards; `validate-bites` OK; A1 snapshot identical; 21/21 tests passed.
- Scenario: generate the required gap report through its real CLI.
- Invocation: `node scripts/report-gaps.mjs 12 34`
- Observable: exit 0; 23 chapters, 196 bites; 59 pattern bites split into 31 hunt and 28 teach fallback; 73 sentence guess cards with null target; report written to `docs/harness/audit/gap-report-12-34.md`.

## Manual reconciliation

- Scenario: independently parse `src/lib/bites.json` for chapters 12–34 rather than trusting reporter output.
- Invocation: independent `node -e` reduction over chapter numbers, bite kinds, card kinds, and null targets.
- Observable: chapters 12 through 34 inclusive; 23 chapters; `bites=196`; `biteCountSum=196`; 662 cards; bite kinds `boss=23`, `dialogue=23`, `pattern=59`, `reading=23`, `words=68`; `hunt=31`; `teachFallback=28`; `patternCovered=59`; `nullTargetSentenceGuesses=73`.
- Scenario: inspect the generated Markdown structure and reconcile its data rows.
- Invocation: `node -e` assertions over `docs/harness/audit/gap-report-12-34.md`.
- Observable: exit 0; all 10 required title/summary/section markers present; 59 pattern rows; 73 null-target guess rows; `REPORT_STRUCTURE_OK`.

## Adversarial probes

- Stale generated state: captured SHA-256 values, reran `npm run guard` and `node scripts/report-gaps.mjs 12 34`, then recaptured them. Both sets were identical: `bites.json=19c82df42c203f682a1db02431531e1d3fdb38de9ac49775e52959c021237224`, `wordbook.json=13590dfb25069717b3a54f0b46a5a069d7e2763b3bb673086961fb1a9e36e9ba`, `gap-report-12-34.md=64f05df4b26054be0b439c9a887237d5c47fcc768c56a678182643ce2746ab01`.
- Misleading success, invalid usage: `node scripts/report-gaps.mjs` printed the usage line and exited 1.
- Misleading success, absent compiled chapter: `node scripts/report-gaps.mjs 35 35` printed `missing compiled chapter(s): 35` and exited 1.
- Whitespace integrity: `git diff --check` exited 0 with no output.
- Dirty-worktree/staging scope: recorded after staging below.

## Staging and cleanup

- Generated `src/lib/bites.json` and `src/lib/wordbook.json` are intentionally ignored by the repository and were not staged.
- No `guard:full`, deploy, budget change, A1 resnapshot, parent-repository write, or temporary repository artifact was performed.
- Staging probe result: `git diff --cached --name-status` listed exactly 27 Order 01 files (23 chapter copies, PROGRESS, gap report, evidence, reporter); `git diff --name-only` was empty; generated ignored files were absent.
