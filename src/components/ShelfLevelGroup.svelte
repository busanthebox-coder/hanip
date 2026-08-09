<script>
  import { buildSnackBlock, chapterProgress, chapterRangeLabel } from '../lib/shelf.js';
  import StatusCell from './StatusCell.svelte';

  export let group;
  export let open = false;
  export let forceOpen = false;
  export let doneMap = {};
  // order 33: the one chapter in 72 that is drawn as a card, with its ledger and
  // its own next bite. Null on a finished course — then no row is promoted.
  export let focus = null;
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
  $: focusId = focus ? focus.chapter.id : null;
  $: currentChapter = group.chapters.find((chapter) => chapter.id === focusId) || null;
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
        {@const here = chapter.id === focusId}
        {@const chapterOpen = openChapterId === chapter.id}
        {@const chapterTriggerId = `${idPrefix}-${chapter.id}-trigger`}
        {@const bitesId = `${idPrefix}-${chapter.id}-bites`}
        {@const snackBlock = buildSnackBlock(group.snacks, chapter.number, openSnacks)}
        {@const snacksId = `${idPrefix}-${chapter.id}-snacks`}
        <!-- one rule per chapter, and none inside: line → chapter → its parts →
             line, so the block count equals the chapter count no matter how many
             snacks or bites hang underneath -->
        <div class="block" class:block--card={here}>
          {#if here}
            <!-- order 33: one row in 72 is an actual card — the screen's single
                 card outline (STYLE §2). It sits in its own place in the list
                 rather than above it, so "carry on" and "where am I" are one
                 object and no other chapter is pushed off the screen for it.
                 ±10px: the card reaches out by exactly the padding it takes
                 back, so its [number][status] gutter stands on the same vertical
                 as the other 71 rows and the number column stays scannable. -->
            <div class="cardrow" data-shelf-card>
              <button
                class="crow"
                id={chapterTriggerId}
                aria-expanded={chapterOpen}
                aria-controls={bitesId}
                on:click={() => toggleChapter(chapter)}
              >
                <span class="n">{chapter.number}</span>
                <StatusCell
                  done={prog.done}
                  total={prog.total}
                  label={`${prog.done} of ${prog.total} bites done`}
                />
                <span class="col">
                  <span class="kick">{focus.kicker}</span>
                  <b>{chapter.title}</b>
                </span>
              </button>
              {#if chapter.goal}<p class="goal">{chapter.goal}</p>{/if}
              <div class="ledger">
                {prog.done} of {prog.total} bites
                {#if focus.nextBite}· next: {focus.nextBite.title}{/if}
              </div>
              {#if focus.nextBite}
                <!-- the shelf continues *this chapter*; Home picks the next bite
                     in the whole course. Same learner, different destination. -->
                <button class="cta" on:click={() => onPlay(chapter, focus.nextBite)}>
                  <b>Continue</b><i>이어서 하기</i>
                </button>
              {/if}
            </div>
          {:else}
          <button
            class="chap"
            class:done={prog.state === 'done'}
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
            </span>
          </button>
          {/if}

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
  .chap { width: 100%; display: flex; align-items: flex-start; gap: 8px;
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
  .chap.done .n { color: var(--gold); }
  .chap.done .col b { color: var(--ink-3); font-weight: 700; }

  /* order 33: the one card on the screen (STYLE §2). It reaches out by 10px and
     takes 10px back as padding, so the gutter inside it stands on the same
     vertical as the other 71 rows — the number column is one unbroken scan.
     The tooth carries on through it (§10-1): a card is a sheet, and a sheet has
     paper grain wherever it lands. */
  .block--card { padding-bottom: 6px; }
  .cardrow { margin: 10px -10px 0; padding: 14px 10px 13px; border: 1px solid var(--line-2);
    border-radius: var(--r-card); box-shadow: var(--shadow-1); background-color: var(--card);
    background-image: radial-gradient(var(--study-grid) 0.6px, transparent 0.7px);
    background-size: 3px 3px; }
  .crow { width: 100%; display: flex; align-items: flex-start; gap: 8px; text-align: left; }
  .crow .n { flex: none; width: 24px; text-align: right; font-size: 12.5px; font-weight: 850;
    color: var(--ink); line-height: 19px; font-variant-numeric: tabular-nums; }
  .crow .col { flex: 1; min-width: 0; }
  .crow .kick { display: block; font-size: 11px; font-weight: 700; color: var(--ink-3); line-height: 1.3; }
  .crow .col b { display: block; margin-top: 2px; font-size: 15.5px; font-weight: 850; letter-spacing: -.015em;
    line-height: 20px; color: var(--ink); word-break: keep-all; }
  /* 54px is the gutter, so the sentence starts under the title, not under the number */
  .goal { margin: 7px 0 0 54px; font-size: 12.5px; font-weight: 650; line-height: 1.5; color: var(--ink-2);
    word-break: keep-all; }
  .ledger { margin: 6px 0 0 54px; font-size: 11.5px; font-weight: 700; color: var(--ink-3);
    font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* the screen's only --accent, and the only CTA on the shelf (STYLE §3) */
  .cta { width: 100%; min-height: 46px; margin-top: 12px; display: grid; justify-items: center;
    align-content: center; gap: 1px; padding: 8px 16px; border-radius: var(--r-chip);
    background: var(--accent); color: var(--on-accent); box-shadow: 0 4px 0 var(--accent-deep);
    transition: transform .12s var(--ease), box-shadow .12s var(--ease); }
  .cta:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--accent-deep); }
  .cta b { font-size: 15.5px; font-weight: 850; letter-spacing: -.015em; line-height: 1.25; }
  .cta i { font-style: normal; font-size: 10.5px; font-weight: 700; opacity: .62; line-height: 1.25; }

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
