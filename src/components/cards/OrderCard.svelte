<script>
  import { tick as afterUpdate } from 'svelte';
  export let card;
  export let onResolve = () => {};

  // deterministic scramble: rotate by 1 (or reverse when rotation is identity)
  const bank0 = (() => {
    const tokens = [...card.tokens];
    const rotated = [...tokens.slice(1), tokens[0]];
    return rotated.join(' ') === tokens.join(' ') ? tokens.reverse() : rotated;
  })();

  let picked = [];
  let bank = [...bank0];
  let state = ''; // '', 'right', 'wrong'
  let revealElement;

  const normal = (s) => String(s).replace(/[^가-힣a-zA-Z0-9]/g, '');

  function take(i) {
    if (state) return;
    picked = [...picked, bank[i]];
    bank = bank.filter((_, at) => at !== i);
    state = '';
  }
  function untake(i) {
    if (state) return;
    bank = [...bank, picked[i]];
    picked = picked.filter((_, at) => at !== i);
    state = '';
  }
  function check() {
    if (normal(picked.join(' ')) === normal(card.correct)) {
      state = 'right';
      onResolve(true);
    } else {
      state = 'wrong';
      onResolve(false);
    }
    showReveal();
  }
  async function showReveal() {
    await afterUpdate();
    revealElement?.scrollIntoView?.({ block: 'nearest' });
  }
</script>

<div class="step-label">배열 · Korean word order</div>
<div class="q">{card.prompt}</div>

<div class="slot" class:right={state === 'right'} class:wrong={state === 'wrong'}>
  {#if picked.length === 0}<span class="hint">어절을 순서대로 탭하세요 · Tap the tiles in Korean order</span>{/if}
  {#each picked as tokenText, i}
    <button class="tile picked" on:click={() => untake(i)}>{tokenText}</button>
  {/each}
</div>

<div class="bank">
  {#each bank as tokenText, i}
    <button class="tile" on:click={() => take(i)}>{tokenText}</button>
  {/each}
</div>

{#if state === 'right'}
  <div class="why good-note" bind:this={revealElement}>{card.correct}{#if card.explanation} — {card.explanation}{/if}</div>
{:else if state === 'wrong'}
  <div class="why bad-note" bind:this={revealElement}>정답: {card.correct} · Not quite — review the answer, then try it again later.</div>
{/if}

{#if bank.length === 0 && state !== 'right'}
  <button class="check" on:click={check}>확인 · Check</button>
{/if}

<style>
  .step-label { font-size: 11px; font-weight: 850; letter-spacing: .16em; color: var(--accent); text-transform: uppercase; }
  .q { margin-top: 6px; font-size: 17px; font-weight: 800; line-height: 1.45; word-break: keep-all; }
  .slot { margin-top: 14px; min-height: 66px; padding: 12px; border-radius: 16px; background: var(--wash);
    border: 1.5px dashed var(--line-2); display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
    transition: border-color .15s var(--ease); }
  .slot.right { border-color: var(--good); border-style: solid; background: var(--good-soft); }
  .slot.wrong { border-color: var(--bad); }
  .hint { color: var(--ink-3); font-size: 13px; }
  .bank { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
  .tile { padding: 11px 14px; border-radius: 14px; background: var(--card); border: 1.5px solid var(--line);
    font-size: 18px; font-weight: 750; transition: border-color .12s var(--ease), transform .12s var(--ease); }
  .tile:hover { border-color: var(--ink-3); }
  .tile:active { transform: scale(.97); }
  .tile.picked { border-color: var(--gold); background: var(--gold-soft); }
  .check { margin-top: 14px; justify-self: start; padding: 12px 26px; border-radius: 999px; background: var(--accent);
    color: var(--on-accent); font-size: 15px; font-weight: 850; box-shadow: 0 3px 0 var(--accent-deep); }
  .check:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--accent-deep); }
  .why { margin-top: 12px; padding: 12px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.6; word-break: keep-all; }
  .good-note { background: var(--good-soft); color: var(--good-deep); font-weight: 700; }
  .bad-note { background: var(--accent-soft); color: var(--accent-deep); }
</style>
