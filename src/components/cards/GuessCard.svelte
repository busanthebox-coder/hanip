<script>
  import { tick as afterUpdate } from 'svelte';
  import AudioDot from './AudioDot.svelte';
  import { prefs } from '../../lib/prefs.js';
  import { srs } from '../../lib/srs.js';
  import { progress, toggleStarred } from '../../lib/store.js';

  export let card;
  export let onResolve = () => {};
  export let onOpenWord = () => {};

  let picked = null;      // option text the learner tapped
  let revealed = false;
  let skipped = false;
  let romajaShown = false;
  let revealElement;

  $: parts = card.sentence && card.target
    ? splitOnce(card.sentence.ko, card.target)
    : null;
  $: starred = ($progress.starred || []).includes(card.word.ko);
  $: direction = card.direction || 'ko→en';
  $: correctOption = direction === 'en→ko' ? card.word.ko : card.word.en;
  // The player records the answer before the reveal renders, so the schedule
  // already holds the real next due date — no second guess at the ladder.
  $: dueInterval = revealed && !skipped ? $srs[card.word.ko]?.interval ?? null : null;

  function splitOnce(text, needle) {
    const at = text.indexOf(needle);
    if (at < 0) return null;
    return { pre: text.slice(0, at), mid: needle, post: text.slice(at + needle.length) };
  }

  function nextReviewEn(days) {
    if (days < 1) return 'Next review later today';
    if (days === 1) return 'Next review tomorrow';
    return `Next review in ${days} days`;
  }
  function nextReviewKo(days) {
    if (days < 1) return '오늘 안에 다시 나와요';
    if (days === 1) return '내일 다시 나와요';
    return `${days}일 뒤에 다시 나와요`;
  }

  function pick(opt) {
    if (revealed) return;
    picked = opt;
    revealed = true;
    onResolve(opt === correctOption, { picked: opt });
    showReveal();
  }
  function giveUp() {
    if (revealed) return;
    revealed = true;
    skipped = true;
    onResolve(false, { skipped: true });
    showReveal();
  }
  async function showReveal() {
    await afterUpdate();
    revealElement?.scrollIntoView?.({ block: 'nearest' });
  }
</script>

