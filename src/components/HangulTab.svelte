<script>
  import { onDestroy } from 'svelte';
  import AudioDot from './cards/AudioDot.svelte';
  import { speak } from '../lib/tts.js';
  import { LEADS, VOWELS, TAILS, LEAD_ROMAJI, VOWEL_ROMAJI, compose } from '../lib/hangul.js';

  // ㅇ as a lead is silent — used to voice bare vowels (ㅏ → 아).
  const OI = LEADS.indexOf('ㅇ');
  const AI = VOWELS.indexOf('ㅏ');

  const BASIC_LEADS = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
    .map((j) => LEADS.indexOf(j));
  const DOUBLE_LEADS = ['ㄲ','ㄸ','ㅃ','ㅆ','ㅉ'].map((j) => LEADS.indexOf(j));

  const BASIC_VOWELS = ['ㅏ','ㅑ','ㅓ','ㅕ','ㅗ','ㅛ','ㅜ','ㅠ','ㅡ','ㅣ']
    .map((j) => VOWELS.indexOf(j));
  const COMPOUND_VOWELS = VOWELS
    .map((_, i) => i)
    .filter((i) => !BASIC_VOWELS.includes(i));

  const TAIL_CHOICES = ['', 'ㄱ', 'ㄴ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅇ'].map((j) => TAILS.indexOf(j));
  const TAIL_ROM = { '': '', 'ㄱ': 'k', 'ㄴ': 'n', 'ㄹ': 'l', 'ㅁ': 'm', 'ㅂ': 'p', 'ㅇ': 'ng' };

  // ---- letter tiles: tap → speak, flash the voiced syllable briefly ----
  let flashKey = null;
  let flashSyll = '';
  let flashTimer = null;

  function tapLetter(key, syll) {
    speak(syll);
    flashKey = key;
    flashSyll = syll;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashKey = null; }, 1100);
  }
  onDestroy(() => clearTimeout(flashTimer));

  // ---- syllable builder: preselect ㅎ + ㅏ + ㄴ → 한 ----
  let leadSel = LEADS.indexOf('ㅎ');
  let vowelSel = VOWELS.indexOf('ㅏ');
  let tailSel = TAILS.indexOf('ㄴ');

  $: built = compose(leadSel, vowelSel, tailSel);
  $: builtRom =
    (leadSel === OI ? '' : LEAD_ROMAJI[leadSel]) +
    VOWEL_ROMAJI[vowelSel] +
    (TAIL_ROM[TAILS[tailSel]] || '');
  $: builtParts =
    LEADS[leadSel] + ' + ' + VOWELS[vowelSel] + (tailSel ? ' + ' + TAILS[tailSel] : '');

  function pickLead(i) { leadSel = i; speak(compose(leadSel, vowelSel, tailSel)); }
  function pickVowel(i) { vowelSel = i; speak(compose(leadSel, vowelSel, tailSel)); }
  function pickTail(i) { tailSel = i; speak(compose(leadSel, vowelSel, tailSel)); }
</script>

