export function createDepthLoader(modules, retryUrls = {}, fetcher = (...args) => fetch(...args)) {
  const pending = new Map();
  const importFailed = new Set();

  return function loadDepth(shard) {
    if (!pending.has(shard)) {
      const path = `../lib/wordbook-depth/${shard}.json`;
      const loader = modules[path];
      if (!loader) return Promise.reject(new Error(`Missing wordbook depth shard: ${shard}`));

      const request = (importFailed.has(shard)
        ? Promise.resolve().then(async () => {
          const retryUrl = retryUrls[path];
          if (!retryUrl) throw new Error(`Missing wordbook depth retry URL: ${shard}`);
          const response = await fetcher(retryUrl);
          if (!response.ok) throw new Error(`Wordbook depth retry failed: ${response.status}`);
          return response.json();
        })
        : Promise.resolve().then(() => loader()))
        .catch((error) => {
          pending.delete(shard);
          importFailed.add(shard);
          throw error;
        });
      pending.set(shard, request);
    }
    return pending.get(shard);
  };
}
