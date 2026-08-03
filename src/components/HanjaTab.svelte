<script>
  import hanjaData from '../../data/hanja.json';
  import AudioDot from './cards/AudioDot.svelte';

  const roots = hanjaData.roots;
  const levels = [...new Set(roots.map((r) => r.level))].sort();

  let level = 'all';
  let openId = null;

  $: visible = level === 'all' ? roots : roots.filter((r) => r.level === level);

  function toggle(id) {
    openId = openId === id ? null : id;
  }

  function pickLevel(l) {
    level = l;
    openId = null;
  }

  /* Split a member's hangul around the root's reading syllable.
     Returns null when the reading doesn't appear (e.g. 요 in 수수료). */
  function splitReading(hangul, reading) {
    const i = hangul.indexOf(reading);
    if (i < 0) return null;
    return [hangul.slice(0, i), reading, hangul.slice(i + reading.length)];
  }
</script>

<section class="hanja">
  <div class="cap">한자 뿌리 · Hanja roots</div>
  <p class="sub">One root unlocks a whole word family · 뿌리 하나로 단어 가족이 열려요.</p>

  <div class="chips" role="group" aria-label="레벨 필터 · Level filter">
    <button class="chip" class:on={level === 'all'} aria-pressed={level === 'all'} on:click={() => pickLevel('all')}>전체 All</button>
    {#each levels as l}
      <button class="chip" class:on={level === l} aria-pressed={level === l} on:click={() => pickLevel(l)}>{l}</button>
    {/each}
  </div>

  <div class="rows">
    {#each visible as root (root.id)}
      <div class="root" class:open={openId === root.id}>
        <button class="head" aria-expanded={openId === root.id} on:click={() => toggle(root.id)}>
          <span class="char" aria-hidden="true">{root.hanja}</span>
          <span class="main">
            <strong>{root.reading} — {root.gloss}</strong>
            <span class="meta">
              <span class="lvl">{root.level}</span>
              <span class="fam">가족 {root.members.length} words</span>
            </span>
          </span>
          <span class="arrow" aria-hidden="true">{openId === root.id ? '−' : '+'}</span>
        </button>

        {#if openId === root.id}
          <div class="body">
            <p class="note">{root.note}</p>
            <ul class="members">
              {#each root.members as m (m.hangul + m.romanization)}
                {@const parts = splitReading(m.hangul, root.reading)}
                <li class="member">
                  <AudioDot text={m.hangul} size={26} />
                  <span class="m-text">
                    <span class="m-hangul">
                      {#if parts}
                        {parts[0]}<span class="hit">{parts[1]}</span>{parts[2]}
                      {:else}
                        {m.hangul}
                      {/if}
                    </span>
                    <span class="m-break">{m.breakdown}</span>
                    {#if m.english}
                      <span class="m-eng">{m.english}</span>
                    {/if}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</section>

<style>
  .hanja { max-width: 480px; margin: 0 auto; padding: 30px 20px 40px; }
  .cap { font-size: 11.5px; font-weight: 850; letter-spacing: .2em; color: var(--accent); text-transform: uppercase; }
  .sub { margin: 6px 0 18px; font-size: 13.5px; color: var(--ink-3); word-break: keep-all; }

  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .chip { min-height: 44px; padding: 8px 16px; border-radius: var(--r-chip); border: 1px solid var(--line-2);
    background: var(--card); font-size: 13px; font-weight: 800; color: var(--ink-2);
    transition: background-color .15s var(--ease), border-color .15s var(--ease), color .15s var(--ease); }
  .chip:hover { background: var(--wash); }
  .chip.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }

  .rows { display: grid; gap: 10px; }
  .root { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-1); overflow: hidden; }

  .head { width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 16px; text-align: left;
    transition: background-color .15s var(--ease); }
  .head:hover { background: var(--bg); }
  .char { flex: none; width: 52px; height: 52px; display: grid; place-items: center;
    font-size: 34px; line-height: 1; font-family: 'Noto Serif KR', 'Songti SC', 'AppleMyungjo', 'SimSun', serif;
    background: var(--wash); border: 1px solid var(--line-2); border-radius: 14px; color: var(--ink); }
  .main { flex: 1; min-width: 0; display: grid; gap: 3px; }
  .main strong { font-size: 15px; font-weight: 800; word-break: keep-all; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { display: flex; align-items: center; gap: 8px; }
  .lvl { flex: none; font-size: 10.5px; font-weight: 850; letter-spacing: .08em; color: var(--accent-deep);
    background: var(--accent-soft); padding: 2px 8px; border-radius: 999px; }
  .fam { font-size: 12px; color: var(--ink-3); }
  .arrow { flex: none; font-size: 18px; font-weight: 800; color: var(--ink-3); }

  .body { border-top: 1px solid var(--line); }
  .note { margin: 0; padding: 11px 16px; font-size: 12.5px; color: var(--ink-2); background: var(--wash);
    border-bottom: 1px solid var(--line); word-break: keep-all; }

  .members { list-style: none; margin: 0; padding: 0; }
  .member { display: flex; align-items: flex-start; gap: 12px; min-height: 44px; padding: 12px 16px; border-top: 1px solid var(--line); }
  .member:first-child { border-top: 0; }
  .m-text { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .m-hangul { font-size: 18px; font-weight: 700; line-height: 1.35; word-break: keep-all; }
  .hit { border-bottom: 2px solid var(--gold); background: var(--gold-soft); }
  .m-break { font-size: 12.5px; color: var(--ink-3); }
  .m-eng { font-size: 13px; color: var(--ink-2); word-break: keep-all; }
</style>
