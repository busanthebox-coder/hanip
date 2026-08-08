<script>
  // The classroom half of the settings sheet (order 29). A shared phone holds one
  // profile per learner; a profile is a local label, never an account.
  import { activeId, createProfile, profiles, remove, rename, switchProfile } from '../lib/profiles.js';

  export let onOpenTransfer = () => {};

  let editing = null;      // profile id whose row is open
  let draft = '';
  let adding = false;
  let addDraft = '';
  let armedDelete = null;  // profile id whose delete is armed (step 2 of 2)

  $: list = $profiles;

  function openRow(profile) {
    if (editing === profile.id) { closeRow(); return; }
    editing = profile.id;
    draft = profile.name;
    armedDelete = null;
    adding = false;
  }

  function closeRow() {
    editing = null;
    armedDelete = null;
  }

  function saveName(profile) {
    if (draft.trim() && draft.trim() !== profile.name) rename(profile.id, draft);
    closeRow();
  }

  function confirmDelete(profile) {
    remove(profile.id);
    closeRow();
  }

  function addLearner() {
    if (!addDraft.trim()) return;
    createProfile(addDraft);
    addDraft = '';
    adding = false;
  }

  function lastStudied(at) {
    if (!at) return 'Not started yet';
    const date = new Date(at);
    const days = Math.floor((Date.now() - at) / 86_400_000);
    if (days <= 0) return 'Studied today';
    if (days === 1) return 'Studied yesterday';
    return `Last studied ${date.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]}`;
  }
</script>

<section class="profiles" aria-labelledby="profiles-title">
  <div class="cap" id="profiles-title">Profiles</div>
  <p class="cap-ko">이 기기를 함께 쓰는 학생들</p>

  <ul class="list">
    {#each list as profile (profile.id)}
      <li class:open={editing === profile.id}>
        <button class="row" aria-expanded={editing === profile.id} on:click={() => openRow(profile)}>
          <span class="who">
            <b>{profile.name}</b>
            <span class="meta">#{profile.code} · {lastStudied(profile.lastSeenAt)}</span>
          </span>
          {#if profile.id === $activeId}
            <span class="here" aria-label="Studying now">✓</span>
          {:else}
            <i aria-hidden="true">›</i>
          {/if}
        </button>

        {#if editing === profile.id}
          <div class="editor">
            <label class="field">
              <span>Name<i>이름</i></span>
              <input type="text" bind:value={draft} maxlength="24" on:keydown={(event) => event.key === 'Enter' && saveName(profile)} />
            </label>
            <div class="acts">
              <button class="act" on:click={() => saveName(profile)}>Save name</button>
              {#if profile.id !== $activeId}
                <button class="act primary" on:click={() => switchProfile(profile.id)}>Switch to {profile.name}</button>
              {/if}
            </div>
            {#if profile.id === $activeId}
              <p class="hint">This is the profile in use. Switch to another learner before deleting it.</p>
            {:else if armedDelete === profile.id}
              <p class="warn">{profile.name}'s progress on this device will be erased. It cannot be undone.</p>
              <p class="warn-ko">이 학생의 진도가 지워집니다</p>
              <div class="acts">
                <button class="act danger" on:click={() => confirmDelete(profile)}>Delete {profile.name}</button>
                <button class="act" on:click={() => { armedDelete = null; }}>Keep</button>
              </div>
            {:else}
              <button class="act danger" on:click={() => { armedDelete = profile.id; }}>Delete this learner</button>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  {#if adding}
    <div class="editor add">
      <label class="field">
        <span>New learner<i>새 학생</i></span>
        <input type="text" bind:value={addDraft} maxlength="24" placeholder="Name" on:keydown={(event) => event.key === 'Enter' && addLearner()} />
      </label>
      <div class="acts">
        <button class="act primary" on:click={addLearner}>Add</button>
        <button class="act" on:click={() => { adding = false; addDraft = ''; }}>Cancel</button>
      </div>
    </div>
  {:else}
    <button class="row wide" on:click={() => { adding = true; editing = null; }}>
      <span class="who"><b>Add a learner</b><span class="meta">Their progress starts empty</span></span>
      <i aria-hidden="true">+</i>
    </button>
  {/if}

  <button class="row wide" on:click={onOpenTransfer}>
    <span class="who">
      <b>Move progress to another device</b>
      <span class="meta">진도 코드로 옮기기</span>
    </span>
    <i aria-hidden="true">›</i>
  </button>
  <p class="limit">A number only tells learners apart on this phone. To carry progress to another
    device you have to take the progress code or its file with you.</p>
  <p class="limit-ko">번호만 입력해서는 다른 기기에서 진도가 살아나지 않아요</p>
</section>

<style>
  .profiles { margin-top: 30px; }
  .cap { font-size: 11.5px; font-weight: 650; color: var(--ink-3); }
  .cap-ko { margin: 2px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); }

  .list { margin: 8px 0 0; padding: 0; list-style: none; }
  .row { width: 100%; min-height: 56px; padding: 13px 0; display: flex; align-items: center;
    justify-content: space-between; gap: 14px; border-top: 1px solid var(--line); text-align: left;
    transition: background-color .12s var(--ease); }
  li:last-child > .row { border-bottom: 1px solid var(--line); }
  .row.wide { border-bottom: 1px solid var(--line); margin-top: -1px; }
  .row:hover { background: var(--wash); }
  .who { min-width: 0; display: grid; gap: 2px; }
  .who b { font-size: 14.5px; font-weight: 750; letter-spacing: -.01em; word-break: keep-all; }
  .meta { font-size: 11.5px; font-weight: 650; color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .row i { flex: none; font-style: normal; font-size: 15px; color: var(--ink-3); }
  .here { flex: none; font-size: 14px; font-weight: 900; color: var(--gold); }
  li.open > .row { background: var(--wash); }

  .editor { padding: 4px 0 16px; display: grid; gap: 12px; }
  .editor.add { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    margin-top: -1px; padding: 14px 0 16px; }
  .field { display: grid; gap: 4px; }
  .field span { font-size: 11.5px; font-weight: 650; color: var(--ink-3); display: flex; gap: 6px; }
  .field i { font-style: normal; }
  .field input { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--line-2);
    border-radius: var(--r-chip); background: var(--card); color: var(--ink);
    font: inherit; font-size: 15px; font-weight: 700;
    transition: border-color .12s var(--ease); }
  .field input:focus { outline: none; border-color: var(--accent); }

  .acts { display: flex; flex-wrap: wrap; gap: 10px; }
  .act { min-height: 44px; padding: 9px 14px; border: 1px solid var(--line-2); border-radius: var(--r-chip);
    font-size: 13px; font-weight: 750; color: var(--ink-2);
    transition: border-color .12s var(--ease), color .12s var(--ease); }
  .act:hover { border-color: var(--ink-3); color: var(--ink); }
  .act.primary { border-color: var(--accent); color: var(--accent-deep); }
  .act.danger { border-color: var(--line-2); color: var(--bad); }
  .act.danger:hover { border-color: var(--bad); color: var(--bad); }

  .hint, .warn, .warn-ko { margin: 0; font-size: 12.5px; font-weight: 650; line-height: 1.6;
    color: var(--ink-3); word-break: keep-all; }
  .warn { color: var(--bad); font-weight: 700; }
  .warn-ko { margin-top: -6px; font-size: 11.5px; }

  .limit { margin: 12px 0 0; font-size: 12.5px; font-weight: 650; line-height: 1.6; color: var(--ink-3);
    word-break: keep-all; }
  .limit-ko { margin: 3px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
</style>
