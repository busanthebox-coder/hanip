<script>
  import readersData from '../../data/readers.json';
  import ReaderView from './ReaderView.svelte';

  let selected = null;
</script>

{#if selected}
  <ReaderView reader={selected} onBack={() => { selected = null; window.scrollTo(0, 0); }} />
{:else}
  <section class="readers">
    <div class="cap">읽을거리 · Readers</div>
    <p class="sub">20편의 짧은 글을 레벨별로 읽어 보세요. · Read 20 short texts by level.</p>
    <div class="list">
      {#each readersData.readers as reader (reader.id)}
        <button class="reader" data-reader-id={reader.id} on:click={() => { selected = reader; window.scrollTo(0, 0); }}>
          <span class="level">{reader.level}</span>
          <span class="main">
            <strong>{reader.title} · {reader.titleEn}</strong>
            <span>{reader.genre} · {reader.body.length} paragraphs</span>
          </span>
          <span class="chevron">▸</span>
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .readers { display: grid; gap: 10px; }
  .cap { color: var(--accent); font-size: 11.5px; font-weight: 850; letter-spacing: .2em; text-transform: uppercase; }
  .sub { margin: -4px 0 2px; color: var(--ink-3); font-size: 13px; word-break: keep-all; }
  .list { display: grid; gap: 8px; }
  .reader { width: 100%; min-height: 62px; display: flex; align-items: center; gap: 11px; padding: 11px 13px;
    border: 1px solid var(--line); border-radius: var(--r-chip); background: var(--card); box-shadow: var(--shadow-1); text-align: left; }
  .reader:hover { border-color: var(--ink-3); }
  .level { flex: none; padding: 3px 7px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-deep);
    font-size: 10.5px; font-weight: 850; }
  .main { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .main strong { font-size: 13.5px; font-weight: 800; word-break: keep-all; }
  .main span { color: var(--ink-3); font-size: 11.5px; }
  .chevron { color: var(--ink-3); }
</style>
