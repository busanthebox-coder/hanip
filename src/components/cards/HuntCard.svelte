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
</script>

<div class="step-label">문법 · Grammar hunt</div>
<div class="q">두 문장에서 반복되는 문법 표현을 탭하세요 <span class="q-en">Tap the grammar piece that repeats in both sentences</span></div>

<div class="hunt">
  {#each card.lines as line, li}
    <div class="hunt-row">
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
      {#if ruleShown && line.en}<div class="line-en">{line.en}</div>{/if}
    </div>
  {/each}
</div>

{#if ruleShown}
  <div class="rule" bind:this={revealElement}>
    <div class="rule-cap">발견한 규칙 · You found the rule — {card.rule.name}{#if card.sub} · {card.sub}{/if}</div>
    <div class="fork">
      {#each card.rule.rows as row}
        <div class="fork-row">
          <span class="fork-when">{row.when}</span>
          <div>
            <div class="fork-add">{row.add}</div>
            {#if row.ex}<div class="fork-ex">{row.ex}</div>{/if}
          </div>
        </div>
      {/each}
    </div>
    {#if card.more && (card.more.func || card.more.keyPoint || card.more.pronunciation)}
      <button class="more-link" on:click={() => { moreShown = !moreShown; }}>더 알아보기 · Full explanation {moreShown ? '⌃' : '⌄'}</button>
      {#if moreShown}
        <div class="more-body">
          {#if card.more.func}<p>{card.more.func}</p>{/if}
          {#if card.more.keyPoint}<p><b>{card.more.keyPoint.label}</b> — {card.more.keyPoint.body}</p>{/if}
          {#if card.more.pronunciation}<p><b>발음</b> — {card.more.pronunciation}</p>{/if}
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .step-label { font-size: 11px; font-weight: 850; letter-spacing: .16em; color: var(--accent); text-transform: uppercase; }
  .q { margin-top: 6px; font-size: 19px; font-weight: 800; word-break: keep-all; }
  .q-en { display: block; font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .hunt { margin-top: 16px; display: grid; gap: 14px; }
  .hunt-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .tok { padding: 8px 11px; border-radius: 12px; background: var(--card); border: 1.5px solid var(--line);
    font-size: 21px; font-weight: 750; transition: border-color .12s var(--ease), background .12s var(--ease); }
  .tok:hover { border-color: var(--ink-3); }
  .tok.hit { border-color: var(--gold); background: var(--gold-soft); }
  .tok.hit .p { color: var(--accent); font-weight: 900; }
  :global(.tok.miss) { animation: shake .28s ease; }
  @keyframes shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  .line-en { margin-top: 4px; font-size: 13px; color: var(--ink-3); }
  .line-rom { margin-top: 4px; font-size: 12.5px; color: var(--ink-3); letter-spacing: .01em; }
  .rule { margin-top: 16px; padding: 17px; border-radius: 18px; background: var(--card); border: 1px solid var(--line);
    box-shadow: var(--shadow-1); animation: rise .3s var(--ease); }
  @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .rule-cap { font-size: 11px; font-weight: 850; letter-spacing: .1em; color: var(--ink-3); text-transform: uppercase; }
  .fork { margin-top: 10px; display: grid; gap: 12px; }
  .fork-row { display: grid; grid-template-columns: minmax(72px, auto) 1fr; gap: 12px; align-items: baseline; }
  .fork-when { font-size: 11.5px; font-weight: 850; color: var(--ink-3); line-height: 1.4; }
  .fork-add { font-size: 23px; font-weight: 850; color: var(--accent-deep); word-break: keep-all; }
  .fork-ex { font-size: 13.5px; color: var(--ink-2); word-break: keep-all; }
  .more-link { margin-top: 12px; font-size: 12.5px; font-weight: 800; color: var(--accent-deep); }
  .more-body { margin-top: 8px; border-top: 1px solid var(--line); padding-top: 8px; }
  .more-body p { margin: 0 0 8px; font-size: 13px; color: var(--ink-2); line-height: 1.65; word-break: keep-all; }
</style>
