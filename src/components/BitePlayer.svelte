<script>
  import { onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import Bowl from './Bowl.svelte';
  import GuessCard from './cards/GuessCard.svelte';
  import HuntCard from './cards/HuntCard.svelte';
  import TeachCard from './cards/TeachCard.svelte';
  import DrillCard from './cards/DrillCard.svelte';
  import OrderCard from './cards/OrderCard.svelte';
  import ChatCard from './cards/ChatCard.svelte';
  import ReadCard from './cards/ReadCard.svelte';
  import PayoffCard from './cards/PayoffCard.svelte';
  import GrammarLessonCard from './cards/GrammarLessonCard.svelte';
  import GrammarRefSheet from './GrammarRefSheet.svelte';
  import { buzz, fanfare, thud, tick } from '../lib/feedback.js';
  import { withConfirmations } from '../lib/confirm.js';
  import { collectMistake } from '../lib/mistakes.js';
  import { prefs } from '../lib/prefs.js';
  import { guessMode, record, scoresAnswer, srs, writesSchedule } from '../lib/srs.js';
  import { markLastPlayed, progress, todayKey, warmupCards } from '../lib/store.js';
  import { bowlFill, streak } from '../lib/stats.js';
  import { speak } from '../lib/tts.js';

  export let bite;
  export let onExit = () => {};      // (finished: boolean, wantMore: boolean)
  export let onOpenWord = () => {};
  export let withWarmup = true;
  export let nextUp = null;          // what "한 입 더" will actually serve
  export let chapterSeal = null;     // { number, level, ordinal } when this bite closes a chapter

  const KIND_EN = { words: 'Words', pattern: 'Grammar', dialogue: 'Dialogue', reading: 'Reading', boss: 'Boss' };

  const studyCards = bite.lessonCards?.length ? bite.lessonCards : bite.cards;
  // Order 30: the schedule as it stood when the bite opened decides which words
  // are first meetings. It is frozen on purpose — answering one card writes to
  // the schedule, and a live read would silently reclassify a later card of the
  // same run from teach to quiz halfway through.
  let openingSchedule = get(srs);
  let cards = [...(withWarmup ? warmupCards(bite) : []), ...withConfirmations(studyCards, openingSchedule)];
  markLastPlayed(bite.id);
  let i = 0;
  let resolved = false;
  let finished = false;
  let requeuedIds = new Set();
  let correctCount = 0;
  let answeredCount = 0;
  let mistakes = [];
  let resolutionCorrect = null;
  let speechTimer = null;
  let showRefSheet = false;

  // replay from the rule sheet: same bite from the top, no warmups (it's review)
  function replayBite() {
    showRefSheet = false;
    openingSchedule = get(srs);
    cards = [...withConfirmations(studyCards, openingSchedule)];
    i = 0;
    resolved = false;
    resolutionCorrect = null;
    finished = false;
    requeuedIds = new Set();
    correctCount = 0;
    answeredCount = 0;
    mistakes = [];
  }

  const ACTIVE_KINDS = new Set(['guess', 'drill', 'order', 'grammar-check']);

  onDestroy(() => clearTimeout(speechTimer));

  $: cur = cards[i] || null;
  $: curMode = guessMode(cur, openingSchedule);
  $: projectedBowls = finished
    ? { ...$progress.bowls, [todayKey()]: ($progress.bowls[todayKey()] || 0) + 1 }
    : $progress.bowls;
  $: winStreak = streak(projectedBowls);
  // the bowl on the win screen is the real one: it heaps only when the day's
  // goal is actually met, so 고봉 stays a signal instead of a decoration
  $: winFill = bowlFill(projectedBowls[todayKey()] || 0, $prefs.dailyGoal);
  $: nextLabel = !nextUp ? null : nextUp.type === 'snack'
    ? {
        title: nextUp.snack.title,
        sub: `Snack after Chapter ${nextUp.snack.afterChapter}`,
        count: nextUp.snack.cardCount,
      }
    : {
        title: nextUp.bite.firstWord || nextUp.bite.title,
        sub: `${nextUp.level} · Chapter ${nextUp.chapterNumber} · ${KIND_EN[nextUp.bite.kind] || nextUp.bite.kind}`,
        count: nextUp.bite.cardCount,
      };

  function resolve(correct, meta = {}) {
    if (resolved) return;
    resolved = true;
    // Order 30: a first meeting is an explanation, not an attempt. It settles
    // the card so the Next button lights up, and stops there — no verdict, no
    // sound, no score, no mistake note, and above all no schedule write. A
    // teach card that recorded would drop a word onto the review ladder that
    // the learner was never tested on, and the whole schedule drifts from it.
    if (!scoresAnswer(cur, curMode)) {
      speakSoon(cur.word?.ko);
      return;
    }
    resolutionCorrect = correct;
    mistakes = collectMistake(mistakes, cur, correct, meta, curMode);
    if (ACTIVE_KINDS.has(cur.kind)) {
      // "몰라요" is a neutral reveal, not a wrong-answer penalty.
      if (!meta.skipped) {
        if (correct) {
          tick();
          buzz(15);
        } else {
          thud();
          buzz([30, 40, 30]);
        }
      }
      // 몰라요 is a no-penalty escape: the card comes back for another look,
      // but it never counts against the learner's score
      if (!meta.skipped) {
        answeredCount += 1;
        if (correct) correctCount += 1;
      }
      // a missed active card quietly comes back a few cards later, once
      const key = cardKey(cur);
      if (!correct && !requeuedIds.has(key)) {
        requeuedIds = new Set([...requeuedIds, key]);
        const clone = { ...cur, requeued: true };
        const at = Math.min(i + 3, cards.length);
        cards = [...cards.slice(0, at), clone, ...cards.slice(at)];
      }
    } else if (cur.kind === 'hunt' && correct) {
      tick();
      buzz(15);
    }
    if (cur.kind === 'guess') {
      if (writesSchedule(cur, curMode, correct)) {
        record(cur.word?.ko, correct, Date.now(), ($progress.starred || []).includes(cur.word?.ko));
      }
      speakSoon(cur.word?.ko);
    }
    if (cur.kind === 'payoff') speakSoon(cur.line?.ko);
  }
  function speakSoon(text) {
    if (!$prefs.autoSpeak || !text) return;
    clearTimeout(speechTimer);
    speechTimer = setTimeout(() => {
      if ($prefs.autoSpeak) speak(text);
    }, 60);
  }
  function cardKey(card) {
    return card.kind + ':' + (card.word?.ko || card.prompt || card.name || '');
  }
  function next() {
    if (i < cards.length - 1) {
      i += 1;
      resolved = false;
      resolutionCorrect = null;
      document.querySelector('.bp')?.scrollTo?.(0, 0);
      window.scrollTo(0, 0);
    } else {
      finished = true;
      fanfare();
    }
  }
</script>

<section class="bp">
  {#if !finished && cur}
    <div class="playbar">
      <button class="x" aria-label="Close" on:click={() => onExit(false, false)}>×</button>
      {#if cards.length > 12}
        <div class="track" aria-hidden="true"><span style="width:{((i + 1) / cards.length) * 100}%"></span></div>
      {:else}
        <div class="dots" aria-hidden="true">
          {#each cards as _, di}
            <i class:done={di < i} class:now={di === i}></i>
          {/each}
        </div>
      {/if}
      <span class="count">{i + 1}/{cards.length}</span>
    </div>

    {#key i}
      <div class="deck">
        <div class="sheet tooth">
          {#if cur.requeued}<div class="again">Again</div>{/if}
          {#if cur.kind === 'guess'}<GuessCard card={cur} mode={curMode} onResolve={resolve} {onOpenWord} />
          {:else if cur.kind === 'hunt'}<HuntCard card={cur} onResolve={resolve} />
          {:else if cur.kind === 'teach'}<TeachCard card={cur} onResolve={resolve} />
          {:else if cur.kind === 'drill'}<DrillCard card={cur} onResolve={resolve} />
          {:else if cur.kind === 'order'}<OrderCard card={cur} onResolve={resolve} />
          {:else if cur.kind === 'chat'}<ChatCard card={cur} onResolve={resolve} />
          {:else if cur.kind === 'read'}<ReadCard card={cur} onResolve={resolve} />
          {:else if cur.kind === 'payoff'}<PayoffCard card={cur} onResolve={resolve} />
          {:else if cur.kind === 'grammar-lesson' || cur.kind === 'grammar-check'}<GrammarLessonCard card={cur} onResolve={resolve} />
          {/if}
          {#if resolved && resolutionCorrect === false && ACTIVE_KINDS.has(cur.kind)}
            <div class="retry">
              This one comes back in a moment
              <span>잠시 뒤에 다시 나와요</span>
            </div>
          {/if}
        </div>
      </div>
    {/key}

    <div class="nav">
      <button class="cta" class:off={!resolved} disabled={!resolved} on:click={next}>
        <b>{i === cards.length - 1 ? 'Finish' : 'Next'}</b>
        <i>{i === cards.length - 1 ? '한 입 끝' : '다음'}</i>
      </button>
    </div>
  {:else if finished}
    <div class="win">
      <div class="win-head">
        <Bowl size={112} fill={winFill} animate />
        <h2>Bite done!</h2>
        {#if answeredCount}
          <p class="score">{correctCount} of {answeredCount} on your own</p>
        {/if}
        <p class="meta">{winStreak}-day streak</p>
        {#if bite.canDo}<p class="cando">{bite.canDo}</p>{/if}
      </div>

      {#if chapterSeal}
        <!-- a finished chapter leaves a mark, not a number -->
        <div class="sealrow">
          <span class="seal stamp" aria-hidden="true">한입<em>CH {chapterSeal.number}</em></span>
          <span class="seal-t">
            <b>Chapter {chapterSeal.number} sealed</b>
            <span>{chapterSeal.number}과를 다 먹었어요 · {chapterSeal.level}에서 {chapterSeal.ordinal}번째 도장</span>
          </span>
        </div>
      {/if}

      {#if mistakes.length}
        <!-- order 27: the last thing on screen is what tripped you up -->
        <section class="misses" aria-label="Mistakes">
          <div class="misses-head">
            <b>Mistakes</b>
            <span class="num">{mistakes.length}</span>
          </div>
          {#each mistakes as miss (miss.key)}
            <div class="miss">
              <div class="miss-top">
                <span class="miss-ko">{miss.ko}</span>
                {#if miss.en}<span class="miss-en">{miss.en}</span>{/if}
              </div>
              {#if miss.said}<div class="said">You said<b>{miss.said}</b></div>{/if}
            </div>
          {/each}
          <p class="misses-ko">틀렸던 카드는 곧 복습으로 다시 나와요</p>
        </section>
      {/if}

      {#if bite.kind === 'pattern'}
        <button class="grammar-row" on:click={() => { showRefSheet = true; }}>
          <b>Grammar card collected</b>
          <span>규칙 다시 보기</span>
          <i aria-hidden="true">›</i>
        </button>
      {/if}

      {#if nextLabel}
        <!-- naming the next item turns "한 입 더" into a choice -->
        <div class="nextrow">
          <span class="next-t">
            <b>Next: {nextLabel.title}</b>
            <span>{nextLabel.sub}</span>
          </span>
          {#if nextLabel.count}<span class="next-n">{nextLabel.count}</span>{/if}
        </div>
      {/if}

      <div class="actions">
        <button class="cta" on:click={() => onExit(true, true)}><b>One more bite</b><i>한 입 더</i></button>
        <button class="ghost" on:click={() => onExit(true, false)}>Done for today</button>
      </div>
    </div>
  {/if}

  {#if bite.kind === 'pattern'}
    <GrammarRefSheet
      open={showRefSheet}
      {bite}
      onReplay={replayBite}
      onClose={() => { showRefSheet = false; }}
    />
  {/if}
</section>

<style>
  /* the ruled paper is painted on <html> now, so the player just sits on it */
  .bp { --sheet-pad: 22px;
    min-height: 100dvh; max-width: 480px; margin: 0 auto; padding: 14px 16px 18px; display: flex; flex-direction: column; }

  /* .playbar, not .bar: a progress module elsewhere claimed .bar once and
     turned this 3px rail into a 34px circle */
  .playbar { display: flex; align-items: center; gap: 12px; min-height: 34px; flex: none; }
  .x { width: 44px; height: 34px; flex: none; margin-left: -7px; display: grid; place-items: center;
    color: var(--ink-3); font-size: 19px; line-height: 1; }
  .x:hover { color: var(--ink); }
  .track { flex: 1; height: 3px; border-radius: 999px; background: var(--progress-track); overflow: hidden; }
  .track span { display: block; height: 100%; background: var(--gold); border-radius: 999px;
    transition: width .2s var(--ease); }
  .dots { flex: 1; display: flex; gap: 4px; }
  .dots i { height: 3px; flex: 1; border-radius: 999px; background: var(--progress-track);
    transition: background .2s var(--ease); }
  .dots i.done { background: var(--gold); }
  .dots i.now { background: var(--ink-3); }
  .count { flex: none; font-size: 11.5px; font-weight: 750; color: var(--ink-3); font-variant-numeric: tabular-nums; }

  /* one card outline per screen — the two edges below are the rest of the deck.
     A short deck centres itself instead of leaving 200px of dead space below. */
  .deck { position: relative; margin: auto 0; animation: deal .28s var(--ease); }
  /* each back sheet sits at a slightly different angle: a stack of loose paper,
     not a UI stack */
  .deck::before, .deck::after { content: ""; position: absolute; left: 8px; right: 8px; bottom: -6px; height: 28px;
    border: 1px solid var(--line); border-radius: 0 0 22px 22px; background: var(--card); z-index: 0;
    transform: rotate(-.35deg); transform-origin: 50% 0; }
  .deck::after { left: 16px; right: 16px; bottom: -12px; opacity: .72; transform: rotate(.5deg); }
  .sheet { position: relative; z-index: 1; border-radius: 22px; border: 1px solid var(--line);
    box-shadow: var(--shadow-1); padding: 24px var(--sheet-pad) 22px; }
  /* the card is paper too: the same 3px tooth runs on through it, so it reads
     as a sheet on the desk rather than a white rectangle over it */
  .tooth { background-color: var(--card);
    background-image: radial-gradient(var(--study-grid) 0.6px, transparent 0.7px);
    background-size: 3px 3px; }
  @keyframes deal { from { opacity: 0; transform: translateY(12px) rotate(.4deg); } to { opacity: 1; transform: none; } }

  .again { margin-bottom: 12px; font-size: 11.5px; font-weight: 750; color: var(--ink-3); }
  .retry { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--line);
    font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .retry span { display: block; font-size: 11.5px; font-weight: 650; }

  .nav { flex: none; padding: 26px 0 4px; position: sticky; bottom: 0;
    background: linear-gradient(to top, var(--bg) 72%, transparent); }

  .cta { width: 100%; padding: 15px 16px 13px; border-radius: 16px; background: var(--accent); color: var(--on-accent);
    display: grid; gap: 1px; text-align: center; box-shadow: 0 3px 0 var(--accent-deep);
    transition: transform .09s var(--ease), box-shadow .09s var(--ease), background-color .15s var(--ease),
      color .15s var(--ease); }
  .cta:active { transform: translateY(3px); box-shadow: 0 0 0 var(--accent-deep); }
  .cta b { font-size: 17px; font-weight: 850; letter-spacing: -.01em; }
  .cta i { font-size: 10.5px; font-style: normal; font-weight: 700; opacity: .62; }
  .cta.off { background: var(--wash); color: var(--ink-3); box-shadow: none; pointer-events: none; }
  .cta.off i { opacity: .7; }

  .win { flex: 1; display: flex; flex-direction: column; padding: 12px 6px 4px; }
  .win-head { margin-top: auto; display: grid; justify-items: center; text-align: center; }
  .win h2 { margin: 14px 0 0; font-size: 28px; font-weight: 900; letter-spacing: -.03em; }
  .score { margin: 9px 0 0; font-size: 13.5px; font-weight: 700; color: var(--ink-2); }
  .meta { margin: 3px 0 0; font-size: 12.5px; font-weight: 650; color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .cando { margin: 10px 0 0; font-size: 12.5px; font-weight: 650; line-height: 1.6; color: var(--ink-3);
    word-break: keep-all; }

  /* the collection stamp, scaled up from the grammar grid to the whole chapter */
  .sealrow { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line);
    display: flex; align-items: center; gap: 14px; }
  .seal { position: relative; flex: none; width: 62px; height: 62px; display: grid; place-items: center;
    align-content: center; gap: 2px; border: 1.8px solid var(--gold); border-radius: 11px; color: var(--gold);
    font-size: 15px; font-weight: 900; letter-spacing: -.02em; line-height: 1;
    transform: rotate(-8deg); opacity: .92; }
  .seal::before { content: ""; position: absolute; inset: 4px; border: .8px solid var(--gold);
    border-radius: 8px; opacity: .6; }
  .seal em { font-style: normal; font-size: 7.5px; font-weight: 750; letter-spacing: .04em; opacity: .8; }
  @keyframes stampIn { 0% { transform: rotate(-8deg) scale(1.7); opacity: 0; }
    62% { transform: rotate(-8deg) scale(.94); opacity: 1; }
    100% { transform: rotate(-8deg) scale(1); opacity: .92; } }
  .stamp { animation: stampIn .34s var(--ease) .5s both; }
  .seal-t { min-width: 0; display: grid; }
  .seal-t b { font-size: 14.5px; font-weight: 800; letter-spacing: -.01em; }
  .seal-t span { margin-top: 2px; font-size: 11.5px; font-weight: 650; color: var(--ink-3);
    word-break: keep-all; }

  .misses { margin-top: 22px; }
  .misses-head { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 10px; }
  .misses-head b { font-size: 15.5px; font-weight: 850; letter-spacing: -.01em; }
  .num { font-size: 12.5px; font-weight: 650; color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .miss { padding: 13px 0; border-top: 1px solid var(--line); }
  .miss:last-of-type { border-bottom: 1px solid var(--line); }
  .miss-top { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; }
  /* a compiled prompt can be a full sentence — it must wrap, never widen the page */
  .miss-ko { flex: none; max-width: 55%; font-size: 18px; font-weight: 850; letter-spacing: -.02em;
    word-break: keep-all; overflow-wrap: anywhere; }
  .miss-en { flex: 1 1 auto; min-width: 0; font-size: 13px; font-weight: 650; color: var(--ink-2);
    text-align: right; word-break: keep-all; overflow-wrap: anywhere; }
  .said { margin-top: 5px; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    word-break: keep-all; overflow-wrap: anywhere; }
  .said b { margin-left: 7px; font-weight: 750; color: var(--bad); }
  .misses-ko { margin: 10px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }

  .grammar-row { width: 100%; min-height: 44px; margin-top: 22px; padding: 14px 0;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    display: grid; grid-template-columns: 1fr auto; align-items: center; text-align: left; }
  .grammar-row b { font-size: 14.5px; font-weight: 750; letter-spacing: -.01em; }
  .grammar-row span { grid-column: 1; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .grammar-row i { grid-row: 1 / -1; grid-column: 2; font-style: normal; font-size: 15px; color: var(--ink-3); }

  .nextrow { margin-top: 20px; min-height: 44px; padding: 13px 0;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    display: flex; align-items: center; gap: 12px; }
  .next-t { flex: 1; min-width: 0; display: grid; }
  .next-t b { font-size: 14.5px; font-weight: 800; letter-spacing: -.01em; word-break: keep-all; }
  .next-t span { font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .next-n { flex: none; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    font-variant-numeric: tabular-nums; }

  .actions { margin-top: auto; padding-top: 24px; display: grid; gap: 2px; }
  .ghost { width: 100%; min-height: 44px; color: var(--ink-3); font-size: 14px; font-weight: 750; text-align: center; }
  .ghost:hover { color: var(--ink); }
</style>
