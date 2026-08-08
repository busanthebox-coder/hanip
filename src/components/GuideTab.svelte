<script>
  import guideData from '../../data/guide.json';
  import AudioDot from './cards/AudioDot.svelte';
  import { speak } from '../lib/tts.js';

  const tracks = Array.isArray(guideData && guideData.tracks) ? guideData.tracks : [];

  let selectedTrack = null;
  let selectedUnit = null;

  let openGuide = 0; // beginnerGuide accordion — first item open
  let shownEn = {}; // dialogue bubble index -> english visible
  let openNote = {}; // keyPhrase index -> note visible

  function list(unit, key) {
    return unit && Array.isArray(unit[key]) ? unit[key] : [];
  }

  function openUnit(track, unit) {
    selectedTrack = track;
    selectedUnit = unit;
    openGuide = 0;
    shownEn = {};
    openNote = {};
    window.scrollTo(0, 0);
  }

  function goBack() {
    selectedTrack = null;
    selectedUnit = null;
    window.scrollTo(0, 0);
  }

  function toggleGuide(i) {
    openGuide = openGuide === i ? -1 : i;
  }

  function tapPhrase(p, i) {
    if (p && p.ko) speak(p.ko);
    openNote = { ...openNote, [i]: !openNote[i] };
  }

  function toggleEn(i) {
    shownEn = { ...shownEn, [i]: !shownEn[i] };
  }

  function isMe(bubble, i) {
    if (bubble && bubble.speaker) return bubble.speaker === 'You';
    return i % 2 === 1;
  }
</script>

