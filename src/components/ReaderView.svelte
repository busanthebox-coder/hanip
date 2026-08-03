<script>
  import { prefs } from '../lib/prefs.js';

  export let reader;
  export let onBack = () => {};

  let shown = 1;
  let translationOpen = false;
  let answers = {};

  function toggleAnswer(index) {
    answers = { ...answers, [index]: !answers[index] };
  }

  function paragraphText(paragraph) {
    return typeof paragraph === 'string' ? paragraph : paragraph?.ko || '';
  }

  function paragraphRomanization(paragraph, index) {
    if (paragraph && typeof paragraph === 'object') return paragraph.romanization || '';
    return reader.bodyRomanization?.[index] || '';
  }
</script>

<article class="reader-view">
  <button class="back" on:click={onBack}>← 읽을거리 · Back to readers</button>
  <div class="level">{reader.level} · {reader.genre}</div>
  <h2>{reader.title} · {reader.titleEn}</h2>

  <div class="body">
    {#each reader.body.slice(0, shown) as paragraph, index}
      <section class="paragraph">
        <p lang="ko">{paragraphText(paragraph)}</p>
        {#if $prefs.romaja === 'shown' && paragraphRomanization(paragraph, index)}
          <p class="romanization">{paragraphRomanization(paragraph, index)}</p>
        {/if}
        {#if translationOpen}<p class="translation">{reader.bodyTranslation[index]}</p>{/if}
      </section>
    {/each}
  </div>

  <div class="actions">
    {#if shown < reader.body.length}
      <button class="action" on:click={() => { shown += 1; }}>
        계속 읽기 · Keep reading ({shown}/{reader.body.length})
      </button>
    {/if}
    <button class="action quiet" aria-pressed={translationOpen} on:click={() => { translationOpen = !translationOpen; }}>
      {translationOpen ? '번역 숨기기 · Hide translation' : '번역 보기 · Show translation'}
    </button>
  </div>

  {#if shown === reader.body.length}
    <section class="questions">
      <h3>이해 확인 · Check your reading</h3>
      {#each reader.comprehensionQuestions as question, index}
        <button class="question" class:open={answers[index]} on:click={() => toggleAnswer(index)}>
          <strong>{question.prompt}</strong>
          <span>{answers[index] ? `${question.correct} — ${question.explanation}` : '답 보기 · Reveal answer'}</span>
        </button>
      {/each}
    </section>
  {/if}
</article>

<style>
  .reader-view { display: grid; gap: 14px; }
  .back { justify-self: start; min-height: 44px; padding: 8px 13px; border: 1px solid var(--line); border-radius: 999px;
    background: var(--card); color: var(--ink-2); font-size: 12.5px; font-weight: 800; }
  .level { color: var(--accent); font-size: 11px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; }
  h2 { margin: -8px 0 0; font-size: 22px; line-height: 1.35; word-break: keep-all; }
  .body { display: grid; gap: 12px; }
  .paragraph { padding: 16px; border: 1px solid var(--line); border-radius: 18px; background: var(--card); box-shadow: var(--shadow-1); }
  p { margin: 0; font-size: 16px; line-height: 1.9; word-break: keep-all; }
  .romanization { margin-top: 7px; color: var(--ink-3); font-size: 12.5px; line-height: 1.65; letter-spacing: .01em; }
  .translation { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); color: var(--ink-2); font-size: 13.5px; line-height: 1.65; }
  .actions { display: grid; gap: 8px; }
  .action { min-height: 46px; padding: 10px 14px; border-radius: var(--r-chip); background: var(--accent); color: var(--card);
    font-size: 13px; font-weight: 850; }
  .action.quiet { border: 1px solid var(--line); background: var(--card); color: var(--ink-2); }
  .questions { display: grid; gap: 8px; margin-top: 4px; }
  h3 { margin: 0 0 2px; font-size: 15px; }
  .question { min-height: 56px; display: grid; gap: 4px; padding: 13px 14px; border: 1px solid var(--line);
    border-radius: var(--r-chip); background: var(--card); text-align: left; }
  .question strong { font-size: 13.5px; word-break: keep-all; }
  .question span { color: var(--ink-3); font-size: 12px; line-height: 1.5; word-break: keep-all; }
  .question.open { border-color: var(--good); background: var(--good-soft); }
</style>
