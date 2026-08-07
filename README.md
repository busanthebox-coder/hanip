# 한입 (Hanip) — bite-sized Korean

**하루 한 입, 3분.** Korean in bites, not chapters.

A phone-first Korean course that reslices [Korean Core Starter](https://github.com/busanthebox-coder/korean-core-starter)'s
65-chapter A1–C1 course into ~3-minute tap-only rounds. Same content, inverted order:
**you guess before you're told.**

## The idea

A chapter used to be a 24-screen march. Here it compiles into 6–9 **bites**,
each a self-contained round with a fixed arc:

1. **2 warm-up recalls** — words you met in earlier bites
2. **New material** — one thing, never two
3. **Active taps** — guess, hunt, drill, arrange
4. **A payoff** — a real dialogue line you couldn't read three minutes ago

Nothing is read-only. Word cards ask you to guess the meaning from the word's
own example sentence (with a no-penalty 몰라요 escape). Grammar isn't presented
as a table — you tap the repeating morpheme across two contrasting sentences,
and the rule card appears as confirmation of what you just found.

English translations, romanization, and the full original grammar notes are all
still here — they're **pulled, not pushed**: tap a bubble, tap 발음, tap
더 알아보기.

## Content is compiled, not authored

`data/chapters/*.json` are verbatim copies of the source course. The compiler
(`scripts/lib/compiler.mjs`) only reorders and clozes what's already there:

- **Pattern extraction** parses grammar-note titles (`N을/를`, `V아/어야 해요`,
  `(으)로`) into morpheme variants, then verifies each candidate against the
  note's own examples — the reading that never occurs is discarded. Notes with
  no extractable morpheme (the Hangul chapter) fall back to a teach card.
- **Target matching** composes conjugated forms via jamo arithmetic, so 오다
  matches 와요/올, 공부하다 matches 공부해요, ㅂ-irregular 반갑다 matches
  반가워요 — and a bare 오 can never claim the 오 of 오늘.
- **Distractor filtering** rejects options that share a content word with the
  answer, plus a hand-curated ban list (`data/overrides.json`) from an
  11-chapter content audit, so 천천히 is never offered against "again".

`npm run validate` fails the build on any card a learner couldn't finish.

## Run it

```bash
npm install
npm run dev        # compiles bites, then serves
npm test           # compiler unit tests
npm run build      # compile → validate → bundle
npm run guard:full # compile → validate → baseline → tests → bundle budget
npm run smoke:stats
```

## Status

65 chapters across A1–C1 compile to 619 chapter bites and 2,977 chapter cards — after the thickness
phase, every grammar bite ends in at least two questions, no bite is a single card, and the median
bite is 5 cards. The shelf also carries 12 snack bites (173 cards), 20 short readers, and all 32
confusable expression sets. The bilingual wordbook contains 718 course words with lazy-loaded
nuance, mistakes, forms, examples, and contrast cards. Warmup recall scales with the lesson:
2 cards before a full bite, 1 before a thin one, none on direct shelf entry.
(`guard:thin` in `package.json` is the thickness-phase gate that skips the baseline check — it
stays for the next additive phase; day-to-day gates are `guard` and `guard:full`.)

Home recommends the next chapter bite or boundary snack from one shared calculator, shows the current
level, and restores an unfinished item through Continue. Progress, learned-word pool, daily bowls, and
the last-played item live in localStorage; snack skips last only for the current session.

Migration evidence and known extraction limits are recorded in [`docs/harness/RELEASE.md`](docs/harness/RELEASE.md).
