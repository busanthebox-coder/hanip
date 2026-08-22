<script>
  import { tick as afterUpdate } from 'svelte';
  import AudioDot from './AudioDot.svelte';
  import { prefs } from '../../lib/prefs.js';

  export let card;
  export let onResolve = () => {};

  let found = 0;
  let ruleShown = false;
  let moreShown = false;
  let hitLines = card.lines.map(() => false);
  let revealElement;

  function tap(lineIdx, token) {
    if (ruleShown) return;
    if (token.hit) {
      if (!hitLines[lineIdx]) {
        hitLines[lineIdx] = true;
        found += 1;
      }
      if (found >= card.lines.length) {
        ruleShown = true;
        onResolve(true);
        showReveal();
      }
    }
  }
  async function showReveal() {
    await afterUpdate();
    revealElement?.scrollIntoView?.({ block: 'nearest' });
  }
  function shakeWrong(e) {
    const el = e.currentTarget;
    el.classList.remove('miss');
    void el.offsetWidth;
    el.classList.add('miss');
  }
  // Order 34: which language leads the instruction (see lib/instructions.js).
  export let lead = 'ko';

  const ASK_KO = '각 문장에서 오늘 배운 문법을 찾아 탭하세요';
  const ASK_EN = "Tap today's grammar form in each sentence";
</script>

<div class="ask">{lead === 'en' ? ASK_EN : ASK_KO}</div>
<div class="ask-en">{lead === 'en' ? ASK_KO : ASK_EN}</div>

<div class="hunt">
  {#each card.lines as line, li}
    <div class="hunt-row" class:found={hitLines[li]}>
      <div class="hunt-line">
        {#each line.tokens as token}
          {#if token.hit}
            <button class="tok" class:hit={hitLines[li]} on:click={() => tap(li, token)}>
              {token.pre}<span class="p">{token.mid}</span>{token.post}
            </button>
          {:else}
            <button class="tok plain" on:click={(e) => { shakeWrong(e); }}>{token.pre}</button>
          {/if}
        {/each}
        <AudioDot text={line.ko} size={26} />
      </div>
      {#if $prefs.romaja === 'shown' && line.romanization}<div class="line-rom">{line.romanization}</div>{/if}
      {#if hitLines[li] && line.en}<div class="line-en">{line.en}</div>
      {:else if !hitLines[li]}<div class="line-todo">Not found yet</div>{/if}
    </div>
  {/each}
</div>

<div class="progress">{found} of {card.lines.length} found</div>

{#if ruleShown}
  <div class="rule" bind:this={revealElement}>
    <div class="rule-head">You found it — {card.rule.name}</div>
    {#if card.sub}<div class="rule-sub">{card.sub}</div>{/if}
    {#if card.more?.funcLead}
      <p class="func-lead">{card.more.funcLead}</p>
    {/if}
    <div class="fork">
      {#each card.rule.rows as row}
        <div class="fork-row">
          <span class="fork-when">{row.when}</span>
          <b class="fork-add">{row.add}</b>
          {#if row.ex}<span class="fork-ex">{row.ex}</span>{/if}
        </div>
      {/each}
    </div>
    {#if card.more && (card.more.func || card.more.keyPoint || card.more.pronunciation)}
      <button class="more-link" on:click={() => { moreShown = !moreShown; }}>
        {moreShown ? 'Less' : 'Full explanation'}
      </button>
      {#if moreShown}
        <div class="more-body">
          {#if card.more.func}<p>{card.more.func}</p>{/if}
          {#if card.more.keyPoint}<p><b>{card.more.keyPoint.label}</b> — {card.more.keyPoint.body}</p>{/if}
          {#if card.more.pronunciation}<p><b>Pronunciation</b> — {card.more.pronunciation}</p>{/if}
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .ask { font-size: 15px; font-weight: 700; line-height: 1.55; color: var(--ink); word-break: keep-all; }
  .ask-en { margin-top: 4px; font-size: 11.5px; font-weight: 650; line-height: 1.5; color: var(--ink-3); word-break: keep-all; }

  .hunt { margin-top: 26px; }
  .hunt-row + .hunt-row { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--line); }
  .hunt-line { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
  /* the sentence stays a sentence — the only affordance is the underline */
  .tok { font-size: 25px; font-weight: 800; letter-spacing: -.02em; line-height: 1.5; color: var(--ink-2);
    word-break: keep-all; transition: color .15s var(--ease); }
  .tok .p { border-bottom: 2px dotted var(--line-2); padding-bottom: 2px; }
  .tok.hit { color: var(--ink); }
  .tok.hit .p { border-bottom: 3px solid var(--gold); font-weight: 850; }
  .hunt-row.found .tok { color: var(--ink); }
  :global(.tok.miss) { animation: shake .28s ease; }
  @keyframes shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  .line-en { margin-top: 5px; font-size: 11.5px; font-weight: 650; line-height: 1.5; color: var(--ink-3); }
  .line-todo { margin-top: 6px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .line-rom { margin-top: 5px; font-size: 12px; font-weight: 650; letter-spacing: .02em; color: var(--ink-3); }

  .progress { margin-top: 20px; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    font-variant-numeric: tabular-nums; }

  .rule { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line); animation: rise .3s var(--ease); }
  @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .rule-head { font-size: 15.5px; font-weight: 850; letter-spacing: -.01em; color: var(--ink); word-break: keep-all; }
  .rule-sub { margin-top: 2px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .func-lead { margin: 12px 0 0; font-size: 15px; font-weight: 500; line-height: 1.85; color: var(--ink-2);
    word-break: keep-all; }
  .fork { margin-top: 18px; }
  .fork-row { display: flex; align-items: baseline; gap: 14px; padding: 11px 0; border-top: 1px solid var(--line); }
  .fork-row:last-child { border-bottom: 1px solid var(--line); }
  .fork-when { flex: none; width: 96px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); line-height: 1.4; }
  .fork-add { font-size: 19px; font-weight: 900; color: var(--ink); word-break: keep-all; }
  .fork-ex { margin-left: auto; font-size: 12.5px; font-weight: 650; color: var(--ink-3); text-align: right;
    word-break: keep-all; }
  .more-link { min-height: 44px; margin-top: 8px; font-size: 12.5px; font-weight: 700; color: var(--ink-3); }
  .more-link:hover { color: var(--ink); }
  .more-body { border-top: 1px solid var(--line); padding-top: 12px; }
  .more-body p { margin: 0 0 10px; font-size: 12.5px; font-weight: 600; line-height: 1.7; color: var(--ink-3);
    word-break: keep-all; }
</style>
