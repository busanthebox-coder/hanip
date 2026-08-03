<script>
  export let chapters = [];
  export let collected = [];
  export let onBack = () => {};
  export let onPlay = () => {};

  $: collectedSet = new Set(collected);
  $: cards = chapters.flatMap((chapter) => (chapter.bites || [])
    .filter((bite) => bite.kind === 'pattern')
    .map((bite) => ({ chapter, bite })));
  $: collectedCount = cards.filter((item) => collectedSet.has(item.bite.id)).length;
</script>

<section class="collection">
  <button class="back" on:click={onBack}>← 책장 · Back to shelf</button>
  <div class="cap">모은 문법 · Grammar collection</div>
  <h1>📜 {collectedCount}/{cards.length}</h1>
  <p class="sub">완료한 문법 카드는 도장이 찍혀요. 카드를 누르면 다시 학습할 수 있어요. · Completed grammar cards receive a seal. Tap one to review.</p>

  <div class="grid">
    {#each cards as item (item.bite.id)}
      <button
        class="grammar-card"
        class:collected={collectedSet.has(item.bite.id)}
        disabled={!collectedSet.has(item.bite.id)}
        on:click={() => onPlay(item.chapter, item.bite)}
      >
        <span class="meta">{item.chapter.level} · {item.chapter.number}과</span>
        <strong>{item.bite.firstWord || item.bite.title}</strong>
        {#if collectedSet.has(item.bite.id)}<span class="seal" aria-label="수집 완료 · Collected">한입</span>{/if}
      </button>
    {/each}
  </div>
</section>

<style>
  .collection { max-width: 480px; margin: 0 auto; padding: 20px 20px 44px; }
  .back { min-height: 44px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--card);
    color: var(--ink-2); font-size: 13px; font-weight: 800; }
  .cap { margin-top: 24px; color: var(--accent); font-size: 11px; font-weight: 850; letter-spacing: .18em; text-transform: uppercase; }
  h1 { margin: 5px 0 0; font-size: 30px; line-height: 1.2; }
  .sub { margin: 8px 0 20px; color: var(--ink-3); font-size: 13px; line-height: 1.55; word-break: keep-all; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .grammar-card { position: relative; min-height: 126px; padding: 14px; display: grid; align-content: start; gap: 8px;
    overflow: hidden; text-align: left; border: 1px dashed var(--line-2); border-radius: 16px; background: var(--wash);
    color: var(--ink-3); opacity: .48; }
  .grammar-card.collected { border-style: solid; background: var(--card); color: var(--ink); opacity: 1; box-shadow: var(--shadow-1); }
  .meta { font-size: 10.5px; font-weight: 800; color: var(--ink-3); }
  strong { padding-right: 28px; font-size: 15px; line-height: 1.4; word-break: keep-all; }
  .seal { position: absolute; right: 10px; bottom: 10px; width: 38px; height: 38px; display: grid; place-items: center;
    border: 2px solid var(--bad); border-radius: 8px; color: var(--bad); font-size: 10px; font-weight: 900; transform: rotate(-8deg); }
</style>
