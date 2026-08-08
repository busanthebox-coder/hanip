<script>
  import AudioDot from './cards/AudioDot.svelte';
  import ContrastCard from './ContrastCard.svelte';
  import { speak } from '../lib/tts.js';

  export let word;
  export let onBack = () => {};

  let showMore = false;

  // camelCase form key → English label, in teaching order.
  const FORM_LABELS = [
    ['dictionary', 'Dictionary'],
    ['politePresent', 'Polite'],
    ['casualPresent', 'Casual'],
    ['formalPresent', 'Formal'],
    ['negative', 'Negative'],
    ['past', 'Past'],
    ['future', 'Will'],
    ['want', 'Want to'],
    ['can', 'Can'],
    ['cannot', "Can't"],
    ['must', 'Must'],
    ['dontHaveTo', "Don't have to"],
    ['pleaseDo', 'Please do'],
    ['pleaseDont', "Please don't"],
    ['shallWe', 'Shall we?']
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
    return FORM_LABELS.filter(([k]) => txt(f[k])).map(([k, label]) => ({ label, value: txt(f[k]) }));
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
  $: moreLabel = explanation ? 'Full explanation' : 'Words it travels with';
  // Meta reads as one ink-3 line instead of four pastel pills.
  $: metaLine = [
    txt(word && word.pos),
    txt(word && word.level),
    word && word.chapter ? `Chapter ${word.chapter}` : '',
    txt(word && word.irregular),
  ].filter(Boolean).join('  ·  ');
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
    <button class="back" on:click={onBack}>← Wordbook</button>

    <header class="head">
      <div class="head-top">
        <h1 class="ko">{word.ko}</h1>
        <AudioDot text={word.ko} size={38} />
      </div>
      {#if txt(word.romanization)}<p class="rom">{word.romanization}</p>{/if}
      {#if txt(word.en)}<p class="en">{word.en}</p>{/if}
      {#if metaLine}<p class="meta">{metaLine}</p>{/if}
    </header>

    {#if nuance}
      <!-- the nuance is the first prose on the screen, not a boxed callout -->
      <div class="note"><p>{nuance}</p></div>
    {/if}

    {#if thin}
      <p class="thin">Only a short entry for this word so far.</p>
    {/if}

    {#if examples.length}
      <section class="block">
        <b class="sect">In use</b>
        <div class="rows">
          {#each examples as ex}
            <div class="row">
              <div class="line">
                <span class="k">{ex.ko}</span>
                <AudioDot text={ex.ko} size={30} />
              </div>
              {#if txt(ex.romanization)}<p class="rom-s">{ex.romanization}</p>{/if}
              {#if txt(ex.en)}<p class="e">{ex.en}</p>{/if}
              {#if txt(ex.note)}<p class="note-s">{ex.note}</p>{/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if mistakes.length}
      <section class="block">
        <b class="sect">Common mistakes</b>
        <ul class="mistakes">
          {#each mistakes as m}
            <li><span class="x" aria-hidden="true">✕</span><span>{m}</span></li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if phrases.length}
      <section class="block">
        <b class="sect">Set phrases</b>
        <div class="rows">
          {#each phrases as p}
            <div class="row">
              <div class="line">
                <span class="k small">{p.ko}</span>
                <AudioDot text={p.ko} size={28} />
              </div>
              {#if txt(p.romanization)}<p class="rom-s">{p.romanization}</p>{/if}
              {#if txt(p.en)}<p class="e">{p.en}</p>{/if}
              {#if txt(p.note)}<p class="note-s">{p.note}</p>{/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if forms.length}
      <section class="block">
        <b class="sect">Forms</b>
        <p class="sect-sub">Tap any form to hear it</p>
        <div class="forms">
          {#each forms as f}
            <button class="form" on:click={() => speak(f.value)}>
              <span class="f-lab">{f.label}</span>
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
          <span class="chev" class:open={showMore} aria-hidden="true">⌄</span>
        </button>
        {#if showMore}
          <div class="more">
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
                <div class="mini">Goes with</div>
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

    <button class="back bottom" on:click={onBack}>← Wordbook</button>
  </section>
{/if}

<style>
  .detail { max-width: 480px; margin: 0 auto; padding: 18px 22px 44px; }

  .back { min-height: 44px; font-size: 12.5px; font-weight: 700; color: var(--ink-3); text-align: left;
    transition: color .12s var(--ease); }
  .back:hover { color: var(--ink); }
  .back.bottom { margin-top: 26px; }

  .head { margin: 6px 0 20px; }
  .head-top { display: flex; align-items: center; gap: 12px; }
  .ko { margin: 0; font-size: clamp(40px, 13vw, 52px); font-weight: 900; line-height: 1.08;
    letter-spacing: -.04em; word-break: keep-all; }
  .rom { margin: 8px 0 0; font-size: 12.5px; font-weight: 650; letter-spacing: .02em; color: var(--ink-3); }
  .en { margin: 4px 0 0; font-size: 16.5px; font-weight: 750; color: var(--ink-2); word-break: keep-all; }
  .meta { margin: 8px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }

  .note { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line); }
  .note p { margin: 0; font-size: 15px; font-weight: 500; line-height: 1.85; color: var(--ink-2);
    word-break: keep-all; }

  .thin { margin: 20px 0 0; padding-top: 18px; border-top: 1px solid var(--line);
    font-size: 13.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }

  .block { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); }
  .sect { display: block; font-size: 15.5px; font-weight: 850; letter-spacing: -.01em; }
  .sect-sub { margin: 4px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }

  .rows { margin-top: 4px; }
  .row { padding: 12px 0; border-top: 1px solid var(--line); }
  .row:first-child { border-top: 0; }
  .line { display: flex; align-items: center; gap: 10px; min-height: 34px; }
  .k { flex: 1; min-width: 0; font-size: 18.5px; font-weight: 800; line-height: 1.45; word-break: keep-all; }
  .k.small { font-size: 17px; }
  .rom-s { margin: 3px 0 0; font-size: 12px; font-weight: 650; letter-spacing: .02em; color: var(--ink-3); }
  .e { margin: 2px 0 0; font-size: 13.5px; font-weight: 650; color: var(--ink-2); word-break: keep-all; }
  .note-s { margin: 5px 0 0; font-size: 11.5px; font-weight: 650; line-height: 1.55; color: var(--ink-3);
    word-break: keep-all; }

  .mistakes { margin: 10px 0 0; padding: 0; list-style: none; }
  .mistakes li { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line);
    font-size: 13.5px; font-weight: 650; line-height: 1.6; color: var(--ink-2); word-break: keep-all; }
  .mistakes li:first-child { border-top: 0; }
  .x { flex: none; font-weight: 850; color: var(--bad); line-height: 1.6; }

  .forms { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; }
  .form { min-height: 44px; display: grid; align-content: center; gap: 2px; text-align: left;
    transition: color .12s var(--ease); }
  .f-lab { font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  .f-val { font-size: 15px; font-weight: 800; color: var(--ink); word-break: keep-all; line-height: 1.35; }
  .form:hover .f-val { color: var(--accent-deep); }

  .disc { width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 4px 0; text-align: left; font-size: 14.5px; font-weight: 750; color: var(--ink);
    transition: color .12s var(--ease); }
  .disc:hover { color: var(--accent-deep); }
  .chev { flex: none; color: var(--ink-3); font-size: 13px; transition: transform .16s var(--ease); }
  .chev.open { transform: rotate(180deg); }

  .more { margin-top: 10px; }
  .para { margin: 0; font-size: 15px; font-weight: 500; line-height: 1.85; color: var(--ink-2); word-break: keep-all; }
  .tips { margin-top: 14px; }
  .tip { padding: 12px 0; border-top: 1px solid var(--line); }
  .tip strong { display: block; font-size: 13px; font-weight: 850; color: var(--ink); word-break: keep-all; }
  .tip p { margin: 4px 0 0; font-size: 12.5px; font-weight: 600; line-height: 1.7; color: var(--ink-3);
    word-break: keep-all; }
  .colloc { margin-top: 16px; }
  .mini { font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .colls { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
  .coll { min-height: 44px; padding: 8px 14px; border: 1px solid var(--line); border-radius: 14px;
    background: var(--card); font-size: 13.5px; font-weight: 700; color: var(--ink-2); word-break: keep-all;
    transition: border-color .12s var(--ease), color .12s var(--ease); }
  .coll:hover { border-color: var(--line-2); color: var(--ink); }
</style>
