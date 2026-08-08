<script>
  export let value = '';
  export let label = 'Search';
  export let placeholder = 'Search';
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
    font: inherit; font-size: 13.5px; font-weight: 600; color: var(--ink);
    background: var(--wash); border: 1px solid var(--line); border-radius: 14px;
    transition: border-color .15s var(--ease), background-color .15s var(--ease);
  }
  .search::placeholder { color: var(--ink-3); }
  .search:hover { border-color: var(--line-2); }
  .search:focus { border-color: var(--line-2); background: var(--card); }
</style>
