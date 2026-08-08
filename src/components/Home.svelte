<script>
  import { onDestroy } from 'svelte';
  import SettingsSheet from './SettingsSheet.svelte';
  import { prefs, setPref } from '../lib/prefs.js';
  import { installPrompt, promptInstall, shouldOfferInstall } from '../lib/pwa.js';
  import { progress, todayKey } from '../lib/store.js';
  import { bowlFill, streak, weekActivity } from '../lib/stats.js';
  import { learnedDueEntries, srs } from '../lib/srs.js';
  import { findById, findNext } from '../lib/nextBite.js';

  export let index = { chapters: [], snacks: [] };
  export let skippedSnacks = new Set();
  export let onStart = () => {};
  export let onSkipSnack = () => {};
  export let onChangeStart = () => {};
  export let onStartReview = () => {};

  let settingsOpen = false;
  let dayToast = '';
  let toastTimer;

  onDestroy(() => clearTimeout(toastTimer));

  $: state = $progress;
  $: nextItem = findNext({ index, done: state.done, skippedSnacks, startChapter: $prefs.startChapter });
  $: continueItem = state.lastPlayed && !state.done[state.lastPlayed.biteOrSnackId]
    ? findById({ index, id: state.lastPlayed.biteOrSnackId })
    : null;
  $: bitesToday = state.bowls[todayKey()] || 0;
  $: currentStreak = streak(state.bowls);
  $: week = weekActivity(state.bowls, $prefs.dailyGoal);
  $: bowls = week.filter((day) => day.count > 0).length;
  $: todayPending = bitesToday === 0;
  $: fill = bowlFill(bitesToday, $prefs.dailyGoal);
  $: dueCount = learnedDueEntries(state.learned, $srs).length;
  $: showInstall = shouldOfferInstall({
    installEvent: $installPrompt,
    prefsState: $prefs,
    progressState: state,
  });

  async function installApp() {
    setPref('installPromptDismissed', true);
    await promptInstall();
  }

  function dismissInstall() {
    setPref('installPromptDismissed', true);
  }

  function showDay(day) {
    dayToast = `${day.key} — ${day.count} bite${day.count === 1 ? '' : 's'}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { dayToast = ''; }, 2200);
  }

  function headWord(item) {
    if (item.type === 'snack') return item.title;
    return item.bite.firstWord || item.bite.title.split('·').pop().trim();
  }
  // Where today's item sits in the course, in the learner's own language.
  function placeLine(item) {
    if (item.type === 'snack') return `${item.level} · Snack after Chapter ${item.afterChapter}`;
    const at = item.chapter.bites.findIndex((bite) => bite.id === item.bite.id);
    return `${item.level} · Chapter ${item.chapterNumber} · Bite ${at < 0 ? 1 : at + 1}`;
  }
  // English leads, Korean follows one line down — never joined with a dot.
  const HOOKS = {
    words: ['Meet new words by guessing first', '새 단어를 추측으로 먼저 만나요'],
    pattern: ['Spot the grammar pattern yourself', '문법 규칙을 직접 찾아요'],
    dialogue: ['Read a real conversation line by line', '진짜 대화를 한 줄씩 읽어요'],
    reading: ['Read a short passage', '짧은 글 한 편을 읽어요'],
    boss: ['Everything from this chapter', '이번 과의 전부'],
  };
  const FALLBACK_HOOK = ['Three minutes is plenty', '3분이면 충분해요'];
  function hookLine(next) {
    if (next.type === 'snack') return [`${next.snack.cardCount} words, one sitting`, `단어 ${next.snack.cardCount}개를 한 번에`];
    return HOOKS[next.bite.kind] || FALLBACK_HOOK;
  }
</script>

<section class="home">
  <div class="home-head">
    <div class="mark">한입</div>
    <button class="gear" aria-label="Open settings" on:click={() => { settingsOpen = true; }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
        <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3"/>
        <circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>
      </svg>
    </button>
  </div>

  {#if nextItem}
    {@const hook = hookLine(nextItem)}
    {@const head = headWord(nextItem)}
    <div class="place">{placeLine(nextItem)}</div>
    <!-- a grammar form or a snack title can be a phrase, not a word: it drops a
         step on the type scale rather than wrapping across three lines at 70px -->
    <h1 class="word" class:long={nextItem.type === 'snack' || head.length > 7}>{head}</h1>
    <p class="lead">{hook[0]}</p>
    <p class="lead-ko">{hook[1]}</p>
  {:else}
    <div class="place">Course complete</div>
    <h1 class="word long">다 먹었어요</h1>
    <p class="lead">Every new bite is done — {dueCount} review{dueCount === 1 ? '' : 's'} waiting</p>
    <p class="lead-ko">새 한입을 모두 마쳤어요</p>
  {/if}

  <div class="bowl-row">
    <svg class="bowl" viewBox="0 0 48 48" aria-hidden="true">
      <defs><clipPath id="homeclip"><path d="M6 20 h36 a1 1 0 0 1 -4 16 a14 8 0 0 1 -28 0 a1 1 0 0 1 -4-16 z"/></clipPath></defs>
      <g clip-path="url(#homeclip)">
        <rect x="0" y="20" width="48" height="28" fill="var(--wash)"/>
        <rect x="0" y={48 - 28 * fill} width="48" height="28" fill="var(--gold)"/>
      </g>
      <path d="M6 20 h36 a1 1 0 0 1 -4 16 a14 8 0 0 1 -28 0 a1 1 0 0 1 -4-16 z" fill="none" stroke="var(--ink)" stroke-width="2.4"/>
    </svg>
    <div class="bowl-cap">
      <b>{bowls} bowl{bowls === 1 ? '' : 's'} this week</b>
      <span>{bitesToday > 0 ? `Today: ${bitesToday} bite${bitesToday === 1 ? '' : 's'}` : "Today's bowl is empty"}</span>
    </div>
    {#if currentStreak > 0}<span class="streak">{currentStreak}-day streak</span>{/if}
  </div>

  <div class="week" aria-label="This week">
    {#each week as day (day.key)}
      <button class="day" class:today={day.today} on:click={() => showDay(day)} aria-label={`${day.key}, ${day.count} bites`}>
        <span>{day.label}</span>
        <i class:partial={day.state === 'partial'} class:full={day.state === 'full'}></i>
      </button>
    {/each}
  </div>
  {#if dayToast}<div class="day-toast" role="status">{dayToast}</div>{/if}
  {#if todayPending && currentStreak > 0}
    <p class="streak-next">One bite today makes it {currentStreak + 1}</p>
  {/if}

  {#if continueItem}
    <button class="line-row" on:click={() => onStart(continueItem)}>
      <b>Pick up where you left off</b>
      <span class="row-sub">{continueItem.title}</span>
      <i aria-hidden="true">›</i>
    </button>
  {/if}

  {#if dueCount >= 6}
    <button class="line-row" on:click={onStartReview}>
      <b>{Math.min(dueCount, 8)} review{Math.min(dueCount, 8) === 1 ? '' : 's'} are waiting</b>
      <span class="row-sub">Oldest due first</span>
      <i aria-hidden="true">›</i>
    </button>
  {/if}

  {#if nextItem}
    <div class="start-actions">
      <button class="cta" on:click={() => onStart(nextItem)}><b>Start</b><i>시작하기</i></button>
      {#if nextItem.type === 'snack'}
        <button class="skip" on:click={() => onSkipSnack(nextItem.snackId)}>Skip to the next chapter</button>
      {/if}
    </div>
  {/if}

  {#if showInstall}
    <aside class="install-banner" aria-label="App installation">
      <button class="install-main" type="button" on:click={installApp}>
        <strong>Add Hanip to your home screen</strong>
        <span>홈 화면에 추가하면 오프라인에서도 열려요</span>
      </button>
      <button class="install-close" type="button" aria-label="Dismiss the install offer" on:click={dismissInstall}>×</button>
    </aside>
  {/if}

  <SettingsSheet open={settingsOpen} onClose={() => { settingsOpen = false; }} {onChangeStart} />
</section>

<style>
  .home { min-height: calc(100dvh - 64px); max-width: 480px; margin: 0 auto; padding: 26px 22px 20px;
    display: flex; flex-direction: column; }
  .home-head { min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .mark { font-size: 16px; font-weight: 900; letter-spacing: -.03em; color: var(--ink); }
  .gear { width: 44px; height: 44px; flex: none; display: grid; place-items: center; color: var(--ink-3);
    transition: color .12s var(--ease); }
  .gear:hover { color: var(--ink); }

  .place { margin-top: 26px; font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .word { margin: 6px 0 0; font-size: clamp(52px, 17vw, 70px); font-weight: 900; letter-spacing: -.045em;
    line-height: 1.05; word-break: keep-all; text-wrap: balance; }
  .word.long { font-size: clamp(34px, 11vw, 48px); letter-spacing: -.03em; line-height: 1.12; }
  .lead { margin: 14px 0 0; font-size: 15.5px; font-weight: 650; line-height: 1.62; color: var(--ink-2);
    word-break: keep-all; text-wrap: pretty; }
  .lead-ko { margin: 4px 0 0; font-size: 11.5px; font-weight: 650; line-height: 1.5; color: var(--ink-3);
    word-break: keep-all; }

  .bowl-row { margin-top: 28px; padding-top: 16px; border-top: 1px solid var(--line);
    display: flex; align-items: center; gap: 12px; }
  .bowl { width: 32px; height: 32px; flex: none; }
  .bowl-cap { min-width: 0; display: grid; }
  .bowl-cap b { font-size: 14.5px; font-weight: 800; letter-spacing: -.01em; color: var(--ink); }
  .bowl-cap span { font-size: 12.5px; font-weight: 650; color: var(--ink-3); }
  .streak { flex: none; margin-left: auto; font-size: 12.5px; font-weight: 650; color: var(--ink-3);
    font-variant-numeric: tabular-nums; }

  .week { margin-top: 14px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .day { min-width: 0; padding: 5px 3px; display: grid; justify-items: center; gap: 5px; }
  .day span { font-size: 10px; font-weight: 750; color: var(--ink-3); }
  .day.today span { color: var(--ink); }
  .day i { width: 20px; height: 15px; border: 1px solid var(--line-2); border-radius: 3px 3px 9px 9px; background: transparent; }
  .day i.partial { background: linear-gradient(to top, var(--gold) 50%, transparent 50%); }
  .day i.full { border-color: var(--gold); background: var(--gold); }
  .day-toast { margin-top: 8px; font-size: 11.5px; font-weight: 650; color: var(--ink-3); text-align: center;
    font-variant-numeric: tabular-nums; }
  .streak-next { margin: 9px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }

  .line-row { width: 100%; min-height: 44px; margin-top: 18px; padding: 14px 0;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    display: grid; grid-template-columns: 1fr auto; align-items: center; text-align: left; }
  .line-row + .line-row { margin-top: -1px; }
  .line-row b { font-size: 14.5px; font-weight: 750; letter-spacing: -.01em; color: var(--ink); }
  .row-sub { grid-column: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .line-row i { grid-row: 1 / -1; grid-column: 2; font-style: normal; font-size: 15px; color: var(--ink-3); }

  .start-actions { margin-top: auto; padding-top: 20px; display: grid; gap: 2px; }
  .cta { width: 100%; padding: 15px 16px 13px; border-radius: 16px; background: var(--accent); color: var(--on-accent);
    display: grid; gap: 1px; text-align: center; box-shadow: 0 3px 0 var(--accent-deep);
    transition: transform .09s var(--ease), box-shadow .09s var(--ease); }
  .cta:active { transform: translateY(3px); box-shadow: 0 0 0 var(--accent-deep); }
  .cta b { font-size: 17px; font-weight: 850; letter-spacing: -.01em; }
  .cta i { font-size: 10.5px; font-style: normal; font-weight: 700; opacity: .62; }
  .skip { width: 100%; min-height: 44px; color: var(--ink-3); font-size: 14px; font-weight: 750; text-align: center; }

  .install-banner { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line);
    display: flex; align-items: center; gap: 8px; }
  .install-main { min-width: 0; flex: 1; display: grid; text-align: left; }
  .install-main strong { font-size: 14px; font-weight: 750; color: var(--ink); }
  .install-main span { font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .install-close { width: 44px; height: 44px; flex: none; color: var(--ink-3); font-size: 22px; }
</style>
