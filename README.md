# 한입 (Hanip) — bite-sized Korean

**하루 한 입, 3분.** Korean in bites, not chapters.

A phone-first Korean course that reslices [Korean Core Starter](https://github.com/busanthebox-coder/korean-core-starter)'s
A1 material into ~3-minute tap-only rounds. Same content, inverted order:
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
```

## Status

A1 only — 11 chapters, 89 bites, 334 cards. Bilingual UI (한국어 · English).
Progress, learned-word pool, and daily bowls live in localStorage.