{#if direction === 'en→ko'}
  <div class="stem" class:small={revealed}>{card.word.en}</div>
{:else if parts}
  <div class="stem" class:small={revealed}>{parts.pre}<span class="tgt">{parts.mid}</span>{parts.post}</div>
{:else}
  <div class="stem" class:small={revealed}><span class="tgt">{card.word.ko}</span></div>
{/if}
{#if revealed && card.sentence?.en && direction !== 'en→ko'}
  <div class="stem-en">{card.sentence.en}</div>
{/if}

{#if !revealed}
  {#if direction === 'en→ko'}
    <div class="ask">어떤 한국어 단어일까요?</div>
    <div class="ask-en">Which Korean word matches this meaning?</div>
  {:else}
    <div class="ask">{parts ? '밑줄 친 말은 무슨 뜻일까요?' : '무슨 뜻일까요?'}</div>
    <div class="ask-en">What does the highlighted word mean?</div>
  {/if}
{/if}

<div class="opts">
  {#each card.options as opt}
    <button
      class="opt"
      class:dim={revealed && opt !== correctOption && opt !== picked}
      class:picked={revealed && opt === correctOption}
      class:wrong={revealed && picked === opt && opt !== correctOption}
      on:click={() => pick(opt)}
    >
      <span class="opt-text">{opt}</span>
      {#if revealed && opt === correctOption}<span class="mark good">Correct</span>
      {:else if revealed && picked === opt}<span class="mark bad">Your answer</span>{/if}
    </button>
  {/each}
</div>

{#if !revealed}
  <button class="textbtn dunno" on:click={giveUp}>Don't know — just show me</button>
{/if}

{#if revealed}
  <div class="answer" bind:this={revealElement}>
    <div class="answer-head">
      <span class="hero">{card.word.ko}</span>
      <AudioDot text={card.word.ko} />
      <button
        class="star"
        class:on={starred}
        aria-pressed={starred}
        aria-label={starred ? `Remove ${card.word.ko} from saved words` : `Save ${card.word.ko}`}
        on:click={() => toggleStarred(card.word.ko)}
      >{starred ? '★' : '☆'}</button>
    </div>
    <div class="gloss">{card.word.en}</div>
    {#if $prefs.romaja === 'shown' || romajaShown}
      <div class="rom">{card.word.romanization}</div>
    {:else}
      <button class="textbtn rom-btn" on:click={() => { romajaShown = true; }}>Show romanization</button>
    {/if}
    {#if card.word.pos}<div class="pos">{card.word.pos}</div>{/if}

    {#if card.word.nuance || card.note}
      <!-- The instant after a guess is when nuance actually lands, so the reveal
           teaches the distinction instead of only confirming. Plain English
           prose under a single rule — no caption, no coloured gutter. -->
      <div class="note">
        {#if card.word.nuance}<p>{card.word.nuance}</p>{/if}
        {#if card.note}<p class="sub">{card.note}</p>{/if}
      </div>
    {/if}

    {#if dueInterval}
      <div class="srs">
        {nextReviewEn(dueInterval)}
        <span>{nextReviewKo(dueInterval)}</span>
      </div>
    {/if}

    <button class="textbtn book" on:click={() => onOpenWord(card.word.ko)}>See this word in the wordbook →</button>
  </div>
{/if}

<style>
  .stem { font-size: 26px; font-weight: 800; line-height: 1.45; letter-spacing: -.02em; color: var(--ink);
    word-break: keep-all; transition: font-size .18s var(--ease), color .18s var(--ease); }
  .stem.small { font-size: 20px; font-weight: 700; line-height: 1.5; color: var(--ink-2); }
  .tgt { font-weight: 850; color: var(--ink); border-bottom: 2px solid var(--gold); padding-bottom: 1px; }
  .stem-en { margin-top: 5px; font-size: 11.5px; font-weight: 650; line-height: 1.5; color: var(--ink-3); }
  .ask { margin-top: 14px; font-size: 14px; font-weight: 700; color: var(--ink-3); word-break: keep-all; }
  .ask-en { margin-top: 4px; font-size: 11.5px; font-weight: 650; line-height: 1.5; color: var(--ink-3); }

  .opts { margin-top: 18px; }
  /* santa-style answer sheet: the row rules run the full width of the screen,
     so the options read as a list and not as a stack of pills */
  .opt { display: flex; align-items: center; gap: 10px; min-height: 44px;
    width: calc(100% + var(--sheet-pad, 20px) * 2);
    margin: 0 calc(var(--sheet-pad, 20px) * -1); padding: 9px var(--sheet-pad, 20px);
    border-top: 1px solid var(--line); font-size: 15px; font-weight: 650; color: var(--ink); text-align: left;
    transition: background-color .12s var(--ease), color .12s var(--ease); }
  .opt:last-child { border-bottom: 1px solid var(--line); }
  .opt:hover { background: var(--wash); }
  .opt-text { min-width: 0; word-break: keep-all; }
  .opt.dim { color: var(--ink-3); font-weight: 600; }
  .opt.dim:hover { background: none; }
  .opt.picked { background: var(--wash); color: var(--ink); font-weight: 800; }
  .opt.wrong { color: var(--bad); }
  .opt.wrong:hover { background: none; }
  .mark { margin-left: auto; flex: none; font-size: 13px; font-weight: 900; }
  .mark.good { color: var(--good); }
  .mark.bad { color: var(--bad); }

  .textbtn { min-height: 44px; font-size: 12.5px; font-weight: 700; color: var(--ink-3); text-align: left; }
  .textbtn:hover { color: var(--ink); }
  .dunno { margin-top: 4px; }

  .answer { margin-top: 26px; animation: rise .25s var(--ease); }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .answer-head { display: flex; align-items: center; gap: 12px; }
  .hero { font-size: clamp(42px, 14vw, 58px); font-weight: 900; letter-spacing: -.035em; line-height: 1.05;
    word-break: keep-all; }
  .star { width: 44px; height: 44px; flex: none; margin-left: auto; display: grid; place-items: center;
    color: var(--ink-3); font-size: 22px; line-height: 1; }
  .star.on { color: var(--gold); }
  .gloss { margin-top: 8px; font-size: 15.5px; font-weight: 800; letter-spacing: -.01em; color: var(--ink);
    word-break: keep-all; }
  .rom { margin-top: 3px; font-size: 12px; font-weight: 650; letter-spacing: .02em; color: var(--ink-3); }
  .rom-btn { min-height: 32px; margin-top: 2px; display: block; }
  .pos { margin-top: 3px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }

  .note { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line); }
  .note p { margin: 0; font-size: 15px; font-weight: 500; line-height: 1.85; color: var(--ink-2); word-break: keep-all; }
  .note p + p, .note p.sub { margin-top: 10px; font-size: 12.5px; font-weight: 600; line-height: 1.7; color: var(--ink-3); }

  .srs { margin-top: 20px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .srs span { display: block; font-size: 11.5px; font-weight: 650; }
  .book { display: block; margin-top: 6px; }
</style>
