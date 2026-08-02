<script>
  import { onMount } from 'svelte';
  import { progress } from '../lib/store.js';
  import {
    SHELF_OPEN_KEY,
    buildShelfGroups,
    defaultOpenLevels,
    filterShelfGroups,
    parseStoredOpenLevels,
  } from '../lib/shelf.js';
  import SearchField from './SearchField.svelte';
  import ShelfLevelGroup from './ShelfLevelGroup.svelte';

  export let chapters = [];
  export let onPlay = () => {};
  export let onOpenGuide = () => {};

  let query = '';
  let openLevels = [];

  $: state = $progress;
  $: groups = buildShelfGroups(chapters, state.done);
  $: visibleGroups = filterShelfGroups(groups, query);
  $: searching = query.trim().length > 0;

  onMount(() => {
    const fallback = defaultOpenLevels(chapters, state.done);
    openLevels = parseStoredOpenLevels(localStorage.getItem(SHELF_OPEN_KEY), fallback);
  });

  function toggleLevel(level) {
    openLevels = openLevels.includes(level)
      ? openLevels.filter((item) => item !== level)
      : [...openLevels, level];
    try {
      localStorage.setItem(SHELF_OPEN_KEY, JSON.stringify(openLevels));
    } catch {
      // Private browsing may disable storage; the in-memory accordion still works.
    }
  }
</script>

<section class="shelf">
  <div class="cap">책장 · Bookshelf</div>
  <p class="sub">65개 챕터를 레벨별로 열어 보세요. · Browse all 65 chapters by level.</p>

  <button class="guide-card" on:click={onOpenGuide}>
    <span class="g-ico">🧭</span>
    <span class="g-main">
      <strong>가이드북 · Korea guides</strong>
      <span>Real-life survival guides — arrival, transport, food, emergencies · 실전 생활 가이드 20편</span>
    </span>
    <span class="g-chev">▸</span>
  </button>

  <div class="search-wrap">
    <SearchField
      bind:value={query}
      label="챕터 검색 · Search chapters"
      placeholder="챕터 번호나 제목 검색 · Search number or title"
    />
  </div>

  {#if visibleGroups.length === 0}
    <div class="empty" role="status">
      <strong>검색 결과가 없어요 · No matching chapters</strong>
      <span>다른 번호나 제목을 입력해 보세요. · Try another number or title.</span>
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
        />
      {/each}
    </div>
  {/if}
</section>

<style>
  .shelf { max-width: 480px; margin: 0 auto; padding: 30px 20px 40px; }
  .cap { font-size: 11.5px; font-weight: 850; letter-spacing: .2em; color: var(--accent); text-transform: uppercase; }
  .sub { margin: 6px 0 18px; font-size: 13.5px; color: var(--ink-3); word-break: keep-all; }
  .guide-card { width: 100%; display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding: 15px 16px;
    border-radius: 18px; background: var(--card); border: 1px solid var(--line); box-shadow: var(--shadow-1);
    text-align: left; transition: border-color .12s var(--ease); }
  .guide-card:hover { border-color: var(--ink-3); }
  .g-ico { font-size: 26px; flex: none; }
  .g-main { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .g-main strong { font-size: 15px; font-weight: 850; }
  .g-main span { font-size: 12px; color: var(--ink-3); line-height: 1.45; word-break: keep-all; }
  .g-chev { color: var(--ink-3); flex: none; }
  .search-wrap { margin-bottom: 14px; }
  .groups { display: grid; gap: 12px; }
  .empty { display: grid; gap: 4px; padding: 28px 16px; border: 1px solid var(--line); border-radius: 18px;
    background: var(--card); box-shadow: var(--shadow-1); text-align: center; word-break: keep-all; }
  .empty strong { font-size: 15px; }
  .empty span { color: var(--ink-3); font-size: 13px; }
</style>
