<script>
  import ContrastCard from './ContrastCard.svelte';
  import SearchField from './SearchField.svelte';

  export let onBack = () => {};

  const clustersPromise = import('../lib/clusters.json').then((module) => module.default.clusters);
  let query = '';
  let selected = null;

  function matches(cluster, q) {
    if (!q) return true;
    return cluster.title.toLowerCase().includes(q)
      || cluster.members.some((member) => member.ko.toLowerCase().includes(q));
  }

  $: normalizedQuery = query.trim().toLowerCase();

  function back() {
    if (selected) {
      selected = null;
      window.scrollTo(0, 0);
      return;
    }
    onBack();
  }
</script>

<section class="browser">
  <button class="back" on:click={back}>
    {selected ? '← All sets' : '← Wordbook'}
  </button>

  {#if selected}
    <ContrastCard cluster={selected} />
  {:else}
    <div class="mark">Confusable sets</div>
    <h2>32 expression sets</h2>
    <p class="sub">Compare expressions that look alike but are used differently</p>
    <p class="sub-ko">헷갈리는 짝을 한곳에서 비교해요</p>
    <SearchField
      bind:value={query}
      label="Search sets"
      placeholder="Search a title or a Korean word"
    />

    {#await clustersPromise}
      <p class="status" role="status">Loading sets…</p>
    {:then clusters}
      {@const visible = clusters.filter((cluster) => matches(cluster, normalizedQuery))}
      {#if visible.length}
        <div class="sets">
          {#each visible as cluster (cluster.title)}
            <button class="set" on:click={() => { selected = cluster; window.scrollTo(0, 0); }}>
              <strong>{cluster.title}</strong>
              <span>{cluster.members.map((member) => member.ko).join(' · ')}</span>
              <small>{cluster.members.length} expressions</small>
            </button>
          {/each}
        </div>
      {:else}
        <p class="status">No matching sets.</p>
      {/if}
    {:catch}
      <p class="status error" role="alert">Could not load sets.</p>
    {/await}
  {/if}
</section>

<style>
  .browser { max-width: 480px; margin: 0 auto; padding: 22px 20px 40px; }
  .back { min-height: 44px; margin-bottom: 18px; color: var(--ink-2); font-size: 13px; font-weight: 800; }
  .mark { font-size: 16px; font-weight: 900; letter-spacing: -.03em; }
  .sub-ko { margin: 2px 0 0; font-size: 11.5px; font-weight: 650; color: var(--ink-3); word-break: keep-all; }
  h2 { margin: 7px 0 0; font-size: 23px; line-height: 1.35; word-break: keep-all; }
  .sub { margin: 7px 0 16px; color: var(--ink-3); font-size: 13px; line-height: 1.55; word-break: keep-all; }
  .sets { display: grid; gap: 9px; margin-top: 16px; }
  .set { display: grid; gap: 4px; width: 100%; min-height: 44px; padding: 14px 15px; text-align: left;
    background: var(--card); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-1); }
  .set:hover { border-color: var(--line-2); }
  .set strong { font-size: 16px; line-height: 1.4; color: var(--ink); word-break: keep-all; }
  .set span { font-size: 13px; line-height: 1.45; color: var(--ink-2); word-break: keep-all; }
  .set small { font-size: 11.5px; color: var(--ink-3); }
  .status { margin: 18px 0 0; padding: 22px 14px; text-align: center; color: var(--ink-3);
    background: var(--card); border: 1px solid var(--line); border-radius: 16px; }
  .status.error { color: var(--danger); }
</style>
