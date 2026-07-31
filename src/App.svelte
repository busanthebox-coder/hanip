<script>
  import bitesData from './lib/bites.json';
  import Home from './components/Home.svelte';
  import Shelf from './components/Shelf.svelte';
  import BitePlayer from './components/BitePlayer.svelte';
  import { markBiteDone, progress } from './lib/store.js';

  const chapters = bitesData.chapters;

  let tab = 'today';           // 'today' | 'shelf'
  let playing = null;          // { chapter, bite }

  function play(chapter, bite) {
    playing = { chapter, bite };
    window.scrollTo(0, 0);
  }
  function exitBite(finished, wantMore) {
    if (finished) markBiteDone(playing.bite);
    if (finished && wantMore) {
      // roll straight into the next unfinished bite
      const state = { done: doneMap() };
      for (const ch of chapters) {
        for (const bite of ch.bites) {
          if (!state.done[bite.id]) { playing = { chapter: ch, bite }; window.scrollTo(0, 0); return; }
        }
      }
    }
    playing = null;
    window.scrollTo(0, 0);
  }
  function doneMap() {
    let map = {};
    const un = progress.subscribe((s) => { map = s.done; });
    un();
    return map;
  }
</script>

{#if playing}
  <!-- keyed so 한 입 더 rebuilds the player from scratch for the next bite -->
  {#key playing.bite.id}
    <BitePlayer
      bite={playing.bite}
      biteNumber={playing.bite.index + 1}
      biteTotal={playing.chapter.biteCount}
      onExit={exitBite}
    />
  {/key}
{:else}
  <main>
    {#if tab === 'today'}
      <Home {chapters} onStart={play} />
    {:else}
      <Shelf {chapters} onPlay={play} />
    {/if}
  </main>
  <nav class="tabs">
    <button class:on={tab === 'today'} on:click={() => { tab = 'today'; }}>
      <span class="ico">🍚</span>오늘
    </button>
    <button class:on={tab === 'shelf'} on:click={() => { tab = 'shelf'; }}>
      <span class="ico">📚</span>책장
    </button>
  </nav>
{/if}

<style>
  main { padding-bottom: 64px; }
  .tabs { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: var(--card);
    border-top: 1px solid var(--line); padding: 6px 0 calc(6px + env(safe-area-inset-bottom, 0px)); z-index: 40; }
  .tabs button { flex: 1; display: grid; justify-items: center; gap: 1px; padding: 5px 0;
    font-size: 11.5px; font-weight: 800; color: var(--ink-3); }
  .tabs button.on { color: var(--accent-deep); }
  .ico { font-size: 19px; }
</style>
