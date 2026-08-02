<script>
  import AudioDot from './cards/AudioDot.svelte';

  export let word;
  export let learned = false;
  export let open = false;
  export let loading = false;
  export let error = '';
  export let onToggle = () => {};
  export let onOpen = () => {};

  $: detailId = `word-detail-${encodeURIComponent(word.ko).replaceAll('%', '')}`;
</script>

<div class="entry" class:open>
  <div class="row">
    <button
      class="row-main"
      aria-expanded={open}
      aria-controls={detailId}
      on:click={onToggle}
    >
      <span class="ko">{word.ko}</span>
      {#if learned}
        <span class="learned-dot" title="배운 단어 · Learned">✓</span>
      {/if}
      {#if word.hasCluster}
        <span class="depth-dot" title="헷갈리는 짝이 있어요 · Has a confusable twin" aria-label="헷갈리는 짝 있음">💡</span>
      {/if}
      <span class="chapter">{word.chapter}과</span>
      <span class="en">{word.en}</span>
    </button>
    <AudioDot text={word.ko} size={44} />
  </div>
  {#if open}
    <div class="detail" id={detailId}>
      <div class="rom">{word.romanization}</div>
      <button class="full-link" disabled={loading} on:click={onOpen}>
        {loading
          ? '불러오는 중 · Loading…'
          : error ? '다시 시도 · Retry'
          : word.hasDepth ? '뉘앙스 · 자세히 보기 →' : '자세히 보기 · Full entry →'}
      </button>
      {#if error}
        <p class="detail-error" role="alert">{error}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
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
  .row-main:focus-visible, .full-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .ko { flex: none; font-size: 17px; font-weight: 800; word-break: keep-all; }
  .learned-dot {
    flex: none; width: 16px; height: 16px; display: grid; place-items: center;
    border-radius: 999px; background: var(--good-soft); color: var(--good-deep);
    font-size: 10px; font-weight: 850; line-height: 1;
  }
  .depth-dot { flex: none; font-size: 13px; line-height: 1; }
  .chapter { flex: none; font-size: 10.5px; font-weight: 800; color: var(--ink-3); white-space: nowrap; }
  .en {
    flex: 1; min-width: 0; margin-left: auto; text-align: right;
    font-size: 12.5px; color: var(--ink-2);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .detail { padding: 0 15px 13px; }
  .rom { font-size: 12.5px; font-style: italic; color: var(--ink-3); letter-spacing: .02em; }
  .full-link {
    margin-top: 10px; min-height: 44px; justify-self: start; padding: 8px 14px; border-radius: 999px;
    background: var(--wash); color: var(--accent-deep); font-size: 12.5px; font-weight: 850;
    transition: background .12s var(--ease);
  }
  .full-link:hover { background: var(--accent-soft); }
  .detail-error { margin: 8px 0 0; font-size: 12px; line-height: 1.45; color: var(--bad); }
</style>
