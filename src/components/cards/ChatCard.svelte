<script>
  import AudioDot from './AudioDot.svelte';
  import { prefs } from '../../lib/prefs.js';

  export let card;
  export let onResolve = () => {};

  let shown = 1;                     // lines revealed so far
  let enOpen = {};                   // per-line translation toggles

  $: speakers = [...new Set(card.lines.map((l) => l.speaker))];
  $: if (shown >= card.lines.length) onResolve(true);

  function reveal() {
    if (shown < card.lines.length) shown += 1;
  }
  function toggleEn(i) {
    enOpen = { ...enOpen, [i]: !enOpen[i] };
  }
</script>

<div class="label">Real dialogue, line by line</div>
{#if card.setting}<p class="setting">{card.setting}</p>{/if}

<div class="thread">
  {#each card.lines.slice(0, shown) as line, i}
    <div class="row" class:mine={line.speaker === speakers[1]}>
      <div class="name">{line.speaker}</div>
      <button class="bub" on:click={() => toggleEn(i)}>
        {line.ko}
        {#if $prefs.romaja === 'shown' && line.romanization}<span class="rom">{line.romanization}</span>{/if}
        {#if enOpen[i] && line.en}<span class="en">{line.en}</span>{/if}
      </button>
      <AudioDot text={line.ko} size={24} />
    </div>
  {/each}
</div>

{#if shown < card.lines.length}
  <button class="reveal-next" on:click={reveal}>Next line ({shown}/{card.lines.length})</button>
{:else}
  <div class="hint">Tap a bubble for English</div>
{/if}

<style>
  .label { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .setting { margin: 6px 0 0; font-size: 13.5px; font-weight: 650; color: var(--ink-2); word-break: keep-all; }
  /* the chat canvas is the metaphor, not a card frame — it stays */
  .thread { margin-top: 18px; background: var(--chat-canvas); border-radius: 18px; padding: 14px 12px;
    display: grid; gap: 10px; }
  .row { display: grid; grid-template-columns: 1fr auto; gap: 6px; justify-items: start; align-items: end; }
  .row.mine { justify-items: end; }
  .name { grid-column: 1 / -1; font-size: 11px; font-weight: 800; color: var(--ink-3); margin: 0 4px; }
  .bub { max-width: 100%; background: var(--card); border-radius: 4px 16px 16px 16px; padding: 10px 13px;
    font-size: 16.5px; font-weight: 700; line-height: 1.5; text-align: left; word-break: keep-all;
    box-shadow: var(--chat-shadow); animation: pop .22s var(--ease); }
  .row.mine .bub { background: var(--chat-self); color: var(--chat-self-ink); border-radius: 16px 4px 16px 16px; }
  @keyframes pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .en { display: block; margin-top: 5px; font-size: 12.5px; color: var(--ink-2); font-weight: 600; }
  .rom { display: block; margin-top: 4px; color: var(--ink-3); font-size: 12px; font-weight: 650; letter-spacing: .01em; }
  .reveal-next { width: 100%; min-height: 44px; margin-top: 16px; padding: 13px 0;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    font-size: 14px; font-weight: 750; color: var(--ink); text-align: center;
    transition: background-color .12s var(--ease); }
  .reveal-next:hover { background: var(--wash); }
  .hint { margin-top: 14px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); text-align: center; }
</style>
