<script>
  import { buildSnackBlock, chapterProgress, chapterRangeLabel } from '../lib/shelf.js';
  import StatusCell from './StatusCell.svelte';

  export let group;
  export let open = false;
  export let forceOpen = false;
  export let doneMap = {};
  export let currentId = null;   // the one chapter in 72 the learner is standing in
  export let onToggle = () => {};
  export let onPlay = () => {};
  export let onPlaySnack = () => {};
  export let idPrefix = 'shelf';

  let openChapterId = null;
  let openSnacks = [];   // chapter numbers whose snack block is expanded

  const KIND_EN = { words: 'Words', pattern: 'Grammar', dialogue: 'Dialogue', reading: 'Reading', boss: 'Boss' };

  $: triggerId = `${idPrefix}-${group.id}-trigger`;
  $: contentId = `${idPrefix}-${group.id}-content`;
  $: chapterRange = chapterRangeLabel(group.chapters);
  // the id column already says "A1", so the name drops the prefix
  $: levelName = group.label.replace(`${group.id} `, '');
  $: currentChapter = group.chapters.find((chapter) => chapter.id === currentId) || null;
  $: snackNote = group.snacks.length
    ? ` · ${group.snacks.length} snack${group.snacks.length === 1 ? '' : 's'}`
    : '';

  function toggleChapter(chapter) {
    openChapterId = openChapterId === chapter.id ? null : chapter.id;
  }

  function toggleSnacks(number) {
    openSnacks = openSnacks.includes(number)
      ? openSnacks.filter((item) => item !== number)
      : [...openSnacks, number];
  }
</script>

