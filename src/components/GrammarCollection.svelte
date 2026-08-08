<script>
  export let chapters = [];
  export let collected = [];
  export let onBack = () => {};
  export let onOpen = () => {};   // (chapter, bite, isCollected) → open the reference sheet

  $: collectedSet = new Set(collected);
  $: cards = chapters.flatMap((chapter) => (chapter.bites || [])
    .filter((bite) => bite.kind === 'pattern')
    .map((bite) => ({ chapter, bite })));
  $: collectedCount = cards.filter((item) => collectedSet.has(item.bite.id)).length;
</script>

<section class="collection">
  <button class="back" on:click={onBack}>← Shelf</button>

  <div class="score"><span class="num">{collectedCount}</span><span class="total">/{cards.length}</span></div>
  <p class="sub">Tap a card to open its rule sheet</p>
  <p class="sub-ko">완료한 문법 카드에는 도장이 찍혀요</p>

  <div class="grid">
    {#each cards as item (item.bite.id)}
      {@const isCollected = collectedSet.has(item.bite.id)}
      <button
        class="card"
        class:collected={isCollected}
        on:click={() => onOpen(item.chapter, item.bite, isCollected)}
      >
        <span class="meta">{item.chapter.level} · Chapter {item.chapter.number}</span>
        <b>{item.bite.firstWord || item.bite.title}</b>
        {#if isCollected}<span class="seal" aria-label="Collected">한입</span>{/if}
      </button>
    {/each}
  </div>
</section>

<style>
  .collection { max-width: 480px; margin: 0 auto; padding: 18px 22px 44px; }
  .back { min-height: 44px; font-size: 12.5px; font-weight: 700; color: var(--ink-3); text-align: left;
    transition: color .12s var(--ease); }
  .back:hover { color: var(--ink); }

  .score { margin-top: 12px; font-variant-numeric: tabular-nums; line-height: 1; }
  .num { font-size: 44px; font-weight: 900; letter-spacing: -.04em; }
  .total { font-size: 24px; font-weight: 800; color: var(--ink-3); }
  .sub { margin: 8px 0 0; font-size: 12.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .sub-ko { margin: 3px 0 18px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }

  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  /* one 1px outline plus the seal — no dashed borders, no shadows */
  .card { position: relative; min-height: 92px; padding: 12px; display: grid; align-content: start; gap: 5px;
    overflow: hidden; text-align: left; border: 1px solid var(--line); border-radius: 14px;
    background: transparent; color: var(--ink-3); opacity: .5;
    transition: opacity .12s var(--ease), border-color .12s var(--ease); }
  /* order 31: the grid sits on the index surface, which has no ruling — but a
     collected card is a sheet, and a sheet has tooth wherever it lands */
  .card.collected { background-color: var(--card); color: var(--ink); opacity: 1;
    background-image: radial-gradient(var(--study-grid) 0.6px, transparent 0.7px);
    background-size: 3px 3px; }
  .card:hover { border-color: var(--line-2); opacity: 1; }
  .meta { font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .card b { padding-right: 30px; font-size: 15px; font-weight: 750; line-height: 1.35; word-break: keep-all; }
  .card.collected b { font-weight: 820; }
  .seal { position: absolute; right: 9px; bottom: 9px; width: 32px; height: 32px; display: grid;
    place-items: center; border: 1.5px solid var(--gold); border-radius: 7px; color: var(--gold);
    font-size: 9px; font-weight: 900; transform: rotate(-8deg); }
</style>
