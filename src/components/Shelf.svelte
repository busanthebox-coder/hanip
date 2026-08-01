<script>
  import { progress } from '../lib/store.js';

  export let chapters = [];
  export let onPlay = () => {};
  export let onOpenGuide = () => {};

  let openId = null;

  const KIND_KO = { words: '단어', pattern: '무늬', dialogue: '대화', reading: '읽기', boss: '보스' };

  $: state = $progress;
  function doneCount(ch) {
    return ch.bites.filter((b) => state.done[b.id]).length;
  }
</script>

<section class="shelf">
  <div class="cap">책장 · Bookshelf — the whole A1 course</div>
  <p class="sub">Open a chapter to see its bites — replay any of them anytime. · 챕터를 열면 한입 목록이 나와요.</p>

  <button class="guide-card" on:click={onOpenGuide}>
    <span class="g-ico">🧭</span>
    <span class="g-main">
      <strong>가이드북 · Korea guides</strong>
      <span>Real-life survival guides — arrival, transport, food, emergencies · 실전 생활 가이드 20편</span>
    </span>
    <span class="g-chev">▸</span>
  </button>

  <div class="rows">
    {#each chapters as ch}
      {@const done = doneCount(ch)}
      <div class="ch" class:open={openId === ch.id}>
        <button class="head" on:click={() => { openId = openId === ch.id ? null : ch.id; }}>
          <span class="num" class:done={done === ch.biteCount}>{done === ch.biteCount ? '완' : ch.number}</span>
          <span class="main">
            <strong>{ch.title}</strong>
            <span class="goal">{ch.goal}</span>
          </span>
          <span class="bites-dots" aria-hidden="true">
            {#each ch.bites as bite}
              <i class:on={!!state.done[bite.id]}></i>
            {/each}
          </span>
        </button>
        {#if openId === ch.id}
          <div class="bites">
            {#each ch.bites as bite, bi}
              <button class="bite" on:click={() => onPlay(ch, bite)}>
                <span class="b-kind">{KIND_KO[bite.kind] || bite.kind}</span>
                <span class="b-title">{bite.title}</span>
                <span class="b-state">{state.done[bite.id] ? '✓' : `${bite.cards.length}장`}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</section>

<style>
  .shelf { max-width: 480px; margin: 0 auto; padding: 30px 20px 40px; }
  .cap { font-size: 11.5px; font-weight: 850; letter-spacing: .2em; color: var(--accent); text-transform: uppercase; }
  .sub { margin: 6px 0 18px; font-size: 13.5px; color: var(--ink-3); word-break: keep-all; }
  .guide-card { width: 100%; display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding: 15px 16px;
    border-radius: 18px; background: var(--card); border: 1px solid var(--line); box-shadow: var(--shadow-1);
    text-align: left; transition: border-color .12s var(--ease); }
  .guide-card:hover { border-color: var(--ink-3); }
  .g-ico { font-size: 26px; flex: none; }
  .g-main { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .g-main strong { font-size: 15px; font-weight: 850; }
  .g-main span { font-size: 12px; color: var(--ink-3); line-height: 1.45; word-break: keep-all; }
  .g-chev { color: var(--ink-3); flex: none; }
  .rows { display: grid; gap: 10px; }
  .ch { border: 1px solid var(--line); border-radius: 18px; background: var(--card); box-shadow: var(--shadow-1); overflow: hidden; }
  .head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 15px; text-align: left; }
  .head:hover { background: var(--bg); }
  .num { width: 40px; height: 40px; flex: none; display: grid; place-items: center; border-radius: 999px;
    background: var(--bg); border: 1px solid var(--line-2); font-weight: 800; font-size: 16px; }
  .num.done { background: var(--gold); border-color: var(--gold); color: #fff; }
  .main { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .main strong { font-size: 15.5px; font-weight: 800; word-break: keep-all; }
  .goal { font-size: 12px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bites-dots { display: flex; gap: 3px; flex: none; }
  .bites-dots i { width: 6px; height: 6px; border-radius: 999px; background: var(--wash); border: 1px solid var(--line-2); }
  .bites-dots i.on { background: var(--gold); border-color: var(--gold); }
  .bites { border-top: 1px solid var(--line); display: grid; }
  .bite { display: flex; align-items: center; gap: 10px; padding: 12px 15px; text-align: left; border-top: 1px solid var(--line); }
  .bite:first-child { border-top: 0; }
  .bite:hover { background: var(--bg); }
  .b-kind { flex: none; font-size: 10.5px; font-weight: 850; letter-spacing: .08em; color: var(--accent-deep);
    background: var(--accent-soft); padding: 3px 8px; border-radius: 999px; }
  .b-title { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .b-state { flex: none; font-size: 12px; font-weight: 800; color: var(--ink-3); }
</style>
