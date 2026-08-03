<script>
  import { onDestroy } from 'svelte';
  import courseIndex from './lib/bites-index.json';
  import Home from './components/Home.svelte';
  import Shelf from './components/Shelf.svelte';
  import BitePlayer from './components/BitePlayer.svelte';
  import Onboarding from './components/Onboarding.svelte';
  import PwaUpdateToast from './components/PwaUpdateToast.svelte';
  import { createLatestRequest, loadChapterCards, loadSnackCards } from './lib/courseData.js';
  import { findNext } from './lib/nextBite.js';
  import { prefs } from './lib/prefs.js';
  import { buildDueReviewCards, migrateLearnedSchedules, srs } from './lib/srs.js';
  import { applyTheme } from './lib/theme.js';
  import { markBiteDone, migrateCollected, progress, todayKey } from './lib/store.js';

  // The reference tabs carry the heavy data — the wordbook's nuance layer alone
  // is ~650kB — and none of it is needed to start today's bite. Load each on
  // first visit and memoize the promise so switching back is instant.
  const LAZY = {
    hangul: () => import('./components/HangulTab.svelte'),
    hanja: () => import('./components/HanjaTab.svelte'),
    guide: () => import('./components/GuideTab.svelte'),
    words: () => import('./components/WordbookTab.svelte'),
  };
  const loaded = {};
  const loadTab = (key) => (loaded[key] ||= LAZY[key]());
  const loadShowcase = () => import('./components/DesignShowcase.svelte');
  const beginBiteRequest = createLatestRequest();
  const showcase = new URLSearchParams(window.location.search).get('showcase') === 'shelf';

  const chapters = courseIndex.chapters;
  const snacks = courseIndex.snacks || [];
  migrateCollected(courseIndex);

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
  let loadingBite = false;
  let loadError = '';
  let skippedSnacks = new Set();
  let onboardingRequested = false;
  let wordbookTarget = '';

  const colorScheme = typeof window === 'undefined' ? null : window.matchMedia?.('(prefers-color-scheme: dark)');
  let systemDark = colorScheme?.matches || false;
  const colorSchemeChanged = (event) => { systemDark = event.matches; };
  if (colorScheme?.addEventListener) colorScheme.addEventListener('change', colorSchemeChanged);
  else colorScheme?.addListener?.(colorSchemeChanged);
  onDestroy(() => {
    if (colorScheme?.removeEventListener) colorScheme.removeEventListener('change', colorSchemeChanged);
    else colorScheme?.removeListener?.(colorSchemeChanged);
  });

  $: applyTheme($prefs.theme, systemDark);
  $: migrateLearnedSchedules($progress.learned);

  $: showOnboarding = onboardingRequested
    || (Object.keys($progress.done).length === 0 && !$prefs.onboardingDone);

  function cancelBiteRequest() {
    beginBiteRequest();
    loadingBite = false;
  }

  async function play(chapter, bite, { withWarmup = true } = {}) {
    const isLatest = beginBiteRequest();
    loadingBite = true;
    loadError = '';
    try {
      const bites = await loadChapterCards(chapter.id);
      const fullBite = bites.find((item) => item.id === bite.id);
      if (!fullBite) throw new Error(`Missing bite: ${bite.id}`);
      if (!isLatest()) return;
      playing = { chapter, bite: fullBite, withWarmup };
      window.scrollTo(0, 0);
    } catch (error) {
      if (!isLatest()) return;
      playing = null;
      loadError = '한입을 불러오지 못했어요. 다시 시도해 주세요. · Could not load this bite. Please try again.';
      console.error(error);
    } finally {
      if (isLatest()) loadingBite = false;
    }
  }
  async function playSnack(snack, { withWarmup = true } = {}) {
    const isLatest = beginBiteRequest();
    loadingBite = true;
    loadError = '';
    try {
      const cards = await loadSnackCards(snack.id);
      if (!isLatest()) return;
      playing = {
        chapter: { id: snack.id, number: snack.afterChapter, biteCount: 1 },
        bite: { ...snack, kind: 'snack', index: 0, cards },
        withWarmup,
      };
      window.scrollTo(0, 0);
    } catch (error) {
      if (!isLatest()) return;
      playing = null;
      loadError = '간식을 불러오지 못했어요. 다시 시도해 주세요. · Could not load this snack. Please try again.';
      console.error(error);
    } finally {
      if (isLatest()) loadingBite = false;
    }
  }
  async function playItem(item) {
    if (!item) return;
    if (item.type === 'snack') await playSnack(item.snack);
    else await play(item.chapter, item.bite);
  }
  function skipSnack(snackId) {
    skippedSnacks = new Set([...skippedSnacks, snackId]);
  }
  function openWordbook(word) {
    cancelBiteRequest();
    playing = null;
    showGuide = false;
    wordbookTarget = word;
    tab = 'words';
    window.scrollTo(0, 0);
  }
  function startReview() {
    const cards = buildDueReviewCards($progress.learned, $srs, Date.now(), 8);
    if (!cards.length) return;
    playing = {
      chapter: { id: 'review', number: 0, biteCount: 1 },
      bite: {
        id: `review-${todayKey()}`,
        kind: 'review',
        index: 0,
        title: '복습 한 입 · Review bite',
        canDo: 'Review the words that are due today · 오늘 복습할 단어를 다시 확인해요',
        cards,
      },
      withWarmup: false,
    };
    window.scrollTo(0, 0);
  }
  async function exitBite(finished, wantMore) {
    if (finished) markBiteDone(playing.bite);
    if (finished && wantMore) {
      const next = findNext({ index: courseIndex, done: doneMap(), skippedSnacks, startChapter: $prefs.startChapter });
      playing = null;
      await playItem(next);
      return;
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

{#if showcase}
  {#await loadShowcase()}
    <p class="loading">컴포넌트 불러오는 중 · Loading showcase…</p>
  {:then mod}
    <svelte:component this={mod.default} />
  {/await}
{:else if showOnboarding}
  <Onboarding onComplete={() => { onboardingRequested = false; }} />
{:else if playing}
  <!-- keyed so 한 입 더 rebuilds the player from scratch for the next bite -->
  {#key playing.bite.id}
    <BitePlayer
      bite={playing.bite}
      biteNumber={playing.bite.index + 1}
      biteTotal={playing.chapter.biteCount}
      onExit={exitBite}
      onOpenWord={openWordbook}
      withWarmup={playing.withWarmup}
    />
  {/key}
{:else}
  <main>
    {#if loadingBite}
      <p class="loading" role="status">한입 불러오는 중 · Loading bite…</p>
    {:else}
      {#if loadError}<p class="load-error" role="alert">{loadError}</p>{/if}
      {#if tab === 'today'}
        <Home
          index={courseIndex}
          {skippedSnacks}
          onStart={playItem}
          onSkipSnack={skipSnack}
          onChangeStart={() => { onboardingRequested = true; }}
          onStartReview={startReview}
        />
      {:else if tab === 'shelf'}
        {#if showGuide}
          <div class="guide-wrap">
            <button class="back-shelf" on:click={() => { showGuide = false; window.scrollTo(0, 0); }}>← 책장 · Back to shelf</button>
            {#await loadTab('guide')}
              <p class="loading">불러오는 중 · Loading…</p>
            {:then mod}
              <svelte:component this={mod.default} />
            {/await}
          </div>
        {:else}
          <Shelf
            {chapters}
            {snacks}
            onPlay={(chapter, bite) => play(chapter, bite, { withWarmup: false })}
            onPlaySnack={(snack) => playSnack(snack, { withWarmup: false })}
            onOpenGuide={() => { showGuide = true; window.scrollTo(0, 0); }}
          />
        {/if}
      {:else}
        {#await loadTab(tab)}
          <p class="loading">불러오는 중 · Loading…</p>
        {:then mod}
          {#if tab === 'words'}
            <svelte:component this={mod.default} targetWord={wordbookTarget} onTargetHandled={() => { wordbookTarget = ''; }} />
          {:else}
            <svelte:component this={mod.default} />
          {/if}
        {/await}
      {/if}
    {/if}
  </main>
  <nav class="tabs">
    {#each TABS as t}
      <button class:on={tab === t.key} on:click={() => { cancelBiteRequest(); tab = t.key; showGuide = false; window.scrollTo(0, 0); }}>
        <span class="ico">{t.ico}</span>
        <span class="t-ko">{t.ko}</span>
        <span class="t-en">{t.en}</span>
      </button>
    {/each}
  </nav>
{/if}

<PwaUpdateToast />

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
  .loading { max-width: 480px; margin: 0 auto; padding: 40px 20px; color: var(--ink-3);
    font-size: 13px; font-weight: 750; text-align: center; }
  .load-error { max-width: 440px; margin: 16px auto 0; padding: 12px 16px; border: 1px solid var(--line);
    border-radius: var(--r-chip); background: var(--card); color: var(--ink-2); font-size: 13px; font-weight: 750;
    text-align: center; word-break: keep-all; }
</style>