<section class="guide">
  {#if !selectedUnit}
    <!-- ===== List view: tracks → units ===== -->
    <div class="mark">Korea guides</div>
    <p class="sub">Real-life situations, ready to use</p>
    <p class="sub-ko">실전 상황별 한국 생활 가이드</p>

    <div class="tracks">
      {#each tracks as track (track.id)}
        <div class="track">
          <div class="t-head">
            <span class="t-letter">{track.letter}</span>
            <div class="t-main">
              <strong>{track.title}</strong>
              {#if track.summary}<p class="t-sum">{track.summary}</p>{/if}
            </div>
          </div>
          <div class="units">
            {#each list(track, 'units') as unit (unit.id)}
              <button class="u-row" on:click={() => openUnit(track, unit)}>
                <span class="u-main">
                  <span class="u-title">{unit.title}</span>
                  {#if unit.situation}<span class="u-sit">{unit.situation}</span>{/if}
                </span>
                <span class="u-arrow" aria-hidden="true">→</span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- ===== Reader view: one unit ===== -->
    <button class="back" on:click={goBack}>← Guides</button>

    {#if selectedTrack}
      <div class="crumb">{selectedTrack.letter} · {selectedTrack.title}</div>
    {/if}
    <h1 class="u-h">{selectedUnit.title}</h1>
    {#if selectedUnit.situation}
      <p class="situation">{selectedUnit.situation}</p>
    {/if}

    {#if selectedUnit.goal}
      <div class="goal">
        <span class="goal-box" aria-hidden="true">✓</span>
        <div class="goal-body">
          <span class="sec-cap goal-cap">Goal</span>
          <p>{selectedUnit.goal}</p>
        </div>
      </div>
    {/if}

    {#if list(selectedUnit, 'beginnerGuide').length}
      <div class="sec">
        <div class="sec-cap">Before you start</div>
        <div class="acc">
          {#each list(selectedUnit, 'beginnerGuide') as g, i (i)}
            <div class="acc-item" class:open={openGuide === i}>
              <button
                class="acc-head"
                aria-expanded={openGuide === i}
                on:click={() => toggleGuide(i)}
              >
                <span class="acc-title">{g.title}</span>
                <span class="acc-chev" aria-hidden="true">▾</span>
              </button>
              {#if openGuide === i && g.body}
                <p class="acc-body">{g.body}</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if list(selectedUnit, 'steps').length}
      <div class="sec">
        <div class="sec-cap">Steps</div>
        <ol class="steps">
          {#each list(selectedUnit, 'steps') as step, i (i)}
            <li class="step">
              <span class="step-num" aria-hidden="true">{i + 1}</span>
              <span class="step-text">{step}</span>
            </li>
          {/each}
        </ol>
      </div>
    {/if}

    {#if list(selectedUnit, 'keyPhrases').length}
      <div class="sec">
        <div class="sec-cap">Key phrases</div>
        <p class="sec-sub">Tap a phrase to hear it and see the tip</p>
        <div class="phrases">
          {#each list(selectedUnit, 'keyPhrases') as p, i (i)}
            <div class="phrase" class:noted={!!openNote[i]}>
              <div class="p-row">
                <button class="p-main" on:click={() => tapPhrase(p, i)}>
                  <span class="p-ko">{p.ko}</span>
                  {#if p.romanization}<span class="p-rom">{p.romanization}</span>{/if}
                  {#if p.en}<span class="p-en">{p.en}</span>{/if}
                </button>
                <AudioDot text={p.ko || ''} size={30} />
              </div>
              {#if openNote[i] && p.note}
                <p class="p-note">{p.note}</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if list(selectedUnit, 'dialogue').length}
      <div class="sec">
        <div class="sec-cap">Dialogue</div>
        <p class="sec-sub">Tap a bubble to show its English</p>
        <div class="chat">
          {#each list(selectedUnit, 'dialogue') as b, i (i)}
            {@const me = isMe(b, i)}
            <div class="msg" class:me>
              {#if b.speaker}<span class="who">{b.speaker}</span>{/if}
              <button class="bubble" on:click={() => toggleEn(i)}>
                <span class="m-ko">{b.ko}</span>
                {#if b.romanization}<span class="m-rom">{b.romanization}</span>{/if}
                {#if shownEn[i] && b.en}<span class="m-en">{b.en}</span>{/if}
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if list(selectedUnit, 'checkpoints').length}
      <div class="sec">
        <div class="sec-cap">Can-do check</div>
        <ul class="checks">
          {#each list(selectedUnit, 'checkpoints') as c, i (i)}
            <li class="check">
              <span class="check-box" aria-hidden="true"></span>
              <span class="check-text">{c}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if selectedUnit.costs || selectedUnit.notes}
      <div class="sec">
        <div class="sec-cap">Good to know</div>
        <div class="memo">
          {#if selectedUnit.costs}<p>{selectedUnit.costs}</p>{/if}
          {#if selectedUnit.notes}<p>{selectedUnit.notes}</p>{/if}
        </div>
      </div>
    {/if}

    <button class="back back-bottom" on:click={goBack}>← Guides</button>
  {/if}
</section>

<style>
  .guide { max-width: 480px; margin: 0 auto; padding: 30px 20px 40px; }
  .mark { font-size: 16px; font-weight: 900; letter-spacing: -.03em; }
  .sub-ko { margin: 2px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .sub { margin: 6px 0 20px; font-size: 13.5px; color: var(--ink-3); word-break: keep-all; }

  /* ===== List view ===== */
  .tracks { display: grid; gap: 24px; }
  .t-head { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 10px; }
  .t-letter { width: 34px; height: 34px; flex: none; display: grid; place-items: center; border-radius: 12px;
    background: var(--accent-soft); color: var(--accent-deep); font-weight: 850; font-size: 15px; }
  .t-main { min-width: 0; }
  .t-main strong { display: block; font-size: 15.5px; font-weight: 800; word-break: keep-all; line-height: 1.35; padding-top: 1px; }
  .t-sum { margin: 3px 0 0; font-size: 12.5px; color: var(--ink-3); word-break: keep-all; line-height: 1.55; }
  .units { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); overflow: hidden; }
  .u-row { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 10px;
    padding: 12px 15px; text-align: left; border-top: 1px solid var(--line);
    transition: background-color .15s var(--ease); }
  .u-row:first-child { border-top: 0; }
  .u-row:hover { background: var(--bg); }
  .u-main { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .u-title { font-size: 14px; font-weight: 750; word-break: keep-all; }
  .u-sit { font-size: 12px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .u-arrow { flex: none; color: var(--ink-3); font-size: 14px; }

  /* ===== Reader view ===== */
  .back { display: inline-flex; align-items: center; min-height: 44px; padding: 0 4px;
    font-size: 13px; font-weight: 800; color: var(--accent-deep); }
  .back:hover { color: var(--accent); }
  .back-bottom { margin-top: 26px; }
  .crumb { margin-top: 8px; font-size: 11px; font-weight: 850; letter-spacing: .01em; color: var(--ink-3); }
  .u-h { margin: 4px 0 0; font-size: 22px; font-weight: 850; line-height: 1.3; word-break: keep-all; }
  .situation { margin: 8px 0 0; font-size: 14px; color: var(--ink-2); word-break: keep-all; }

  .goal { margin-top: 16px; display: flex; gap: 12px; align-items: flex-start;
    background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); padding: 14px 15px; }
  .goal-box { width: 26px; height: 26px; flex: none; display: grid; place-items: center; margin-top: 1px;
    border-radius: 8px; background: var(--good-soft); color: var(--good-deep); font-size: 14px; font-weight: 850; }
  .goal-body { min-width: 0; }
  .goal-cap { color: var(--good-deep); }
  .goal-body p { margin: 3px 0 0; font-size: 13.5px; color: var(--ink-2); word-break: keep-all; }

  .sec { margin-top: 26px; }
  .sec-cap { display: block; font-size: 11px; font-weight: 850; letter-spacing: .01em; color: var(--ink-3); }
  .sec-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--ink-3); word-break: keep-all; }
  .sec > .acc, .sec > .steps, .sec > .phrases, .sec > .chat, .sec > .checks, .sec > .memo { margin-top: 10px; }

  /* Beginner guide accordion */
  .acc { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); overflow: hidden; }
  .acc-item { border-top: 1px solid var(--line); }
  .acc-item:first-child { border-top: 0; }
  .acc-head { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 10px;
    padding: 12px 15px; text-align: left; transition: background-color .15s var(--ease); }
  .acc-head:hover { background: var(--bg); }
  .acc-title { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 750; word-break: keep-all; }
  .acc-chev { flex: none; color: var(--ink-3); font-size: 12px; transition: transform .2s var(--ease); }
  .acc-item.open .acc-chev { transform: rotate(180deg); }
  .acc-body { margin: 0; padding: 0 15px 13px; font-size: 13px; color: var(--ink-2); word-break: keep-all; }

  /* Steps */
  .steps { list-style: none; margin: 0; padding: 14px 15px; display: grid; gap: 12px;
    background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); }
  .step { display: flex; gap: 11px; align-items: flex-start; }
  .step-num { width: 24px; height: 24px; flex: none; display: grid; place-items: center; margin-top: 1px;
    border-radius: 999px; background: var(--wash); border: 1px solid var(--line-2); color: var(--ink-2);
    font-size: 12px; font-weight: 850; }
  .step-text { min-width: 0; font-size: 13.5px; color: var(--ink-2); word-break: keep-all; }

  /* Key phrases — the heart */
  .phrases { display: grid; gap: 8px; }
  .phrase { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1);
    transition: border-color .15s var(--ease); }
  .phrase.noted { border-color: var(--line-2); }
  .p-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px 12px 15px; }
  .p-main { flex: 1; min-width: 0; min-height: 44px; display: grid; gap: 1px; text-align: left; align-content: center; }
  .p-ko { font-size: 18px; font-weight: 800; line-height: 1.4; word-break: keep-all; }
  .p-rom { font-size: 11.5px; color: var(--ink-3); letter-spacing: .01em; }
  .p-en { font-size: 13px; color: var(--ink-2); word-break: keep-all; }
  .p-note { margin: 0 15px; padding: 9px 0 12px; border-top: 1px solid var(--line);
    font-size: 12.5px; color: var(--ink-2); word-break: keep-all; }

  /* Dialogue bubbles */
  .chat { display: grid; gap: 12px; }
  .msg { display: grid; justify-items: start; max-width: 86%; }
  .msg.me { justify-items: end; margin-left: auto; }
  .who { font-size: 10.5px; font-weight: 850; letter-spacing: .01em;
    color: var(--ink-3); margin: 0 4px 3px; }
  .bubble { display: grid; gap: 2px; text-align: left; min-height: 44px; align-content: center;
    padding: 10px 14px; border-radius: 16px; background: var(--card); border: 1px solid var(--line);
    box-shadow: var(--shadow-1); transition: background-color .15s var(--ease), border-color .15s var(--ease); }
  .msg:not(.me) .bubble { border-bottom-left-radius: 6px; }
  .msg.me .bubble { background: var(--accent-soft); border-color: var(--accent-soft); border-bottom-right-radius: 6px; }
  .bubble:hover { border-color: var(--line-2); }
  .msg.me .bubble:hover { border-color: var(--accent); }
  .m-ko { font-size: 14.5px; font-weight: 750; line-height: 1.45; word-break: keep-all; }
  .msg.me .m-ko { color: var(--accent-deep); }
  .m-rom { font-size: 11px; color: var(--ink-3); }
  .m-en { font-size: 12.5px; color: var(--ink-2); margin-top: 3px; padding-top: 4px; border-top: 1px dashed var(--line-2); word-break: keep-all; }
  .msg.me .m-en { border-top-color: var(--accent); color: var(--accent-deep); }

  /* Checkpoints */
  .checks { list-style: none; margin: 0; padding: 14px 15px; display: grid; gap: 11px;
    background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); }
  .check { display: flex; gap: 11px; align-items: flex-start; }
  .check-box { width: 18px; height: 18px; flex: none; margin-top: 2px; border-radius: 5px;
    border: 1.5px solid var(--line-2); background: var(--bg); }
  .check-text { min-width: 0; font-size: 13.5px; color: var(--ink-2); word-break: keep-all; }

  /* Costs & notes */
  .memo { background: var(--wash); border: 1px solid var(--line); border-radius: 18px; padding: 12px 15px; display: grid; gap: 8px; }
  .memo p { margin: 0; font-size: 12.5px; color: var(--ink-2); word-break: keep-all; }
</style>
