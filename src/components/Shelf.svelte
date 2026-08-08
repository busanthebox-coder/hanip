<script>
  import { onMount } from 'svelte';
  import { progress } from '../lib/store.js';
  import { activeKey } from '../lib/profiles.js';
  import {
    buildShelfGroups,
    defaultOpenLevels,
    filterShelfGroups,
    parseStoredOpenLevels,
  } from '../lib/shelf.js';
  import SearchField from './SearchField.svelte';
  import ShelfLevelGroup from './ShelfLevelGroup.svelte';
  import GrammarCollection from './GrammarCollection.svelte';
  import GrammarRefSheet from './GrammarRefSheet.svelte';
  import { createLatestRequest, loadChapterCards } from '../lib/courseData.js';

  export let chapters = [];
  export let snacks = [];
  export let onPlay = () => {};
  export let onPlaySnack = () => {};
  export let onOpenGuide = () => {};

  let query = '';
  let openLevels = [];
  let showCollection = false;

  // order 24: tapping a collection card opens the static rule sheet
  let refOpen = false;
  let refBite = null;        // full bite (with cards) once its chunk loads
  let refIndexItem = null;   // { chapter, bite } from the index grid
  let refCollected = true;
  let refLoading = false;
  const beginRefRequest = createLatestRequest();

  async function openRefSheet(chapter, bite, isCollected) {
    refOpen = true;
    refLoading = true;
    refBite = null;
    refIndexItem = { chapter, bite };
    refCollected = isCollected;
    const isLatest = beginRefRequest();
    try {
      const bites = await loadChapterCards(chapter.id);
      if (!isLatest()) return;
      refBite = bites.find((item) => item.id === bite.id) || null;
    } catch {
      if (isLatest()) refBite = null;
    } finally {
      if (isLatest()) refLoading = false;
    }
  }

  function closeRefSheet() {
    refOpen = false;
    refBite = null;
    refIndexItem = null;
  }

  $: state = $progress;
  $: groups = buildShelfGroups(chapters, state.done, snacks);
  $: visibleGroups = filterShelfGroups(groups, query);
  $: searching = query.trim().length > 0;
  $: grammarBites = chapters.flatMap((chapter) => chapter.bites || []).filter((bite) => bite.kind === 'pattern');
  $: grammarTotal = grammarBites.length;
  $: grammarCollected = grammarBites.filter((bite) => (state.collected || []).includes(bite.id)).length;

  onMount(() => {
    const fallback = defaultOpenLevels(chapters, state.done);
    openLevels = parseStoredOpenLevels(localStorage.getItem(activeKey('shelf-open-v1')), fallback);
  });

  function toggleLevel(level) {
    openLevels = openLevels.includes(level)
      ? openLevels.filter((item) => item !== level)
      : [...openLevels, level];
    try {
      localStorage.setItem(activeKey('shelf-open-v1'), JSON.stringify(openLevels));
    } catch {
      // Private browsing may disable storage; the in-memory accordion still works.
    }
  }
</script>

{#if showCollection}
  <GrammarCollection
    {chapters}
    collected={state.collected || []}
    onBack={() => { showCollection = false; window.scrollTo(0, 0); }}
    onOpen={openRefSheet}
  />
  <GrammarRefSheet
    open={refOpen}
    bite={refBite}
    loading={refLoading}
    notLearned={!refCollected}
    meta={refIndexItem ? { level: refIndexItem.chapter.level, chapterNumber: refIndexItem.chapter.number } : null}
    onReplay={() => {
      const item = refIndexItem;
      closeRefSheet();
      showCollection = false;
      if (item) onPlay(item.chapter, item.bite);
    }}
    onClose={closeRefSheet}
  />
{:else}
<section class="shelf">
  <div class="mark">Shelf</div>
  <p class="sub">Browse all {chapters.length} chapters by level</p>

  <SearchField
    bind:value={query}
    label="Search chapters"
    placeholder="Search number or title"
  />

  <div class="entries">
    <button class="entry" on:click={() => { showCollection = true; window.scrollTo(0, 0); }}>
      <b>Grammar collection</b>
      <span class="entry-sub">모은 문법 카드</span>
      <span class="entry-num">{grammarCollected}/{grammarTotal}</span>
    </button>
    <button class="entry" on:click={onOpenGuide}>
      <b>Korea guides</b>
      <span class="entry-sub">Arrival, transport, food, emergencies</span>
      <span class="entry-num">20</span>
    </button>
  </div>

  {#if visibleGroups.length === 0}
    <div class="empty" role="status">
      <b>No matching chapters</b>
      <span>Try another number or title</span>
    </div>
  {:else}
    <div class="groups">
      {#each visibleGroups as group (group.id)}
        <ShelfLevelGroup
          {group}
          open={searching || openLevels.includes(group.id)}
          forceOpen={searching}
          doneMap={state.done}
          onToggle={() => toggleLevel(group.id)}
          {onPlay}
          {onPlaySnack}
        />
      {/each}
    </div>
  {/if}

  <div class="readers-wrap">
    {#await import('./ReadersShelf.svelte')}
      <p class="readers-loading" role="status">Loading readers…</p>
    {:then mod}
      <svelte:component this={mod.default} />
    {/await}
  </div>
</section>
{/if}

<style>
  .shelf { max-width: 480px; margin: 0 auto; padding: 26px 22px 40px; }
  .mark { font-size: 16px; font-weight: 900; letter-spacing: -.03em; }
  .sub { margin: 5px 0 14px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }

  .entries { margin-top: 18px; }
  .entry { width: 100%; min-height: 44px; display: grid; grid-template-columns: 1fr auto; align-items: center;
    padding: 13px 0; border-top: 1px solid var(--line); text-align: left;
    transition: background-color .12s var(--ease); }
  .entry:last-child { border-bottom: 1px solid var(--line); }
  .entry:hover { background: var(--wash); }
  .entry b { font-size: 14.5px; font-weight: 750; letter-spacing: -.01em; }
  .entry-sub { grid-column: 1; font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .entry-num { grid-row: 1 / -1; grid-column: 2; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    font-variant-numeric: tabular-nums; }

  .groups { margin-top: 20px; }
  .empty { margin-top: 26px; display: grid; gap: 4px; text-align: center; word-break: keep-all; }
  .empty b { font-size: 15px; font-weight: 800; }
  .empty span { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .readers-wrap { margin-top: 28px; }
  .readers-loading { margin: 0; padding: 24px 0; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    text-align: center; }
</style>
