<script>
  import AudioDot from './AudioDot.svelte';

  export let card;
  export let onResolve = () => {};
  let moreShown = false;

  // a teach card resolves on sight — it exists for content with no huntable morpheme
  onResolve(true);
</script>

<div class="label">Learn</div>
<h1>{card.name}</h1>
{#if card.sub}<p class="lead">{card.sub}</p>{/if}
{#if card.more?.funcLead}
  <p class="func-lead">{card.more.funcLead}</p>
{/if}

{#if card.rows?.length}
  <div class="rows">
    {#each card.rows as row}
      <div class="row">
        <span class="when">{row.when}</span>
        <b class="add">{row.add}</b>
        {#if row.ex}<span class="ex">{row.ex}</span>{/if}
      </div>
    {/each}
  </div>
{/if}

{#if card.examples?.length}
  <div class="rows">
    {#each card.examples as ex}
      <div class="row example">
        <div class="ex-ko">{ex.ko} <AudioDot text={ex.ko} size={24} /></div>
        {#if ex.en}<div class="ex-en">{ex.en}</div>{/if}
      </div>
    {/each}
  </div>
{/if}

{#if card.more && (card.more.func || card.more.keyPoint)}
  <button class="more-link" on:click={() => { moreShown = !moreShown; }}>
    {moreShown ? 'Less' : 'Full explanation'}
  </button>
  {#if moreShown}
    <div class="more-body">
      {#if card.more.func}<p>{card.more.func}</p>{/if}
      {#if card.more.keyPoint}<p><b>{card.more.keyPoint.label}</b> — {card.more.keyPoint.body}</p>{/if}
      {#if card.more.pronunciation}<p><b>Pronunciation</b> — {card.more.pronunciation}</p>{/if}
    </div>
  {/if}
{/if}

<style>
  .label { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  h1 { margin: 10px 0 0; font-size: clamp(30px, 9vw, 40px); font-weight: 900; letter-spacing: -.04em;
    line-height: 1.15; word-break: keep-all; }
  .lead { margin: 14px 0 0; font-size: 15.5px; font-weight: 650; line-height: 1.62; color: var(--ink-2);
    word-break: keep-all; }
  .func-lead { margin: 10px 0 0; font-size: 15px; font-weight: 500; line-height: 1.85; color: var(--ink-2);
    word-break: keep-all; }

  .rows { margin-top: 22px; }
  .row { display: flex; align-items: baseline; gap: 14px; padding: 13px 0; border-top: 1px solid var(--line); }
  .row:last-child { border-bottom: 1px solid var(--line); }
  .when { flex: none; width: 96px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); line-height: 1.4;
    word-break: keep-all; }
  .add { font-size: 21px; font-weight: 900; color: var(--ink); word-break: keep-all; }
  .ex { margin-left: auto; font-size: 12.5px; font-weight: 650; color: var(--ink-3); text-align: right;
    word-break: keep-all; }

  .row.example { display: block; padding: 15px 0; }
  .ex-ko { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 20px; font-weight: 820;
    line-height: 1.45; word-break: keep-all; }
  .ex-en { margin-top: 3px; font-size: 13px; font-weight: 700; color: var(--ink-2); word-break: keep-all; }

  .more-link { min-height: 44px; margin-top: 8px; font-size: 12.5px; font-weight: 700; color: var(--ink-3); }
  .more-link:hover { color: var(--ink); }
  .more-body { border-top: 1px solid var(--line); padding-top: 12px; }
  .more-body p { margin: 0 0 10px; font-size: 12.5px; font-weight: 600; line-height: 1.7; color: var(--ink-3);
    word-break: keep-all; }
</style>
