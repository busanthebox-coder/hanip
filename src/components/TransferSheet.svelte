<script>
  // Progress transfer (order 29). Lazy-loaded: nobody needs the codec until they
  // ask to move a learner, and rebuilding word cards pulls the course chunks.
  import { tick } from 'svelte';
  import { get } from 'svelte/store';
  import { activeProfile, touchActive } from '../lib/profiles.js';
  import { progress } from '../lib/store.js';
  import { srs } from '../lib/srs.js';
  import {
    TransferError, decodeCode, encodeCode, loadCardIndex, packState, planImport,
  } from '../lib/transfer.js';

  export let onClose = () => {};

  const profile = activeProfile();
  const compressed = typeof CompressionStream === 'function';

  let sheet;
  let closeButton;
  let code = '';
  let building = true;
  let copied = '';
  let pasted = '';
  let plan = null;
  let error = '';
  let checking = false;
  let applied = null;
  let fileInput;

  tick().then(() => closeButton?.focus());

  (async () => {
    try {
      code = await encodeCode(packState({ progress: get(progress), srs: get(srs) }, {
        name: profile?.name, code: profile?.code,
      }));
    } catch {
      code = '';
    } finally {
      building = false;
    }
  })();

  function keydown(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onClose();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      copied = 'Copied. Paste it into the other device.';
    } catch {
      copied = 'Could not reach the clipboard — select the code and copy it by hand.';
    }
  }

  function saveFile() {
    const stamp = new Date().toISOString().slice(0, 10);
    const label = (profile?.name || 'hanip').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 20);
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `hanip-${label}-${profile?.code || '0000'}-${stamp}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    copied = 'Saved. Move the file to the other device and load it there.';
  }

  async function readFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    pasted = await file.text();
    event.target.value = '';
    await check();
  }

  async function check() {
    checking = true;
    error = '';
    plan = null;
    applied = null;
    try {
      const payload = await decodeCode(pasted);
      const cards = await loadCardIndex();
      plan = planImport({ progress: get(progress), srs: get(srs) }, payload, (ko) => cards.get(ko) || null);
    } catch (failure) {
      error = failure instanceof TransferError
        ? failure.message
        : 'Could not read this code. Check that all of it was pasted.';
    } finally {
      checking = false;
    }
  }

  // Both stores are set only after planImport has validated the whole payload,
  // so a code that fails halfway leaves this device exactly as it was.
  function apply() {
    if (!plan) return;
    progress.set(plan.progress);
    srs.set(plan.srs);
    // the imported work was studied somewhere, so the profile list should date it
    // from the newest completion rather than claiming this learner never started
    const newest = Object.values(plan.progress.done).filter(Number.isFinite);
    if (newest.length) touchActive(Math.max(...newest));
    applied = plan.summary;
    plan = null;
    pasted = '';
  }

  const countLine = (s) => [
    `${s.bites} new bite${s.bites === 1 ? '' : 's'}`,
    `${s.words} new word${s.words === 1 ? '' : 's'}`,
    `${s.grammar} grammar card${s.grammar === 1 ? '' : 's'}`,
  ].join(' · ');
</script>

<svelte:window on:keydown={keydown} />

<div class="layer">
  <button class="scrim" aria-label="Close progress transfer" on:click={onClose}></button>
  <section class="sheet" bind:this={sheet} role="dialog" aria-modal="true" aria-labelledby="transfer-title">
    <header>
      <div>
        <h2 id="transfer-title">Move progress</h2>
        <div class="sub">진도 옮기기</div>
      </div>
      <button class="close" bind:this={closeButton} aria-label="Close progress transfer" on:click={onClose}>×</button>
    </header>

    <p class="limit">Hanip has no server. A profile number tells learners apart on one phone and
      nothing more — to move progress, the code below (or the file) has to travel with it.</p>
    <p class="limit-ko">번호만으로는 다른 기기에서 진도가 살아나지 않아요</p>

    <section class="block" aria-labelledby="send-title">
      <div class="cap" id="send-title">Take {profile?.name || 'this learner'} with you</div>
      <p class="cap-ko">이 프로필의 진도를 코드로 내보내요</p>

      {#if building}
        <p class="note" role="status">Building the code…</p>
      {:else if code}
        <textarea class="code" readonly rows="4" aria-label="Progress code" value={code}></textarea>
        <p class="note">{(code.length / 1024).toFixed(1)}KB{compressed ? '' : ' — this browser cannot compress, so the code is long. Saving it as a file is easier.'}</p>
        <div class="acts">
          <button class="act primary" on:click={copyCode}>Copy code</button>
          <button class="act" on:click={saveFile}>Save as file</button>
        </div>
        {#if copied}<p class="note ok" role="status">{copied}</p>{/if}
      {:else}
        <p class="note bad" role="alert">This device could not build a code. Try again after closing and reopening Hanip.</p>
      {/if}
    </section>

    <section class="block" aria-labelledby="receive-title">
      <div class="cap" id="receive-title">Bring progress in</div>
      <p class="cap-ko">받은 코드를 지금 프로필에 합쳐요</p>

      <textarea
        class="code paste"
        rows="4"
        placeholder="Paste a progress code"
        aria-label="Paste a progress code"
        bind:value={pasted}
      ></textarea>
      <div class="acts">
        <button class="act primary" disabled={!pasted.trim() || checking} on:click={check}>
          {checking ? 'Checking…' : 'Check this code'}
        </button>
        <button class="act" on:click={() => fileInput.click()}>Load a file</button>
        <input class="hidden-file" type="file" accept=".txt,text/plain" bind:this={fileInput} on:change={readFile} />
      </div>

      {#if error}<p class="note bad" role="alert">{error}</p>{/if}

      {#if plan}
        <div class="preview" role="status">
          <b>{countLine(plan.summary)}</b>
          <span>
            Merged into {profile?.name || 'this profile'}{plan.summary.from.name ? ` from ${plan.summary.from.name} #${plan.summary.from.code}` : ''}.
            Nothing already on this device is replaced.
          </span>
          <span class="preview-ko">지금 프로필에 더해집니다 — 기존 진도는 지워지지 않아요</span>
          {#if plan.summary.unresolved > 0}
            <span class="miss">{plan.summary.unresolved} word{plan.summary.unresolved === 1 ? '' : 's'} in the code
              are not in this version of the course and will be left out.</span>
          {/if}
        </div>
        <div class="acts">
          <button class="act primary" on:click={apply}>Add to {profile?.name || 'this profile'}</button>
          <button class="act" on:click={() => { plan = null; }}>Cancel</button>
        </div>
      {/if}

      {#if applied}
        <p class="note ok" role="status">Added. {countLine(applied)}.</p>
      {/if}
    </section>
  </section>
</div>

<style>
  .layer { position: fixed; inset: 0; z-index: 110; display: grid; align-items: end; }
  .scrim { position: absolute; inset: 0; width: 100%; height: 100%; background: var(--ink); opacity: .28; border-radius: 0; }
  .sheet { position: relative; width: min(100%, 520px); max-height: min(90dvh, 800px); margin: 0 auto; overflow-y: auto;
    padding: 20px 22px calc(24px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--line);
    border-radius: 22px 22px 0 0; background: var(--bg); box-shadow: var(--shadow-2);
    animation: sheet-in var(--duration-standard) var(--ease); }
  @keyframes sheet-in { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
  h2 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -.03em; line-height: 1.2; }
  .sub { margin-top: 2px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .close { width: 44px; height: 44px; flex: none; display: grid; place-items: center; color: var(--ink-3);
    font-size: 20px; line-height: 1; }
  .close:hover { color: var(--ink); }

  .limit { margin: 16px 0 0; font-size: 13.5px; font-weight: 650; line-height: 1.6; color: var(--ink-2);
    word-break: keep-all; }
  .limit-ko { margin: 3px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }

  .block { margin-top: 26px; padding-top: 14px; border-top: 1px solid var(--line); }
  .cap { font-size: 15.5px; font-weight: 800; letter-spacing: -.01em; word-break: keep-all; }
  .cap-ko { margin: 2px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }

  .code { width: 100%; margin-top: 12px; padding: 11px 12px; border: 1px solid var(--line-2);
    border-radius: var(--r-chip); background: var(--card); color: var(--ink-2);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; line-height: 1.5;
    resize: vertical; word-break: break-all; transition: border-color .12s var(--ease); }
  .code:focus { outline: none; border-color: var(--accent); }
  .paste { font-family: inherit; font-size: 13px; font-weight: 650; word-break: normal; }
  .hidden-file { display: none; }

  .note { margin: 8px 0 0; font-size: 11.5px; font-weight: 650; line-height: 1.55; color: var(--ink-3);
    word-break: keep-all; font-variant-numeric: tabular-nums; }
  .note.ok { color: var(--good-deep); font-weight: 700; }
  .note.bad { color: var(--bad); font-weight: 700; font-size: 12.5px; }

  .acts { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 10px; }
  .act { min-height: 44px; padding: 9px 14px; border: 1px solid var(--line-2); border-radius: var(--r-chip);
    font-size: 13px; font-weight: 750; color: var(--ink-2);
    transition: border-color .12s var(--ease), color .12s var(--ease); }
  .act:hover { border-color: var(--ink-3); color: var(--ink); }
  .act.primary { border-color: var(--accent); color: var(--accent-deep); }
  .act[disabled] { opacity: .45; }

  .preview { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); display: grid; gap: 4px; }
  .preview b { font-size: 15.5px; font-weight: 850; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
  .preview span { font-size: 12.5px; font-weight: 650; line-height: 1.6; color: var(--ink-3); word-break: keep-all; }
  .preview-ko { font-size: 11.5px !important; }
  .miss { color: var(--bad) !important; font-weight: 700 !important; }
</style>
