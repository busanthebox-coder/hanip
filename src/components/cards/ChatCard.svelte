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

<div class="step-label">대화 · Real dialogue, line by line</div>
{#if card.setting}<div class="setting">{card.setting}</div>{/if}

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
  <button class="reveal-next" on:click={reveal}>다음 줄 · Next line ⌄ ({shown}/{card.lines.length})</button>
{:else}
  <div class="done-hint">말풍선 탭 = 번역 · Tap a bubble for English</div>
{/if}

<style>
  .step-label { font-size: 11px; font-weight: 850; letter-spacing: .16em; color: var(--accent); text-transform: uppercase; }
  .setting { margin-top: 4px; font-size: 13px; color: var(--ink-3); word-break: keep-all; }
  .thread { margin-top: 14px; background: #EFE6D4; border-radius: 18px; padding: 14px 12px; display: grid; gap: 10px; }
  .row { display: grid; grid-template-columns: 1fr auto; gap: 6px; justify-items: start; align-items: end; }
  .row.mine { justify-items: end; }
  .name { grid-column: 1 / -1; font-size: 11px; font-weight: 800; color: var(--ink-3); margin: 0 4px; }
  .bub { max-width: 100%; background: var(--card); border-radius: 4px 16px 16px 16px; padding: 10px 13px;
    font-size: 16.5px; font-weight: 700; line-height: 1.5; text-align: left; word-break: keep-all;
    box-shadow: 0 2px 8px -4px rgba(38, 34, 28, 0.2); animation: pop .22s var(--ease); }
  .row.mine .bub { background: #FCE879; border-radius: 16px 4px 16px 16px; }
  @keyframes pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .en { display: block; margin-top: 5px; font-size: 12.5px; color: var(--ink-2); font-weight: 600; }
  .rom { display: block; margin-top: 4px; color: var(--ink-3); font-size: 12px; font-weight: 650; letter-spacing: .01em; }
  .reveal-next { margin-top: 12px; justify-self: center; padding: 10px 20px; border-radius: 999px;
    background: var(--card); border: 1.5px solid var(--line); font-size: 14px; font-weight: 800; color: var(--ink-2); }
  .reveal-next:hover { border-color: var(--ink-3); }
  .done-hint { margin-top: 10px; text-align: center; font-size: 12px; color: var(--ink-3); }
</style>
