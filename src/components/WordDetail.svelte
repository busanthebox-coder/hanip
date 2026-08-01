<script>
  import AudioDot from './cards/AudioDot.svelte';
  import ContrastCard from './ContrastCard.svelte';
  import { speak } from '../lib/tts.js';

  export let word;
  export let onBack = () => {};

  let showMore = false;

  // camelCase form key → 한국어 · English label, in teaching order.
  const FORM_LABELS = [
    ['dictionary', '기본형', 'dictionary'],
    ['politePresent', '해요체', 'polite'],
    ['casualPresent', '반말', 'casual'],
    ['formalPresent', '합니다체', 'formal'],
    ['negative', '부정', 'negative'],
    ['past', '과거', 'past'],
    ['future', '미래', 'will'],
    ['want', '-고 싶어요', 'want'],
    ['can', '가능', 'can'],
    ['cannot', '불가', "can't"],
    ['must', '의무', 'must'],
    ['dontHaveTo', '불필요', "don't have to"],
    ['pleaseDo', '요청', 'please do'],
    ['pleaseDont', '금지', "please don't"],
    ['shallWe', '제안', 'shall we?']
  ];

  const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
  const txt = (v) => (typeof v === 'string' ? v.trim() : '');
  const norm = (s) => txt(s).replace(/[\s.!?~,·"'“”‘’]/g, '');

  // word.ex is a single example that sometimes repeats examples[0]; merge by Korean text.
  function mergeExamples(w) {
    const out = [];
    const seen = new Set();
    const push = (e) => {
      if (!e || !txt(e.ko)) return;
      const key = norm(e.ko);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(e);
    };
    if (w && w.ex) push(w.ex);
    list(w && w.examples).forEach(push);
    return out;
  }

  function formRows(w) {
    const f = w && w.forms;
    if (!f || typeof f !== 'object') return [];
    return FORM_LABELS.filter(([k]) => txt(f[k])).map(([k, ko, en]) => ({
      ko,
      en,
      value: txt(f[k])
    }));
  }

  $: examples = mergeExamples(word);
  $: mistakes = list(word && word.commonMistakes).filter((m) => txt(m));
  $: phrases = list(word && word.usagePhrases).filter((p) => txt(p.ko));
  $: forms = formRows(word);
  $: tips = list(word && word.conjugationTips).filter((t) => txt(t.body) || txt(t.title));
  $: collocations = list(word && word.collocations).filter((c) => txt(c));
  $: nuance = txt(word && word.nuance);
  $: explanation = txt(word && word.explanation);
  $: cluster = word && word.cluster && list(word.cluster.members).length ? word.cluster : null;
  $: hasMore = !!explanation || tips.length > 0 || collocations.length > 0;
  $: moreLabel = explanation
    ? '자세한 설명 · Full explanation'
    : '함께 쓰는 말 · Words it travels with';
  // "Thin" entries only carry ko/en/ex — say so instead of leaving a lonely headword.
  $: thin =
    !nuance &&
    !explanation &&
    examples.length <= 1 &&
    !mistakes.length &&
    !phrases.length &&
    !forms.length &&
    !cluster;

  $: word, (showMore = false);
</script>

{#if word}
  <section class="detail">
    <button class="back" on:click={onBack}>← 단어장 · Back</button>

    <header class="head">
      <div class="head-top">
        <h1 class="ko">{word.ko}</h1>
        <AudioDot text={word.ko} size={38} />
      </div>
      {#if txt(word.romanization)}<p class="rom">{word.romanization}</p>{/if}
      {#if txt(word.en)}<p class="en">{word.en}</p>{/if}
      <div class="chips">
        {#if txt(word.pos)}<span class="chip">{word.pos}</span>{/if}
        {#if txt(word.level)}<span class="chip lv">{word.level}</span>{/if}
        {#if word.chapter}<span class="chip">{word.chapter}과 · Chapter {word.chapter}</span>{/if}
        {#if txt(word.irregular)}<span class="chip irr">{word.irregular}</span>{/if}
      </div>
    </header>

    {#if nuance}
      <div class="nuance">
        <div class="cap gold">뉘앙스 · Nuance</div>
        <p>{nuance}</p>
      </div>
    {/if}

    {#if thin}
      <p class="thin">이 단어는 아직 짧은 설명만 있어요 · Only a short entry for this word so far.</p>
    {/if}

    {#if examples.length}
      <section class="block">
        <div class="cap">이렇게 씁니다 · In use</div>
        <div class="card rows">
          {#each examples as ex}
            <div class="row">
              <div class="line">
                <span class="k">{ex.ko}</span>
                <AudioDot text={ex.ko} size={30} />
              </div>
              {#if txt(ex.romanization)}<p class="rom-s">{ex.romanization}</p>{/if}
              {#if txt(ex.en)}<p class="e">{ex.en}</p>{/if}
              {#if txt(ex.note)}<p class="note">{ex.note}</p>{/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if mistakes.length}
      <section class="block">
        <div class="cap bad">자주 하는 실수 · Common mistakes</div>
        <ul class="mistakes">
          {#each mistakes as m}
            <li><span class="x" aria-hidden="true">✕</span><span>{m}</span></li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if phrases.length}
      <section class="block">
        <div class="cap">이 표현들 · Set phrases</div>
        <div class="card rows">
          {#each phrases as p}
            <div class="row">
              <div class="line">
                <span class="k small">{p.ko}</span>
                <AudioDot text={p.ko} size={28} />
              </div>
              {#if txt(p.romanization)}<p class="rom-s">{p.romanization}</p>{/if}
              {#if txt(p.en)}<p class="e">{p.en}</p>{/if}
              {#if txt(p.note)}<p class="note">{p.note}</p>{/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if forms.length}
      <section class="block">
        <div class="cap">활용형 · Forms</div>
        <p class="sub">눌러서 들어 보세요 · Tap any form to hear it.</p>
        <div class="forms">
          {#each forms as f}
            <button class="form" on:click={() => speak(f.value)}>
              <span class="f-lab">{f.ko} · {f.en}</span>
              <span class="f-val">{f.value}</span>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    {#if cluster}
      <!-- ContrastCard carries its own caption, so no section header here. -->
      <section class="block">
        <ContrastCard cluster={word.cluster} />
      </section>
    {/if}

    {#if hasMore}
      <section class="block">
        <button class="disc" aria-expanded={showMore} on:click={() => (showMore = !showMore)}>
          <span>{moreLabel}</span>
          <span class="chev" class:open={showMore} aria-hidden="true">▾</span>
        </button>
        {#if showMore}
          <div class="card more">
            {#if explanation}<p class="para">{explanation}</p>{/if}

            {#if tips.length}
              <div class="tips">
                {#each tips as t}
                  <div class="tip">
                    {#if txt(t.title)}<strong>{t.title}</strong>{/if}
                    {#if txt(t.body)}<p>{t.body}</p>{/if}
                  </div>
                {/each}
              </div>
            {/if}

            {#if collocations.length}
              <div class="colloc">
                <div class="mini">함께 쓰는 말 · Goes with</div>
                <div class="colls">
                  {#each collocations as c}
                    <button class="coll" on:click={() => speak(c)}>{c}</button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </section>
    {/if}

    <button class="back bottom" on:click={onBack}>← 단어장 · Back</button>
  </section>
{/if}

<style>
  .detail { max-width: 480px; margin: 0 auto; padding: 18px 20px 44px; }

  .back { display: inline-flex; align-items: center; min-height: 44px; padding: 0 14px 0 12px;
    border-radius: 999px; background: var(--card); border: 1px solid var(--line);
    font-size: 13.5px; font-weight: 800; color: var(--ink-2);
    transition: border-color .12s var(--ease), color .12s var(--ease); }
  .back:hover { border-color: var(--ink-3); color: var(--ink); }
  .back.bottom { margin-top: 26px; }

  .head { margin: 16px 0 18px; }
  .head-top { display: flex; align-items: center; gap: 12px; }
  .ko { margin: 0; font-size: clamp(40px, 12vw, 52px); font-weight: 850; line-height: 1.12;
    letter-spacing: -0.02em; word-break: keep-all; }
  .rom { margin: 8px 0 0; font-size: 14px; color: var(--ink-3); font-style: italic; }
  .en { margin: 3px 0 0; font-size: 17px; font-weight: 700; color: var(--ink-2); word-break: keep-all; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .chip { font-size: 11.5px; font-weight: 800; letter-spacing: .02em; padding: 5px 10px;
    border-radius: 999px; background: var(--wash); color: var(--ink-2); border: 1px solid var(--line); }
  .chip.lv { background: var(--accent-soft); color: var(--accent-deep); border-color: var(--accent-soft); }
  .chip.irr { background: var(--gold-soft); color: var(--ink-2); border-color: var(--gold-soft); }

  .cap { font-size: 11.5px; font-weight: 850; letter-spacing: .2em; color: var(--accent); text-transform: uppercase; }
  .cap.gold { color: var(--gold); }
  .cap.bad { color: var(--bad); }
  .sub { margin: 5px 0 0; font-size: 13px; color: var(--ink-3); word-break: keep-all; }

  .nuance { position: relative; margin: 0 0 24px; padding: 16px 18px 17px 20px;
    background: var(--gold-soft); border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 6px 18px 18px 6px; box-shadow: var(--shadow-1); }
  .nuance p { margin: 8px 0 0; font-size: 15.5px; line-height: 1.62; color: var(--ink); word-break: keep-all; }

  .thin { margin: 0 0 24px; padding: 14px 16px; border: 1px dashed var(--line-2); border-radius: 16px;
    background: var(--wash); font-size: 13.5px; color: var(--ink-2); word-break: keep-all; }

  .block { margin-bottom: 24px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); }
  .rows { margin-top: 10px; display: grid; }
  .row { padding: 13px 15px; border-top: 1px solid var(--line); }
  .row:first-child { border-top: 0; }
  .line { display: flex; align-items: center; gap: 10px; min-height: 34px; }
  .k { flex: 1; min-width: 0; font-size: 18.5px; font-weight: 800; line-height: 1.45; word-break: keep-all; }
  .k.small { font-size: 17px; }
  .rom-s { margin: 4px 0 0; font-size: 12.5px; color: var(--ink-3); font-style: italic; }
  .e { margin: 3px 0 0; font-size: 14px; color: var(--ink-2); word-break: keep-all; }
  .note { margin: 6px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--ink-3); word-break: keep-all; }

  .mistakes { margin: 10px 0 0; padding: 4px 2px; list-style: none; display: grid; gap: 2px; }
  .mistakes li { display: flex; gap: 10px; padding: 9px 12px; border-radius: 12px; background: var(--bg);
    border: 1px solid var(--line); font-size: 13.5px; line-height: 1.55; color: var(--ink-2); word-break: keep-all; }
  .x { flex: none; font-weight: 850; color: var(--bad); line-height: 1.55; }

  .forms { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .form { min-height: 56px; display: grid; align-content: center; gap: 2px; padding: 9px 12px; text-align: left;
    background: var(--card); border: 1px solid var(--line); border-radius: 14px;
    transition: border-color .12s var(--ease), background-color .12s var(--ease); }
  .form:hover { border-color: var(--line-2); background: var(--bg); }
  .f-lab { font-size: 10.5px; font-weight: 800; letter-spacing: .04em; color: var(--ink-3); word-break: keep-all; }
  .f-val { font-size: 15px; font-weight: 800; color: var(--ink); word-break: keep-all; line-height: 1.35; }

  .disc { width: 100%; min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 12px 16px; text-align: left; background: var(--card); border: 1px solid var(--line);
    border-radius: 18px; box-shadow: var(--shadow-1);
    font-size: 13.5px; font-weight: 850; letter-spacing: .01em; color: var(--ink-2);
    transition: border-color .12s var(--ease), color .12s var(--ease); }
  .disc:hover { border-color: var(--ink-3); color: var(--ink); }
  .chev { flex: none; color: var(--ink-3); transition: transform .16s var(--ease); }
  .chev.open { transform: rotate(180deg); }

  .more { margin-top: 8px; padding: 16px; }
  .para { margin: 0; font-size: 14.5px; line-height: 1.68; color: var(--ink-2); word-break: keep-all; }
  .tips { margin-top: 14px; display: grid; gap: 10px; }
  .tip { padding: 12px 14px; border-radius: 14px; background: var(--bg); border: 1px solid var(--line); }
  .tip strong { display: block; font-size: 13px; font-weight: 850; color: var(--ink); word-break: keep-all; }
  .tip p { margin: 5px 0 0; font-size: 13px; line-height: 1.6; color: var(--ink-2); word-break: keep-all; }
  .colloc { margin-top: 16px; }
  .mini { font-size: 10.5px; font-weight: 850; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-3); }
  .colls { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
  .coll { min-height: 44px; padding: 8px 14px; border-radius: 999px; background: var(--wash);
    border: 1px solid var(--line); font-size: 13.5px; font-weight: 700; color: var(--ink-2); word-break: keep-all;
    transition: border-color .12s var(--ease), color .12s var(--ease); }
  .coll:hover { border-color: var(--line-2); color: var(--ink); }
</style>
