<script>
  import wordbookData from '../lib/wordbook.json';
  import WordDetail from './WordDetail.svelte';
  import WordbookRow from './WordbookRow.svelte';
  import { progress } from '../lib/store.js';
  import { chapterLevel } from '../lib/levels.js';
  import { createDepthLoader } from '../lib/wordbookData.js';

  const words = wordbookData.words;
  // single-copy shards: `?url` emits each JSON as one hashed asset, no JS twin
  const depthUrls = import.meta.glob('../lib/wordbook-depth/*.json', {
    eager: true,
    query: '?url',
    import: 'default',
  });
  const loadDepth = createDepthLoader(depthUrls);
  const levels = [...new Set(words.flatMap((word) => word.chapters.map(chapterLevel)))];

  export let targetWord = '';
  export let onTargetHandled = () => {};

  let query = '';
  let filter = 'all'; // 'all' | 'learned' | 'starred' | 'nuance' | part-of-speech buckets
  let levelFilter = 'all';
  let openKey = null;
  let loadingKey = null;
  let detailError = '';
  let detailRequest = 0;
  let selected = null;
  let showClusters = false;
  let clusterBrowserModule = null;
  let handledTarget = '';

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'learned', label: 'Learned' },
    { id: 'starred', label: 'Starred' },
    { id: 'nuance', label: 'Confusable' },
    { id: 'verb', label: 'Verb' },
    { id: 'noun', label: 'Noun' },
    { id: 'adj', label: 'Adjective' },
    { id: 'other', label: 'Other' }
  ];

  // Nuance notes sit on 174 of 191 words, so badging those would mark almost
  // every row — background, not signal. The rare, worth-hunting thing is a
  // confusable twin (말하다 vs 이야기하다), and that is what Confusable filters.
  async function openDetail(w) {
    const key = rowKey(w);
    const request = ++detailRequest;
    loadingKey = key;
    detailError = '';
    try {
      const detail = (await loadDepth(w.depthShard))[w.ko];
      if (!detail) throw new Error(`Missing wordbook detail: ${w.ko}`);
      if (request !== detailRequest) return;
      selected = { ...w, ...detail };
      window.scrollTo(0, 0);
    } catch (error) {
      if (request === detailRequest) {
        detailError = 'Could not load this entry. Tap to retry.';
      }
    } finally {
      if (request === detailRequest) loadingKey = null;
    }
  }

  async function openTarget(word) {
    handledTarget = word;
    const match = words.find((item) => item.ko === word);
    if (match) await openDetail(match);
    onTargetHandled();
  }
  function closeDetail() {
    detailRequest += 1;
    loadingKey = null;
    detailError = '';
    selected = null;
    window.scrollTo(0, 0);
  }

  function openClusterBrowser() {
    clusterBrowserModule ||= import('./ClusterBrowser.svelte');
    showClusters = true;
    window.scrollTo(0, 0);
  }

  function closeClusterBrowser() {
    showClusters = false;
    window.scrollTo(0, 0);
  }

  function bucket(pos) {
    if (pos.startsWith('verb')) return 'verb';
    if (pos.startsWith('noun')) return 'noun';
    if (pos.startsWith('adj')) return 'adj';
    return 'other';
  }

  function rowKey(w) {
    return w.ko;
  }

  function toggle(w) {
    const key = rowKey(w);
    detailRequest += 1;
    loadingKey = null;
    detailError = '';
    openKey = openKey === key ? null : key;
  }

  $: learnedSet = new Set($progress.learned.map((c) => c.word.ko));
  $: starredSet = new Set($progress.starred || []);
  $: learnedCount = words.filter((w) => learnedSet.has(w.ko)).length;
  $: clusterCount = words.filter((word) => word.hasCluster).length;
  $: if (!targetWord) handledTarget = '';
  $: if (targetWord && targetWord !== handledTarget) openTarget(targetWord);

  $: q = query.trim().toLowerCase();
  $: visible = words.filter((w) => {
    if (levelFilter !== 'all' && !w.chapters.some((chapter) => chapterLevel(chapter) === levelFilter)) return false;
    if (filter === 'learned' && !learnedSet.has(w.ko)) return false;
    if (filter === 'starred' && !starredSet.has(w.ko)) return false;
    if (filter === 'nuance' && !w.hasCluster) return false;
    if (!['all', 'learned', 'starred', 'nuance'].includes(filter) && bucket(w.pos) !== filter) return false;
    if (!q) return true;
    return (
      w.ko.toLowerCase().includes(q) ||
      w.romanization.toLowerCase().includes(q) ||
      w.en.toLowerCase().includes(q)
    );
  });

  $: groups = (() => {
    const map = new Map();
    for (const w of visible) {
      const primaryChapter = w.chapters[0];
      if (!map.has(primaryChapter)) map.set(primaryChapter, []);
      map.get(primaryChapter).push(w);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([chapter, items]) => ({ chapter, items }));
  })();
</script>

