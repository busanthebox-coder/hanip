# 한입 (Hanip) — bite-sized Korean

**하루 한 입, 3분.** Korean in bites, not chapters.

A phone-first Korean course that reslices [Korean Core Starter](https://github.com/busanthebox-coder/korean-core-starter)'s
72-chapter A1–C1 course into ~3-minute tap-only rounds. Same content, inverted order:
**you guess before you're told — from the second meeting on.**

## The idea

A chapter used to be a 24-screen march. Here it compiles into 6–9 **bites**,
each a self-contained round with a fixed arc:

1. **2 warm-up recalls** — words you met in earlier bites
2. **New material** — one thing, never two
3. **Active taps** — guess, hunt, drill, arrange
4. **A payoff** — a real dialogue line you couldn't read three minutes ago

Nothing is read-only, but guessing has a floor. The **first** time a word turns
up you are simply told it — the word, its meaning, then its sentence as an
example of use — because inferring a word from its context needs the words
around it, and at A1 there aren't any yet. **Every meeting after that is a
question**: the sentence becomes the prompt and you pick the meaning from three
options, with a no-penalty 몰라요 escape. That second meeting comes fast — the
word bite that taught a word closes by re-asking two of them, and the rest come
back as warm-ups and in the review bite. Grammar isn't presented as a table —
you tap the repeating morpheme across two contrasting sentences, and the rule
card appears as confirmation of what you just found.

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

72 chapters across A1–C1 compile to 696 chapter bites and 3,340 chapter cards — after the thickness
phase, every grammar bite ends in at least two questions, and the median bite is 4 cards (5 across
chapters 1–65, 4 across the written B2/C1 chapters 66–72, whose passages yield fewer recall
clozes; one reading bite, 67, is a single card because its passage carries no literally matching
vocabulary). Levels stop being contiguous at 66: B2 holds 57–63 and 66–69, C1 holds 64–65 and
70–72. The shelf also carries 18 snack bites (257 cards) — 12 vocab packs plus 6
situational expression packs (교통·주문·쇼핑·병원·직장·행정, 84 whole phrases lifted from the
parent corpus) — 20 short readers, and all 32
confusable expression sets. The bilingual wordbook contains 803 course words with lazy-loaded
nuance, mistakes, forms, examples, and contrast cards. Warmup recall scales with the lesson:
2 cards before a full bite, 1 before a thin one, none on direct shelf entry.
(`guard:thin` in `package.json` is the thickness-phase gate that skips the baseline check — it
stays for the next additive phase; day-to-day gates are `guard` and `guard:full`.)

Home recommends the next chapter bite or boundary snack from one shared calculator, shows the current
level, and restores an unfinished item through Continue. Progress, learned-word pool, daily bowls, and
the last-played item live in localStorage; snack skips last only for the current session.

## Several learners, one phone

A classroom phone holds one **profile** per learner — a free-text name plus a four-digit number, so
two 민수 are still two people. Each profile owns a private copy of all four storage keys under
`hanip.p.<id>.*`, and switching writes the active pointer and reloads, because every store reads its
key once at module init. Names never leave the device: there is no account, no password, no server.

Upgrading an existing install moves the four legacy keys under a profile in one direction only —
**copy, verify byte for byte, then clean up**. If any legacy value fails to parse or a copy cannot be
read back, nothing is created, copied, or deleted, and the app keeps reading the legacy key names, so
a learner's progress can never be lost by upgrading. The four migration cases are pinned in
`src/lib/profiles.test.js`.

**A number alone does not move progress.** To carry a learner to another device you export a
**progress code** — `HANIP1.` plus deflated, base64url'd state — and paste it (or load the saved
`.txt`) on the other phone. Settings → *Move progress to another device*; the screen says this
limitation in as many words rather than implying the number syncs anything.

The code is small enough to paste because `learned` ships as Korean keys only and the cards are
rebuilt from the compiled chunks on arrival, and because finished bites fold to one bitmask per
chapter. The worst progress this course can produce is 219kB of JSON, still 92kB after a naive
deflate+base64 — the shipped encoding brings the same state to **3.7kB**, a typical learner to ~1kB.
Browsers without `CompressionStream` fall back to an uncompressed code that still works, with a note
that it is long.

Importing **merges, never overwrites**, and only after the whole payload has validated — a damaged
code changes nothing at all. Finished bites, collected grammar, saved words and learned words union;
each day's bowl takes the larger count; a review card is taken whole from whichever side has the
larger interval, the earlier due date breaking ties. Preferences, shelf state and the Continue pointer
stay with the device. A preview names the counts before anything is applied.

## How the interface reads

The learner is an English speaker studying Korean, so the two languages are stacked, never
juxtaposed. **Korean is the hero** wherever it is the thing being learned — the word on Home,
the word (or, once it is being quizzed, the sentence) on a guess card, the form in a grammar lesson. **English is the body text** for every
explanation and nuance note (straight from the source data, untranslated), and it leads every
functional string — buttons, section titles, filters, stats — with a small Korean line underneath.
There is no `한국어 · English` one-line pairing anywhere.

The surface is built from whitespace and 1px rules: one card outline per screen, one dominant type
size per screen, greyscale plus at most two accent colours (gold for progress and the target
morpheme, green for correct, red only on the wrong answer itself). There are no emoji anywhere,
including the tab bar.

What keeps that restraint from reading as unfinished is **material**. Every screen sits on ruled
study paper — the same `--study-grid` token laid down twice for legible contrast, with a 3px dot
lattice for tooth — and the grain carries on **through the card**, so a bite reads as loose sheets on
a desk rather than white rectangles floating over it. The back sheets of the deck sit a third of a
degree off true. Answering correctly makes `--good-soft` seep out from where the finger landed and
settle, like ink into paper.

The bowl is the one repeated metaphor, and it exists **once**: a brush silhouette of ribbon body,
lens rim and foot, drawn from a single path in `src/lib/bowl.js` and rendered only by
`src/components/Bowl.svelte`. Home, the week strip, the win screen, onboarding and the Today tab icon
are all that component at different sizes; rice fills linearly with the day's goal and heaps over the
rim when it is met. The five tab glyphs are one hand-drawn stroke system at 24×24 — bowl, spines,
가, 文, open book. Progress reads in three states: a 한입 seal when a chapter is finished, `5/8` over
a 38px bar while it runs, a faded `0/8` before it starts.

[`docs/design/STYLE.md`](docs/design/STYLE.md) is the binding style guide (type scale, colour budget,
kill list, bowl/icon/paper rules); [`docs/tab-contract.md`](docs/tab-contract.md) carries the language
policy that any new tab must follow; [`docs/design/spec-v4.html`](docs/design/spec-v4.html) is the
14-frame product-tone mockup and [`docs/design/spec-v5.html`](docs/design/spec-v5.html) the 8-frame
material pass the current interface was built against.

Migration evidence and known extraction limits are recorded in [`docs/harness/RELEASE.md`](docs/harness/RELEASE.md).
