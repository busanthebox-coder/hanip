<script>
  export let group;
  export let open = false;
  export let forceOpen = false;
  export let doneMap = {};
  export let onToggle = () => {};
  export let onPlay = () => {};
  export let idPrefix = 'shelf';

  let openChapterId = null;

  const KIND_KO = { words: '단어', pattern: '무늬', dialogue: '대화', reading: '읽기', boss: '보스' };

  $: triggerId = `${idPrefix}-${group.id}-trigger`;
  $: contentId = `${idPrefix}-${group.id}-content`;
  $: chapterRange = group.chapters.length
    ? `${group.chapters[0].number}-${group.chapters[group.chapters.length - 1].number}과`
    : '챕터 없음';

  function doneCount(chapter) {
    return chapter.bites.filter((bite) => doneMap[bite.id]).length;
  }

  function toggleChapter(chapter) {
    openChapterId = openChapterId === chapter.id ? null : chapter.id;
  }
</script>

<section class="level" class:open class:complete={group.total > 0 && group.done === group.total} data-level={group.id}>
  <button
    class="level-head"
    id={triggerId}
    aria-expanded={open}
    aria-controls={contentId}
    disabled={forceOpen}
    on:click={onToggle}
  >
    <span class="level-main">
      <strong>{group.label}</strong>
      <span>{chapterRange} · {group.chapters.length} chapters</span>
    </span>
    <span class="progress" aria-label={`완료 ${group.done}/${group.total}한입 · ${group.done} of ${group.total} bites completed`}>
      {group.done}/{group.total} 한입
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
        <div class="chapter" class:open={chapterOpen}>
          <button
            class="chapter-head"
            id={chapterTriggerId}
            aria-expanded={chapterOpen}
            aria-controls={bitesId}
            on:click={() => toggleChapter(chapter)}
          >
            <span class="number" class:done={done === chapter.biteCount}>
              {done === chapter.biteCount ? '완' : chapter.number}
            </span>
            <span class="chapter-main">
              <strong>{chapter.title}</strong>
              <span class="goal">{chapter.goal}</span>
            </span>
            <span class="bite-dots" aria-hidden="true">
              {#each chapter.bites as bite}
                <i class:on={!!doneMap[bite.id]}></i>
              {/each}
            </span>
          </button>

          {#if chapterOpen}
            <div class="bites" id={bitesId} role="region" aria-labelledby={chapterTriggerId}>
              {#each chapter.bites as bite (bite.id)}
                <button class="bite" on:click={() => onPlay(chapter, bite)}>
                  <span class="bite-kind">{KIND_KO[bite.kind] || bite.kind}</span>
                  <span class="bite-title">{bite.title}</span>
                  <span class="bite-state">{doneMap[bite.id] ? '완료' : `${bite.cardCount}장`}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .level { overflow: hidden; border: 1px solid var(--line); border-radius: var(--r-card); background: var(--card); box-shadow: var(--shadow-1); }
  .level-head { width: 100%; min-height: 68px; display: flex; align-items: center; gap: 12px;
    padding: 12px 16px; text-align: left;
    transition: background-color .15s var(--ease), transform .09s var(--ease); }
  .level-head:hover { background: var(--bg); }
  .level-head:active { transform: scale(.99); }
  .level-head:disabled { cursor: default; opacity: 1; }
  .level-head:disabled:hover { background: var(--card); }
  .level-main { flex: 1; min-width: 0; display: grid; gap: 4px; }
  .level-main strong { font-size: 15.5px; font-weight: 850; line-height: 1.3; word-break: keep-all; }
  .level-main span { font-size: 12px; color: var(--ink-3); }
  .progress { flex: none; padding: 4px 8px; border-radius: 999px; background: var(--wash);
    border: 1px solid var(--line); color: var(--ink-2); font-size: 12px; font-weight: 850;
    font-variant-numeric: tabular-nums; white-space: nowrap; }
  .complete .progress { background: var(--good-soft); border-color: var(--good-soft); color: var(--good-deep); }
  .chevron { flex: none; color: var(--ink-3); font-size: 18px; line-height: 1;
    transform: rotate(0); transition: transform .24s var(--ease); }
  .open .chevron { transform: rotate(180deg); }

  .chapters { display: grid; gap: 8px; padding: 0 12px 12px;
    animation: reveal .24s var(--ease); }
  @keyframes reveal { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .chapter { overflow: hidden; border: 1px solid var(--line); border-radius: var(--r-chip); background: var(--bg); }
  .chapter-head { width: 100%; min-height: 64px; display: flex; align-items: center; gap: 12px;
    padding: 12px; text-align: left;
    transition: background-color .15s var(--ease), transform .09s var(--ease); }
  .chapter-head:hover { background: var(--wash); }
  .chapter-head:active { transform: scale(.99); }
  .number { width: 40px; height: 40px; flex: none; display: grid; place-items: center; border-radius: 999px;
    background: var(--card); border: 1px solid var(--line-2); font-size: 15.5px; font-weight: 800; }
  .number.done { background: var(--gold); border-color: var(--gold); color: var(--card); }
  .chapter-main { flex: 1; min-width: 0; display: grid; gap: 4px; }
  .chapter-main strong { font-size: 15px; font-weight: 800; line-height: 1.35; word-break: keep-all; }
  .goal { overflow: hidden; color: var(--ink-3); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .bite-dots { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 3px; width: 60px; flex: none; }
  .bite-dots i { width: 6px; height: 6px; border-radius: 999px; background: var(--card); border: 1px solid var(--line-2); }
  .bite-dots i.on { background: var(--gold); border-color: var(--gold); }
  .bites { border-top: 1px solid var(--line); display: grid; background: var(--card);
    animation: reveal .24s var(--ease); }
  .bite { min-height: 48px; display: flex; align-items: center; gap: 8px; padding: 12px;
    text-align: left; border-top: 1px solid var(--line);
    transition: background-color .15s var(--ease), transform .09s var(--ease); }
  .bite:first-child { border-top: 0; }
  .bite:hover { background: var(--bg); }
  .bite:active { transform: scale(.99); }
  .bite-kind { flex: none; padding: 3px 8px; border-radius: 999px; background: var(--accent-soft);
    color: var(--accent-deep); font-size: 10.5px; font-weight: 850; letter-spacing: .08em; }
  .bite-title { flex: 1; min-width: 0; overflow: hidden; font-size: 13.5px; font-weight: 700;
    text-overflow: ellipsis; white-space: nowrap; }
  .bite-state { flex: none; color: var(--ink-3); font-size: 12px; font-weight: 800; }

  @media (max-width: 420px) {
    .level-head { align-items: flex-start; }
    .progress { margin-top: 4px; }
    .bite-dots { display: none; }
  }
</style>
