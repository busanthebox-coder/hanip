<script>
  export let value = '';
  export let label = '검색 · Search';
  export let placeholder = '검색 · Search';
</script>

<input
  class="search"
  type="search"
  bind:value
  {placeholder}
  aria-label={label}
/>

<style>
  .search {
    width: 100%; min-height: 44px; padding: 11px 15px;
    font: inherit; font-size: 13.5px; color: var(--ink);
    background: var(--wash); border: 1px solid var(--line); border-radius: var(--r-chip);
    transition: border-color .15s var(--ease), background-color .15s var(--ease);
  }
  .search::placeholder { color: var(--ink-3); }
  .search:hover { border-color: var(--line-2); }
  .search:focus { border-color: var(--line-2); background: var(--card); }
</style>
