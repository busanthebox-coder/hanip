<script>
  import { tick as afterUpdate } from 'svelte';
  import AudioDot from './AudioDot.svelte';
  import { prefs } from '../../lib/prefs.js';

  export let card;
  export let onResolve = () => {};

  let picked = null;      // option text the learner tapped
  let revealed = false;
  let romajaShown = false;
  let revealElement;

  $: parts = card.sentence && card.target
    ? splitOnce(card.sentence.ko, card.target)
    : null;

  function splitOnce(text, needle) {
    const at = text.indexOf(needle);
    if (at < 0) return null;
    return { pre: text.slice(0, at), mid: needle, post: text.slice(at + needle.length) };
  }

  function pick(opt) {
    if (revealed) return;
    picked = opt;
    revealed = true;
    onResolve(opt === card.word.en);
    showReveal();
  }
  function giveUp() {
    if (revealed) return;
    revealed = true;
    onResolve(false, { skipped: true });
    showReveal();
  }
  async function showReveal() {
    await afterUpdate();
    revealElement?.scrollIntoView?.({ block: 'nearest' });
  }
</script>

<div class="step-label">{card.warmup ? '복습 · Do you remember?' : '단어 · Guess first'}</div>

{#if parts}
  <div class="sent">{parts.pre}<span class="target">{parts.mid}</span>{parts.post}</div>
{:else}
  <div class="sent"><span class="target">{card.word.ko}</span></div>
{/if}
<div class="q">무슨 뜻일까요? <span class="q-en">What does the highlighted word mean?</span></div>

<div class="chips">
  {#each card.options as opt}
    <button
      class="chip"
      class:good={revealed && opt === card.word.en}
      class:bad={revealed && picked === opt && opt !== card.word.en}
      on:click={() => pick(opt)}
    >{opt}</button>
  {/each}
</div>
{#if !revealed}
  <button class="dunno" on:click={giveUp}>몰라요 · Don't know — just show me</button>
{/if}

{#if revealed}
  <div class="reveal" bind:this={revealElement}>
    <div class="reveal-head">
      <span class="big">{card.word.ko}</span>
      <AudioDot text={card.word.ko} />
    </div>
    <div class="mean">{card.word.en}{#if card.word.pos}<span class="pos"> · {card.word.pos}</span>{/if}</div>
    {#if card.sentence}
      <div class="note">{card.sentence.ko}{#if card.sentence.en} = {card.sentence.en}{/if}</div>
    {/if}
    {#if card.note}<div class="note sub">{card.note}</div>{/if}
    {#if card.word.nuance}
      <!-- The instant after a guess is when nuance actually lands, so the
           reveal teaches the distinction instead of only confirming. -->
      <div class="nuance"><span class="n-cap">뉘앙스 · Nuance</span>{card.word.nuance}</div>
    {/if}
    {#if $prefs.romaja === 'shown' || romajaShown}
      <div class="note sub">{card.word.romanization}</div>
    {:else}
      <button class="romaja" on:click={() => { romajaShown = true; }}>발음 · Show romanization</button>
    {/if}
  </div>
{/if}

<style>
  .step-label { font-size: 11px; font-weight: 850; letter-spacing: .16em; color: var(--accent); text-transform: uppercase; }
  .sent { margin: 16px 0 4px; font-size: 26px; font-weight: 750; line-height: 1.5; word-break: keep-all; }
  .target { background: var(--gold-soft); border-bottom: 3px solid var(--gold); border-radius: 4px 4px 0 0; padding: 0 2px; }
  .q { font-size: 19px; font-weight: 800; }
  .q-en { display: block; font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .chips { margin-top: 14px; display: grid; gap: 9px; }
  .chip { padding: 14px 16px; border-radius: var(--r-chip); background: var(--card); border: 1.5px solid var(--line);
    font-size: 16px; font-weight: 700; text-align: left;
    transition: border-color .12s var(--ease), background .12s var(--ease), transform .12s var(--ease); }
  .chip:hover { border-color: var(--ink-3); }
  .chip:active { transform: scale(.98); }
  .chip.good { border-color: var(--good); background: var(--good-soft); color: var(--good-deep); }
  .chip.bad { border-color: var(--bad); color: var(--bad); animation: shake .28s ease; }
  @keyframes shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  .dunno { justify-self: start; margin-top: 10px; padding: 8px 15px; border-radius: 999px;
    border: 1.5px dashed var(--line-2); color: var(--ink-3); font-size: 13px; font-weight: 800; }
  .dunno:hover { border-color: var(--ink-3); }
  .reveal { margin-top: 14px; padding: 16px; border-radius: 18px; background: var(--card); border: 1px solid var(--line);
    box-shadow: var(--shadow-1); animation: rise .25s var(--ease); }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .reveal-head { display: flex; align-items: center; gap: 10px; }
  .big { font-size: 34px; font-weight: 850; letter-spacing: -.01em; }
  .mean { margin-top: 2px; font-size: 16.5px; font-weight: 750; }
  .pos { color: var(--ink-3); font-weight: 650; font-size: 13px; }
  .note { margin-top: 7px; font-size: 13.5px; color: var(--ink-2); line-height: 1.55; word-break: keep-all; }
  .note.sub { color: var(--ink-3); font-size: 12.5px; }
  .romaja { margin-top: 8px; padding: 5px 12px; border-radius: 999px; background: var(--wash); color: var(--ink-3);
    font-size: 12px; font-weight: 800; }
  .nuance { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: var(--gold-soft);
    border-left: 3px solid var(--gold); font-size: 13px; line-height: 1.6; color: var(--ink); word-break: keep-all; }
  .n-cap { display: block; margin-bottom: 3px; font-size: 10px; font-weight: 850; letter-spacing: .1em;
    text-transform: uppercase; color: var(--ink-3); }
</style>
