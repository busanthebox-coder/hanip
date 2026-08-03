<script>
  import { tick } from 'svelte';
  import { setPref } from '../lib/prefs.js';

  export let onComplete = () => {};

  let step = 0;
  let title;

  $: step, tick().then(() => title?.focus());

  function finish(startChapter) {
    setPref('startChapter', startChapter);
    if (startChapter === 1) setPref('romaja', 'shown');
    setPref('onboardingDone', true);
    onComplete();
  }
</script>

<main class="onboarding">
  <div class="topbar">
    <div class="brand">한입 · HANIP</div>
    <button class="skip" on:click={() => finish(1)}>건너뛰기 · Skip</button>
  </div>

  <div class="steps" aria-label={`온보딩 ${step + 1}/3 · Onboarding ${step + 1} of 3`}>
    {#each [0, 1, 2] as index}
      <span class:on={index === step} class:done={index < step}></span>
    {/each}
  </div>

  <section class="card" aria-live="polite">
    {#if step === 0}
      <div class="bowl-wrap">
        <svg class="bowl" viewBox="0 0 120 120" aria-hidden="true">
          <path d="M18 48h84c0 29-18 47-42 47S18 77 18 48Z" fill="var(--card)" stroke="var(--ink)" stroke-width="5"/>
          <path d="M30 48c4-14 14-22 30-22s26 8 30 22" fill="var(--gold-soft)" stroke="var(--gold)" stroke-width="5" stroke-linecap="round"/>
          <path d="M40 101h40" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="cap">3분 마이크로러닝 · 3-minute microlearning</div>
      <h1 bind:this={title} tabindex="-1">한 입이면 돼요 · One bite is enough</h1>
      <p>긴 수업 대신 매일 작은 한입 하나를 끝내요. · Finish one small bite a day instead of sitting through a long lesson.</p>
      <button class="next" on:click={() => { step = 1; }}>다음 · Next →</button>
    {:else if step === 1}
      <div class="guess-demo" aria-hidden="true">
        <span class="korean">괜찮아요</span>
        <span class="choice">It's okay</span>
        <span class="choice quiet">I don't know</span>
      </div>
      <div class="cap">추측 우선 · Guess first</div>
      <h1 bind:this={title} tabindex="-1">맞히면서 배워요 · Learn by answering</h1>
      <p>먼저 추측하고 바로 설명을 확인해요. ‘몰라요’에는 감점이 없어요. · Guess first, then see the explanation. “I don't know” has no penalty.</p>
      <button class="next" on:click={() => { step = 2; }}>시작점 고르기 · Choose a start →</button>
    {:else}
      <div class="cap">나에게 맞는 첫 과 · Your first chapter</div>
      <h1 bind:this={title} tabindex="-1">어디서 시작할까요? · Where should we start?</h1>
      <p>지금 가장 가까운 상태를 골라 주세요. · Choose the option closest to you now.</p>
      <div class="choices">
        <button on:click={() => finish(1)}>
          <strong>완전 처음이에요 · Brand new</strong>
          <span>1과부터 · Start at Chapter 1</span>
        </button>
        <button on:click={() => finish(2)}>
          <strong>한글은 읽어요 · I can read Hangul</strong>
          <span>2과부터 · Start at Chapter 2</span>
        </button>
        <button on:click={() => finish(12)}>
          <strong>기초는 해요 · I know the basics</strong>
          <span>A2 12과부터 · Start at A2 Chapter 12</span>
        </button>
      </div>
    {/if}
  </section>
</main>

<style>
  .onboarding { min-height: 100dvh; max-width: 480px; margin: 0 auto; padding: var(--space-5) var(--space-5) var(--space-8);
    display: flex; flex-direction: column; background: var(--bg); }
  .topbar { min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .brand { color: var(--accent); font-size: var(--type-overline); font-weight: 900; letter-spacing: .18em; }
  .skip { min-height: 44px; padding: 7px 11px; color: var(--ink-3); font-size: var(--type-body-sm); font-weight: 800; }
  .steps { display: flex; gap: var(--space-2); margin-top: var(--space-5); }
  .steps span { width: 28px; height: 6px; border-radius: 999px; background: var(--line-2); }
  .steps span.on { background: var(--accent); }
  .steps span.done { background: var(--gold); }
  .card { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: var(--space-6) 0; animation: enter var(--duration-standard) var(--ease); }
  @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .bowl-wrap { width: 150px; height: 150px; display: grid; place-items: center; margin-bottom: var(--space-5); border-radius: 999px;
    background: var(--wash); }
  .bowl { width: 116px; height: 116px; }
  .cap { color: var(--accent); font-size: var(--type-overline); font-weight: 850; letter-spacing: .16em; text-transform: uppercase; }
  h1 { margin: var(--space-2) 0 0; font-size: clamp(30px, 9vw, 42px); line-height: 1.18; letter-spacing: -.02em; word-break: keep-all; }
  p { margin: var(--space-4) 0 0; color: var(--ink-2); font-size: var(--type-body); line-height: 1.7; font-weight: 650; word-break: keep-all; }
  .next { min-height: 54px; margin-top: var(--space-8); padding: 13px var(--space-4); border-radius: var(--r-chip); background: var(--accent);
    color: var(--on-accent); font-size: var(--type-title); font-weight: 900; box-shadow: 0 4px 0 var(--accent-deep);
    transition: transform var(--duration-press) var(--ease), box-shadow var(--duration-press) var(--ease); }
  .next:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--accent-deep); }
  .guess-demo { display: grid; gap: var(--space-2); width: min(100%, 320px); margin-bottom: var(--space-6); padding: var(--space-4);
    border: 1px solid var(--line); border-radius: var(--r-card); background: var(--card); box-shadow: var(--shadow-1); }
  .korean { margin-bottom: var(--space-1); font-size: 30px; font-weight: 900; }
  .choice { min-height: 44px; display: flex; align-items: center; padding: 9px var(--space-3); border: 1px solid var(--good);
    border-radius: 12px; background: var(--good-soft); color: var(--good-deep); font-weight: 800; }
  .choice.quiet { border-color: var(--line); background: var(--wash); color: var(--ink-3); }
  .choices { display: grid; gap: var(--space-3); margin-top: var(--space-6); }
  .choices button { min-height: 68px; display: grid; gap: 3px; padding: 13px var(--space-4); border: 1px solid var(--line);
    border-radius: var(--r-chip); background: var(--card); box-shadow: var(--shadow-1); text-align: left;
    transition: border-color var(--duration-micro) var(--ease), transform var(--duration-press) var(--ease); }
  .choices button:hover { border-color: var(--accent); }
  .choices button:active { transform: scale(.985); }
  .choices strong { font-size: var(--type-body); word-break: keep-all; }
  .choices span { color: var(--ink-3); font-size: var(--type-caption); font-weight: 700; }
</style>
