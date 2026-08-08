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

<div class="label">You can read this now</div>
<p class="lead">A real dialogue line using the word you just learned</p>
<p class="lead-ko">방금 배운 말이 들어간 진짜 대화 한 줄</p>

<div class="chatwrap">
  <div class="name">{card.line.speaker}</div>
  <button class="bub" on:click={() => { enShown = !enShown; }}>
    {#if parts}{parts.pre}<span class="hl">{parts.mid}</span>{parts.post}{:else}{card.line.ko}{/if}
    {#if $prefs.romaja === 'shown' && card.line.romanization}<span class="rom">{card.line.romanization}</span>{/if}
    {#if enShown && card.line.en}<span class="en">{card.line.en}</span>{/if}
  </button>
  <div class="tools"><AudioDot text={card.line.ko} size={28} /></div>
</div>
<div class="hint">Tap the bubble for English, the dot for sound</div>

<style>
  .label { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .lead { margin: 8px 0 0; font-size: 15.5px; font-weight: 650; line-height: 1.55; color: var(--ink);
    word-break: keep-all; }
  .lead-ko { margin: 4px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .chatwrap { margin-top: 20px; background: var(--chat-canvas); border-radius: 18px; padding: 16px 14px;
    display: grid; gap: 8px; justify-items: start; }
  .name { font-size: 11.5px; font-weight: 800; color: var(--ink-3); margin-left: 4px; }
  .bub { max-width: 92%; background: var(--card); border-radius: 4px 18px 18px 18px; padding: 13px 15px;
    font-size: 19px; font-weight: 750; line-height: 1.55; text-align: left; word-break: keep-all;
    box-shadow: var(--chat-shadow); }
  .hl { border-bottom: 2.5px solid var(--gold); padding-bottom: 1px; font-weight: 850; }
  .en { display: block; margin-top: 6px; font-size: 13px; color: var(--ink-2); font-weight: 600; }
  .rom { display: block; margin-top: 5px; color: var(--ink-3); font-size: 12.5px; font-weight: 650; letter-spacing: .01em; }
  .tools { margin-left: 4px; }
  .hint { margin-top: 14px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); text-align: center; }
</style>
