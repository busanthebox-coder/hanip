<script>
  import AudioDot from './cards/AudioDot.svelte';

  export let word;
  export let learned = false;
  export let starred = false;
  export let open = false;
  export let loading = false;
  export let error = '';
  export let onToggle = () => {};
  export let onOpen = () => {};

  $: detailId = `word-detail-${encodeURIComponent(word.ko).replaceAll('%', '')}`;
  /* order 31: the same left 22px cell the shelf uses, with the vocabulary this
     surface needs. A word's state is a yes/no, not an amount, so the ring gives
     way to the single glyph STYLE §4 allows. Starred wins over learned — 12
     saved against 214 learned, so the deliberate mark is the rarer signal. */
  $: mark = starred ? { glyph: '★', tone: 'star', label: 'Saved' }
    : learned ? { glyph: '✓', tone: 'ok', label: 'Learned' }
    : { glyph: '☆', tone: 'off', label: 'Not learned yet' };
</script>

<div class="entry" class:open>
  <div class="row">
    <button
      class="row-main"
      aria-expanded={open}
      aria-controls={detailId}
      on:click={onToggle}
    >
      <span class="st glyph {mark.tone}" role="img" aria-label={mark.label}>{mark.glyph}</span>
      <span class="ko">{word.ko}</span>
      <span class="en ell">{word.en}</span>
    </button>
    <AudioDot text={word.ko} size={44} />
  </div>
  {#if open}
    <div class="detail" id={detailId}>
      <div class="rom">{word.romanization}</div>
      {#if word.hasCluster}<div class="twin">Has a confusable twin</div>{/if}
      <button class="full-link" disabled={loading} on:click={onOpen}>
        {loading ? 'Loading…' : error ? 'Retry' : 'Open the full entry →'}
      </button>
      {#if error}
        <p class="detail-error" role="alert">{error}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .entry { border-top: 1px solid var(--line); }
  .entry:last-child { border-bottom: 1px solid var(--line); }
  .row { display: flex; align-items: center; gap: 8px; }
  .row-main {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px;
    min-height: 44px; padding: 11px 0; text-align: left;
    transition: background-color .12s var(--ease);
  }
  .row-main:hover { background: var(--wash); }
  .row-main:focus-visible, .full-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  /* the shelf's gutter geometry, this surface's vocabulary */
  .st { flex: none; width: 22px; height: 20px; display: grid; place-items: center; }
  .glyph { font-size: 13px; font-weight: 800; line-height: 1; }
  .glyph.ok { color: var(--good); }
  .glyph.star { color: var(--gold); }
  .glyph.off { color: var(--line-2); }
  .ko { flex: none; font-size: 17px; font-weight: 800; word-break: keep-all; }
  .en {
    flex: 1; min-width: 0; margin-left: auto; text-align: right;
    font-size: 12.5px; font-weight: 650; color: var(--ink-3);
  }
  .ell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .detail { padding: 0 0 13px; }
  .rom { font-size: 12px; font-weight: 650; letter-spacing: .02em; color: var(--ink-3); }
  .twin { margin-top: 3px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .full-link {
    min-height: 44px; margin-top: 4px; display: block;
    font-size: 12.5px; font-weight: 700; color: var(--ink-3); text-align: left;
    transition: color .12s var(--ease);
  }
  .full-link:hover { color: var(--ink); }
  .detail-error { margin: 4px 0 0; font-size: 12px; line-height: 1.45; color: var(--bad); }
</style>
