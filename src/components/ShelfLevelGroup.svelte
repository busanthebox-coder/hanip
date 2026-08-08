<script>
  export let group;
  export let open = false;
  export let forceOpen = false;
  export let doneMap = {};
  export let onToggle = () => {};
  export let onPlay = () => {};
  export let onPlaySnack = () => {};
  export let idPrefix = 'shelf';

  let openChapterId = null;

  const KIND_EN = { words: 'Words', pattern: 'Grammar', dialogue: 'Dialogue', reading: 'Reading', boss: 'Boss' };

  $: triggerId = `${idPrefix}-${group.id}-trigger`;
  $: contentId = `${idPrefix}-${group.id}-content`;
  $: chapterRange = group.chapters.length
    ? `Chapters ${group.chapters[0].number}–${group.chapters[group.chapters.length - 1].number}`
    : 'No chapters';

  function doneCount(chapter) {
    return chapter.bites.filter((bite) => doneMap[bite.id]).length;
  }

  function toggleChapter(chapter) {
    openChapterId = openChapterId === chapter.id ? null : chapter.id;
  }
</script>

<section class="level" class:open data-level={group.id}>
  <button
    class="level-head"
    id={triggerId}
    aria-expanded={open}
    aria-controls={contentId}
    disabled={forceOpen}
    on:click={onToggle}
  >
    <span class="level-main">
      <b>{group.label}</b>
      <span class="range">{chapterRange}</span>
    </span>
    <span class="count" aria-label={`${group.done} of ${group.total} bites completed`}>
      {group.done}/{group.total} bites
    </span>
    <span class="chevron" aria-hidden="true">⌄</span>
  </button>

  {#if open}
    <div class="chapters" id={contentId} role="region" aria-labelledby={triggerId}>
      {#each group.chapters as chapter (chapter.id)}
        {@const done = doneCount(chapter)}
        {@const chapterOpen = openChapterId === chapter.id}
        {@const chapterTriggerId = `${idPrefix}-${chapter.id}-trigger`}
        {@const bitesId = `${idPrefix}-${chapter.id}-bites`}
        <button
          class="chapter"
          id={chapterTriggerId}
          aria-expanded={chapterOpen}
          aria-controls={bitesId}
          on:click={() => toggleChapter(chapter)}
        >
          <span class="num" class:done={done === chapter.biteCount}>{chapter.number}</span>
          <span class="chapter-main">
            <b class="ell">{chapter.title}</b>
            <span class="goal ell">{chapter.goal}</span>
          </span>
          <span class="pips" aria-hidden="true">
            {#each chapter.bites as bite}
              <i class:on={!!doneMap[bite.id]}></i>
            {/each}
          </span>
        </button>

        {#if chapterOpen}
          <div class="bites" id={bitesId} role="region" aria-labelledby={chapterTriggerId}>
            {#each chapter.bites as bite (bite.id)}
              <button class="bite" on:click={() => onPlay(chapter, bite)}>
                <span class="kind">{KIND_EN[bite.kind] || bite.kind}</span>
                <span class="bite-title ell">{bite.title}</span>
                <span class="state">
                  {doneMap[bite.id] ? 'Done' : bite.kind === 'pattern' ? 'Lesson' : `${bite.cardCount} cards`}
                </span>
              </button>
            {/each}
          </div>
        {/if}

        {#each group.snacks.filter((snack) => snack.afterChapter === chapter.number) as snack (snack.id)}
          <button class="snack" data-snack-id={snack.id} on:click={() => onPlaySnack(snack)}>
            <span class="kind">Snack</span>
            <span class="bite-title ell">{snack.title}</span>
            <span class="state">{doneMap[snack.id] ? 'Done' : `${snack.cardCount} words`}</span>
          </button>
        {/each}
      {/each}
    </div>
  {/if}
</section>

<style>
  /* every level, chapter, bite and snack is one 1px rule — no nested cards */
  .level { border-top: 1px solid var(--line); }
  .level:last-child { border-bottom: 1px solid var(--line); }
  .level.open { padding-bottom: 12px; border-bottom: 1px solid var(--line); }

  .level-head { width: 100%; min-height: 56px; display: flex; align-items: center; gap: 12px;
    padding: 14px 0 12px; text-align: left; }
  .level-head:disabled { cursor: default; }
  .level-main { flex: 1; min-width: 0; display: grid; }
  .level-main b { font-size: 15.5px; font-weight: 850; letter-spacing: -.01em; }
  .range { font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .count { flex: none; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    font-variant-numeric: tabular-nums; white-space: nowrap; }
  .chevron { flex: none; color: var(--ink-3); font-size: 13px; line-height: 1;
    transition: transform .24s var(--ease); }
  .open .chevron { transform: rotate(180deg); }

  .chapters { animation: reveal .24s var(--ease); }
  @keyframes reveal { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

  .chapter { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 12px; padding: 11px 0;
    border-top: 1px solid var(--line); text-align: left; transition: background-color .12s var(--ease); }
  .chapter:hover { background: var(--wash); }
  .num { flex: none; width: 20px; font-size: 14px; font-weight: 800; color: var(--ink-3);
    font-variant-numeric: tabular-nums; }
  .num.done { color: var(--gold); }
  .chapter-main { flex: 1; min-width: 0; display: grid; }
  .chapter-main b { font-size: 14.5px; font-weight: 750; letter-spacing: -.01em; }
  .goal { font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .ell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pips { flex: none; display: flex; gap: 3px; }
  .pips i { width: 6px; height: 6px; border-radius: 999px; border: 1px solid var(--line-2); }
  .pips i.on { background: var(--gold); border-color: var(--gold); }

  .bites { animation: reveal .24s var(--ease); }
  .bite, .snack { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 10px;
    padding: 10px 0 10px 20px; border-top: 1px solid var(--line); text-align: left;
    transition: background-color .12s var(--ease); }
  .bite:hover, .snack:hover { background: var(--wash); }
  .snack { background: var(--wash); }
  .snack:hover { background: var(--line); }
  .kind { flex: none; width: 62px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .bite-title { flex: 1; min-width: 0; font-size: 14px; font-weight: 750; }
  .state { flex: none; font-size: 11.5px; font-weight: 650; color: var(--ink-3); white-space: nowrap; }

</style>