{#if showClusters}
  {#await clusterBrowserModule}
    <p class="cluster-loading" role="status">Loading all sets…</p>
  {:then mod}
    <svelte:component this={mod.default} onBack={closeClusterBrowser} />
  {/await}
{:else if selected}
  <WordDetail word={selected} onBack={closeDetail} />
{:else}
<section class="wordbook">
  <div class="mark">Wordbook</div>
  <p class="sub">{words.length} words · {learnedCount} learned · {starredSet.size} saved</p>

  <input
    class="search"
    type="search"
    bind:value={query}
    placeholder="Search Korean, romanization, or English"
    aria-label="Search words"
  />

  <!-- underline tabs, not pastel pills: the filter row spends no colour -->
  <div class="tabs" role="group" aria-label="Level filter">
    <button class="tab" class:on={levelFilter === 'all'} aria-pressed={levelFilter === 'all'}
      on:click={() => { levelFilter = 'all'; }}>All levels</button>
    {#each levels as level}
      <button class="tab" class:on={levelFilter === level} aria-pressed={levelFilter === level}
        on:click={() => { levelFilter = level; }}>{level}</button>
    {/each}
  </div>

  <div class="tabs" role="group" aria-label="Word filter">
    {#each FILTERS as f}
      <button class="tab" class:on={filter === f.id} aria-pressed={filter === f.id}
        on:click={() => { filter = f.id; }}>{f.label}</button>
    {/each}
  </div>

  <button class="entry" on:click={openClusterBrowser}>
    <b>All confusable sets</b>
    <span class="entry-sub">헷갈리는 짝 전집</span>
    <span class="entry-num">{clusterCount}</span>
  </button>

  {#if visible.length === 0}
    <div class="empty">
      {#if filter === 'learned' && !q}
        <b>Nothing learned yet</b>
        <span>Finish a bite and the words land here</span>
      {:else if filter === 'starred' && !q}
        <b>Nothing saved yet</b>
        <span>Star a word after a guess to keep it here</span>
      {:else}
        <b>No matches</b>
        <span>Try the Korean or the English</span>
      {/if}
    </div>
  {:else}
    {#each groups as group (group.chapter)}
      <div class="group">
        <div class="ch-head">Chapter {group.chapter}</div>
        <div class="list">
          {#each group.items as w (rowKey(w))}
            <WordbookRow
              word={w}
              learned={learnedSet.has(w.ko)}
              starred={starredSet.has(w.ko)}
              open={openKey === rowKey(w)}
              loading={loadingKey === rowKey(w)}
              error={openKey === rowKey(w) ? detailError : ''}
              onToggle={() => toggle(w)}
              onOpen={() => openDetail(w)}
            />
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</section>
{/if}

<style>
  .wordbook { max-width: 480px; margin: 0 auto; padding: 26px 22px 40px; }
  .mark { font-size: 16px; font-weight: 900; letter-spacing: -.03em; }
  .sub { margin: 5px 0 14px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }

  .search {
    width: 100%; min-height: 44px; padding: 11px 15px; font: inherit; font-size: 13.5px; font-weight: 600;
    color: var(--ink); background: var(--wash); border: 1px solid var(--line); border-radius: 14px;
    transition: border-color .15s var(--ease), background-color .15s var(--ease);
  }
  .search::placeholder { color: var(--ink-3); }
  .search:focus { border-color: var(--line-2); background: var(--card); }

  .tabs { margin-top: 16px; display: flex; gap: 18px; border-bottom: 1px solid var(--line);
    overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { flex: none; min-height: 40px; padding-bottom: 9px; font-size: 13.5px; font-weight: 700;
    color: var(--ink-3); white-space: nowrap; border-bottom: 2px solid transparent;
    transition: color .12s var(--ease), border-color .12s var(--ease); }
  .tab:hover { color: var(--ink-2); }
  .tab.on { color: var(--ink); font-weight: 850; border-bottom-color: var(--ink); }

  .entry { width: 100%; min-height: 44px; margin-top: 18px; display: grid; grid-template-columns: 1fr auto;
    align-items: center; padding: 13px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    text-align: left; transition: background-color .12s var(--ease); }
  .entry:hover { background: var(--wash); }
  .entry b { font-size: 14.5px; font-weight: 750; letter-spacing: -.01em; }
  .entry-sub { grid-column: 1; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .entry-num { grid-row: 1 / -1; grid-column: 2; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    font-variant-numeric: tabular-nums; }

  .group { margin-top: 20px; }
  .ch-head { position: sticky; top: 0; z-index: 1; padding: 6px 0; background: var(--bg);
    font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .list { margin-top: 2px; }

  .empty { margin-top: 34px; display: grid; gap: 4px; text-align: center; word-break: keep-all; }
  .empty b { font-size: 15px; font-weight: 800; }
  .empty span { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .cluster-loading { max-width: 480px; margin: 0 auto; padding: 40px 20px; text-align: center;
    font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
</style>
