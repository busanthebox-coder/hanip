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
    onResolve(!!opt.ok, { picked: opt.text });
    showReveal();
  }
  async function showReveal() {
    await afterUpdate();
    revealElement?.scrollIntoView?.({ block: 'nearest' });
  }
</script>

<div class="label">Check yourself</div>
<p class="prompt">{card.prompt}</p>
{#if card.sentence}<div class="sent">{card.sentence}</div>{/if}

<div class="opts">
  {#each card.options as opt}
    <button
      class="opt"
      class:picked={revealed && opt.ok}
      class:wrong={revealed && picked === opt && !opt.ok}
      class:dim={revealed && !opt.ok && picked !== opt}
      on:click={() => pick(opt)}
    >
      <span class="opt-text">{opt.text}</span>
      {#if revealed && opt.ok}<span class="mark good">Correct</span>
      {:else if revealed && picked === opt}<span class="mark bad">Your answer</span>{/if}
    </button>
  {/each}
</div>

{#if revealed && card.explanation}
  <p class="why" bind:this={revealElement}>{card.explanation}</p>
{/if}

<style>
  .label { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .prompt { margin: 8px 0 0; font-size: 16px; font-weight: 750; line-height: 1.5; color: var(--ink);
    word-break: keep-all; }
  .sent { margin-top: 16px; font-size: 26px; font-weight: 800; line-height: 1.45; letter-spacing: -.02em;
    word-break: keep-all; }

  .opts { margin-top: 20px; }
  .opt { display: flex; align-items: center; gap: 10px; min-height: 44px;
    width: calc(100% + var(--sheet-pad, 20px) * 2);
    margin: 0 calc(var(--sheet-pad, 20px) * -1); padding: 11px var(--sheet-pad, 20px);
    border-top: 1px solid var(--line); font-size: 16px; font-weight: 650; line-height: 1.5; color: var(--ink);
    text-align: left; transition: background-color .12s var(--ease), color .12s var(--ease); }
  .opt:last-child { border-bottom: 1px solid var(--line); }
  .opt:hover { background: var(--wash); }
  .opt-text { min-width: 0; word-break: keep-all; }
  .opt.dim { color: var(--ink-3); font-weight: 600; }
  .opt.dim:hover { background: none; }
  .opt.picked { background: var(--wash); font-weight: 800; }
  .opt.wrong { color: var(--bad); }
  .opt.wrong:hover { background: none; }
  .mark { margin-left: auto; flex: none; font-size: 13px; font-weight: 900; }
  .mark.good { color: var(--good); }
  .mark.bad { color: var(--bad); }

  .why { margin: 18px 0 0; padding-top: 16px; border-top: 1px solid var(--line);
    font-size: 12.5px; font-weight: 600; line-height: 1.7; color: var(--ink-3); word-break: keep-all;
    animation: rise .25s var(--ease); }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
</style>
