<script>
  import { onMount, tick } from 'svelte';
  import { progress } from '../lib/store.js';
  import { activeKey } from '../lib/profiles.js';
  import {
    buildLevelStrip,
    buildShelfGroups,
    cardNeedsScroll,
    defaultOpenLevels,
    filterShelfGroups,
    parseStoredOpenLevels,
    shelfFocusCard,
    shelfPosition,
    toggleShelfSearch,
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
  let searchOpen = false;
  let openLevels = [];
  let showCollection = false;
  let showReaders = false;

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
  // order 33: what is left of the course rail — the three numbers it carried
  $: position = shelfPosition(chapters, state.done);
  // the one chapter in 72 that is promoted to a card, in its own place in the list
  $: focus = shelfFocusCard(chapters, state.done);
  $: levelStrip = buildLevelStrip(chapters, state.done);
  $: grammarBites = chapters.flatMap((chapter) => chapter.bites || []).filter((bite) => bite.kind === 'pattern');
  $: grammarTotal = grammarBites.length;
  $: grammarCollected = grammarBites.filter((bite) => (state.collected || []).includes(bite.id)).length;

  onMount(async () => {
    const fallback = defaultOpenLevels(chapters, state.done);
    openLevels = parseStoredOpenLevels(localStorage.getItem(activeKey('shelf-open-v1')), fallback);
    // the card sits in its own place in the list, which for chapter 56 is a long
    // way down. Opening the shelf on the bookmark rather than on chapter 1 is
    // the whole point of putting it there.
    await scrollToCard();
  });

  function persistOpenLevels() {
    try {
      localStorage.setItem(activeKey('shelf-open-v1'), JSON.stringify(openLevels));
    } catch {
      // Private browsing may disable storage; the in-memory accordion still works.
    }
  }

  function toggleLevel(level) {
    openLevels = openLevels.includes(level)
      ? openLevels.filter((item) => item !== level)
      : [...openLevels, level];
    persistOpenLevels();
  }

  // scrollIntoView ignores the reduced-motion media query, so it is asked here
  function scrollMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
  }

  // the card is two components down, so it is found by its mark rather than
  // threaded back up through a callback per chapter row. Whether the page
  // should move at all is cardNeedsScroll's judgement, not this function's.
  async function scrollToCard(behavior = 'auto', always = false) {
    await tick();
    const el = document.querySelector('[data-shelf-card]');
    if (!el) return false;
    if (always || cardNeedsScroll(el.getBoundingClientRect(), window.innerHeight)) {
      el.scrollIntoView({ block: 'center', behavior });
    }
    return true;
  }

  // order 33, diagnosis 1: the rail's five labels were captions. These jump.
  // Tapping the level you are already in lands on the card — that is the way
  // back once you have scrolled away from it, so no floating button is needed.
  async function jumpToLevel(id) {
    if (!openLevels.includes(id)) {
      openLevels = [...openLevels, id];
      persistOpenLevels();
    }
    const motion = scrollMotion();
    // tapping your own level is a deliberate "take me back", so this one always moves
    if (focus && focus.chapter.level === id && await scrollToCard(motion, true)) return;
    await tick();
    const el = document.querySelector(`[data-level="${id}"]`);
    if (el) el.scrollIntoView({ block: 'start', behavior: motion });
  }

  function toggleSearch() {
    ({ open: searchOpen, query } = toggleShelfSearch(searchOpen, query));
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
    onBack={() => { showCollection = false; window.scrollTo(0, 0); scrollToCard(); }}
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
{:else if showReaders}
  {#await import('./ReadersShelf.svelte')}
    <p class="readers-loading" role="status">Loading readers…</p>
  {:then mod}
    <svelte:component
      this={mod.default}
      onBack={() => { showReaders = false; window.scrollTo(0, 0); scrollToCard(); }}
    />
  {/await}
{:else}
<section class="shelf">
  <!-- order 33: the header is one layer. The name, the position and the search
       icon share a single 44px line; the rail, the search field and the mini-nav
       that used to stack under it cost 167.6px on every visit. -->
  <div class="top">
    <span class="grow">
      <span class="mark">Shelf</span>
      <span class="count">
        {#if position.current}Chapter <b>{position.current}</b> of {position.total} · {position.done} done
        {:else}All {position.total} chapters done{/if}
      </span>
    </span>
    <!-- folded, not killed: filterShelfGroups still searches number, title,
         goal, bite title and first word — it just stops charging 56px for it -->
    <button
      class="iconbtn"
      aria-label={searchOpen ? 'Close search' : 'Search chapters'}
      aria-expanded={searchOpen}
      on:click={toggleSearch}
    >
      {#if searchOpen}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5L17.5 17.5"/><path d="M17.5 6.5L6.5 17.5"/></svg>
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.6" cy="10.6" r="6.4"/><path d="M15.3 15.3L20 20"/></svg>
      {/if}
    </button>
  </div>

  {#if searchOpen}
    <div class="searchrow">
      <SearchField
        bind:value={query}
        autofocus
        label="Search chapters"
        placeholder="Search number or title"
      />
    </div>
  {/if}

  <!-- the level strip replaces the rail: five fractions you can read and five
       44px targets you can tap. Not a pill (STYLE §4 kill list 4) — the 3px
       underline is the level's progress, not a selection mark. It does not
       stick; pinning it would rebuild the always-on A1–C1 band it replaced. -->
  <div class="lvstrip">
    {#each levelStrip as cell (cell.id)}
      <button
        class="lvcell"
        class:here={cell.here}
        aria-label="{cell.id} — {cell.done} of {cell.total} chapters done"
        on:click={() => jumpToLevel(cell.id)}
      >
        <span class="lab"><b>{cell.id}</b><span>{cell.done}/{cell.total}</span></span>
        <span class="bar" aria-hidden="true"><i style="width:{cell.percent}%"></i></span>
      </button>
    {/each}
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
          {focus}
          onToggle={() => toggleLevel(group.id)}
          {onPlay}
          {onPlaySnack}
        />
      {/each}
    </div>
  {/if}

  <!-- order 33: three side doors of the same rank, in one place. Grammar and
       Guides used to ride the header and Readers sat alone at the foot, so
       position said they were different things when they are not. They are
       other indexes, not entries in this one — hence the foot, and hence no
       gutter: they start at x=0 because they are not chapters. -->
  <div class="more">
    <div class="h">More</div>
    <button class="mrow" on:click={() => { showCollection = true; window.scrollTo(0, 0); }}>
      <b>Grammar</b>
      <span>{grammarCollected} of {grammarTotal} collected</span>
    </button>
    <button class="mrow" on:click={onOpenGuide}>
      <b>Guides</b>
      <span>20 guides</span>
    </button>
    <button class="mrow" on:click={() => { showReaders = true; window.scrollTo(0, 0); }}>
      <b>Readers</b>
      <span>20 short texts</span>
    </button>
  </div>
</section>
{/if}
</div>

<style>
  .shelf { max-width: 480px; margin: 0 auto; padding: 14px 22px 40px; }
  /* one header line carries the screen's name, the learner's position and the
     search affordance — the icon costs no vertical space at all */
  .top { min-height: 44px; display: flex; align-items: center; gap: 10px; }
  .grow { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
  .mark { font-size: 16px; font-weight: 900; letter-spacing: -.03em; }
  .count { font-size: 11.5px; font-weight: 700; color: var(--ink-3); font-variant-numeric: tabular-nums;
    white-space: nowrap; }
  .count b { font-weight: 850; color: var(--ink); }
  /* -11px hangs the 44px target into the column padding so the glyph, not the
     target, lines up with the right edge of the list */
  .iconbtn { flex: none; width: 44px; height: 44px; margin-right: -11px; display: grid; place-items: center;
    color: var(--ink-3); transition: color .12s var(--ease); }
  .iconbtn:hover { color: var(--ink); }
  .iconbtn svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.7;
    stroke-linecap: round; stroke-linejoin: round; }
  .searchrow { margin-top: 8px; }

  /* fractional tracks, never a fixed pitch: five fixed-width cells are what put
     the order-31 rail 31px past the edge of a 320px phone */
  .lvstrip { margin-top: 6px; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr);
    gap: 6px; }
  .lvcell { min-height: 44px; display: grid; align-content: center; gap: 5px; overflow: hidden;
    text-align: left; }
  .lvcell .lab { display: flex; align-items: baseline; gap: 4px; white-space: nowrap; }
  .lvcell .lab b { font-size: 12.5px; font-weight: 850; letter-spacing: -.01em; color: var(--ink-3);
    line-height: 1.25; transition: color .12s var(--ease); }
  .lvcell .lab span { font-size: 10.5px; font-weight: 700; color: var(--ink-3);
    font-variant-numeric: tabular-nums; line-height: 1.25; transition: color .12s var(--ease); }
  .lvcell .bar { height: 3px; border-radius: 999px; background: var(--progress-track); overflow: hidden; }
  .lvcell .bar i { display: block; height: 100%; background: var(--gold); border-radius: 999px; }
  /* "here" is said with the ink contrast the app already uses, not with a fill */
  .lvcell.here .lab b, .lvcell.here .lab span { color: var(--ink); }
  .lvcell:hover .lab b { color: var(--ink); }
  /* 320px leaves each cell 50px, and "A1 11/11" measures 49px in the widest
     fallback face — the label sheds half a point rather than clipping */
  @media (max-width: 359px) {
    .lvstrip { gap: 4px; }
    .lvcell .lab b { font-size: 11.5px; }
    .lvcell .lab span { font-size: 10px; }
  }

  .groups { margin-top: 10px; }
  .empty { margin-top: 26px; display: grid; gap: 4px; text-align: center; word-break: keep-all; }
  .empty b { font-size: 15px; font-weight: 800; }
  .empty span { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }

  /* the three side doors are siblings, so each row carries a rule; "More" is
     their parent and carries none (STYLE §10-2) */
  .more { margin-top: 26px; }
  .more .h { font-size: 11.5px; font-weight: 700; color: var(--ink-3); padding-bottom: 4px; }
  .mrow { width: 100%; min-height: 48px; display: flex; align-items: center; justify-content: space-between;
    gap: 10px; padding: 12px 0; border-top: 1px solid var(--line); text-align: left;
    transition: background-color .12s var(--ease); }
  .mrow:last-child { border-bottom: 1px solid var(--line); }
  .mrow:hover { background: var(--wash); }
  .mrow b { font-size: 14.5px; font-weight: 800; letter-spacing: -.012em; }
  .mrow span { font-size: 11.5px; font-weight: 650; color: var(--ink-3); font-variant-numeric: tabular-nums;
    white-space: nowrap; }

  .readers-loading { margin: 0; padding: 24px 0; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    text-align: center; }
</style>
