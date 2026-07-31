<script>
  import { speak } from '../../lib/tts.js';
  export let text = '';
  export let size = 32;
</script>

<button class="dot" style="--sz:{size}px" aria-label="발음 듣기" on:click|stopPropagation={() => speak(text)}>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12"/></svg>
</button>

<style>
  .dot { width: var(--sz); height: var(--sz); flex: none; display: inline-grid; place-items: center;
    border-radius: 999px; background: var(--good-soft); color: var(--good-deep); }
  .dot:hover { background: var(--line); }
  .dot svg { width: 55%; height: 55%; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
</style>
