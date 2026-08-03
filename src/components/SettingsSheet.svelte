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
    <button class="scrim" aria-label="설정 닫기 · Close settings" on:click={close}></button>
    <section class="sheet" bind:this={sheet} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header>
        <div>
          <div class="cap">내 한입 · My Hanip</div>
          <h2 id="settings-title">설정 · Settings</h2>
        </div>
        <button class="close" bind:this={closeButton} aria-label="설정 닫기 · Close settings" on:click={close}>×</button>
      </header>

      <div class="settings">
        <button
          class="setting toggle-row"
          role="switch"
          aria-checked={$prefs.romaja === 'shown'}
          on:click={() => setPref('romaja', $prefs.romaja === 'shown' ? 'hidden' : 'shown')}
        >
          <span class="setting-copy">
            <strong>로마자 항상 표시 · Always show romanization</strong>
            <small>학습 카드에 발음 표기를 바로 보여 줘요. · Show pronunciation guides on learning cards.</small>
          </span>
          <span class="switch" class:on={$prefs.romaja === 'shown'} aria-hidden="true"><span></span></span>
        </button>

        <button
          class="setting toggle-row"
          role="switch"
          aria-checked={$prefs.autoSpeak}
          on:click={() => setPref('autoSpeak', !$prefs.autoSpeak)}
        >
          <span class="setting-copy">
            <strong>정답 발음 자동 재생 · Auto-play pronunciation</strong>
            <small>정답 뒤 발음을 자동으로 재생해요. · Play pronunciation after an answer.</small>
          </span>
          <span class="switch" class:on={$prefs.autoSpeak} aria-hidden="true"><span></span></span>
        </button>

        <button
          class="setting toggle-row"
          role="switch"
          aria-checked={$prefs.sound}
          on:click={() => setPref('sound', !$prefs.sound)}
        >
          <span class="setting-copy">
            <strong>효과음 · Sounds</strong>
            <small>정답과 완료 효과음을 사용해요. · Use answer and completion sounds.</small>
          </span>
          <span class="switch" class:on={$prefs.sound} aria-hidden="true"><span></span></span>
        </button>

        <button
          class="setting toggle-row"
          role="switch"
          aria-checked={$prefs.haptics}
          on:click={() => setPref('haptics', !$prefs.haptics)}
        >
          <span class="setting-copy">
            <strong>진동 · Haptics</strong>
            <small>지원되는 기기에서 짧은 진동을 사용해요. · Use brief feedback on supported devices.</small>
          </span>
          <span class="switch" class:on={$prefs.haptics} aria-hidden="true"><span></span></span>
        </button>

        <div class="setting block">
          <div class="setting-copy">
            <strong>테마 · Theme</strong>
            <small>사용할 화면 모드를 저장해요. · Save your preferred display mode.</small>
          </div>
          <div class="segments" role="group" aria-label="테마 · Theme">
            {#each [['auto', '자동 · Auto'], ['light', '밝게 · Light'], ['dark', '어둡게 · Dark']] as option}
              <button class:on={$prefs.theme === option[0]} aria-pressed={$prefs.theme === option[0]} on:click={() => setPref('theme', option[0])}>{option[1]}</button>
            {/each}
          </div>
        </div>

        <div class="setting block">
          <div class="setting-copy">
            <strong>하루 목표 · Daily goal</strong>
            <small>매일 채울 한입 수를 골라요. · Choose how many bites to finish each day.</small>
          </div>
          <div class="segments" role="group" aria-label="하루 목표 · Daily goal">
            {#each [1, 2, 3] as goal}
              <button class:on={$prefs.dailyGoal === goal} aria-pressed={$prefs.dailyGoal === goal} on:click={() => setPref('dailyGoal', goal)}>{goal}입 · {goal} bite{goal === 1 ? '' : 's'}</button>
            {/each}
          </div>
        </div>
      </div>

      <button class="change-start" on:click={() => { onClose(); onChangeStart(); }}>
        <span>시작점 다시 고르기 · Change starting point</span>
        <small>1과·2과·12과 중 다시 선택해요. · Choose Chapter 1, 2, or 12 again.</small>
      </button>

      <section class="danger" aria-labelledby="danger-title">
        <div class="danger-cap" id="danger-title">위험 구역 · Danger zone</div>
        {#if resetArmed}
          <p>완료·배운 단어·복습 일정·수집·저장 단어·그릇 기록을 지울까요? 설정은 유지됩니다. · Delete completions, learned words, review schedules, collections, saved words, and bowls? Settings will stay.</p>
          <div class="danger-actions">
            <button class="reset confirm" on:click={confirmReset}>정말 초기화 · Confirm reset</button>
            <button class="cancel" on:click={() => { resetArmed = false; }}>취소 · Cancel</button>
          </div>
        {:else}
          <button class="reset" on:click={() => { resetArmed = true; resetDone = false; }}>진행 초기화 · Reset progress</button>
          {#if resetDone}<p class="reset-done" role="status">진행을 초기화했어요. 설정은 그대로예요. · Progress reset. Settings were kept.</p>{/if}
        {/if}
      </section>
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
  header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
  .cap, .danger-cap { color: var(--accent); font-size: var(--type-overline); font-weight: 850; letter-spacing: .16em; text-transform: uppercase; }
  h2 { margin: var(--space-1) 0 0; font-size: var(--type-heading); line-height: 1.35; }
  .close { width: 44px; height: 44px; flex: none; display: grid; place-items: center; border: 1px solid var(--line);
    border-radius: 999px; background: var(--card); color: var(--ink-2); font-size: 24px; line-height: 1; }
  .close:hover { border-color: var(--line-2); }
  .settings { display: grid; gap: var(--space-2); margin-top: var(--space-5); }
  .setting { width: 100%; min-height: 64px; padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--r-chip);
    background: var(--card); text-align: left; }
  .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .setting-copy { min-width: 0; display: grid; gap: 3px; }
  .setting-copy strong { font-size: var(--type-body-sm); line-height: 1.45; word-break: keep-all; }
  .setting-copy small { color: var(--ink-3); font-size: var(--type-caption); line-height: 1.45; word-break: keep-all; }
  .switch { width: 46px; height: 28px; flex: none; padding: 3px; border-radius: 999px; background: var(--line-2);
    transition: background var(--duration-micro) var(--ease); }
  .switch span { display: block; width: 22px; height: 22px; border-radius: 999px; background: var(--card); box-shadow: var(--shadow-1);
    transition: transform var(--duration-micro) var(--ease); }
  .switch.on { background: var(--accent); }
  .switch.on span { transform: translateX(18px); }
  .block { display: grid; gap: var(--space-3); }
  .segments { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 2px; padding: 3px;
    border-radius: 12px; background: var(--wash); }
  .segments button { min-height: 44px; padding: 6px 5px; border-radius: 9px; color: var(--ink-3); font-size: 11.5px; font-weight: 800;
    line-height: 1.25; transition: background var(--duration-micro) var(--ease), color var(--duration-micro) var(--ease); }
  .segments button.on { background: var(--card); color: var(--accent-deep); box-shadow: var(--shadow-1); }
  .change-start { width: 100%; min-height: 58px; display: grid; gap: 3px; margin-top: var(--space-4); padding: var(--space-3);
    border: 1px solid var(--line); border-radius: var(--r-chip); background: var(--card); text-align: left; }
  .change-start span { color: var(--ink); font-size: var(--type-body-sm); font-weight: 850; }
  .change-start small { color: var(--ink-3); font-size: var(--type-caption); line-height: 1.45; word-break: keep-all; }
  .danger { margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--line); }
  .danger-cap { color: var(--bad); }
  .danger p { margin: var(--space-2) 0 0; color: var(--ink-2); font-size: var(--type-caption); line-height: 1.55; word-break: keep-all; }
  .reset { min-height: 44px; margin-top: var(--space-2); padding: 9px 13px; border: 1px solid var(--bad); border-radius: 12px;
    background: var(--card); color: var(--bad); font-size: var(--type-body-sm); font-weight: 850; }
  .reset.confirm { background: var(--bad); color: var(--on-accent); }
  .danger-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .cancel { min-height: 44px; margin-top: var(--space-2); padding: 9px 13px; border: 1px solid var(--line); border-radius: 12px;
    background: var(--card); color: var(--ink-2); font-size: var(--type-body-sm); font-weight: 850; }
  .reset-done { color: var(--good-deep) !important; font-weight: 750; }
</style>
