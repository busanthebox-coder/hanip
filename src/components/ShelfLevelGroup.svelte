<script>
  import { chapterRangeLabel } from '../lib/shelf.js';

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
  $: chapterRange = chapterRangeLabel(group.chapters);

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
    <span class="prog" aria-label={`${group.done} of ${group.total} bites completed`}>
      <span class="prog-n">{group.done}<i>/{group.total}</i></span>
      <span class="progbar"><b style="width:{group.total ? (group.done / group.total) * 100 : 0}%"></b></span>
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
            <!-- order 28: the goal runs to two lines. A one-line "…" reads as a
                 broken row, not as restraint. -->
            <span class="goal">{chapter.goal}</span>
          </span>
          <span class="chapter-right">
            {#if done === chapter.biteCount}
              <span class="seal" aria-label="Chapter complete">한입</span>
            {:else}
              <span class="prog" class:prog--off={done === 0}
                aria-label={`${done} of ${chapter.biteCount} bites completed`}>
                <span class="prog-n">{done}<i>/{chapter.biteCount}</i></span>
                <span class="progbar">
                  {#if done > 0}<b style="width:{(done / chapter.biteCount) * 100}%"></b>{/if}
                </span>
              </span>
            {/if}
          </span>
        </button>

        {#if chapterOpen}
          <div class="bites" id={bitesId} role="region" aria-labelledby={chapterTriggerId}>
            {#each chapter.bites as bite (bite.id)}
              <button class="subrow" on:click={() => onPlay(chapter, bite)}>
                <span class="kind">{KIND_EN[bite.kind] || bite.kind}</span>
                <span class="subrow-title ell">{bite.title}</span>
                <span class="state">
                  {doneMap[bite.id] ? 'Done' : bite.kind === 'pattern' ? 'Lesson' : `${bite.cardCount} cards`}
                </span>
              </button>
            {/each}
          </div>
        {/if}

        {#each group.snacks.filter((snack) => snack.afterChapter === chapter.number) as snack (snack.id)}
          <button class="subrow snack" data-snack-id={snack.id} on:click={() => onPlaySnack(snack)}>
            <span class="kind">Snack</span>
            <span class="subrow-title ell">{snack.title}</span>
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
  .chevron { flex: none; color: var(--ink-3); font-size: 13px; line-height: 1;
    transition: transform .24s var(--ease); }
  .open .chevron { transform: rotate(180deg); }

  /* Progress in three readable states: a seal when the chapter is finished,
     n/8 over a 38px bar while it is running, a faded 0/8 before it starts.
     Eight 6px circles said nothing at arm's length. Named .progbar, not .bar —
     .bar already belongs to the player's top rail. */
  .prog { flex: none; display: grid; justify-items: end; gap: 4px; font-variant-numeric: tabular-nums; }
  .prog-n { font-size: 13.5px; font-weight: 800; letter-spacing: -.02em; color: var(--ink); line-height: 1; }
  .prog-n i { font-style: normal; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .progbar { width: 38px; height: 3px; border-radius: 999px; background: var(--progress-track); overflow: hidden; }
  .progbar b { display: block; height: 100%; background: var(--gold); border-radius: 999px; }
  .prog--off .prog-n { color: var(--ink-3); font-weight: 700; }
  .prog--off .prog-n i { opacity: .7; }
  .seal { width: 24px; height: 24px; display: grid; place-items: center; border: 1.2px solid var(--gold);
    border-radius: 5px; color: var(--gold); font-size: 7.5px; font-weight: 900; line-height: 1;
    transform: rotate(-8deg); }

  .chapters { animation: reveal .24s var(--ease); }
  @keyframes reveal { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

  /* the chapter row is the heaviest thing in the list — everything filed under
     it has to read as lighter, or the shelf inverts */
  .chapter { width: 100%; display: flex; align-items: flex-start; gap: 12px; padding: 14px 0;
    border-top: 1px solid var(--line); text-align: left; transition: background-color .12s var(--ease); }
  .chapter:hover { background: var(--wash); }
  .num { flex: none; width: 20px; padding-top: 1px; font-size: 14.5px; font-weight: 800; color: var(--ink-3);
    font-variant-numeric: tabular-nums; }
  .num.done { color: var(--gold); }
  .chapter-main { flex: 1; min-width: 0; display: grid; }
  .chapter-main b { font-size: 15px; font-weight: 820; letter-spacing: -.012em; line-height: 1.35; }
  .goal { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    margin-top: 2px; font-size: 11.5px; font-weight: 650; line-height: 1.5; color: var(--ink-3);
    word-break: keep-all; }
  .ell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chapter-right { flex: none; padding-top: 2px; }

  .bites { animation: reveal .24s var(--ease); }
  /* bites and snacks are parts of a chapter, so they are indented and quieter —
     no filled background, which is what used to make a snack out-weigh a chapter */
  .subrow { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 10px;
    padding: 10px 0 10px 32px; border-top: 1px solid var(--line); text-align: left;
    transition: background-color .12s var(--ease); }
  .subrow:hover { background: var(--wash); }
  .kind { flex: none; width: 58px; font-size: 11px; font-weight: 650; color: var(--ink-3); }
  .subrow-title { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 700; color: var(--ink-2); }
  .snack .subrow-title { font-weight: 650; }
  .snack .kind { font-style: italic; }
  .state { flex: none; font-size: 11px; font-weight: 650; color: var(--ink-3); white-space: nowrap; }

</style>