<section class="hangul">
  <div class="mark">The Korean alphabet</div>
  <p class="sub">Tap any letter to hear it</p>
  <p class="sub-ko">아무 글자나 탭하면 소리가 나요</p>

  <!-- ── 자음 Consonants ─────────────────────────── -->
  <div class="block">
    <h3 class="sec">Consonants <span class="cnt">14</span></h3>
    <p class="note">Voiced with ㅏ so you can hear them — 자음</p>
    <div class="grid">
      {#each BASIC_LEADS as idx (idx)}
        <button
          class="tile"
          class:hot={flashKey === `c-${idx}`}
          on:click={() => tapLetter(`c-${idx}`, compose(idx, AI, 0))}
        >
          <span class="jamo">{LEADS[idx]}</span>
          <span class="rom" class:say={flashKey === `c-${idx}`}>
            {flashKey === `c-${idx}` ? `→ ${flashSyll}` : LEAD_ROMAJI[idx]}
          </span>
        </button>
      {/each}
    </div>

    <h4 class="mini">Double consonants</h4>
    <div class="grid">
      {#each DOUBLE_LEADS as idx (idx)}
        <button
          class="tile dbl"
          class:hot={flashKey === `c-${idx}`}
          on:click={() => tapLetter(`c-${idx}`, compose(idx, AI, 0))}
        >
          <span class="jamo">{LEADS[idx]}</span>
          <span class="rom" class:say={flashKey === `c-${idx}`}>
            {flashKey === `c-${idx}` ? `→ ${flashSyll}` : LEAD_ROMAJI[idx]}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- ── 모음 Vowels ─────────────────────────────── -->
  <div class="block">
    <h3 class="sec">Vowels <span class="cnt">21</span></h3>
    <h4 class="mini first">Basic vowels</h4>
    <div class="grid">
      {#each BASIC_VOWELS as idx (idx)}
        <button
          class="tile"
          class:hot={flashKey === `v-${idx}`}
          on:click={() => tapLetter(`v-${idx}`, compose(OI, idx, 0))}
        >
          <span class="jamo">{VOWELS[idx]}</span>
          <span class="rom" class:say={flashKey === `v-${idx}`}>
            {flashKey === `v-${idx}` ? `→ ${flashSyll}` : VOWEL_ROMAJI[idx]}
          </span>
        </button>
      {/each}
    </div>

    <h4 class="mini divided">Compound vowels</h4>
    <div class="grid">
      {#each COMPOUND_VOWELS as idx (idx)}
        <button
          class="tile dbl"
          class:hot={flashKey === `v-${idx}`}
          on:click={() => tapLetter(`v-${idx}`, compose(OI, idx, 0))}
        >
          <span class="jamo">{VOWELS[idx]}</span>
          <span class="rom" class:say={flashKey === `v-${idx}`}>
            {flashKey === `v-${idx}` ? `→ ${flashSyll}` : VOWEL_ROMAJI[idx]}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- ── 글자 조립 Build a syllable ──────────────── -->
  <div class="block">
    <h3 class="sec">Build a syllable</h3>
    <p class="note">Pick a lead, a vowel, and an optional final</p>

    <div class="builder">
      <div class="row-lab">Lead 첫소리</div>
      <div class="chips">
        {#each BASIC_LEADS as idx (idx)}
          <button class="chip" class:on={leadSel === idx} on:click={() => pickLead(idx)}>
            {LEADS[idx]}
          </button>
        {/each}
      </div>

      <div class="row-lab">Vowel 모음</div>
      <div class="chips">
        {#each BASIC_VOWELS as idx (idx)}
          <button class="chip" class:on={vowelSel === idx} on:click={() => pickVowel(idx)}>
            {VOWELS[idx]}
          </button>
        {/each}
      </div>

      <div class="row-lab">Final 받침 <span class="opt">(optional)</span></div>
      <div class="chips">
        {#each TAIL_CHOICES as idx (idx)}
          <button class="chip" class:none={idx === 0} class:on={tailSel === idx} on:click={() => pickTail(idx)}>
            {idx === 0 ? 'none' : TAILS[idx]}
          </button>
        {/each}
      </div>

      <div class="result">
        <div class="big-row">
          <span class="big">{built}</span>
          <AudioDot text={built} size={36} />
        </div>
        <div class="big-rom">{builtRom}</div>
        <div class="parts">{builtParts}</div>
      </div>
    </div>
  </div>

  <!-- ── closing tip ─────────────────────────────── -->
  <div class="tip">
    <div class="tip-cap">How blocks read</div>
    <p class="tip-line">Syllable blocks read left→right, top→bottom.</p>
    <p class="tip-line">Every block starts with a consonant — ㅇ is silent before a vowel.</p>
  </div>
</section>

<style>
  .hangul { max-width: 480px; margin: 0 auto; padding: 30px 20px 40px; }
  .mark { font-size: 16px; font-weight: 900; letter-spacing: -.03em; }
  .sub-ko { margin: 2px 0 14px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .sub { margin: 6px 0 18px; font-size: 13.5px; color: var(--ink-3); word-break: keep-all; }

  .block { margin-top: 26px; }
  .sub-ko + .block { margin-top: 0; }
  .sec { margin: 0 0 4px; font-size: 15.5px; font-weight: 800; word-break: keep-all; }
  .cnt { font-size: 11px; font-weight: 850; color: var(--ink-3); background: var(--wash);
    border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; vertical-align: 2px; }
  .note { margin: 0 0 12px; font-size: 12.5px; color: var(--ink-3); word-break: keep-all; }

  .mini { margin: 18px 0 10px; font-size: 11px; font-weight: 850; letter-spacing: .01em; color: var(--ink-3); word-break: keep-all; }
  .mini.first { margin-top: 12px; }
  .mini.divided { border-top: 1px solid var(--line); padding-top: 16px; margin-top: 20px; }

  /* letter tiles */
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .tile { display: grid; place-items: center; gap: 1px; padding: 10px 4px 8px; min-height: 68px;
    background: var(--card); border: 1px solid var(--line); border-radius: var(--r-chip);
    box-shadow: var(--shadow-1);
    transition: background-color .18s var(--ease), border-color .18s var(--ease), transform .12s var(--ease); }
  .tile:hover { background: var(--bg); }
  .tile:active { transform: translateY(1px); }
  .tile.dbl { background: var(--bg); box-shadow: none; }
  .tile.dbl:hover { background: var(--wash); }
  .tile.hot { border-color: var(--accent); background: var(--accent-soft); }
  .jamo { font-size: 30px; font-weight: 800; line-height: 1.15; }
  .rom { font-size: 10.5px; font-weight: 700; color: var(--ink-3); letter-spacing: .04em;
    transition: color .18s var(--ease); }
  .rom.say { color: var(--accent-deep); font-weight: 850; }

  /* builder card */
  .builder { background: var(--card); border: 1px solid var(--line); border-radius: 18px;
    box-shadow: var(--shadow-1); padding: 16px 15px 18px; }
  .row-lab { font-size: 11px; font-weight: 850; letter-spacing: .01em;
    color: var(--ink-2); margin: 14px 0 8px; word-break: keep-all; }
  .row-lab:first-child { margin-top: 0; }
  .opt { font-weight: 700; letter-spacing: .04em; color: var(--ink-3); text-transform: none; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { min-width: 44px; min-height: 44px; padding: 0 10px; display: grid; place-items: center;
    font-size: 17px; font-weight: 800; background: var(--bg); border: 1px solid var(--line-2);
    border-radius: var(--r-chip); color: var(--ink);
    transition: background-color .16s var(--ease), border-color .16s var(--ease), color .16s var(--ease), transform .12s var(--ease); }
  .chip:hover { background: var(--wash); }
  .chip:active { transform: translateY(1px); }
  .chip.none { font-size: 12.5px; font-weight: 750; color: var(--ink-2); }
  .chip.on { background: var(--accent); border-color: var(--accent-deep); color: var(--on-accent); }
  .chip.none.on { color: var(--on-accent); }

  .result { margin-top: 18px; padding: 18px 14px 16px; background: var(--wash);
    border: 1px solid var(--line); border-radius: var(--r-chip); text-align: center; }
  .big-row { display: flex; align-items: center; justify-content: center; gap: 14px; }
  .big { font-size: 78px; font-weight: 800; line-height: 1.05; }
  .big-rom { margin-top: 6px; font-size: 16px; font-weight: 850; letter-spacing: .06em; color: var(--accent-deep); }
  .parts { margin-top: 2px; font-size: 13px; font-weight: 700; color: var(--ink-3); }

  /* closing tip */
  .tip { margin-top: 26px; background: var(--card); border: 1px solid var(--line);
    border-radius: 18px; box-shadow: var(--shadow-1); padding: 15px 16px; }
  .tip-cap { font-size: 11px; font-weight: 850; letter-spacing: .01em;
    color: var(--gold); margin-bottom: 6px; }
  .tip-line { margin: 6px 0 0; font-size: 13.5px; color: var(--ink-2); word-break: keep-all; }
</style>
