<script>
  /* Order 31, defect 5. Untouched / in progress / finished used to be a faded
     "0/8", a "5/8 + 38px bar" and a 24px seal — three widths, three shapes, no
     column to compare down. All three now share one 22px square: an empty ring,
     the same ring with a gold arc, then the 한입 seal. "Same weight" is read as
     same area, same column, same geometry; the ink alone rises monotonically,
     so scanning the list reads as an order of brightness and finishing still
     lands as a reward. */
  export let done = 0;
  export let total = 0;
  export let label = '';

  const CIRCUMFERENCE = 2 * Math.PI * 8.2;

  $: complete = total > 0 && done >= total;
  $: arc = total > 0 ? CIRCUMFERENCE * Math.min(done / total, 1) : 0;
</script>

<span class="st" role="img" aria-label={label}>
  {#if complete}
    <span class="seal22" aria-hidden="true">한입</span>
  {:else}
    <svg class="ring" viewBox="0 0 20 20" aria-hidden="true">
      <circle class="trk" cx="10" cy="10" r="8.2" />
      {#if arc > 0}
        <circle
          class="arc"
          cx="10"
          cy="10"
          r="8.2"
          transform="rotate(-90 10 10)"
          stroke-dasharray="{arc.toFixed(2)} 999"
        />
      {/if}
    </svg>
  {/if}
</span>

<style>
  .st { flex: none; width: 22px; height: 19px; display: grid; place-items: center; }
  .ring { width: 20px; height: 20px; display: block; }
  .trk { fill: none; stroke: var(--line-2); stroke-width: 1.7; }
  .arc { fill: none; stroke: var(--gold); stroke-width: 2.6; stroke-linecap: round; }
  /* the ring filling one full turn becomes the seal — the same 22px box, so the
     transition is a change of ink, not of layout */
  .seal22 { width: 22px; height: 22px; display: grid; place-items: center; border: 1.2px solid var(--gold);
    border-radius: 5px; color: var(--gold); font-size: 7.5px; font-weight: 900; line-height: 1;
    transform: rotate(-8deg); }
</style>
