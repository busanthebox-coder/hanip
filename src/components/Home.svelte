<script>
  import { progress, todayKey, weekBowls } from '../lib/store.js';
  import { findById, findNext } from '../lib/nextBite.js';

  export let index = { chapters: [], snacks: [] };
  export let skippedSnacks = new Set();
  export let onStart = () => {};
  export let onSkipSnack = () => {};

  $: state = $progress;
  $: nextItem = findNext({ index, done: state.done, skippedSnacks });
  $: continueItem = state.lastPlayed && !state.done[state.lastPlayed.biteOrSnackId]
    ? findById({ index, id: state.lastPlayed.biteOrSnackId })
    : null;
  $: bitesToday = state.bowls[todayKey()] || 0;
  $: bowls = weekBowls(state);
  $: doneTotal = Object.keys(state.done).length;

  function headWord(item) {
    if (item.type === 'snack') return item.title;
    return item.bite.firstWord || item.bite.title.split('·').pop().trim();
  }
  function hookLine(next) {
    const kindMap = {
      words: 'Meet new words by guessing first — 새 단어를 추측으로',
      pattern: 'Find the repeating pattern yourself — 무늬를 직접 찾아요',
      dialogue: 'Read a real conversation line by line — 진짜 대화',
      reading: 'Read a short passage — 짧은 글 한 편',
      boss: 'Everything from this chapter — 이번 과 전부',
    };
    return kindMap[next.bite.kind] || 'Three minutes is plenty — 3분이면 충분해요';
  }
</script>

<section class="home">
  <div class="kicker">오늘의 한 입 · Today's bite</div>

  {#if nextItem}
    <div class="level-chip">{nextItem.level} · {nextItem.type === 'snack' ? nextItem.afterChapter : nextItem.chapterNumber}과</div>
    {#if continueItem}
      <button class="continue" on:click={() => onStart(continueItem)}>이어서 · Continue — {continueItem.title}</button>
    {/if}
    {#if nextItem.type === 'snack'}
      <p class="snack-prompt">간식 · Snack — 잠깐 단 것 먼저?</p>
      <h1 class="word snack-word">{headWord(nextItem)}</h1>
      <p class="hook">{nextItem.snack.cardCount}단어 · {nextItem.snack.cardCount} words</p>
    {:else}
      <h1 class="word">{headWord(nextItem)}</h1>
      <p class="hook">{hookLine(nextItem)}</p>
      <p class="hook sub">{nextItem.bite.title}</p>
    {/if}
  {:else}
    <h1 class="word">다 먹었어요!</h1>
    <p class="hook">All done — you finished every bite. Re-chew any bite from the bookshelf. · 책장에서 아무 한입이나 다시 씹어보세요.</p>
  {/if}

  <div class="bowl-row">
    <svg class="bowl" viewBox="0 0 48 48" aria-hidden="true">
      <defs><clipPath id="homeclip"><path d="M6 20 h36 a1 1 0 0 1 -4 16 a14 8 0 0 1 -28 0 a1 1 0 0 1 -4-16 z"/></clipPath></defs>
      <g clip-path="url(#homeclip)">
        <rect x="0" y="20" width="48" height="28" fill="var(--wash)"/>
        <rect x="0" y={bitesToday >= 2 ? 24 : bitesToday === 1 ? 32 : 48} width="48" height="28" fill="var(--gold)"/>
      </g>
      <path d="M6 20 h36 a1 1 0 0 1 -4 16 a14 8 0 0 1 -28 0 a1 1 0 0 1 -4-16 z" fill="none" stroke="var(--ink)" stroke-width="2.4"/>
    </svg>
    <div class="bowl-cap">
      <b>이번 주 {bowls}그릇 · {bowls} bowl{bowls === 1 ? '' : 's'} this week</b>
      <span>{bitesToday > 0 ? `today ${bitesToday} bite${bitesToday === 1 ? '' : 's'} · 오늘 ${bitesToday}입` : "today's bowl is empty · 오늘 그릇이 비어 있어요"} · total {doneTotal}</span>
    </div>
  </div>

  {#if nextItem}
    <div class="start-actions">
      <button class="start" on:click={() => onStart(nextItem)}>시작 · Start →</button>
      {#if nextItem.type === 'snack'}
        <button class="skip" on:click={() => onSkipSnack(nextItem.snackId)}>괜찮아요, 다음 과로 · Skip to next chapter</button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .home { min-height: calc(100dvh - 64px); max-width: 480px; margin: 0 auto; padding: 34px 24px 24px;
    display: flex; flex-direction: column; }
  .kicker { font-size: 11.5px; font-weight: 850; letter-spacing: .2em; color: var(--accent); text-transform: uppercase; }
  .level-chip { align-self: flex-start; margin-top: 14px; padding: 5px 10px; border-radius: 999px;
    background: var(--accent-soft); color: var(--accent-deep); font-size: 12px; font-weight: 850; }
  .continue { align-self: flex-start; max-width: 100%; margin-top: 10px; padding: 7px 11px; border: 1px solid var(--line);
    border-radius: 999px; background: var(--card); color: var(--ink-2); font-size: 12px; font-weight: 800;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .snack-prompt { margin: 66px 0 0; color: var(--accent); font-size: 15px; font-weight: 850; word-break: keep-all; }
  .word { margin: 90px 0 0; font-size: clamp(56px, 17vw, 76px); font-weight: 900; letter-spacing: -.02em; line-height: 1.05;
    word-break: keep-all; text-wrap: balance; }
  .word.snack-word { margin-top: 12px; font-size: clamp(38px, 12vw, 56px); }
  .hook { margin: 12px 0 0; font-size: 15.5px; color: var(--ink-2); font-weight: 650; word-break: keep-all; text-wrap: pretty; }
  .hook.sub { margin-top: 4px; font-size: 12.5px; color: var(--ink-3); font-weight: 700; }
  .bowl-row { margin-top: 28px; display: flex; align-items: center; gap: 12px; }
  .bowl { width: 46px; height: 46px; flex: none; }
  .bowl-cap { display: grid; font-size: 12.5px; color: var(--ink-3); font-weight: 700; }
  .bowl-cap b { color: var(--ink); font-size: 13.5px; }
  .start-actions { margin-top: auto; display: grid; gap: 10px; }
  .start { padding: 18px; border-radius: 18px; background: var(--accent); color: #FFF6EF;
    font-size: 19px; font-weight: 900; box-shadow: 0 5px 0 var(--accent-deep);
    transition: transform .09s var(--ease), box-shadow .09s var(--ease); }
  .start:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--accent-deep); }
  .skip { min-height: 44px; padding: 11px; color: var(--ink-3); font-size: 13px; font-weight: 800; }
</style>
