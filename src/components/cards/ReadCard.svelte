<script>
  import AudioDot from './AudioDot.svelte';

  export let card;
  export let onResolve = () => {};

  let chunkShown = 1;
  let translationOpen = false;
  let flipped = {};

  $: allRead = chunkShown >= card.chunks.length;
  $: if (allRead) onResolve(true);
</script>

<div class="step-label">읽기 · {card.title}</div>

<div class="paper">
  {#each card.chunks.slice(0, chunkShown) as chunk}
    <p class="chunk">{chunk}</p>
  {/each}
  {#if chunkShown < card.chunks.length}
    <button class="more" on:click={() => { chunkShown += 1; }}>계속 읽기 ⌄</button>
  {:else if card.translation}
    <button class="more ghost" on:click={() => { translationOpen = !translationOpen; }}>
      {translationOpen ? '번역 접기 ⌃' : '번역 보기 ⌄'}
    </button>
    {#if translationOpen}<p class="trans">{card.translation}</p>{/if}
  {/if}
</div>

{#if allRead && card.qas.length}
  <div class="qa-cap">스스로 확인 — 탭해서 답 맞춰보기</div>
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
  .step-label { font-size: 11px; font-weight: 850; letter-spacing: .16em; color: var(--accent); text-transform: uppercase; }
  .paper { margin-top: 12px; padding: 18px; border-radius: 18px; background: var(--card); border: 1px solid var(--line); box-shadow: var(--shadow-1); }
  .chunk { margin: 0 0 12px; font-size: 17.5px; font-weight: 650; line-height: 1.8; word-break: keep-all; }
  .more { padding: 8px 16px; border-radius: 999px; background: var(--wash); font-size: 13px; font-weight: 800; color: var(--ink-2); }
  .more.ghost { background: none; border: 1.5px dashed var(--line-2); color: var(--ink-3); }
  .trans { margin: 10px 0 0; font-size: 13.5px; color: var(--ink-2); line-height: 1.7; }
  .qa-cap { margin-top: 16px; font-size: 11px; font-weight: 850; letter-spacing: .1em; color: var(--ink-3); text-transform: uppercase; }
  .qas { margin-top: 8px; display: grid; gap: 8px; }
  .qa { padding: 13px 15px; border-radius: 14px; background: var(--card); border: 1.5px solid var(--line);
    text-align: left; display: grid; gap: 5px; transition: border-color .12s var(--ease); }
  .qa:hover { border-color: var(--ink-3); }
  .qa.open { border-color: var(--good); }
  .qa-q { font-size: 15px; font-weight: 750; word-break: keep-all; }
  .qa-a { font-size: 14px; color: var(--good-deep); font-weight: 700; word-break: keep-all; }
</style>
