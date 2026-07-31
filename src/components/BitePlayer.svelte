<script>
  import GuessCard from './cards/GuessCard.svelte';
  import HuntCard from './cards/HuntCard.svelte';
  import TeachCard from './cards/TeachCard.svelte';
  import DrillCard from './cards/DrillCard.svelte';
  import OrderCard from './cards/OrderCard.svelte';
  import ChatCard from './cards/ChatCard.svelte';
  import ReadCard from './cards/ReadCard.svelte';
  import PayoffCard from './cards/PayoffCard.svelte';
  import { warmupCards } from '../lib/store.js';

  export let bite;
  export let biteNumber = 1;   // 1-based position in its chapter
  export let biteTotal = 1;
  export let onExit = () => {};      // (finished: boolean, wantMore: boolean)

  let cards = [...warmupCards(bite), ...bite.cards];
  let i = 0;
  let resolved = false;
  let finished = false;
  let requeuedIds = new Set();
  let correctCount = 0;
  let answeredCount = 0;

  $: cur = cards[i] || null;

  function resolve(correct, meta = {}) {
    if (resolved) return;
    resolved = true;
    if (cur.kind === 'guess' || cur.kind === 'drill' || cur.kind === 'order') {
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
    }
  }
  function cardKey(card) {
    return card.kind + ':' + (card.word?.ko || card.prompt || card.name || '');
  }
  function next() {
    if (i < cards.length - 1) {
      i += 1;
      resolved = false;
      document.querySelector('.bp')?.scrollTo?.(0, 0);
      window.scrollTo(0, 0);
    } else {
      finished = true;
    }
  }
</script>

<section class="bp">
  {#if !finished && cur}
    <div class="top">
      <button class="x" aria-label="닫기" on:click={() => onExit(false, false)}>×</button>
      <div class="dots" aria-hidden="true">
        {#each cards as _, di}
          <span class="dot" class:done={di < i} class:now={di === i}></span>
        {/each}
      </div>
      <span class="count">{biteNumber}/{biteTotal}입</span>
    </div>

    {#key i}
      <div class="card-area">
        {#if cur.kind === 'guess'}<GuessCard card={cur} onResolve={resolve} />
        {:else if cur.kind === 'hunt'}<HuntCard card={cur} onResolve={resolve} />
        {:else if cur.kind === 'teach'}<TeachCard card={cur} onResolve={resolve} />
        {:else if cur.kind === 'drill'}<DrillCard card={cur} onResolve={resolve} />
        {:else if cur.kind === 'order'}<OrderCard card={cur} onResolve={resolve} />
        {:else if cur.kind === 'chat'}<ChatCard card={cur} onResolve={resolve} />
        {:else if cur.kind === 'read'}<ReadCard card={cur} onResolve={resolve} />
        {:else if cur.kind === 'payoff'}<PayoffCard card={cur} onResolve={resolve} />
        {/if}
      </div>
    {/key}

    <div class="nav">
      <button class="go" disabled={!resolved} on:click={next}>
        {i === cards.length - 1 ? '한 입 끝 →' : '다음 →'}
      </button>
    </div>
  {:else if finished}
    <div class="win">
      <svg class="bowl" viewBox="0 0 48 48" aria-hidden="true">
        <defs><clipPath id="winclip"><path d="M6 20 h36 a1 1 0 0 1 -4 16 a14 8 0 0 1 -28 0 a1 1 0 0 1 -4-16 z"/></clipPath></defs>
        <g clip-path="url(#winclip)">
          <rect x="0" y="20" width="48" height="28" fill="var(--wash)"/>
          <rect class="fill" x="0" y="20" width="48" height="28" fill="var(--gold)"/>
        </g>
        <path d="M6 20 h36 a1 1 0 0 1 -4 16 a14 8 0 0 1 -28 0 a1 1 0 0 1 -4-16 z" fill="none" stroke="var(--ink)" stroke-width="2.4"/>
      </svg>
      <h2>한 입 끝!</h2>
      {#if answeredCount}
        <div class="score">{answeredCount}문제 중 {correctCount}개 스스로 맞혔어요</div>
      {/if}
      {#if bite.canDo}<div class="cando">☑ {bite.canDo}</div>{/if}
      <div class="actions">
        <button class="go" on:click={() => onExit(true, true)}>한 입 더 →</button>
        <button class="ghost" on:click={() => onExit(true, false)}>오늘은 여기까지</button>
      </div>
    </div>
  {/if}
</section>

<style>
  .bp { min-height: 100dvh; max-width: 480px; margin: 0 auto; padding: 20px 20px 24px; display: flex; flex-direction: column;
    background:
      repeating-linear-gradient(rgba(140, 127, 107, 0.045) 0 1px, transparent 1px 30px),
      repeating-linear-gradient(90deg, rgba(140, 127, 107, 0.045) 0 1px, transparent 1px 30px),
      var(--bg); }
  .top { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .x { width: 34px; height: 34px; flex: none; border-radius: 999px; background: var(--card); border: 1px solid var(--line);
    color: var(--ink-3); font-size: 17px; font-weight: 700; display: grid; place-items: center; }
  .x:hover { border-color: var(--ink-3); }
  .dots { flex: 1; display: flex; gap: 5px; }
  .dot { height: 7px; flex: 1; border-radius: 999px; background: #EFE4CD; transition: background .2s var(--ease); }
  .dot.done { background: var(--gold); }
  .dot.now { background: var(--accent); }
  .count { flex: none; font-size: 12px; font-weight: 800; color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .card-area { display: grid; align-content: start; animation: deal .28s var(--ease); }
  @keyframes deal { from { opacity: 0; transform: translateY(12px) rotate(.4deg); } to { opacity: 1; transform: none; } }
  .nav { margin-top: auto; padding-top: 18px; position: sticky; bottom: 0;
    background: linear-gradient(to top, var(--bg) 75%, transparent); padding-bottom: 4px; }
  .go { width: 100%; padding: 16px; border-radius: 16px; background: var(--accent); color: #FFF6EF;
    font-size: 17px; font-weight: 850; box-shadow: 0 4px 0 var(--accent-deep);
    transition: transform .09s var(--ease), box-shadow .09s var(--ease), opacity .15s var(--ease); }
  .go:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--accent-deep); }
  .go:disabled { opacity: .35; pointer-events: none; }
  .win { margin: auto 0; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding: 40px 0; }
  .bowl { width: 110px; height: 110px; }
  .bowl .fill { transform: translateY(28px); animation: fillup 1.1s var(--ease) .15s forwards; }
  @keyframes fillup { to { transform: translateY(5px); } }
  .win h2 { margin: 14px 0 0; font-size: 27px; font-weight: 900; }
  .score { margin-top: 6px; font-size: 13.5px; color: var(--ink-2); font-weight: 700; }
  .cando { margin-top: 12px; padding: 11px 16px; border-radius: 14px; background: var(--good-soft); color: var(--good-deep);
    font-size: 14px; font-weight: 750; word-break: keep-all; }
  .actions { margin-top: 26px; align-self: stretch; display: grid; gap: 10px; }
  .ghost { padding: 13px; border-radius: 16px; border: 1.5px solid var(--line); color: var(--ink-3); font-size: 15px; font-weight: 800; }
</style>
