<script>
  import AudioDot from './AudioDot.svelte';
  import { prefs } from '../../lib/prefs.js';

  export let card;
  export let onResolve = () => {};

  let chosen = null;

  if (card.kind === 'grammar-lesson') onResolve(true);

  function choose(option) {
    if (chosen) return;
    chosen = option;
    onResolve(option.ok);
  }
</script>

<div class="lesson-label">{card.label}</div>
<h1>{card.heading}</h1>

{#if card.section === 'intro'}
  <div class="pattern">{card.pattern}</div>
  <p class="lead">{card.body}</p>

{:else if card.section === 'pattern' || card.section === 'examples' || card.section === 'recap'}
  {#if card.pattern}<div class="pattern compact">{card.pattern}</div>{/if}
  {#if card.body}<p class="lead recap-body">{card.body}</p>{/if}
  <div class="examples">
    {#each card.examples || [] as example}
      <article class="example">
        <div class="example-ko">{example.ko} <AudioDot text={example.ko} size={25} /></div>
        {#if $prefs.romaja === 'shown' && example.romanization}<div class="romaja">{example.romanization}</div>{/if}
        <div class="example-en">{example.en}</div>
        {#if example.note}<p>{example.note}</p>{/if}
      </article>
    {/each}
  </div>

{:else if card.section === 'key-point' || card.section === 'formation'}
  <div class="explanation">{card.body}</div>

{:else if card.section === 'form'}
  <div class="form-list">
    {#each card.rows || [] as row}
      <article>
        <span>{row.when}</span>
        <strong>{row.add}</strong>
        {#if row.ex}<p>{row.ex}</p>{/if}
      </article>
    {/each}
  </div>

{:else if card.section === 'pronunciation'}
  <div class="sound-copy">{card.body}</div>
  {#if card.examples?.[0]}
    <div class="sound-example">
      <span>{card.examples[0].ko}</span>
      <AudioDot text={card.examples[0].ko} size={28} />
    </div>
  {/if}

{:else if card.section === 'exceptions'}
  <div class="item-list">
    {#each card.items || [] as item, index}
      <div><span>{index + 1}</span><p>{item}</p></div>
    {/each}
  </div>

{:else if card.section === 'pitfall'}
  <div class="correction">
    <div class="wrong"><span>NOT THIS</span><p>{card.wrong}</p></div>
    <div class="right"><span>USE THIS</span><p>{card.right}</p></div>
  </div>
  <p class="reason">{card.body}</p>

{:else if card.section === 'worked'}
  <div class="worked">
    <span>MODEL</span>
    <p>{card.model}</p>
  </div>
  {#if card.items?.length}
    <div class="practice-frames">
      <span>TRY THESE FRAMES</span>
      {#each card.items as item}<p>{item}</p>{/each}
    </div>
  {/if}

{:else if card.section === 'check'}
  <div class="choices">
    {#each card.options || [] as option}
      <button
        class:correct={chosen && option.ok}
        class:wrong={chosen === option && !option.ok}
        disabled={!!chosen}
        on:click={() => choose(option)}
      >{option.text}</button>
    {/each}
  </div>
  {#if chosen}
    <div class:good={chosen.ok} class:bad={!chosen.ok} class="feedback">
      <strong>{chosen.ok ? 'Correct · 맞아요' : 'Not this one · 다시 확인'}</strong>
      <p>{card.explanation}</p>
    </div>
  {/if}
{/if}

<style>
  .lesson-label { color: var(--accent); font-size: 10.5px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
  h1 { margin: 8px 0 0; max-width: 410px; font-size: clamp(27px, 7vw, 35px); line-height: 1.2; letter-spacing: -.04em; word-break: keep-all; }
  .pattern { margin-top: 24px; color: var(--accent-deep); font-size: clamp(26px, 7.4vw, 36px); font-weight: 900; line-height: 1.25; word-break: keep-all; }
  .pattern.compact { margin-top: 18px; font-size: 22px; }
  .lead { margin: 16px 0 0; color: var(--ink-2); font-size: 15px; line-height: 1.7; }
  .recap-body { font-size: 13px; }

  .examples { margin-top: 22px; border-top: 1px solid var(--line); }
  .example { padding: 15px 0; border-bottom: 1px solid var(--line); }
  .example-ko { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; color: var(--ink); font-size: 20px; font-weight: 820; line-height: 1.45; }
  .romaja { margin-top: 2px; color: var(--gold); font-size: 10.5px; font-style: italic; }
  .example-en { margin-top: 2px; color: var(--ink-2); font-size: 13px; font-weight: 720; }
  .example p { margin: 5px 0 0; color: var(--ink-3); font-size: 11.5px; line-height: 1.55; }

  .explanation, .sound-copy { margin-top: 25px; padding-left: 17px; border-left: 3px solid var(--gold); color: var(--ink-2); font-size: 15px; line-height: 1.78; }
  .sound-example { margin-top: 24px; padding: 18px 0; display: flex; align-items: center; gap: 9px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font-size: 22px; font-weight: 850; }

  .form-list { margin-top: 24px; border-top: 1px solid var(--line); }
  .form-list article { padding: 17px 0; border-bottom: 1px solid var(--line); }
  .form-list span { display: block; color: var(--ink-3); font-size: 11px; font-weight: 820; }
  .form-list strong { display: block; margin-top: 2px; color: var(--accent-deep); font-size: 23px; line-height: 1.4; }
  .form-list p { margin: 5px 0 0; color: var(--ink-2); font-size: 12.5px; line-height: 1.55; }

  .item-list { margin-top: 24px; border-top: 1px solid var(--line); }
  .item-list > div { display: grid; grid-template-columns: 28px 1fr; gap: 11px; padding: 15px 0; border-bottom: 1px solid var(--line); }
  .item-list span { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 999px; background: var(--accent-soft); color: var(--accent-deep); font-size: 11px; font-weight: 900; }
  .item-list p { margin: 0; color: var(--ink-2); font-size: 13px; line-height: 1.55; }

  .correction { margin-top: 24px; border-top: 1px solid var(--line); }
  .correction > div { padding: 16px 0; border-bottom: 1px solid var(--line); }
  .correction span { font-size: 9px; font-weight: 900; letter-spacing: .14em; }
  .correction p { margin: 3px 0 0; font-size: 20px; font-weight: 830; line-height: 1.45; }
  .correction .wrong span, .correction .wrong p { color: var(--bad); }
  .correction .right span { color: var(--good-deep); }
  .reason { margin: 16px 0 0; color: var(--ink-2); font-size: 12.5px; line-height: 1.62; }

  .worked { margin-top: 24px; padding: 18px; border: 1.5px solid var(--gold); border-radius: 18px; background: var(--gold-soft); }
  .worked span, .practice-frames > span { color: var(--gold); font-size: 9px; font-weight: 900; letter-spacing: .14em; }
  .worked p { margin: 6px 0 0; color: var(--ink); font-size: 16px; font-weight: 760; line-height: 1.65; }
  .practice-frames { margin-top: 18px; }
  .practice-frames p { margin: 8px 0 0; padding-bottom: 8px; border-bottom: 1px solid var(--line); color: var(--ink-2); font-size: 12px; }

  .choices { margin-top: 24px; display: grid; gap: 11px; }
  .choices button { min-height: 70px; padding: 14px 17px; border: 1.5px solid var(--line); border-radius: 17px; background: var(--card); color: var(--ink); font-size: 17px; font-weight: 800; text-align: left; line-height: 1.45; transition: border-color .15s var(--ease), background .15s var(--ease), transform .09s var(--ease); }
  .choices button:active { transform: scale(.985); }
  .choices button:disabled { opacity: 1; cursor: default; }
  .choices button.correct { border-color: var(--good); background: var(--good-soft); }
  .choices button.wrong { border-color: var(--bad); background: var(--accent-soft); }
  .feedback { margin-top: 14px; padding: 14px 16px; border-radius: 15px; }
  .feedback strong { font-size: 13px; }
  .feedback p { margin: 4px 0 0; color: var(--ink-2); font-size: 11.5px; line-height: 1.55; }
  .feedback.good { background: var(--good-soft); }
  .feedback.good strong { color: var(--good-deep); }
  .feedback.bad { background: var(--accent-soft); }
  .feedback.bad strong { color: var(--accent-deep); }
</style>
