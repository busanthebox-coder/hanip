<script>
  import bitesData from './lib/bites.json';
  import Home from './components/Home.svelte';
  import Shelf from './components/Shelf.svelte';
  import BitePlayer from './components/BitePlayer.svelte';
  import HangulTab from './components/HangulTab.svelte';
  import HanjaTab from './components/HanjaTab.svelte';
  import GuideTab from './components/GuideTab.svelte';
  import WordbookTab from './components/WordbookTab.svelte';
  import { markBiteDone, progress } from './lib/store.js';

  const chapters = bitesData.chapters;

  const TABS = [
    { key: 'today', ico: '🍚', ko: '오늘', en: 'Today' },
    { key: 'shelf', ico: '📚', ko: '책장', en: 'Shelf' },
    { key: 'hangul', ico: '가', ko: '한글', en: 'Hangul' },
    { key: 'hanja', ico: '學', ko: '한자', en: 'Hanja' },
    { key: 'words', ico: '📖', ko: '단어장', en: 'Words' },
  ];

  let tab = 'today';           // TABS key
  let showGuide = false;       // guidebooks live on the shelf
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
    {:else if tab === 'shelf'}
      {#if showGuide}
        <div class="guide-wrap">
          <button class="back-shelf" on:click={() => { showGuide = false; window.scrollTo(0, 0); }}>← 책장 · Back to shelf</button>
          <GuideTab />
        </div>
      {:else}
        <Shelf {chapters} onPlay={play} onOpenGuide={() => { showGuide = true; window.scrollTo(0, 0); }} />
      {/if}
    {:else if tab === 'hangul'}
      <HangulTab />
    {:else if tab === 'hanja'}
      <HanjaTab />
    {:else if tab === 'words'}
      <WordbookTab />
    {/if}
  </main>
  <nav class="tabs">
    {#each TABS as t}
      <button class:on={tab === t.key} on:click={() => { tab = t.key; showGuide = false; window.scrollTo(0, 0); }}>
        <span class="ico">{t.ico}</span>
        <span class="t-ko">{t.ko}</span>
        <span class="t-en">{t.en}</span>
      </button>
    {/each}
  </nav>
{/if}

<style>
  main { padding-bottom: 78px; }
  .tabs { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: var(--card);
    border-top: 1px solid var(--line); padding: 6px 0 calc(5px + env(safe-area-inset-bottom, 0px)); z-index: 40; }
  .tabs button { flex: 1; min-width: 0; display: grid; justify-items: center; gap: 0; padding: 4px 0 2px;
    color: var(--ink-3); }
  .tabs button.on { color: var(--accent-deep); }
  .ico { font-size: 17px; line-height: 1.2; font-weight: 700; }
  .t-ko { font-size: 11px; font-weight: 850; line-height: 1.25; }
  .t-en { font-size: 8.5px; font-weight: 750; letter-spacing: .04em; opacity: .75; line-height: 1.2; }
  .guide-wrap { max-width: 480px; margin: 0 auto; }
  .back-shelf { margin: 18px 20px 0; padding: 8px 15px; border-radius: 999px; background: var(--card);
    border: 1px solid var(--line); color: var(--ink-2); font-size: 12.5px; font-weight: 800; }
  .back-shelf:hover { border-color: var(--ink-3); }
</style>
