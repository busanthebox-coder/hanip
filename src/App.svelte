<script>
  import { onDestroy } from 'svelte';
  import courseIndex from './lib/bites-index.json';
  import Home from './components/Home.svelte';
  import Shelf from './components/Shelf.svelte';
  import BitePlayer from './components/BitePlayer.svelte';
  import Onboarding from './components/Onboarding.svelte';
  import PwaUpdateToast from './components/PwaUpdateToast.svelte';
  import TabIcon from './components/TabIcon.svelte';
  import { createLatestRequest, loadChapterCards, loadSnackCards } from './lib/courseData.js';
  import { findAfter, findNext } from './lib/nextBite.js';
  import { prefs } from './lib/prefs.js';
  import { buildDueReviewCards, migrateLearnedSchedules, srs } from './lib/srs.js';
  import { chapterSealInfo } from './lib/shelf.js';
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
  const loadGrammarShowcase = () => import('./components/GrammarLessonShowcase.svelte');
  let grammarDataPromise;
  const loadGrammarData = () => (grammarDataPromise ||= import('./lib/grammarData.js'));
  const beginBiteRequest = createLatestRequest();
  const showcaseName = new URLSearchParams(window.location.search).get('showcase');

  const chapters = courseIndex.chapters;
  const snacks = courseIndex.snacks || [];
  migrateCollected(courseIndex);

  // order 28: the five glyphs are drawn, not typed — Today is the bowl itself
  const TABS = [
    { key: 'today', en: 'Today' },
    { key: 'shelf', en: 'Shelf' },
    { key: 'hangul', en: 'Hangul' },
    { key: 'hanja', en: 'Hanja' },
    { key: 'words', en: 'Words' },
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

  // The win screen names what "한 입 더" will actually serve, so the learner is
  // choosing something instead of pressing a blind button.
  $: nextUp = playing
    ? findAfter({
        index: courseIndex,
        done: $progress.done,
        skippedSnacks,
        startChapter: $prefs.startChapter,
        finishedId: playing.bite.id,
      })
    : null;
  $: chapterSeal = playing
    ? chapterSealInfo(chapters, playing.chapter?.id, $progress.done, playing.bite.id)
    : null;

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
      let lessonCards = null;
      if (fullBite.kind === 'pattern') {
        try {
          const grammarData = await loadGrammarData();
          lessonCards = await grammarData.loadGrammarCards(chapter.id, fullBite.title, fullBite.cards);
        } catch (grammarError) {
          console.warn('Could not expand grammar lesson; using compact cards.', grammarError);
        }
      }
      if (!isLatest()) return;
      playing = { chapter, bite: lessonCards ? { ...fullBite, lessonCards } : fullBite, withWarmup };
      window.scrollTo(0, 0);
    } catch (error) {
      if (!isLatest()) return;
      playing = null;
      loadError = 'Could not load this bite. Please try again.';
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
      loadError = 'Could not load this snack. Please try again.';
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
        title: 'Review bite',
        canDo: 'Review the words that are due today.',
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

{#if showcaseName === 'grammar'}
  {#await loadGrammarShowcase()}
    <p class="loading">Loading grammar preview…</p>
  {:then mod}
    <svelte:component this={mod.default} />
  {/await}
{:else if showcaseName === 'shelf'}
  {#await loadShowcase()}
    <p class="loading">Loading showcase…</p>
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
      {nextUp}
      {chapterSeal}
      onExit={exitBite}
      onOpenWord={openWordbook}
      withWarmup={playing.withWarmup}
    />
  {/key}
{:else}
  <main>
    {#if loadingBite}
      <p class="loading" role="status">Loading bite…</p>
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
            <button class="back-shelf" on:click={() => { showGuide = false; window.scrollTo(0, 0); }}>← Shelf</button>
            {#await loadTab('guide')}
              <p class="loading">Loading…</p>
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
          <p class="loading">Loading…</p>
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
        <TabIcon name={t.key} />
        <span class="t-label">{t.en}</span>
      </button>
    {/each}
  </nav>
{/if}

<PwaUpdateToast />

<style>
  main { padding-bottom: 78px; }
  .tabs { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: var(--card);
    border-top: 1px solid var(--line); padding: 7px 0 calc(9px + env(safe-area-inset-bottom, 0px)); z-index: 40; }
  .tabs button { flex: 1; min-width: 0; min-height: 44px; display: grid; justify-items: center; gap: 2px;
    padding: 2px 0; color: var(--ink-3); }
  .tabs button.on { color: var(--accent-deep); }
  .t-label { font-size: 10.5px; font-weight: 850; line-height: 1.25; }
  .guide-wrap { max-width: 480px; margin: 0 auto; }
  .back-shelf { margin: 18px 22px 0; min-height: 44px; color: var(--ink-3); font-size: 12.5px; font-weight: 700; }
  .back-shelf:hover { color: var(--ink); }
  .loading { max-width: 480px; margin: 0 auto; padding: 40px 22px; color: var(--ink-3);
    font-size: 12.5px; font-weight: 650; text-align: center; }
  .load-error { max-width: 440px; margin: 16px auto 0; padding: 14px 22px; color: var(--bad);
    font-size: 13px; font-weight: 700; text-align: center; word-break: keep-all; }
</style>
