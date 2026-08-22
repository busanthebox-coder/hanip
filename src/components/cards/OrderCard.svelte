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

  $: blanks = Math.max(0, card.tokens.length - picked.length);

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
    const answer = picked.join(' ');
    if (normal(answer) === normal(card.correct)) {
      state = 'right';
      onResolve(true, { picked: answer });
    } else {
      state = 'wrong';
      onResolve(false, { picked: answer });
    }
    showReveal();
  }
  async function showReveal() {
    await afterUpdate();
    revealElement?.scrollIntoView?.({ block: 'nearest' });
  }
  // Order 34: which language leads the instruction (see lib/instructions.js).
  export let lead = 'ko';

  const ASK_KO = '어절을 순서대로 탭하세요';
  const ASK_EN = "Tap the tiles in Korean order";
</script>

<div class="label">Korean word order</div>
<p class="prompt">{card.prompt}</p>

<!-- an exam blank, not a dashed drop box: the line is the only container -->
<div class="slot" class:right={state === 'right'} class:wrong={state === 'wrong'}>
  {#each picked as tokenText, i}
    <button class="placed" on:click={() => untake(i)}>{tokenText}</button>
  {/each}
  {#each Array(blanks) as _, b}
    <span class="blank" aria-hidden="true">____</span>
  {/each}
</div>

<div class="ask">{lead === 'en' ? ASK_EN : ASK_KO}</div>
<div class="ask-en">{lead === 'en' ? ASK_KO : ASK_EN}</div>

{#if bank.length}
  <div class="bank">
    {#each bank as tokenText, i}
      <button class="tile" on:click={() => take(i)}>{tokenText}</button>
    {/each}
  </div>
{/if}

<div class="progress">{picked.length} placed · {blanks} left</div>

{#if state === 'right'}
  <div class="why" bind:this={revealElement}>
    <div class="why-ko">{card.correct}</div>
    {#if card.explanation}<p>{card.explanation}</p>{/if}
  </div>
{:else if state === 'wrong'}
  <div class="why" bind:this={revealElement}>
    <div class="why-lab">Correct order</div>
    <div class="why-ko">{card.correct}</div>
    <p>{card.explanation || 'Read it once more — this one comes back in a moment.'}</p>
  </div>
{/if}

{#if bank.length === 0 && state !== 'right'}
  <button class="check" on:click={check}><b>Check</b><i>확인</i></button>
{/if}

<style>
  .label { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .prompt { margin: 8px 0 0; font-size: 16px; font-weight: 750; line-height: 1.5; color: var(--ink);
    word-break: keep-all; }

  .slot { margin-top: 30px; min-height: 56px; display: flex; flex-wrap: wrap; align-items: flex-end; gap: 4px 14px;
    border-bottom: 2px solid var(--line-2); padding-bottom: 10px;
    transition: border-color .15s var(--ease); }
  .slot.right { border-color: var(--good); }
  .slot.wrong { border-color: var(--bad); }
  .placed { font-size: 27px; font-weight: 820; letter-spacing: -.02em; line-height: 1.3; color: var(--ink);
    word-break: keep-all; }
  .blank { font-size: 27px; font-weight: 400; letter-spacing: .1em; line-height: 1.3; color: var(--ink-3); }

  .ask { margin-top: 9px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .ask-en { margin-top: 4px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }

  .bank { margin-top: 26px; display: flex; flex-wrap: wrap; gap: 9px; }
  .tile { min-height: 44px; padding: 11px 16px; border: 1px solid var(--line); border-radius: 14px;
    background: var(--card); font-size: 18px; font-weight: 750; word-break: keep-all;
    transition: border-color .12s var(--ease), transform .12s var(--ease); }
  .tile:hover { border-color: var(--ink-3); }
  .tile:active { transform: scale(.97); }

  .progress { margin-top: 20px; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    font-variant-numeric: tabular-nums; }

  .why { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); }
  .why-lab { font-size: 11.5px; font-weight: 750; color: var(--ink-3); }
  .why-ko { margin-top: 3px; font-size: 19px; font-weight: 820; line-height: 1.45; word-break: keep-all; }
  .why p { margin: 8px 0 0; font-size: 12.5px; font-weight: 600; line-height: 1.7; color: var(--ink-3);
    word-break: keep-all; }

  .check { width: 100%; margin-top: 22px; padding: 15px 16px 13px; border-radius: 16px; background: var(--accent);
    color: var(--on-accent); display: grid; gap: 1px; text-align: center; box-shadow: 0 3px 0 var(--accent-deep);
    transition: transform .09s var(--ease), box-shadow .09s var(--ease); }
  .check:active { transform: translateY(3px); box-shadow: 0 0 0 var(--accent-deep); }
  .check b { font-size: 17px; font-weight: 850; letter-spacing: -.01em; }
  .check i { font-size: 10.5px; font-style: normal; font-weight: 700; opacity: .62; }
</style>