<section class="level" class:open data-level={group.id}>
  <!-- gutter [id 24px][status 22px]; the chevron is the only thing on the right,
       and only here — five per screen, not seventy-two -->
  <button
    class="lvl"
    class:open
    class:here={Boolean(currentChapter)}
    id={triggerId}
    aria-expanded={open}
    aria-controls={contentId}
    disabled={forceOpen}
    on:click={onToggle}
  >
    <span class="id">{group.id}</span>
    <StatusCell
      done={group.done}
      total={group.total}
      label={`${group.done} of ${group.total} chapters done`}
    />
    <span class="col">
      <b>{levelName}</b>
      <span>{chapterRange} · {group.done} of {group.total} done{snackNote}</span>
      <!-- when the level is folded away, this line is the only thing saying
           where the learner actually is; open, the chapter row's ink rail says it -->
      {#if currentChapter && !open}
        <em>In progress — Chapter {currentChapter.number} · {currentChapter.title}</em>
      {/if}
    </span>
    <span class="chev" aria-hidden="true">⌄</span>
  </button>

  {#if open}
    <div class="chapters" id={contentId} role="region" aria-labelledby={triggerId}>
      {#each group.chapters as chapter (chapter.id)}
        {@const prog = chapterProgress(chapter, doneMap)}
        {@const here = chapter.id === currentId}
        {@const chapterOpen = openChapterId === chapter.id}
        {@const chapterTriggerId = `${idPrefix}-${chapter.id}-trigger`}
        {@const bitesId = `${idPrefix}-${chapter.id}-bites`}
        {@const snackBlock = buildSnackBlock(group.snacks, chapter.number, openSnacks)}
        {@const snacksId = `${idPrefix}-${chapter.id}-snacks`}
        <!-- one rule per chapter, and none inside: line → chapter → its parts →
             line, so the block count equals the chapter count no matter how many
             snacks or bites hang underneath -->
        <div class="block">
          <button
            class="chap"
            class:done={prog.state === 'done'}
            class:here
            id={chapterTriggerId}
            aria-expanded={chapterOpen}
            aria-controls={bitesId}
            on:click={() => toggleChapter(chapter)}
          >
            <span class="n">{chapter.number}</span>
            <StatusCell
              done={prog.done}
              total={prog.total}
              label={prog.state === 'done'
                ? 'Chapter complete'
                : `${prog.done} of ${prog.total} bites done`}
            />
            <span class="col">
              <b>{chapter.title}</b>
              <!-- order 31: the goal and the exact fraction ride on this row only.
                   72 goals × 2 lines is 144 grey lines nobody reads. -->
              {#if here}
                <span class="meta">{prog.done}/{prog.total} bites · {chapter.goal}</span>
              {/if}
            </span>
          </button>

          {#if chapterOpen}
            <div class="parts" id={bitesId} role="region" aria-labelledby={chapterTriggerId}>
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

          {#if snackBlock}
            <button
              class="snk snk--head"
              aria-expanded={snackBlock.open}
              aria-controls={snacksId}
              on:click={() => toggleSnacks(chapter.number)}
            >
              <span class="lbl">{snackBlock.label}</span>
              {#if !snackBlock.open}<span class="t">{snackBlock.summary}</span>{/if}
            </button>
            {#if snackBlock.open}
              <div class="parts" id={snacksId}>
                {#each snackBlock.items as snack (snack.id)}
                  <button
                    class="snk"
                    class:done={doneMap[snack.id]}
                    data-snack-id={snack.id}
                    on:click={() => onPlaySnack(snack)}
                  >
                    <span class="t">{snack.title}</span>
                    <span class="c">{doneMap[snack.id] ? 'Done' : `${snack.cardCount} words`}</span>
                  </button>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  /* order 31: the index surface carries no ruling, so these rules are the only
     line system on the screen — and they are drawn between peers only */
  .level { border-top: 1px solid var(--line); }
  .level:last-child { border-bottom: 1px solid var(--line); }
  .level.open { padding-bottom: 12px; border-bottom: 1px solid var(--line); }

  /* the level name stays on screen while its chapters scroll: "which stretch am
     I in" survives independently of "which chapter" */
  .lvl { position: sticky; top: 0; z-index: 2; width: 100%; display: flex; align-items: flex-start;
    gap: 8px; padding: 13px 0 12px; background: var(--bg); text-align: left; }
  .lvl:disabled { cursor: default; }
  .lvl .id { flex: none; width: 24px; font-size: 12.5px; font-weight: 850; color: var(--ink-3);
    line-height: 19px; letter-spacing: -.01em; }
  .lvl .col { flex: 1; min-width: 0; }
  .lvl .col b { display: block; font-size: 15.5px; font-weight: 850; letter-spacing: -.015em; line-height: 19px; }
  .lvl .col span { display: block; margin-top: 2px; font-size: 11.5px; font-weight: 650; color: var(--ink-3);
    font-variant-numeric: tabular-nums; }
  .lvl .col em { display: block; margin-top: 3px; font-style: normal; font-size: 11.5px; font-weight: 700;
    color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lvl .chev { flex: none; color: var(--ink-3); font-size: 13px; line-height: 19px;
    transition: transform .24s var(--ease); }
  .lvl.open .chev { transform: rotate(180deg); }
  .lvl.here .id, .lvl.here .col b { color: var(--ink); }

  .chapters { animation: reveal .24s var(--ease); }
  @keyframes reveal { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

  /* number and state finish inside the left 54px, so reading one row needs no
     round trip to the right edge — and the right edge stays empty, which is what
     lets a title run to two lines without colliding with anything */
  .block { border-top: 1px solid var(--line); padding-bottom: 4px; }
  .chap { position: relative; width: 100%; display: flex; align-items: flex-start; gap: 8px;
    padding: 12px 0; text-align: left; transition: background-color .12s var(--ease); }
  .chap:hover { background: var(--wash); }
  .chap .n { flex: none; width: 24px; text-align: right; font-size: 12.5px; font-weight: 750;
    color: var(--ink-3); line-height: 19px; font-variant-numeric: tabular-nums; }
  .chap .col { flex: 1; min-width: 0; }
  /* two lines, because 9과 and 38과 have titles that a one-line clamp turns into
     a broken row rather than into restraint */
  .chap .col b { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    font-size: 14.5px; font-weight: 780; letter-spacing: -.012em; line-height: 19px; color: var(--ink-2);
    word-break: keep-all; }
  .chap .col .meta { display: block; margin-top: 2px; font-size: 11.5px; font-weight: 650; line-height: 1.45;
    color: var(--ink-3); word-break: keep-all; }
  .chap.done .n { color: var(--gold); }
  .chap.done .col b { color: var(--ink-3); font-weight: 700; }
  .chap.here .n, .chap.here .col b { color: var(--ink); font-weight: 850; }
  /* exactly one row in 72 carries an ink rail: meet it while scrolling and that
     is "now". -22px reaches past the 22px column padding to the screen edge. */
  .chap.here::before { content: ""; position: absolute; left: -22px; top: 8px; bottom: 8px; width: 2px;
    background: var(--ink); }

  .parts { animation: reveal .24s var(--ease); }
  /* bites and snacks are parts of a chapter. They carry no rule of their own —
     a border-top is what promotes anything to "list item", and that promotion is
     what used to make a snack out-weigh the chapter above it. */
  .subrow { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 10px;
    padding: 8px 0 8px 54px; text-align: left; transition: background-color .12s var(--ease); }
  .subrow:hover { background: var(--wash); }
  .kind { flex: none; width: 58px; font-size: 11px; font-weight: 650; color: var(--ink-3); }
  .subrow-title { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 700; color: var(--ink-2); }
  .ell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .state { flex: none; font-size: 11px; font-weight: 650; color: var(--ink-3); white-space: nowrap; }

  /* 54px indent lines the snacks up with the gutter they hang off */
  .snk { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 9px;
    padding: 8px 0 8px 54px; text-align: left; transition: background-color .12s var(--ease); }
  .snk:hover { background: var(--wash); }
  .snk .lbl { flex: none; font-size: 11px; font-weight: 650; color: var(--ink-3); font-style: italic; }
  .snk .t { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 650; color: var(--ink-2);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .snk .c { flex: none; font-size: 11px; font-weight: 650; color: var(--ink-3);
    font-variant-numeric: tabular-nums; }
  .snk.done .t { color: var(--ink-3); }
  /* expanded, the head keeps only the count — the rows below drop the "Snack"
     label because sitting inside the chapter block already says what they are */
  .snk--head { min-height: 36px; }
</style>
