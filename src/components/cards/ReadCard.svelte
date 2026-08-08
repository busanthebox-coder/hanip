<script>
  export let card;
  export let onResolve = () => {};

  let chunkShown = 1;
  let translationOpen = false;
  let flipped = {};

  $: allRead = chunkShown >= card.chunks.length;
  $: if (allRead) onResolve(true);
</script>

<div class="label">Reading</div>
<h1>{card.title}</h1>

<!-- already inside the player's card — the passage needs no frame of its own -->
<div class="passage">
  {#each card.chunks.slice(0, chunkShown) as chunk}
    <p class="chunk">{chunk}</p>
  {/each}
</div>

{#if chunkShown < card.chunks.length}
  <button class="line-btn" on:click={() => { chunkShown += 1; }}>Keep reading</button>
{:else if card.translation}
  <button class="line-btn" on:click={() => { translationOpen = !translationOpen; }}>
    {translationOpen ? 'Hide translation' : 'Show translation'}
  </button>
  {#if translationOpen}<p class="trans">{card.translation}</p>{/if}
{/if}

{#if allRead && card.qas.length}
  <div class="qa-cap">Check yourself — tap a question to flip the answer</div>
  <div class="qas">
    {#each card.qas as qa, i}
      <button class="qa" class:open={flipped[i]} on:click={() => { flipped = { ...flipped, [i]: !flipped[i] }; }}>
        <span class="qa-q">{qa.q}</span>
        {#if flipped[i]}<span class="qa-a">{qa.a}</span>{/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .label { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  h1 { margin: 8px 0 0; font-size: 26px; font-weight: 900; letter-spacing: -.03em; line-height: 1.25;
    word-break: keep-all; }
  .passage { margin-top: 20px; }
  .chunk { margin: 0 0 14px; font-size: 17.5px; font-weight: 650; line-height: 1.8; word-break: keep-all; }
  .line-btn { width: 100%; min-height: 44px; padding: 13px 0;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    font-size: 14px; font-weight: 750; color: var(--ink); text-align: center;
    transition: background-color .12s var(--ease); }
  .line-btn:hover { background: var(--wash); }
  .trans { margin: 14px 0 0; font-size: 13.5px; font-weight: 600; line-height: 1.75; color: var(--ink-3);
    word-break: keep-all; }

  .qa-cap { margin-top: 24px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .qas { margin-top: 8px; }
  .qa { width: 100%; min-height: 44px; display: grid; gap: 5px; padding: 13px 0; text-align: left;
    border-top: 1px solid var(--line); transition: background-color .12s var(--ease); }
  .qa:last-child { border-bottom: 1px solid var(--line); }
  .qa:hover { background: var(--wash); }
  .qa-q { font-size: 15px; font-weight: 750; word-break: keep-all; }
  .qa-a { font-size: 13.5px; font-weight: 700; color: var(--good-deep); word-break: keep-all; }
</style>
