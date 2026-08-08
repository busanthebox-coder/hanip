<script>
  import readersData from '../../data/readers.json';
  import ReaderView from './ReaderView.svelte';

  let selected = null;
</script>

{#if selected}
  <ReaderView reader={selected} onBack={() => { selected = null; window.scrollTo(0, 0); }} />
{:else}
  <section class="readers">
    <b class="cap">Readers</b>
    <p class="sub">20 short texts, sorted by level</p>
    <div class="list">
      {#each readersData.readers as reader (reader.id)}
        <button class="reader" data-reader-id={reader.id} on:click={() => { selected = reader; window.scrollTo(0, 0); }}>
          <span class="level">{reader.level}</span>
          <span class="main">
            <strong>{reader.title}</strong>
            <span class="title-en">{reader.titleEn}</span>
            <span>{reader.genre} · {reader.body.length} paragraphs</span>
          </span>
          <span class="chevron">▸</span>
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .readers { display: block; }
  .cap { display: block; font-size: 15.5px; font-weight: 850; letter-spacing: -.01em; color: var(--ink); }
  .sub { margin: 4px 0 10px; color: var(--ink-3); font-size: 12.5px; font-weight: 650; word-break: keep-all; }
  .list { display: block; }
  .reader { width: 100%; min-height: 56px; display: flex; align-items: center; gap: 12px; padding: 12px 0;
    border-top: 1px solid var(--line); text-align: left; transition: background-color .12s var(--ease); }
  .reader:last-child { border-bottom: 1px solid var(--line); }
  .reader:hover { background: var(--wash); }
  .level { flex: none; width: 24px; font-size: 11.5px; font-weight: 750; color: var(--ink-3); }
  .title-en { font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .main { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .main strong { font-size: 13.5px; font-weight: 800; word-break: keep-all; }
  .main span { color: var(--ink-3); font-size: 11.5px; }
  .chevron { color: var(--ink-3); }
</style>
