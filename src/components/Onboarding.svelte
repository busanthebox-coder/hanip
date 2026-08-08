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
    <div class="mark">한입</div>
    <button class="skip" on:click={() => finish(1)}>Skip</button>
  </div>

  <div class="steps" aria-label={`Onboarding ${step + 1} of 3`}>
    {#each [0, 1, 2] as index}
      <span class:on={index === step} class:done={index < step}></span>
    {/each}
  </div>

  <section class="card" aria-live="polite">
    {#if step === 0}
      <svg class="bowl" viewBox="0 0 120 120" aria-hidden="true">
        <path d="M18 48h84c0 29-18 47-42 47S18 77 18 48Z" fill="none" stroke="var(--ink)" stroke-width="5"/>
        <path d="M30 48c4-14 14-22 30-22s26 8 30 22" fill="none" stroke="var(--gold)" stroke-width="5" stroke-linecap="round"/>
        <path d="M40 101h40" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
      </svg>
      <div class="place">3-minute microlearning</div>
      <h1 bind:this={title} tabindex="-1">One bite is enough</h1>
      <p>Finish one small bite a day instead of sitting through a long lesson.</p>
      <p class="lead-ko">긴 수업 대신 매일 작은 한입 하나를 끝내요</p>
      <button class="cta" on:click={() => { step = 1; }}><b>Next</b><i>다음</i></button>
    {:else if step === 1}
      <div class="demo" aria-hidden="true">
        <div class="demo-word">괜찮아요</div>
        <div class="demo-opt picked">It's okay<span>Correct</span></div>
        <div class="demo-opt">Never mind</div>
      </div>
      <div class="place">Guess first</div>
      <h1 bind:this={title} tabindex="-1">Learn by answering</h1>
      <p>Guess first, then read the explanation. “Don't know” costs you nothing.</p>
      <p class="lead-ko">먼저 추측하고 바로 설명을 확인해요</p>
      <button class="cta" on:click={() => { step = 2; }}><b>Choose a start</b><i>시작점 고르기</i></button>
    {:else}
      <div class="place">Your first chapter</div>
      <h1 bind:this={title} tabindex="-1">Where should we start?</h1>
      <p>Pick whichever is closest to you right now.</p>
      <p class="lead-ko">지금 가장 가까운 상태를 골라 주세요</p>
      <div class="choices">
        <button on:click={() => finish(1)}>
          <b>Brand new to Korean</b>
          <span>Start at Chapter 1</span>
        </button>
        <button on:click={() => finish(2)}>
          <b>I can read Hangul</b>
          <span>Start at Chapter 2</span>
        </button>
        <button on:click={() => finish(12)}>
          <b>I know the basics</b>
          <span>Start at A2, Chapter 12</span>
        </button>
      </div>
    {/if}
  </section>
</main>

<style>
  .onboarding { min-height: 100dvh; max-width: 480px; margin: 0 auto; padding: 22px 22px 32px;
    display: flex; flex-direction: column; background: var(--bg); }
  .topbar { min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .mark { font-size: 16px; font-weight: 900; letter-spacing: -.03em; }
  .skip { min-height: 44px; padding: 0 2px; font-size: 12.5px; font-weight: 700; color: var(--ink-3); }
  .skip:hover { color: var(--ink); }
  .steps { display: flex; gap: 6px; margin-top: 18px; }
  .steps span { width: 28px; height: 3px; border-radius: 999px; background: var(--progress-track); }
  .steps span.on { background: var(--ink-3); }
  .steps span.done { background: var(--gold); }

  .card { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 30px 0;
    animation: enter var(--duration-standard) var(--ease); }
  @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .bowl { width: 108px; height: 108px; margin-bottom: 26px; }
  .place { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  h1 { margin: 8px 0 0; font-size: clamp(34px, 10vw, 46px); font-weight: 900; line-height: 1.12;
    letter-spacing: -.04em; word-break: keep-all; }
  p { margin: 16px 0 0; font-size: 15.5px; font-weight: 650; line-height: 1.62; color: var(--ink-2);
    word-break: keep-all; }
  .lead-ko { margin: 4px 0 0; font-size: 11.5px; font-weight: 650; line-height: 1.5; color: var(--ink-3); }

  .demo { margin-bottom: 30px; }
  .demo-word { font-size: 34px; font-weight: 900; letter-spacing: -.035em; }
  .demo-opt { display: flex; align-items: center; min-height: 44px; padding: 10px 0;
    border-top: 1px solid var(--line); font-size: 15px; font-weight: 650; color: var(--ink-3); }
  .demo-opt:last-child { border-bottom: 1px solid var(--line); }
  .demo-opt.picked { color: var(--ink); font-weight: 800; }
  .demo-opt span { margin-left: auto; font-size: 13px; font-weight: 900; color: var(--good); }

  .cta { width: 100%; margin-top: 34px; padding: 15px 16px 13px; border-radius: 16px; background: var(--accent);
    color: var(--on-accent); display: grid; gap: 1px; text-align: center; box-shadow: 0 3px 0 var(--accent-deep);
    transition: transform .09s var(--ease), box-shadow .09s var(--ease); }
  .cta:active { transform: translateY(3px); box-shadow: 0 0 0 var(--accent-deep); }
  .cta b { font-size: 17px; font-weight: 850; letter-spacing: -.01em; }
  .cta i { font-size: 10.5px; font-style: normal; font-weight: 700; opacity: .62; }

  .choices { margin-top: 26px; }
  .choices button { width: 100%; min-height: 60px; display: grid; gap: 2px; padding: 15px 0; text-align: left;
    border-top: 1px solid var(--line); transition: background-color .12s var(--ease); }
  .choices button:last-child { border-bottom: 1px solid var(--line); }
  .choices button:hover { background: var(--wash); }
  .choices b { font-size: 15.5px; font-weight: 800; letter-spacing: -.01em; word-break: keep-all; }
  .choices span { font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
</style>
