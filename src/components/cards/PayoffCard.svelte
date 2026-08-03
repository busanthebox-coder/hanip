<script>
  import AudioDot from './AudioDot.svelte';
  import { prefs } from '../../lib/prefs.js';

  export let card;
  export let onResolve = () => {};

  let enShown = false;
  onResolve(true);

  $: parts = split(card.line.ko, card.hl);
  function split(text, needle) {
    if (!needle) return null;
    const at = text.indexOf(needle);
    if (at < 0) return null;
    return { pre: text.slice(0, at), mid: needle, post: text.slice(at + needle.length) };
  }
</script>

<div class="step-label">보상 · You can read this now</div>
<div class="q">방금 배운 말이 들어간 진짜 대화 한 줄: <span class="q-en">A real dialogue line using the word you just learned</span></div>

<div class="chatwrap">
  <div class="name">{card.line.speaker}</div>
  <button class="bub" on:click={() => { enShown = !enShown; }}>
    {#if parts}{parts.pre}<span class="hl">{parts.mid}</span>{parts.post}{:else}{card.line.ko}{/if}
    {#if $prefs.romaja === 'shown' && card.line.romanization}<span class="rom">{card.line.romanization}</span>{/if}
    {#if enShown && card.line.en}<span class="en">{card.line.en}</span>{/if}
  </button>
  <div class="tools"><AudioDot text={card.line.ko} size={28} /></div>
  <div class="hint">탭 = 번역 · Tap for English, speaker for sound</div>
</div>

<style>
  .step-label { font-size: 11px; font-weight: 850; letter-spacing: .16em; color: var(--accent); text-transform: uppercase; }
  .q { margin-top: 6px; font-size: 18px; font-weight: 800; word-break: keep-all; }
  .q-en { display: block; font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .chatwrap { margin-top: 18px; background: #EFE6D4; border-radius: 18px; padding: 16px 14px; display: grid; gap: 8px; justify-items: start; }
  .name { font-size: 11.5px; font-weight: 800; color: var(--ink-3); margin-left: 4px; }
  .bub { max-width: 92%; background: var(--card); border-radius: 4px 18px 18px 18px; padding: 13px 15px;
    font-size: 19px; font-weight: 750; line-height: 1.55; text-align: left; word-break: keep-all;
    box-shadow: 0 2px 8px -4px rgba(38, 34, 28, 0.2); }
  .hl { background: var(--gold-soft); border-bottom: 2.5px solid var(--gold); padding: 0 1px; }
  .en { display: block; margin-top: 6px; font-size: 13px; color: var(--ink-2); font-weight: 600; }
  .rom { display: block; margin-top: 5px; color: var(--ink-3); font-size: 12.5px; font-weight: 650; letter-spacing: .01em; }
  .tools { margin-left: 4px; }
  .hint { justify-self: center; font-size: 12px; color: var(--ink-3); }
</style>
