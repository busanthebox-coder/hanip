<script>
  // Five tabs, one drawing system: 24×24, stroke 1.7, round caps, currentColor.
  // Before this the bar mixed OS colour emoji with body-font glyphs, which put
  // three different renderers in five slots.
  import Bowl from './Bowl.svelte';

  export let name;
  export let size = 23;

  // Shelf = three closed spines, one leaning — the tilt is what makes it read
  // as a shelf somebody filled by hand.
  const SHELF = [
    'M3 21.2H21',
    'M5.4 21.2V9H8.6V21.2',
    'M10.2 21.2V6.8H13.4V21.2',
    'M10.2 12H13.4',
    'M15.2 21.2L16.7 9.5L19.9 10.1L18.8 21.2',
  ];
  // Hangul = 가 drawn as strokes (ㄱ in two, ㅏ in two), not set in a font:
  // the shape says the tab is about how letters are built.
  const HANGUL = [
    'M4.2 5.4H10.9',
    'M10.9 5.4L8.3 18.8',
    'M15.4 4.4V19.8',
    'M15.4 12.1H19.6',
  ];
  // Hanja = 文, four strokes. 學 is sixteen: at 23px its top five collapse into
  // one mass, and pruning strokes turns it into 学 — the Japanese shinjitai,
  // which is simply the wrong character in a Korean app.
  const HANJA = [
    'M12 3.1V5.4',
    'M5.2 7.5H18.8',
    'M15.4 9.6C13 14.6 9.2 18.4 5.4 20.7',
    'M8.8 9.6C11 14.2 14.8 18 18.8 20.5',
  ];
  // Words = an open book, so it splits from Shelf's closed spines by shape.
  const WORDS = [
    'M12 7.4V19.8',
    'M12 7.4C10 5.7 7 5.1 3.4 5.3V17.8C7 17.6 10 18.2 12 19.8',
    'M12 7.4C14 5.7 17 5.1 20.6 5.3V17.8C17 17.6 14 18.2 12 19.8',
    'M14.9 10.4H18.2',
    'M14.9 13.2H17.1',
  ];
  const PATHS = { shelf: SHELF, hangul: HANGUL, hanja: HANJA, words: WORDS };

  $: paths = PATHS[name] || [];
</script>

{#if name === 'today'}
  <!-- the bowl itself, so the metaphor reaches all the way into the tab bar -->
  <Bowl variant="line" {size} />
{:else}
  <svg
    class="ti"
    class:dense={name === 'hanja'}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    {#each paths as d}<path {d} />{/each}
  </svg>
{/if}

<style>
  .ti { display: block; flex: none; fill: none; stroke: currentColor; stroke-width: 1.7;
    stroke-linecap: round; stroke-linejoin: round; }
  /* 文 packs more ink per square than the other four — thin it to match */
  .dense { stroke-width: 1.55; }
</style>
