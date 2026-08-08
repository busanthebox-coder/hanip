<script>
  import { onMount } from 'svelte';
  import { progress } from '../lib/store.js';
  import { activeKey } from '../lib/profiles.js';
  import {
    buildCourseRail,
    buildShelfGroups,
    currentChapterId,
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
  $: rail = buildCourseRail(chapters, state.done);
  // One equal track per chapter, plus a 1.8px spacer between levels — with the
  // 1.8px column gap either side that makes the 5.4px level break the spec asks
  // for. Fractional tracks rather than a fixed 2.6px pitch because 72 fixed
  // ticks measure 337px and push a 360px phone into a horizontal scroll; this
  // way the rail always fills the column exactly and never exceeds it.
  $: railColumns = rail.levels
    .map((level) => `repeat(${level.ticks.length},minmax(0,1fr))`)
    .join(' 1.8px ');
  $: currentId = currentChapterId(chapters, state.done);
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

<!-- order 31: the whole shelf tab is an index surface — the dot layer is laid on
     this full-width wrapper, never on the 480px column, or the left and right
     margins keep the ruling that the list is fighting with -->
<div class="index-surface">
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
  <div class="top">
    <span class="mark">Shelf</span>
    <span class="count">
      {#if rail.current}Chapter <b>{rail.current}</b> of {rail.total} · {rail.done} done
      {:else}All {rail.total} chapters done{/if}
    </span>
  </div>

  <!-- the course rail answers "where am I in 72" with a length instead of a
       sentence, and it stays put whether the levels are open, shut or searched -->
  <div class="rail" style="grid-template-columns:{railColumns}" aria-hidden="true">
    {#each rail.levels as level, index (level.id)}
      {#if index > 0}<span class="run-gap"></span>{/if}
      {#each level.ticks as tick (tick.number)}<i class={tick.state}></i>{/each}
    {/each}
  </div>
  <!-- the labels ride the same track list, so a run and its name cannot drift
       apart at any width -->
  <div class="rail-ticks" style="grid-template-columns:{railColumns}" aria-hidden="true">
    {#each rail.levels as level, index (level.id)}
      {#if index > 0}<span class="run-gap"></span>{/if}
      <span class="lv-id" style="grid-column:span {level.ticks.length}">{level.id}</span>
    {/each}
  </div>

  <SearchField
    bind:value={query}
    label="Search chapters"
    placeholder="Search number or title"
  />

  <!-- the subject of this screen is 72 chapters, not the two side doors: one row
       instead of the two 120px entry rows they used to occupy -->
  <div class="mininav">
    <button on:click={() => { showCollection = true; window.scrollTo(0, 0); }}>
      <b>Grammar</b>
      <span>{grammarCollected}/{grammarTotal}</span>
    </button>
    <button on:click={onOpenGuide}>
      <b>Guides</b>
      <span>20</span>
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
          {currentId}
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
</div>

<style>
  .shelf { max-width: 480px; margin: 0 auto; padding: 20px 22px 40px; }
  /* one header line carries the screen's name and the learner's position — no
     separate label row above the rail */
  .top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .mark { font-size: 16px; font-weight: 900; letter-spacing: -.03em; }
  .count { font-size: 11.5px; font-weight: 700; color: var(--ink-3); font-variant-numeric: tabular-nums;
    white-space: nowrap; }
  .count b { font-weight: 850; color: var(--ink); }

  .rail { margin-top: 11px; display: grid; column-gap: 1.8px; align-items: end; height: 15px; }
  .rail i { height: 9px; border-radius: 1.3px; background: var(--progress-track); }
  .rail i.done { background: var(--gold); }
  /* the current chapter is the only ink tick, and it is 6px taller */
  .rail i.now { height: 15px; border-radius: 1.5px; background: var(--ink); }
  .rail-ticks { margin: 4px 0 12px; display: grid; column-gap: 1.8px; font-size: 9.5px; font-weight: 750;
    color: var(--ink-3); letter-spacing: .02em; line-height: 1.2; }
  .lv-id { min-width: 0; overflow: hidden; }

  .mininav { margin-top: 12px; display: grid; grid-template-columns: repeat(2, 1fr);
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .mininav button { min-height: 44px; display: grid; align-content: center; gap: 1px; padding: 8px 0;
    text-align: left; transition: background-color .12s var(--ease); }
  .mininav button:hover { background: var(--wash); }
  .mininav b { font-size: 12.5px; font-weight: 780; letter-spacing: -.01em; }
  .mininav span { font-size: 11px; font-weight: 650; color: var(--ink-3); font-variant-numeric: tabular-nums; }

  .groups { margin-top: 10px; }
  .empty { margin-top: 26px; display: grid; gap: 4px; text-align: center; word-break: keep-all; }
  .empty b { font-size: 15px; font-weight: 800; }
  .empty span { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .readers-wrap { margin-top: 28px; }
  .readers-loading { margin: 0; padding: 24px 0; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    text-align: center; }
</style>
