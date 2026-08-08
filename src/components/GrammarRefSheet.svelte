<script>
  import { tick } from 'svelte';
  import AudioDot from './cards/AudioDot.svelte';
  import { collectExamples, rowsOf, ruleCardOf } from '../lib/grammarRef.js';

  export let open = false;
  export let bite = null;          // full compiled bite (with cards); null while loading
  export let meta = null;          // { level, chapterNumber } — shown when provided
  export let loading = false;
  export let notLearned = false;
  export let showReplay = true;
  export let onReplay = () => {};
  export let onClose = () => {};

  let sheet;
  let closeButton;
  let returnFocus;
  let wasOpen = false;
  let showFullFunc = false;

  $: rule = ruleCardOf(bite);
  $: more = rule?.more || {};
  $: rows = rowsOf(rule);
  $: examples = bite ? collectExamples(bite) : [];
  $: hasMoreFunc = (more.func || '') !== (more.funcLead || '') && (more.func || '').length > 0;

  $: if (open && !wasOpen) {
    wasOpen = true;
    showFullFunc = false;
    returnFocus = typeof document === 'undefined' ? null : document.activeElement;
    tick().then(() => closeButton?.focus());
  }
  $: if (!open && wasOpen) wasOpen = false;

  function close() {
    const target = returnFocus;
    onClose();
    tick().then(() => target?.focus?.());
  }

  function keydown(event) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab' || !sheet) return;
    const controls = [...sheet.querySelectorAll('button:not([disabled])')];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window on:keydown={keydown} />

