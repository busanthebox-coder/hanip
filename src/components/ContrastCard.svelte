<script>
  import AudioDot from './cards/AudioDot.svelte';
  import { prefs } from '../lib/prefs.js';

  export let cluster = null;
  export let compact = false;

  // Titles arrive as '말하다 vs 이야기하다' / '미안해요 vs 죄송해요 vs 죄송합니다'.
  // Split so the Korean pops and every 'vs' can be dimmed to --ink-3.
  function splitTitle(title) {
    const t = (title || '').trim();
    if (!t) return [];
    return t
      .split(/(\s+vs\.?\s+)/i)
      .filter((piece) => piece !== '')
      .map((piece) => ({ sep: /^\s*vs\.?\s*$/i.test(piece), text: piece.trim() }))
      .filter((piece) => piece.text !== '');
  }

  function clean(v) {
    return typeof v === 'string' ? v.trim() : '';
  }

  $: titleParts = splitTitle(cluster && cluster.title);
  $: rule = clean(cluster && cluster.rule);
  $: members = cluster && Array.isArray(cluster.members) ? cluster.members.filter(Boolean) : [];
  $: hasContent = titleParts.length > 0 || rule !== '' || members.length > 0;
</script>

{#if hasContent}
  <section class="contrast" class:compact>
    <div class="cap">헷갈리는 짝 · Easily confused</div>

    {#if titleParts.length}
      <h3 class="title">
        {#each titleParts as part}
          {#if part.sep}
            <span class="vs">{part.text}</span>
          {:else}
            <span class="word" lang="ko">{part.text}</span>
          {/if}
        {/each}
      </h3>
    {/if}

    {#if rule}
      <p class="rule">{rule}</p>
    {/if}

    {#if members.length}
      <div class="members">
        {#each members as m}
          {@const ko = clean(m.ko)}
          {@const en = clean(m.en)}
          {@const rom = clean(m.romanization)}
          {@const when = clean(m.when)}
          {@const hint = clean(m.hint)}
          {@const exKo = m.example ? clean(m.example.ko) : ''}
          {@const exEn = m.example ? clean(m.example.en) : ''}
          <div class="m" class:is-self={m.self === true}>
            {#if ko}
              <div class="m-head">
                <span class="m-ko" lang="ko">{ko}</span>
                <AudioDot text={ko} size={26} />
                {#if m.self === true}
                  <span class="chip anchor">지금 이 단어 · this one</span>
                {/if}
              </div>
            {/if}

            {#if rom && (!compact || $prefs.romaja === 'shown')}
              <div class="m-rom">{rom}</div>
            {/if}

            {#if en}
              <div class="m-en">{en}</div>
            {/if}

            {#if when}
              <div class="m-when"><span class="chip">{when}</span></div>
            {/if}

            {#if !compact && hint}
              <div class="m-hint">{hint}</div>
            {/if}

            {#if !compact && (exKo || exEn)}
              <div class="m-ex">
                {#if exKo}
                  <div class="ex-ko-row">
                    <span class="ex-ko" lang="ko">{exKo}</span>
                    <AudioDot text={exKo} size={22} />
                  </div>
                {/if}
                {#if exEn}
                  <div class="ex-en">{exEn}</div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<style>
  .contrast {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: var(--shadow-1);
    padding: 16px 16px 15px;
  }
  .contrast.compact { padding: 13px 13px 12px; }

  .cap {
    font-size: 11.5px;
    font-weight: 850;
    letter-spacing: .2em;
    color: var(--accent);
    text-transform: uppercase;
  }

  .title {
    margin: 7px 0 0;
    font-size: 19px;
    font-weight: 850;
    line-height: 1.35;
    color: var(--ink);
    word-break: keep-all;
  }
  .compact .title { font-size: 17px; }
  .title .word { margin-right: 2px; }
  .title .vs {
    margin: 0 6px 0 4px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink-3);
    text-transform: lowercase;
    letter-spacing: .04em;
  }

  .rule {
    margin: 11px 0 0;
    padding: 12px 13px;
    background: var(--wash);
    border-radius: 14px;
    font-size: 14px;
    line-height: 1.65;
    color: var(--ink);
    word-break: keep-all;
  }
  .compact .rule {
    margin-top: 9px;
    padding: 10px 11px;
    font-size: 13px;
    line-height: 1.6;
  }

  .members { display: grid; gap: 9px; margin-top: 12px; }
  .compact .members { gap: 6px; margin-top: 9px; }

  .m {
    padding: 11px 12px 12px;
    border: 1px solid var(--line);
    border-left: 3px solid var(--line);
    border-radius: 14px;
    background: var(--card);
  }
  .compact .m { padding: 9px 10px 10px; }
  .m.is-self {
    border-color: var(--line-2);
    border-left-color: var(--accent);
    background: var(--accent-soft);
  }

  .m-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-height: 28px; }
  .m-ko {
    font-size: 20px;
    font-weight: 850;
    line-height: 1.3;
    color: var(--ink);
    word-break: keep-all;
  }
  .compact .m-ko { font-size: 18px; }

  .m-rom { margin-top: 2px; font-size: 12px; color: var(--ink-3); letter-spacing: .01em; }
  .m-en { margin-top: 4px; font-size: 13.5px; line-height: 1.5; color: var(--ink-2); }
  .compact .m-en { margin-top: 3px; font-size: 12.5px; }

  .m-when { margin-top: 7px; }
  .compact .m-when { margin-top: 5px; }

  .chip {
    display: inline-block;
    padding: 3px 9px;
    border-radius: 999px;
    background: var(--wash);
    border: 1px solid var(--line);
    font-size: 11px;
    font-weight: 750;
    line-height: 1.45;
    color: var(--ink-2);
    word-break: keep-all;
  }
  .m.is-self .chip { background: var(--card); border-color: var(--line-2); }
  .chip.anchor {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 800;
    letter-spacing: .01em;
  }
  .m.is-self .chip.anchor { background: var(--accent); border-color: var(--accent); }

  .m-hint { margin-top: 7px; font-size: 12.5px; line-height: 1.5; color: var(--ink-3); word-break: keep-all; }

  .m-ex {
    margin-top: 9px;
    padding-left: 10px;
    border-left: 2px solid var(--line);
  }
  .m.is-self .m-ex { border-left-color: var(--line-2); }
  .ex-ko-row { display: flex; align-items: center; gap: 7px; }
  .ex-ko { font-size: 13.5px; font-weight: 700; color: var(--ink-2); word-break: keep-all; }
  .ex-en { margin-top: 1px; font-size: 12px; line-height: 1.45; color: var(--ink-3); }
</style>
