<script>
  import { tick as afterUpdate } from 'svelte';
  export let card;
  export let onResolve = () => {};

  let picked = null;
  let revealed = false;
  let revealElement;

  function pick(opt) {
    if (revealed) return;
    picked = opt;
    revealed = true;
    onResolve(!!opt.ok);
    showReveal();
  }
  async function showReveal() {
    await afterUpdate();
    revealElement?.scrollIntoView?.({ block: 'nearest' });
  }
</script>

<div class="step-label">확인 · Check yourself</div>
<div class="q">{card.prompt}</div>
{#if card.sentence}<div class="sent">{card.sentence}</div>{/if}

<div class="chips">
  {#each card.options as opt}
    <button
      class="chip"
      class:good={revealed && opt.ok}
      class:bad={revealed && picked === opt && !opt.ok}
      on:click={() => pick(opt)}
    >{opt.text}</button>
  {/each}
</div>

{#if revealed && card.explanation}
  <div class="why" bind:this={revealElement}>{card.explanation}</div>
{/if}

<style>
  .step-label { font-size: 11px; font-weight: 850; letter-spacing: .16em; color: var(--accent); text-transform: uppercase; }
  .q { margin-top: 6px; font-size: 18px; font-weight: 800; line-height: 1.45; word-break: keep-all; }
  .sent { margin-top: 10px; font-size: 24px; font-weight: 750; word-break: keep-all; }
  .chips { margin-top: 14px; display: grid; gap: 9px; }
  .chip { padding: 14px 16px; border-radius: var(--r-chip); background: var(--card); border: 1.5px solid var(--line);
    font-size: 16.5px; font-weight: 700; text-align: left; line-height: 1.5; word-break: keep-all;
    transition: border-color .12s var(--ease), background .12s var(--ease), transform .12s var(--ease); }
  .chip:hover { border-color: var(--ink-3); }
  .chip:active { transform: scale(.98); }
  .chip.good { border-color: var(--good); background: var(--good-soft); color: var(--good-deep); }
  .chip.bad { border-color: var(--bad); color: var(--bad); animation: shake .28s ease; }
  @keyframes shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  .why { margin-top: 12px; padding: 12px 14px; border-radius: 14px; background: var(--card); border: 1px solid var(--line);
    font-size: 13px; color: var(--ink-2); line-height: 1.6; word-break: keep-all; animation: rise .25s var(--ease); }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
</style>
