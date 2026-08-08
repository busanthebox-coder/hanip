<script>
  import SearchField from './SearchField.svelte';
  import ShelfLevelGroup from './ShelfLevelGroup.svelte';
  import { prefs, setPref } from '../lib/prefs.js';

  let query = '';

  const baseBite = (id, title) => ({ id, kind: 'words', title, cardCount: 6 });
  const openGroup = {
    id: 'A2',
    label: 'A2 쌓기 Builder',
    done: 1,
    total: 3,
    chapters: [
      {
        id: 'showcase-12', number: 12, title: '-는 것 같아요 · -잖아요',
        goal: 'Make a careful guess and explain shared context', biteCount: 2,
        bites: [baseBite('showcase-12-b1', '단어 Words · 부탁하다'), baseBite('showcase-12-b2', '문법 Grammar · -는 것 같아요')],
      },
      {
        id: 'showcase-13', number: 13, title: '시간과 약속',
        goal: 'Set a time and confirm an appointment', biteCount: 1,
        bites: [baseBite('showcase-13-b1', '대화 Dialogue · 약속 잡기')],
      },
    ],
  };
  const completeGroup = {
    id: 'A1', label: 'A1 기초 Foundation', done: 2, total: 2,
    chapters: [{
      id: 'showcase-01', number: 1, title: '자음 · 모음', goal: 'Read a syllable block', biteCount: 2,
      bites: [baseBite('showcase-01-b1', '단어 Words · 한글'), baseBite('showcase-01-b2', '문법 Grammar · 모음')],
    }],
  };
  const doneMap = { 'showcase-12-b1': 1, 'showcase-01-b1': 1, 'showcase-01-b2': 1 };
</script>

<main class="showcase">
  <div class="cap">한입 primitive showcase</div>
  <h1>책장 검색과 레벨 그룹</h1>
  <p class="sub">Default, open, complete, focus, and empty states.</p>
  <div class="theme-switch" role="group" aria-label="쇼케이스 테마 · Showcase theme">
    {#each [['auto', '자동'], ['light', '밝게'], ['dark', '어둡게']] as option}
      <button class:on={$prefs.theme === option[0]} aria-pressed={$prefs.theme === option[0]} on:click={() => setPref('theme', option[0])}>{option[1]}</button>
    {/each}
  </div>

  <section class="sample">
    <div class="label">검색 · Search field</div>
    <SearchField bind:value={query} label="컴포넌트 검색" placeholder="검색어를 입력하세요" />
    {#if query && query !== '부탁'}<p class="empty">검색 결과가 없어요 · No matching chapters</p>{/if}
  </section>

  <section class="sample groups">
    <div class="label">열림 · Open and in progress</div>
    <ShelfLevelGroup group={openGroup} open={true} {doneMap} idPrefix="showcase-open" />
    <div class="label next">완료 · Complete and closed</div>
    <ShelfLevelGroup group={completeGroup} open={false} {doneMap} idPrefix="showcase-complete" />
  </section>
</main>

<style>
  .showcase { max-width: 480px; margin: 0 auto; padding: var(--space-8) var(--space-5) var(--space-10); }
  .cap, .label { color: var(--accent); font-size: var(--type-overline); font-weight: 850; letter-spacing: .01em; }
  h1 { margin: var(--space-2) 0 0; font-size: var(--type-heading); line-height: 1.35; }
  .sub { margin: var(--space-1) 0 0; color: var(--ink-3); font-size: var(--type-body-sm); }
  .theme-switch { margin-top: var(--space-4); display: inline-flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--wash); }
  .theme-switch button { min-height: 36px; padding: 6px 12px; border-radius: 9px; color: var(--ink-3); font-size: var(--type-caption); font-weight: 800; }
  .theme-switch button.on { background: var(--card); color: var(--accent-deep); box-shadow: var(--shadow-1); }
  .sample { margin-top: var(--space-8); }
  .sample > :global(.search) { margin-top: var(--space-2); }
  .groups { display: grid; gap: var(--space-2); }
  .groups .label { margin-bottom: 0; }
  .next { margin-top: var(--space-4); }
  .empty { margin: var(--space-2) 0 0; padding: var(--space-4); border: 1px dashed var(--line-2);
    border-radius: var(--r-chip); color: var(--ink-2); font-size: var(--type-body-sm); text-align: center; }
</style>
