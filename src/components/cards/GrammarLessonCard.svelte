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
    onResolve(option.ok, { picked: option.text });
  }
</script>

<div class="label">{card.label}</div>

{#if card.section === 'intro'}
  <!-- the pattern itself is the hero; the English heading recedes to a lead -->
  <div class="pattern">{card.pattern}</div>
  <p class="lead">{card.body}</p>
  <p class="lead-sub">{card.heading}</p>

{:else if card.section === 'pattern' || card.section === 'examples' || card.section === 'recap'}
  {#if card.pattern}<div class="pattern compact">{card.pattern}</div>{/if}
  <h1>{card.heading}</h1>
  {#if card.body}<p class="lead">{card.body}</p>{/if}
  <div class="rows">
    {#each card.examples || [] as example}
      <div class="row">
        <div class="row-ko">{example.ko} <AudioDot text={example.ko} size={25} /></div>
        {#if $prefs.romaja === 'shown' && example.romanization}<div class="row-rom">{example.romanization}</div>{/if}
        <div class="row-en">{example.en}</div>
        {#if example.note}<div class="row-note">{example.note}</div>{/if}
      </div>
    {/each}
  </div>

{:else if card.section === 'key-point' || card.section === 'formation'}
  <h1>{card.heading}</h1>
  <p class="lead">{card.body}</p>

{:else if card.section === 'form'}
  <h1>{card.heading}</h1>
  <div class="rows">
    {#each card.rows || [] as row}
      <div class="row form-row">
        <span class="when">{row.when}</span>
        <b class="add">{row.add}</b>
        {#if row.ex}<span class="ex">{row.ex}</span>{/if}
      </div>
    {/each}
  </div>

{:else if card.section === 'pronunciation'}
  <h1>{card.heading}</h1>
  <p class="lead">{card.body}</p>
  {#if card.examples?.[0]}
    <div class="sound">
      <span>{card.examples[0].ko}</span>
      <AudioDot text={card.examples[0].ko} size={28} />
    </div>
  {/if}

{:else if card.section === 'exceptions'}
  <h1>{card.heading}</h1>
  <div class="rows">
    {#each card.items || [] as item, index}
      <div class="row numbered"><span class="n">{index + 1}</span><p>{item}</p></div>
    {/each}
  </div>

{:else if card.section === 'pitfall'}
  <h1>{card.heading}</h1>
  <div class="rows">
    <div class="row correction">
      <span class="c-lab bad">Not this</span>
      <p class="bad">{card.wrong}</p>
    </div>
    <div class="row correction">
      <span class="c-lab good">Use this</span>
      <p>{card.right}</p>
    </div>
  </div>
  <p class="reason">{card.body}</p>

{:else if card.section === 'worked'}
  <h1>{card.heading}</h1>
  <p class="model">{card.model}</p>
  {#if card.items?.length}
    <div class="rows">
      <div class="frames-cap">Try these frames</div>
      {#each card.items as item}<div class="row"><p class="frame">{item}</p></div>{/each}
    </div>
  {/if}

{:else if card.section === 'check'}
  <h1>{card.heading}</h1>
  <div class="opts">
    {#each card.options || [] as option}
      <button
        class="opt"
        class:picked={chosen && option.ok}
        class:wrong={chosen === option && !option.ok}
        class:dim={chosen && !option.ok && chosen !== option}
        disabled={!!chosen}
        on:click={() => choose(option)}
      >
        <span class="opt-text">{option.text}</span>
        {#if chosen && option.ok}<span class="mark good">Correct</span>
        {:else if chosen === option}<span class="mark bad">Your answer</span>{/if}
      </button>
    {/each}
  </div>
  {#if chosen}
    <p class="explain">{card.explanation}</p>
  {/if}
{/if}

<style>
  .label { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  h1 { margin: 10px 0 0; font-size: 26px; font-weight: 900; line-height: 1.25; letter-spacing: -.03em;
    word-break: keep-all; }
  .pattern { margin-top: 10px; font-size: clamp(34px, 10vw, 44px); font-weight: 900; letter-spacing: -.04em;
    line-height: 1.1; color: var(--ink); word-break: keep-all; }
  .pattern.compact { font-size: 26px; letter-spacing: -.03em; line-height: 1.25; }
  .lead { margin: 14px 0 0; font-size: 15.5px; font-weight: 650; line-height: 1.62; color: var(--ink-2);
    word-break: keep-all; }
  .lead-sub { margin: 6px 0 0; font-size: 11.5px; font-weight: 650; line-height: 1.5; color: var(--ink-3);
    word-break: keep-all; }

  .rows { margin-top: 24px; }
  .row { padding: 15px 0; border-top: 1px solid var(--line); }
  .row:last-child { border-bottom: 1px solid var(--line); }
  .row-ko { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; font-size: 20px; font-weight: 820;
    line-height: 1.45; word-break: keep-all; }
  .row-rom { margin-top: 3px; font-size: 12px; font-weight: 650; letter-spacing: .02em; color: var(--ink-3); }
  .row-en { margin-top: 3px; font-size: 13px; font-weight: 700; color: var(--ink-2); word-break: keep-all; }
  .row-note { margin-top: 5px; font-size: 11.5px; font-weight: 650; line-height: 1.5; color: var(--ink-3);
    word-break: keep-all; }

  .form-row { display: flex; align-items: baseline; gap: 14px; padding: 13px 0; }
  .when { flex: none; width: 96px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); line-height: 1.4;
    word-break: keep-all; }
  .add { font-size: 22px; font-weight: 900; color: var(--ink); word-break: keep-all; }
  .ex { margin-left: auto; font-size: 12.5px; font-weight: 650; color: var(--ink-3); text-align: right;
    word-break: keep-all; }

  .sound { margin-top: 24px; padding: 16px 0; display: flex; align-items: center; gap: 10px;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font-size: 22px; font-weight: 850; }

  .numbered { display: grid; grid-template-columns: 20px 1fr; gap: 12px; }
  .numbered .n { font-size: 13px; font-weight: 800; color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .numbered p { margin: 0; font-size: 13.5px; font-weight: 650; line-height: 1.6; color: var(--ink-2);
    word-break: keep-all; }

  .correction { display: grid; grid-template-columns: 76px 1fr; gap: 12px; align-items: baseline; }
  .c-lab { font-size: 11.5px; font-weight: 750; }
  .c-lab.bad { color: var(--bad); }
  .c-lab.good { color: var(--good); }
  .correction p { margin: 0; font-size: 19px; font-weight: 820; line-height: 1.45; word-break: keep-all; }
  .correction p.bad { color: var(--bad); }
  .reason { margin: 16px 0 0; font-size: 12.5px; font-weight: 600; line-height: 1.7; color: var(--ink-3);
    word-break: keep-all; }

  .model { margin: 16px 0 0; font-size: 16px; font-weight: 750; line-height: 1.65; color: var(--ink);
    word-break: keep-all; }
  .frames-cap { padding-bottom: 8px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .frame { margin: 0; font-size: 13px; font-weight: 650; line-height: 1.6; color: var(--ink-2); word-break: keep-all; }

  .opts { margin-top: 24px; }
  .opt { display: flex; align-items: center; gap: 10px; min-height: 44px;
    width: calc(100% + var(--sheet-pad, 20px) * 2);
    margin: 0 calc(var(--sheet-pad, 20px) * -1); padding: 12px var(--sheet-pad, 20px);
    border-top: 1px solid var(--line); font-size: 16px; font-weight: 650; line-height: 1.45; color: var(--ink);
    text-align: left; transition: background-color .12s var(--ease), color .12s var(--ease); }
  .opt:last-child { border-bottom: 1px solid var(--line); }
  .opt:hover:not(:disabled) { background: var(--wash); }
  .opt:disabled { cursor: default; }
  .opt-text { min-width: 0; word-break: keep-all; }
  .opt.dim { color: var(--ink-3); font-weight: 600; }
  .opt.picked { background: var(--wash); font-weight: 800; }
  .opt.wrong { color: var(--bad); }
  .mark { margin-left: auto; flex: none; font-size: 13px; font-weight: 900; }
  .mark.good { color: var(--good); }
  .mark.bad { color: var(--bad); }
  .explain { margin: 16px 0 0; font-size: 12.5px; font-weight: 600; line-height: 1.7; color: var(--ink-3);
    word-break: keep-all; }
</style>
