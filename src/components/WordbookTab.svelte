<script>
  import wordbookData from '../lib/wordbook.json';
  import WordDetail from './WordDetail.svelte';
  import WordbookRow from './WordbookRow.svelte';
  import { progress } from '../lib/store.js';
  import { chapterLevel } from '../lib/levels.js';
  import { createDepthLoader } from '../lib/wordbookData.js';

  const words = wordbookData.words;
  const depthModules = import.meta.glob('../lib/wordbook-depth/*.json', { import: 'default' });
  const depthRetryUrls = import.meta.glob('../lib/wordbook-depth/*.json', {
    eager: true,
    query: '?url',
    import: 'default',
  });
  const loadDepth = createDepthLoader(depthModules, depthRetryUrls);
  const levels = [...new Set(words.flatMap((word) => word.chapters.map(chapterLevel)))];

  let query = '';
  let filter = 'all'; // 'all' | 'learned' | 'nuance' | 'verb' | 'noun' | 'adj' | 'other'
  let levelFilter = 'all';
  let openKey = null;
  let loadingKey = null;
  let detailError = '';
  let detailRequest = 0;
  let selected = null;

  const FILTERS = [
    { id: 'all', label: '전체 All' },
    { id: 'learned', label: '배운 것 Learned' },
    { id: 'nuance', label: '💡 헷갈리는 짝 Confusable' },
    { id: 'verb', label: '동사 Verb' },
    { id: 'noun', label: '명사 Noun' },
    { id: 'adj', label: '형용사 Adj' },
    { id: 'other', label: '기타 Other' }
  ];

  // Nuance notes sit on 174 of 191 words, so badging those would mark almost
  // every row — background, not signal. The rare, worth-hunting thing is a
  // confusable twin (말하다 vs 이야기하다), so that gets the 💡.
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
        detailError = '상세 정보를 불러오지 못했어요. 다시 시도해 주세요. · Could not load details. Please retry.';
      }
    } finally {
      if (request === detailRequest) loadingKey = null;
    }
  }
  function closeDetail() {
    detailRequest += 1;
    loadingKey = null;
    detailError = '';
    selected = null;
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
  $: learnedCount = words.filter((w) => learnedSet.has(w.ko)).length;

  $: q = query.trim().toLowerCase();
  $: visible = words.filter((w) => {
    if (levelFilter !== 'all' && !w.chapters.some((chapter) => chapterLevel(chapter) === levelFilter)) return false;
    if (filter === 'learned' && !learnedSet.has(w.ko)) return false;
    if (filter === 'nuance' && !w.hasCluster) return false;
    if (!['all', 'learned', 'nuance'].includes(filter) && bucket(w.pos) !== filter) return false;
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

{#if selected}
  <WordDetail word={selected} onBack={closeDetail} />
{:else}
<section class="wordbook">
  <div class="cap">단어장 · Wordbook</div>
  <p class="sub">
    {words.length} words · 배운 단어 {learnedCount}개 · 💡 헷갈리는 짝 {words.filter((word) => word.hasCluster).length}개
  </p>
  <p class="sub note">Tap any word for its nuance note, mistakes, and forms · 아무 단어나 누르면 뉘앙스·실수·활용형이 나와요</p>

  <input
    class="search"
    type="search"
    bind:value={query}
    placeholder="검색 · Search Korean, romanization, or English"
    aria-label="단어 검색 · Search words"
  />

  <div class="chips level-chips" role="group" aria-label="레벨 필터 · Level filters">
    <button
      class="chip"
      class:on={levelFilter === 'all'}
      aria-pressed={levelFilter === 'all'}
      on:click={() => { levelFilter = 'all'; }}
    >모든 레벨 · All levels</button>
    {#each levels as level}
      <button
        class="chip"
        class:on={levelFilter === level}
        aria-pressed={levelFilter === level}
        on:click={() => { levelFilter = level; }}
      >{level}</button>
    {/each}
  </div>

  <div class="chips" role="group" aria-label="필터 · Filters">
    {#each FILTERS as f}
      <button
        class="chip"
        class:on={filter === f.id}
        aria-pressed={filter === f.id}
        on:click={() => { filter = f.id; }}
      >{f.label}</button>
    {/each}
  </div>

  {#if visible.length === 0}
    <div class="empty">
      {#if filter === 'learned' && !q}
        <p class="e-main">아직 배운 단어가 없어요</p>
        <p class="e-sub">Nothing learned yet — finish a bite and it lands here.</p>
      {:else}
        <p class="e-main">검색 결과가 없어요</p>
        <p class="e-sub">No matches — try the Korean or the English.</p>
      {/if}
    </div>
  {:else}
    {#each groups as group (group.chapter)}
      <div class="group">
        <div class="ch-head">{group.chapter}과 · Chapter {group.chapter}</div>
        <div class="card">
          {#each group.items as w (rowKey(w))}
            <WordbookRow
              word={w}
              learned={learnedSet.has(w.ko)}
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
  .wordbook { max-width: 480px; margin: 0 auto; padding: 30px 20px 40px; }
  .cap { font-size: 11.5px; font-weight: 850; letter-spacing: .2em; color: var(--accent); text-transform: uppercase; }
  .sub { margin: 6px 0 4px; font-size: 13.5px; color: var(--ink-3); word-break: keep-all; }
  .sub.note { margin-bottom: 16px; font-size: 12px; line-height: 1.5; }

  .search {
    width: 100%; padding: 11px 15px; font: inherit; font-size: 14px; color: var(--ink);
    background: var(--wash); border: 1px solid var(--line); border-radius: var(--r-chip);
    transition: border-color .15s var(--ease), background-color .15s var(--ease);
  }
  .search::placeholder { color: var(--ink-3); }
  .search:focus { border-color: var(--line-2); background: var(--card); }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 20px; }
  .level-chips { margin-bottom: 0; }
  .chip {
    padding: 6px 12px; min-height: 44px; font-size: 12.5px; font-weight: 700; color: var(--ink-2);
    background: var(--card); border: 1px solid var(--line); border-radius: 999px; word-break: keep-all;
    transition: background-color .15s var(--ease), color .15s var(--ease), border-color .15s var(--ease);
  }
  .chip:hover { background: var(--wash); }
  .chip.on { background: var(--accent-soft); border-color: var(--accent-soft); color: var(--accent-deep); }
  .chip:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }

  .group { margin-bottom: 18px; }
  .ch-head {
    position: sticky; top: 0; z-index: 1;
    padding: 6px 2px; margin-bottom: 8px; background: var(--bg);
    font-size: 11px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3);
  }

  .card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); overflow: hidden; }
  .empty { padding: 34px 16px; text-align: center; background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); }
  .e-main { margin: 0; font-size: 15px; font-weight: 800; word-break: keep-all; }
  .e-sub { margin: 4px 0 0; font-size: 13px; color: var(--ink-3); }
</style>