{#if open}
  <div class="layer">
    <button class="scrim" aria-label="Close" on:click={close}></button>
    <section class="sheet" bind:this={sheet} role="dialog" aria-modal="true" aria-labelledby="gref-title">
      <header>
        <div class="head-main">
          <div class="place">Grammar card{#if meta} · {meta.level} · Chapter {meta.chapterNumber}{/if}</div>
          <h2 id="gref-title">{rule?.name || bite?.title || '…'}</h2>
          {#if rule?.sub}<div class="sub">{rule.sub}</div>{/if}
        </div>
        <button class="close" bind:this={closeButton} aria-label="Close" on:click={close}>×</button>
      </header>

      {#if notLearned}
        <div class="locked">Not learned yet</div>
      {/if}

      {#if loading || !bite}
        <p class="loading" role="status">Loading…</p>
      {:else}
        {#if more.funcLead}
          <p class="func">
            {showFullFunc && hasMoreFunc ? more.func : more.funcLead}
            {#if hasMoreFunc}
              <button class="more-toggle" on:click={() => { showFullFunc = !showFullFunc; }}>
                {showFullFunc ? 'Less' : 'More'}
              </button>
            {/if}
          </p>
        {/if}

        {#if rows.length}
          <div class="sect">Form</div>
          <div class="rows">
            {#each rows as row}
              <div class="row">
                <span class="when">{row.when}</span>
                <b class="add">{row.add}</b>
                {#if row.ex}<span class="ex">{row.ex}</span>{/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if examples.length}
          <div class="sect">Examples</div>
          <ul class="examples">
            {#each examples as ex}
              <li>
                <div class="ex-text">
                  <span class="ko">{ex.ko}</span>
                  {#if ex.en}<span class="en">{ex.en}</span>{/if}
                </div>
                <AudioDot text={ex.ko} size={30} />
              </li>
            {/each}
          </ul>
        {/if}

        {#if more.keyPoint}
          <div class="sect">Key point</div>
          <p class="plain">{more.keyPoint}</p>
        {/if}

        {#if more.pronunciation}
          <div class="sect">Pronunciation</div>
          <p class="plain">{more.pronunciation}</p>
        {/if}

        {#if more.pitfall}
          <div class="sect">Watch out</div>
          <div class="pitfall">
            <div class="pit bad">{more.pitfall.wrong}</div>
            <div class="pit good">{more.pitfall.right}</div>
            {#if more.pitfall.explanation}<p class="pit-why">{more.pitfall.explanation}</p>{/if}
          </div>
        {/if}
      {/if}

      <div class="actions">
        {#if showReplay}
          <button class="cta" disabled={loading || !bite} on:click={onReplay}>
            <b>Replay this bite</b><i>한입 다시 풀기</i>
          </button>
        {/if}
        <button class="ghost" on:click={close}>Close</button>
      </div>
    </section>
  </div>
{/if}

<style>
  .layer { position: fixed; inset: 0; z-index: 100; display: grid; align-items: end; }
  .scrim { position: absolute; inset: 0; width: 100%; height: 100%; background: var(--ink); opacity: .28; border-radius: 0; }
  .sheet { position: relative; width: min(100%, 520px); max-height: min(88dvh, 760px); margin: 0 auto; overflow-y: auto;
    padding: 20px 22px calc(24px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--line);
    border-radius: 22px 22px 0 0; background: var(--bg); box-shadow: var(--shadow-2);
    animation: sheet-in var(--duration-standard) var(--ease); }
  @keyframes sheet-in { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
  .place { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  h2 { margin: 4px 0 0; font-size: 27px; font-weight: 900; letter-spacing: -.03em; line-height: 1.2;
    word-break: keep-all; }
  .sub { margin-top: 2px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .close { width: 44px; height: 44px; flex: none; display: grid; place-items: center; color: var(--ink-3);
    font-size: 20px; line-height: 1; }
  .close:hover { color: var(--ink); }
  .locked { margin-top: 12px; font-size: 11.5px; font-weight: 700; color: var(--ink-3); }
  .loading { margin: 26px 0; font-size: 12.5px; font-weight: 650; color: var(--ink-3); text-align: center; }

  .func { margin: 14px 0 0; font-size: 14px; font-weight: 600; line-height: 1.75; color: var(--ink-2);
    word-break: keep-all; }
  .more-toggle { margin-left: 6px; font-size: 11.5px; font-weight: 700; color: var(--ink-3); }
  .more-toggle:hover { color: var(--ink); }

  .sect { margin: 20px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .rows { margin-top: 2px; }
  .row { display: flex; align-items: baseline; gap: 14px; padding: 11px 0; border-top: 1px solid var(--line); }
  .row:last-child { border-bottom: 1px solid var(--line); }
  .when { flex: none; width: 96px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .add { font-size: 19px; font-weight: 900; color: var(--ink); word-break: keep-all; }
  .ex { margin-left: auto; font-size: 12.5px; font-weight: 650; color: var(--ink-3); text-align: right;
    word-break: keep-all; }

  .examples { margin: 2px 0 0; padding: 0; list-style: none; }
  .examples li { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); }
  .examples li:last-child { border-bottom: 1px solid var(--line); }
  .ex-text { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .ko { font-size: 17px; font-weight: 800; line-height: 1.45; word-break: keep-all; }
  .en { font-size: 11.5px; font-weight: 650; line-height: 1.45; color: var(--ink-3); }

  .plain { margin: 6px 0 0; font-size: 13.5px; font-weight: 600; line-height: 1.7; color: var(--ink-2);
    word-break: keep-all; }
  .pitfall { margin-top: 2px; }
  .pit { padding: 10px 0; border-top: 1px solid var(--line); font-size: 15px; font-weight: 750; line-height: 1.5;
    word-break: keep-all; }
  .pit.bad { color: var(--bad); text-decoration: line-through; text-decoration-color: var(--line-2); }
  .pit.good { color: var(--ink); }
  .pit-why { margin: 8px 0 0; padding-top: 8px; border-top: 1px solid var(--line);
    font-size: 12.5px; font-weight: 600; line-height: 1.65; color: var(--ink-3); word-break: keep-all; }

  .actions { margin-top: 26px; display: grid; gap: 2px; }
  .cta { width: 100%; padding: 15px 16px 13px; border-radius: 16px; background: var(--accent); color: var(--on-accent);
    display: grid; gap: 1px; text-align: center; box-shadow: 0 3px 0 var(--accent-deep);
    transition: transform .09s var(--ease), box-shadow .09s var(--ease); }
  .cta:active { transform: translateY(3px); box-shadow: 0 0 0 var(--accent-deep); }
  .cta:disabled { opacity: .4; pointer-events: none; }
  .cta b { font-size: 17px; font-weight: 850; letter-spacing: -.01em; }
  .cta i { font-size: 10.5px; font-style: normal; font-weight: 700; opacity: .62; }
  .ghost { width: 100%; min-height: 44px; color: var(--ink-3); font-size: 14px; font-weight: 750; text-align: center; }
  .ghost:hover { color: var(--ink); }
</style>
