<script>
  import { applyPwaUpdate, updateReady } from '../lib/pwa.js';
</script>

{#if $updateReady}
  <div class="update-toast" role="status">
    <button type="button" on:click={applyPwaUpdate}>
      <strong>새 버전이 있어요 · Update ready</strong>
      <span>눌러서 업데이트 · Tap to update</span>
    </button>
  </div>
{/if}

<style>
  .update-toast { position: fixed; left: 50%; bottom: calc(82px + env(safe-area-inset-bottom, 0px)); z-index: 90;
    width: min(420px, calc(100% - 32px)); transform: translateX(-50%); }
  button { width: 100%; padding: 13px 16px; display: grid; gap: 1px; text-align: left; border: 1px solid var(--line-2);
    border-radius: var(--r-chip); background: var(--ink); color: var(--on-accent); box-shadow: var(--shadow-2); }
  strong { font-size: 13.5px; }
  span { font-size: 11px; opacity: .78; }
</style>
