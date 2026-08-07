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
    <button class="scrim" aria-label="닫기 · Close" on:click={close}></button>
    <section class="sheet" bind:this={sheet} role="dialog" aria-modal="true" aria-labelledby="gref-title">
      <header>
        <div class="head-main">
          <div class="cap">문법 카드 · Grammar card{#if meta}<span class="meta"> — {meta.level} · {meta.chapterNumber}과</span>{/if}</div>
          <h2 id="gref-title">{rule?.name || bite?.title || '…'}</h2>
          {#if rule?.sub}<div class="sub">{rule.sub}</div>{/if}
        </div>
        <button class="close" bind:this={closeButton} aria-label="닫기 · Close" on:click={close}>×</button>
      </header>

      {#if notLearned}
        <div class="badge">🔒 아직 안 배웠어요 · Not learned yet</div>
      {/if}

      {#if loading || !bite}
        <p class="loading" role="status">불러오는 중 · Loading…</p>
      {:else}
        {#if more.funcLead}
          <p class="func">
            {showFullFunc && hasMoreFunc ? more.func : more.funcLead}
            {#if hasMoreFunc}
              <button class="more-toggle" on:click={() => { showFullFunc = !showFullFunc; }}>
                {showFullFunc ? '접기 · Less' : '더 보기 · More'}
              </button>
            {/if}
          </p>
        {/if}

        {#if rows.length}
          <div class="sec-cap">형태 · Form</div>
          <div class="rows">
            {#each rows as row}
              <div class="row">
                <div class="when">{row.when}</div>
                <div class="add">{row.add}</div>
                {#if row.ex}<div class="ex">{row.ex}</div>{/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if examples.length}
          <div class="sec-cap">예문 · Examples</div>
          <ul class="examples">
            {#each examples as ex}
              <li>
                <AudioDot text={ex.ko} size={30} />
                <div class="ex-text">
                  <span class="ko">{ex.ko}</span>
                  {#if ex.en}<span class="en">{ex.en}</span>{/if}
                </div>
              </li>
            {/each}
          </ul>
        {/if}

        {#if more.keyPoint}
          <div class="sec-cap">핵심 · Key point</div>
          <p class="plain">{more.keyPoint}</p>
        {/if}

        {#if more.pronunciation}
          <div class="sec-cap">발음 · Pronunciation</div>
          <p class="plain">{more.pronunciation}</p>
        {/if}

        {#if more.pitfall}
          <div class="sec-cap">함정 · Watch out</div>
          <div class="pitfall">
            <div class="pit-line bad">✗ {more.pitfall.wrong}</div>
            <div class="pit-line good">✓ {more.pitfall.right}</div>
            {#if more.pitfall.explanation}<p class="pit-why">{more.pitfall.explanation}</p>{/if}
          </div>
        {/if}
      {/if}

      <div class="actions">
        {#if showReplay}
          <button class="go" disabled={loading || !bite} on:click={onReplay}>한입 다시 풀기 · Replay bite</button>
        {/if}
        <button class="ghost" on:click={close}>닫기 · Close</button>
      </div>
    </section>
  </div>
{/if}

<style>
  .layer { position: fixed; inset: 0; z-index: 100; display: grid; align-items: end; }
  .scrim { position: absolute; inset: 0; width: 100%; height: 100%; background: var(--ink); opacity: .36; border-radius: 0; }
  .sheet { position: relative; width: min(100%, 520px); max-height: min(88dvh, 760px); margin: 0 auto; overflow-y: auto;
    padding: 18px var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom, 0px)); border: 1px solid var(--line);
    border-bottom: 0; border-radius: var(--r-card) var(--r-card) 0 0; background: var(--bg); box-shadow: var(--shadow-2);
    animation: sheet-in var(--duration-standard) var(--ease); }
  @keyframes sheet-in { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); }
  .cap { color: var(--accent); font-size: var(--type-overline); font-weight: 850; letter-spacing: .16em; text-transform: uppercase; }
  .cap .meta { color: var(--ink-3); letter-spacing: .08em; }
  h2 { margin: var(--space-1) 0 0; font-size: 24px; line-height: 1.3; }
  .sub { margin-top: 2px; color: var(--ink-3); font-size: 13px; font-weight: 700; }
  .close { width: 44px; height: 44px; flex: none; display: grid; place-items: center; border: 1px solid var(--line);
    border-radius: 999px; background: var(--card); color: var(--ink-3); font-size: 18px; }
  .badge { margin-top: 12px; justify-self: start; display: inline-block; padding: 6px 12px; border-radius: 999px;
    background: var(--gold-soft); color: var(--ink-2); font-size: 12.5px; font-weight: 850; }
  .loading { margin: 26px 0; color: var(--ink-3); font-size: 13.5px; text-align: center; }
  .func { margin: 14px 0 0; color: var(--ink-2); font-size: 14px; line-height: 1.6; word-break: keep-all; }
  .more-toggle { margin-left: 6px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line);
    color: var(--accent-deep); background: var(--card); font-size: 11.5px; font-weight: 800; }
  .sec-cap { margin: 18px 0 8px; color: var(--ink-3); font-size: 11px; font-weight: 850; letter-spacing: .14em; text-transform: uppercase; }
  .rows { display: grid; gap: 6px; }
  .row { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; padding: 10px 12px; border: 1px solid var(--line);
    border-radius: 12px; background: var(--card); }
  .when { color: var(--ink-3); font-size: 12px; font-weight: 700; word-break: keep-all; }
  .add { color: var(--accent-deep); font-size: 15px; font-weight: 900; }
  .ex { grid-column: 1 / -1; color: var(--ink-2); font-size: 13px; line-height: 1.5; }
  .examples { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
  .examples li { display: flex; align-items: flex-start; gap: 10px; padding: 9px 11px; border: 1px solid var(--line);
    border-radius: 12px; background: var(--card); }
  .ex-text { display: grid; gap: 1px; }
  .ko { font-size: 15px; font-weight: 750; line-height: 1.45; }
  .en { color: var(--ink-3); font-size: 12.5px; line-height: 1.45; }
  .plain { margin: 0; color: var(--ink-2); font-size: 13.5px; line-height: 1.6; word-break: keep-all; }
  .pitfall { display: grid; gap: 5px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--card); }
  .pit-line { font-size: 14px; line-height: 1.5; font-weight: 750; }
  .pit-line.bad { color: var(--bad); }
  .pit-line.good { color: var(--good-deep); }
  .pit-why { margin: 3px 0 0; color: var(--ink-3); font-size: 12.5px; line-height: 1.55; }
  .actions { margin-top: 22px; display: grid; gap: 9px; }
  .go { padding: 15px; border-radius: 15px; background: var(--accent); color: var(--on-accent); font-size: 16px; font-weight: 850;
    box-shadow: 0 3px 0 var(--accent-deep); }
  .go:disabled { opacity: .4; }
  .ghost { padding: 12px; border-radius: 15px; border: 1.5px solid var(--line); color: var(--ink-3); font-size: 14.5px; font-weight: 800; }
</style>
