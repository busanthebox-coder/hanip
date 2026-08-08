<script>
  // The single bowl in the app. Home, the win screen, the week strip and the
  // Today tab icon all render THIS component — there is no second copy of the
  // path anywhere. Only the size and the fill change.
  import {
    BOWL_BODY,
    BOWL_CLIP,
    BOWL_FOOT,
    BOWL_HEAP,
    BOWL_LINE_PATHS,
    BOWL_LINE_VIEWBOX,
    BOWL_RIM,
    BOWL_VIEWBOX,
    bowlScale,
    isHeaped,
    ricePath,
  } from '../lib/bowl.js';

  export let size = 86;
  export let fill = 0;          // 0…1 — how much rice is in the bowl today
  export let muted = false;     // a day that has not happened yet
  export let animate = false;   // the rice rises into place (win screen)
  export let variant = 'ink';   // 'ink' = brush silhouette · 'line' = tab-scale abbreviation
  export let label = '';        // set to expose the bowl to screen readers

  let uid = 0;
  const nextId = () => `bowl-in-${(uid += 1)}-${Math.random().toString(36).slice(2, 7)}`;
  const clipId = nextId();

  $: scale = bowlScale(size);
  $: rice = ricePath(fill);
  $: heaped = isHeaped(fill);
</script>

{#if variant === 'line'}
  <svg
    class="bowl line"
    style="--bw:{size}px"
    viewBox={BOWL_LINE_VIEWBOX}
    role={label ? 'img' : undefined}
    aria-label={label || undefined}
    aria-hidden={label ? undefined : 'true'}
    focusable="false"
  >
    {#each BOWL_LINE_PATHS as d}<path {d} />{/each}
  </svg>
{:else}
  <svg
    class="bowl"
    class:sm={scale === 'sm'}
    class:xs={scale === 'xs'}
    class:muted
    class:fillup={animate}
    style="--bw:{size}px"
    viewBox={BOWL_VIEWBOX}
    role={label ? 'img' : undefined}
    aria-label={label || undefined}
    aria-hidden={label ? undefined : 'true'}
    focusable="false"
  >
    {#if rice}
      <defs><clipPath id={clipId}><path d={BOWL_CLIP} /></clipPath></defs>
      <g clip-path="url(#{clipId})"><path class="rice" d={rice} /></g>
      {#if heaped}<path class="rice heap" d={BOWL_HEAP} />{/if}
    {/if}
    <path class="ink" d={BOWL_BODY} />
    <path class="ink" d={BOWL_RIM} />
    <path class="foot" d={BOWL_FOOT} />
  </svg>
{/if}

<style>
  .bowl { display: block; width: var(--bw, 86px); height: var(--bw, 86px); flex: none; }
  .ink { fill: var(--ink); }
  .foot { fill: none; stroke: var(--ink); stroke-width: 5.6; stroke-linecap: round; stroke-linejoin: round; }
  .rice { fill: var(--gold); }

  /* one path at every size — only the stroke weight is corrected so the
     silhouette survives when the bowl shrinks to a week pip */
  .sm .ink { stroke: var(--ink); stroke-width: 2.6; stroke-linejoin: round; }
  .sm .foot { stroke-width: 7.6; }
  .xs .ink { stroke: var(--ink); stroke-width: 4; stroke-linejoin: round; }
  .xs .foot { stroke-width: 9.5; }

  .muted .ink { fill: var(--line-2); }
  .muted .foot { stroke: var(--line-2); }
  .muted.sm .ink, .muted.xs .ink { stroke: var(--line-2); }

  @keyframes riceRise { from { transform: translateY(26px); } to { transform: none; } }
  .fillup .rice { animation: riceRise 1.05s var(--ease) .15s both; }

  /* the same rim–body–foot silhouette, abbreviated to strokes for the tab bar */
  .line path { fill: none; stroke: currentColor; stroke-width: 1.7;
    stroke-linecap: round; stroke-linejoin: round; }
</style>
