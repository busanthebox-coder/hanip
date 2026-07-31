<script>
  import AudioDot from './AudioDot.svelte';

  export let card;
  export let onResolve = () => {};
  let moreShown = false;

  // a teach card resolves on sight — it exists for content with no huntable morpheme
  onResolve(true);
</script>

<div class="step-label">배우기 · Learn — {card.name}</div>
{#if card.sub}<div class="q">{card.sub}</div>{/if}

{#if card.rows?.length}
  <div class="rule">
    {#each card.rows as row}
      <div class="fork-row">
        <span class="fork-when">{row.when}</span>
        <div>
          <div class="fork-add">{row.add}</div>
          {#if row.ex}<div class="fork-ex">{row.ex}</div>{/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

{#if card.examples?.length}
  <div class="exs">
    {#each card.examples as ex}
      <div class="ex">
        <div class="ex-ko">{ex.ko} <AudioDot text={ex.ko} size={24} /></div>
        {#if ex.en}<div class="ex-en">{ex.en}</div>{/if}
      </div>
    {/each}
  </div>
{/if}

{#if card.more && (card.more.func || card.more.keyPoint)}
  <button class="more-link" on:click={() => { moreShown = !moreShown; }}>더 알아보기 · Full explanation {moreShown ? '⌃' : '⌄'}</button>
  {#if moreShown}
    <div class="more-body">
      {#if card.more.func}<p>{card.more.func}</p>{/if}
      {#if card.more.keyPoint}<p><b>{card.more.keyPoint.label}</b> — {card.more.keyPoint.body}</p>{/if}
      {#if card.more.pronunciation}<p><b>발음</b> — {card.more.pronunciation}</p>{/if}
    </div>
  {/if}
{/if}

<style>
  .step-label { font-size: 11px; font-weight: 850; letter-spacing: .16em; color: var(--accent); text-transform: uppercase; }
  .q { margin-top: 6px; font-size: 18px; font-weight: 800; word-break: keep-all; }
  .rule { margin-top: 14px; padding: 16px; border-radius: 18px; background: var(--card); border: 1px solid var(--line);
    box-shadow: var(--shadow-1); display: grid; gap: 12px; }
  .fork-row { display: grid; grid-template-columns: minmax(72px, auto) 1fr; gap: 12px; align-items: baseline; }
  .fork-when { font-size: 11.5px; font-weight: 850; color: var(--ink-3); line-height: 1.4; }
  .fork-add { font-size: 21px; font-weight: 850; color: var(--accent-deep); word-break: keep-all; }
  .fork-ex { font-size: 13.5px; color: var(--ink-2); word-break: keep-all; }
  .exs { margin-top: 14px; display: grid; gap: 10px; }
  .ex-ko { font-size: 19px; font-weight: 750; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; word-break: keep-all; }
  .ex-en { font-size: 13.5px; color: var(--ink-2); }
  .more-link { margin-top: 12px; justify-self: start; font-size: 12.5px; font-weight: 800; color: var(--accent-deep); }
  .more-body { margin-top: 6px; border-top: 1px solid var(--line); padding-top: 8px; }
  .more-body p { margin: 0 0 8px; font-size: 13px; color: var(--ink-2); line-height: 1.65; word-break: keep-all; }
</style>
