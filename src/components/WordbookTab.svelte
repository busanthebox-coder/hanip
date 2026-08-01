<script>
  import wordbookData from '../lib/wordbook.json';
  import AudioDot from './cards/AudioDot.svelte';
  import { progress } from '../lib/store.js';

  const words = wordbookData.words;

  let query = '';
  let filter = 'all'; // 'all' | 'learned' | 'verb' | 'noun' | 'adj' | 'other'
  let openKey = null;

  const FILTERS = [
    { id: 'all', label: '전체 All' },
    { id: 'learned', label: '배운 것 Learned' },
    { id: 'verb', label: '동사 Verb' },
    { id: 'noun', label: '명사 Noun' },
    { id: 'adj', label: '형용사 Adj' },
    { id: 'other', label: '기타 Other' }
  ];

  function bucket(pos) {
    if (pos.startsWith('verb')) return 'verb';
    if (pos.startsWith('noun')) return 'noun';
    if (pos.startsWith('adj')) return 'adj';
    return 'other';
  }

  function rowKey(w) {
    return `${w.chapter}:${w.ko}`;
  }

  function toggle(w) {
    const key = rowKey(w);
    openKey = openKey === key ? null : key;
  }

  $: learnedSet = new Set($progress.learned.map((c) => c.word.ko));
  $: learnedCount = words.filter((w) => learnedSet.has(w.ko)).length;

  $: q = query.trim().toLowerCase();
  $: visible = words.filter((w) => {
    if (filter === 'learned' && !learnedSet.has(w.ko)) return false;
    if (filter !== 'all' && filter !== 'learned' && bucket(w.pos) !== filter) return false;
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
      if (!map.has(w.chapter)) map.set(w.chapter, []);
      map.get(w.chapter).push(w);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([chapter, items]) => ({ chapter, items }));
  })();
</script>

<section class="wordbook">
  <div class="cap">단어장 · Wordbook</div>
  <p class="sub">{words.length} words · 배운 단어 {learnedCount}개</p>

  <input
    class="search"
    type="search"
    bind:value={query}
    placeholder="검색 · Search Korean, romanization, or English"
    aria-label="단어 검색 · Search words"
  />

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
            {@const learned = learnedSet.has(w.ko)}
            {@const open = openKey === rowKey(w)}
            <div class="entry" class:open>
              <div class="row">
                <button
                  class="row-main"
                  aria-expanded={open}
                  on:click={() => toggle(w)}
                >
                  <span class="ko">{w.ko}</span>
                  {#if learned}
                    <span class="learned-dot" title="배운 단어 · Learned">✓</span>
                  {/if}
                  <span class="en">{w.en}</span>
                </button>
                <AudioDot text={w.ko} size={26} />
              </div>
              {#if open}
                <div class="detail">
                  <div class="rom">{w.romanization}</div>
                  {#if w.ex}
                    <div class="ex">
                      <div class="ex-ko">{w.ex.ko}</div>
                      <div class="ex-en">{w.ex.en}</div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</section>

<style>
  .wordbook { max-width: 480px; margin: 0 auto; padding: 30px 20px 40px; }
  .cap { font-size: 11.5px; font-weight: 850; letter-spacing: .2em; color: var(--accent); text-transform: uppercase; }
  .sub { margin: 6px 0 16px; font-size: 13.5px; color: var(--ink-3); word-break: keep-all; }

  .search {
    width: 100%; padding: 11px 15px; font: inherit; font-size: 14px; color: var(--ink);
    background: var(--wash); border: 1px solid var(--line); border-radius: var(--r-chip);
    transition: border-color .15s var(--ease), background-color .15s var(--ease);
  }
  .search::placeholder { color: var(--ink-3); }
  .search:focus { border-color: var(--line-2); background: var(--card); }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 20px; }
  .chip {
    padding: 6px 12px; min-height: 32px; font-size: 12.5px; font-weight: 700; color: var(--ink-2);
    background: var(--card); border: 1px solid var(--line); border-radius: 999px; word-break: keep-all;
    transition: background-color .15s var(--ease), color .15s var(--ease), border-color .15s var(--ease);
  }
  .chip:hover { background: var(--wash); }
  .chip.on { background: var(--accent-soft); border-color: var(--accent-soft); color: var(--accent-deep); }

  .group { margin-bottom: 18px; }
  .ch-head {
    position: sticky; top: 0; z-index: 1;
    padding: 6px 2px; margin-bottom: 8px; background: var(--bg);
    font-size: 11px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3);
  }

  .card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); overflow: hidden; }
  .entry { border-top: 1px solid var(--line); }
  .entry:first-child { border-top: 0; }
  .entry.open { background: var(--bg); }

  .row { display: flex; align-items: center; gap: 10px; padding-right: 14px; }
  .row-main {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px;
    min-height: 48px; padding: 10px 0 10px 15px; text-align: left;
    transition: background-color .15s var(--ease);
  }
  .row-main:hover { background: var(--bg); }
  .entry.open .row-main:hover { background: var(--wash); }

  .ko { flex: none; font-size: 17px; font-weight: 800; word-break: keep-all; }
  .learned-dot {
    flex: none; width: 16px; height: 16px; display: grid; place-items: center;
    border-radius: 999px; background: var(--good-soft); color: var(--good-deep);
    font-size: 10px; font-weight: 850; line-height: 1;
  }
  .en {
    flex: 1; min-width: 0; margin-left: auto; text-align: right;
    font-size: 12.5px; color: var(--ink-2);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .detail { padding: 0 15px 13px; }
  .rom { font-size: 12.5px; font-style: italic; color: var(--ink-3); letter-spacing: .02em; }
  .ex { margin-top: 8px; padding: 10px 12px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
  .ex-ko { font-size: 14px; font-weight: 700; word-break: keep-all; }
  .ex-en { margin-top: 2px; font-size: 12.5px; color: var(--ink-2); }

  .empty { padding: 34px 16px; text-align: center; background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); }
  .e-main { margin: 0; font-size: 15px; font-weight: 800; word-break: keep-all; }
  .e-sub { margin: 4px 0 0; font-size: 13px; color: var(--ink-3); }
</style>
