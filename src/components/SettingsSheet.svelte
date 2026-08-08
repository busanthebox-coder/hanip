<script>
  import { tick } from 'svelte';
  import { prefs, setPref } from '../lib/prefs.js';
  import { resetProgress } from '../lib/store.js';

  export let open = false;
  export let onClose = () => {};
  export let onChangeStart = () => {};

  let sheet;
  let closeButton;
  let returnFocus;
  let wasOpen = false;
  let resetArmed = false;
  let resetDone = false;

  $: if (open && !wasOpen) {
    wasOpen = true;
    resetArmed = false;
    resetDone = false;
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
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function confirmReset() {
    resetProgress();
    resetArmed = false;
    resetDone = true;
  }
</script>

<svelte:window on:keydown={keydown} />

{#if open}
  <div class="layer">
    <button class="scrim" aria-label="Close settings" on:click={close}></button>
    <section class="sheet" bind:this={sheet} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header>
        <div>
          <h2 id="settings-title">Settings</h2>
          <div class="sub">설정</div>
        </div>
        <button class="close" bind:this={closeButton} aria-label="Close settings" on:click={close}>×</button>
      </header>

      <div class="settings">
        <button
          class="row toggle-row"
          role="switch"
          aria-checked={$prefs.romaja === 'shown'}
          on:click={() => setPref('romaja', $prefs.romaja === 'shown' ? 'hidden' : 'shown')}
        >
          <span class="copy">
            <b>Always show romanization</b>
            <small>Pronunciation guides stay visible on learning cards</small>
          </span>
          <span class="switch" class:on={$prefs.romaja === 'shown'} aria-hidden="true"><span></span></span>
        </button>

        <button
          class="row toggle-row"
          role="switch"
          aria-checked={$prefs.autoSpeak}
          on:click={() => setPref('autoSpeak', !$prefs.autoSpeak)}
        >
          <span class="copy">
            <b>Auto-play pronunciation</b>
            <small>Play the word aloud right after an answer</small>
          </span>
          <span class="switch" class:on={$prefs.autoSpeak} aria-hidden="true"><span></span></span>
        </button>

        <button
          class="row toggle-row"
          role="switch"
          aria-checked={$prefs.sound}
          on:click={() => setPref('sound', !$prefs.sound)}
        >
          <span class="copy">
            <b>Sounds</b>
            <small>Answer and completion sounds</small>
          </span>
          <span class="switch" class:on={$prefs.sound} aria-hidden="true"><span></span></span>
        </button>

        <button
          class="row toggle-row"
          role="switch"
          aria-checked={$prefs.haptics}
          on:click={() => setPref('haptics', !$prefs.haptics)}
        >
          <span class="copy">
            <b>Haptics</b>
            <small>Brief feedback on supported devices</small>
          </span>
          <span class="switch" class:on={$prefs.haptics} aria-hidden="true"><span></span></span>
        </button>

        <div class="row block">
          <div class="copy">
            <b>Theme</b>
            <small>Saved for every screen</small>
          </div>
          <div class="segments" role="group" aria-label="Theme">
            {#each [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']] as option}
              <button class:on={$prefs.theme === option[0]} aria-pressed={$prefs.theme === option[0]}
                on:click={() => setPref('theme', option[0])}>{option[1]}</button>
            {/each}
          </div>
        </div>

        <div class="row block">
          <div class="copy">
            <b>Daily goal</b>
            <small>How many bites fill today's bowl</small>
          </div>
          <div class="segments" role="group" aria-label="Daily goal">
            {#each [1, 2, 3] as goal}
              <button class:on={$prefs.dailyGoal === goal} aria-pressed={$prefs.dailyGoal === goal}
                on:click={() => setPref('dailyGoal', goal)}>{goal} bite{goal === 1 ? '' : 's'}</button>
            {/each}
          </div>
        </div>

        <button class="row link-row" on:click={() => { onClose(); onChangeStart(); }}>
          <span class="copy">
            <b>Change starting point</b>
            <small>Pick Chapter 1, 2, or 12 again</small>
          </span>
          <i aria-hidden="true">›</i>
        </button>
      </div>

      <section class="danger" aria-labelledby="danger-title">
        <div class="danger-cap" id="danger-title">Danger zone</div>
        {#if resetArmed}
          <p>Delete completions, learned words, review schedules, collections, saved words, and bowls? Your settings stay.</p>
          <div class="danger-actions">
            <button class="reset confirm" on:click={confirmReset}>Confirm reset</button>
            <button class="cancel" on:click={() => { resetArmed = false; }}>Cancel</button>
          </div>
        {:else}
          <button class="reset" on:click={() => { resetArmed = true; resetDone = false; }}>Reset progress</button>
          {#if resetDone}<p class="reset-done" role="status">Progress reset. Settings were kept.</p>{/if}
        {/if}
      </section>
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
  h2 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -.03em; line-height: 1.2; }
  .sub { margin-top: 2px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .close { width: 44px; height: 44px; flex: none; display: grid; place-items: center; color: var(--ink-3);
    font-size: 20px; line-height: 1; }
  .close:hover { color: var(--ink); }

  /* rows, not cards — a settings sheet is a list */
  .settings { margin-top: 20px; }
  .row { width: 100%; min-height: 56px; padding: 14px 0; border-top: 1px solid var(--line); text-align: left; }
  .row:last-child { border-bottom: 1px solid var(--line); }
  .toggle-row, .link-row { display: flex; align-items: center; justify-content: space-between; gap: 14px;
    transition: background-color .12s var(--ease); }
  .copy { min-width: 0; display: grid; gap: 2px; }
  .copy b { font-size: 14.5px; font-weight: 750; letter-spacing: -.01em; line-height: 1.4; word-break: keep-all; }
  .copy small { font-size: 11.5px; font-weight: 650; line-height: 1.5; color: var(--ink-3); word-break: keep-all; }
  .link-row i { flex: none; font-style: normal; font-size: 15px; color: var(--ink-3); }

  .switch { width: 46px; height: 28px; flex: none; padding: 3px; border-radius: 999px; background: var(--line-2);
    transition: background var(--duration-micro) var(--ease); }
  .switch span { display: block; width: 22px; height: 22px; border-radius: 999px; background: var(--card);
    box-shadow: var(--shadow-1); transition: transform var(--duration-micro) var(--ease); }
  .switch.on { background: var(--accent); }
  .switch.on span { transform: translateX(18px); }

  .block { display: grid; gap: 12px; }
  .segments { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 2px; padding: 3px;
    border-radius: 12px; background: var(--wash); }
  .segments button { min-height: 44px; padding: 6px 5px; border-radius: 9px; color: var(--ink-3); font-size: 12.5px;
    font-weight: 750; line-height: 1.25;
    transition: background var(--duration-micro) var(--ease), color var(--duration-micro) var(--ease); }
  .segments button.on { background: var(--card); color: var(--ink); font-weight: 850; }

  .danger { margin-top: 30px; }
  .danger-cap { font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .danger p { margin: 8px 0 0; font-size: 12.5px; font-weight: 600; line-height: 1.65; color: var(--ink-3);
    word-break: keep-all; }
  .reset { min-height: 44px; margin-top: 8px; font-size: 13.5px; font-weight: 750; color: var(--bad);
    text-align: left; }
  .reset:hover { color: var(--bad); text-decoration: underline; }
  .reset.confirm { padding: 9px 14px; border: 1px solid var(--bad); border-radius: 12px; }
  .danger-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
  .cancel { min-height: 44px; margin-top: 8px; font-size: 13.5px; font-weight: 750; color: var(--ink-3); }
  .cancel:hover { color: var(--ink); }
  .reset-done { color: var(--good-deep) !important; font-weight: 700; }
</style>
